"use client";

// Carte SVG du circuit + « où je perds du temps » : le tracé (track_geometries,
// capturé par le relais) est découpé en N tranches égales en distance — le même
// découpage que les secteurs du relais — et chaque tranche est colorée par
// l'écart entre MON meilleur secteur et le meilleur secteur de la config
// (best_sectors, lisible en anon). Violet = je détiens le meilleur secteur
// (idiome F1), rampe rose = perte croissante, neutre = pas de donnée.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { usePlayer } from '@/hooks/usePlayer';
import { usePreferences } from '@/hooks/usePreferences';
import {
  decouperSecteurs,
  pointADistance,
  type CarteCircuit,
  type PointCarte,
} from '@/lib/circuitGeometry';

export interface ConfigCarte {
  key:        string; // `${car_class}|${drivetrain}|${car_ordinal}` — même clé que la page circuit
  carClass:   string;
  drivetrain: string;
  carLabel:   string;
  carOrdinal: number;
}

type BestSectorRow = {
  player_id:    string;
  car_ordinal:  number;
  car_class:    string;
  drivetrain:   string;
  sector_index: number;
  best_ms:      number;
  players:      { pseudo: string | null } | null;
};

interface SecteurInfo {
  bestMs:     number | null;
  bestPseudo: string | null;
  mienMs:     number | null;
  /** mien − meilleur (ms), null sans donnée personnelle ou de référence. */
  deltaMs:    number | null;
}

// Rampe séquentielle « temps perdu » (famille rose), 4 pas, une teinte par mode,
// validée clair ET sombre (validateur dataviz : L monotone, ΔL ≥ 0.06,
// contraste du pas clair ≥ 2:1 sur la surface). Hex bruts exprès : une couleur
// de DONNÉE ne suit ni les skins ni le remap d'accent.
const BIN_STROKES = [
  '[stroke:#fb7185] dark:[stroke:#9f1239]',
  '[stroke:#e11d48]',
  '[stroke:#9f1239] dark:[stroke:#fb7185]',
  '[stroke:#4c0519] dark:[stroke:#fda4af]',
];
const BIN_FONDS = [
  '[background:#fb7185] dark:[background:#9f1239]',
  '[background:#e11d48]',
  '[background:#9f1239] dark:[background:#fb7185]',
  '[background:#4c0519] dark:[background:#fda4af]',
];
const VIOLET_STROKE  = '[stroke:#7c3aed] dark:[stroke:#a78bfa]';
const VIOLET_FOND    = '[background:#7c3aed] dark:[background:#a78bfa]';
const NEUTRE_STROKE  = 'stroke-neutral-300 dark:stroke-neutral-700';

function cheminSvg(pts: PointCarte[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.z.toFixed(1)}`).join(' ');
}

export default function CircuitMap({
  trackId,
  carte,
  configs,
}: {
  trackId: number;
  carte:   CarteCircuit;
  configs: ConfigCarte[];
}) {
  const { player } = usePlayer();
  const { formatTime, prefs } = usePreferences();
  const decSep = prefs.decimalSep === 'comma' ? ',' : '.';
  /** Écart en secondes, court : « +0,42 s ». */
  const fmtDelta = useCallback(
    (ms: number) => `+${(ms / 1000).toFixed(2).replace('.', decSep)} s`,
    [decSep],
  );

  const [rows, setRows]           = useState<BestSectorRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [survol, setSurvol]       = useState<{ idx: number; x: number; y: number } | null>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let annule = false;
    (async () => {
      const { data } = await fetchAllRows<BestSectorRow>((from, to) =>
        supabase
          .from('best_sectors')
          .select('player_id, car_ordinal, car_class, drivetrain, sector_index, best_ms, players ( pseudo )')
          .eq('track_id', trackId)
          .order('player_id')
          .order('sector_index')
          .range(from, to)
      );
      if (!annule) { setRows(data); setLoading(false); }
    })();
    return () => { annule = true; };
  }, [trackId]);

  const rowsParConfig = useMemo(() => {
    const map = new Map<string, BestSectorRow[]>();
    for (const r of rows) {
      const key = `${r.car_class}|${r.drivetrain}|${r.car_ordinal}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [rows]);

  // Configs de la page ayant des secteurs enregistrés, dans l'ordre de la page.
  const configsDispo = useMemo(
    () => configs.filter(c => rowsParConfig.has(c.key)),
    [configs, rowsParConfig],
  );

  // Config affichée : le choix de l'utilisateur s'il est encore valide, sinon
  // une config où IL a des secteurs, sinon la première qui en a.
  const configActive = useMemo(() => {
    if (selectedKey) {
      const choisie = configsDispo.find(c => c.key === selectedKey);
      if (choisie) return choisie;
    }
    if (player) {
      const mienne = configsDispo.find(c =>
        rowsParConfig.get(c.key)!.some(r => r.player_id === player.id));
      if (mienne) return mienne;
    }
    return configsDispo[0] ?? null;
  }, [selectedKey, configsDispo, player, rowsParConfig]);

  // Un SecteurInfo par index : meilleur de la config (+ détenteur) et mon temps.
  const secteurs = useMemo<SecteurInfo[]>(() => {
    if (!configActive) return [];
    const lignes = rowsParConfig.get(configActive.key)!;
    const n = Math.max(...lignes.map(r => r.sector_index)) + 1;
    const infos: SecteurInfo[] = Array.from({ length: n }, () => ({
      bestMs: null, bestPseudo: null, mienMs: null, deltaMs: null,
    }));
    for (const r of lignes) {
      const s = infos[r.sector_index];
      if (!s) continue;
      if (s.bestMs === null || r.best_ms < s.bestMs) {
        s.bestMs = r.best_ms;
        s.bestPseudo = r.players?.pseudo ?? null;
      }
      if (player && r.player_id === player.id) s.mienMs = r.best_ms;
    }
    for (const s of infos) {
      if (s.mienMs !== null && s.bestMs !== null) s.deltaMs = s.mienMs - s.bestMs;
    }
    return infos;
  }, [configActive, rowsParConfig, player]);

  const segments = useMemo(
    () => decouperSecteurs(carte, secteurs.length || 1),
    [carte, secteurs.length],
  );

  const maxDelta = useMemo(
    () => secteurs.reduce((m, s) => (s.deltaMs !== null && s.deltaMs > m ? s.deltaMs : m), 0),
    [secteurs],
  );
  const aMesDonnees = secteurs.some(s => s.mienMs !== null);

  /** Classe de trait d'un secteur : violet (je détiens), rampe (perte), neutre. */
  function classeSecteur(s: SecteurInfo | undefined): string {
    if (!s || s.deltaMs === null) return NEUTRE_STROKE;
    if (s.deltaMs <= 0) return VIOLET_STROKE;
    if (maxDelta <= 0) return VIOLET_STROKE;
    const bin = Math.min(3, Math.floor((s.deltaMs / maxDelta) * 4));
    return BIN_STROKES[bin];
  }

  // Pires secteurs (perte décroissante) pour le résumé et l'étiquette sur la carte.
  const pires = useMemo(
    () => secteurs
      .map((s, i) => ({ i, delta: s.deltaMs ?? 0 }))
      .filter(p => p.delta > 0)
      .sort((a, b) => b.delta - a.delta),
    [secteurs],
  );
  const nbViolets = aMesDonnees ? secteurs.filter(s => s.deltaMs !== null && s.deltaMs <= 0).length : 0;

  const vb = carte.viewBox;
  /** Coordonnées monde → position % dans le conteneur (pour les étiquettes HTML). */
  const enPourcent = useCallback((p: { x: number; z: number }) => ({
    left: `${(((p.x - vb.minX) / vb.largeur) * 100).toFixed(2)}%`,
    top:  `${(((p.z - vb.minZ) / vb.hauteur) * 100).toFixed(2)}%`,
  }), [vb]);

  const surSurvol = useCallback((idx: number, e: React.MouseEvent) => {
    const rect = conteneurRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSurvol({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const depart = carte.points[0];
  const pire = pires[0];
  const pireMilieu = pire !== undefined && secteurs.length > 0
    ? pointADistance(carte.points, ((pire.i + 0.5) * carte.longueurM) / secteurs.length)
    : null;
  const seuil = maxDelta / 4;

  return (
    <section className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex-1">
          🗺️ Carte du circuit <span className="text-neutral-500 font-normal text-sm">— où perds-tu du temps ?</span>
        </h2>
        {configsDispo.length > 1 && configActive && (
          <select
            value={configActive.key}
            onChange={e => setSelectedKey(e.target.value)}
            aria-label="Configuration comparée"
            className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white max-w-full"
          >
            {configsDispo.map(c => (
              <option key={c.key} value={c.key}>
                {c.carLabel} · {c.carClass}/{c.drivetrain}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        ref={conteneurRef}
        className="relative w-full max-w-2xl mx-auto"
        style={{ aspectRatio: `${vb.largeur} / ${vb.hauteur}` }}
        onMouseLeave={() => setSurvol(null)}
      >
        <svg
          viewBox={`${vb.minX} ${vb.minZ} ${vb.largeur} ${vb.hauteur}`}
          className="absolute inset-0 w-full h-full"
          role="img"
          aria-label="Tracé du circuit coloré par temps perdu par secteur"
        >
          {/* Tracé complet en fond (visible sous les tranches sans donnée). */}
          <path
            d={cheminSvg(carte.points)}
            fill="none"
            strokeWidth={7}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={NEUTRE_STROKE}
          />
          {segments.map((seg, i) => {
            const s = secteurs[i];
            const surligne = survol?.idx === i;
            return (
              <g key={i}>
                {(s?.deltaMs !== null || surligne) && (
                  <path
                    d={cheminSvg(seg)}
                    fill="none"
                    strokeWidth={surligne ? 9 : 5}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={classeSecteur(s)}
                  />
                )}
                {/* Zone de survol large (la tranche fine serait pénible à viser). */}
                <path
                  d={cheminSvg(seg)}
                  fill="none"
                  strokeWidth={18}
                  vectorEffect="non-scaling-stroke"
                  stroke="transparent"
                  strokeLinecap="round"
                  className="cursor-pointer"
                  onMouseMove={e => surSurvol(i, e)}
                />
              </g>
            );
          })}
        </svg>

        {/* Drapeau départ/arrivée. */}
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 text-base select-none pointer-events-none"
          style={enPourcent(depart)}
          aria-hidden="true"
        >
          🏁
        </span>

        {/* Étiquette du pire secteur (label direct sélectif : uniquement le max). */}
        {pire !== undefined && pireMilieu && !survol && (
          <span
            className="absolute -translate-x-1/2 -translate-y-[130%] px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-600 shadow pointer-events-none whitespace-nowrap"
            style={enPourcent(pireMilieu)}
          >
            S{pire.i + 1} · {fmtDelta(pire.delta)}
          </span>
        )}

        {/* Infobulle secteur. */}
        {survol && secteurs[survol.idx] && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-[115%] px-3 py-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 shadow-lg text-xs pointer-events-none whitespace-nowrap"
            style={{ left: survol.x, top: survol.y }}
          >
            <p className="font-bold text-neutral-900 dark:text-white mb-0.5">Secteur {survol.idx + 1}</p>
            {secteurs[survol.idx].bestMs !== null && (
              <p className="text-neutral-600 dark:text-neutral-400">
                Meilleur : <span className="font-mono font-bold text-neutral-900 dark:text-white">{formatTime(secteurs[survol.idx].bestMs!)}</span>
                {secteurs[survol.idx].bestPseudo ? ` (${secteurs[survol.idx].bestPseudo})` : ''}
              </p>
            )}
            {secteurs[survol.idx].mienMs !== null && (
              <p className="text-neutral-600 dark:text-neutral-400">
                Toi : <span className="font-mono font-bold text-neutral-900 dark:text-white">{formatTime(secteurs[survol.idx].mienMs!)}</span>
                {secteurs[survol.idx].deltaMs! > 0
                  ? <span className="font-bold text-pink-500"> {fmtDelta(secteurs[survol.idx].deltaMs!)}</span>
                  : <span className="font-bold text-violet-500"> · meilleur secteur 💜</span>}
              </p>
            )}
            {secteurs[survol.idx].bestMs === null && (
              <p className="text-neutral-500">Aucune donnée sur ce secteur.</p>
            )}
          </div>
        )}
      </div>

      {/* Résumé + légende + repli. */}
      {loading ? (
        <p className="text-sm text-neutral-500 animate-pulse mt-4">Chargement des secteurs…</p>
      ) : !configActive ? (
        <p className="text-sm text-neutral-500 mt-4">
          Pas encore de temps par secteur sur ce circuit — roule avec le relais pour alimenter la carte.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {aMesDonnees ? (
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {pires.length > 0 ? (
                <>
                  🔻 Tu perds le plus au{' '}
                  {pires.slice(0, 3).map((p, j) => (
                    <span key={p.i}>
                      {j > 0 && (j === Math.min(pires.length, 3) - 1 ? ' puis au ' : ', ')}
                      <strong>secteur {p.i + 1}</strong> ({fmtDelta(p.delta)})
                    </span>
                  ))}
                  .
                </>
              ) : (
                <>👑 Tu détiens tous les meilleurs secteurs de cette config — le tour optimal, c&apos;est toi.</>
              )}
              {nbViolets > 0 && pires.length > 0 && (
                <span className="text-neutral-500"> 💜 {nbViolets} secteur{nbViolets > 1 ? 's' : ''} violet{nbViolets > 1 ? 's' : ''} à ton nom.</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-neutral-500">
              {player
                ? 'Pose un temps sur cette config avec le relais pour voir où tu perds du temps.'
                : 'Connecte-toi et pose un temps avec le relais pour voir où tu perds du temps.'}
              {' '}Survole les secteurs pour découvrir les temps de référence.
            </p>
          )}

          {aMesDonnees && maxDelta > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded-sm ${VIOLET_FOND}`} />
                Meilleur secteur (toi)
              </span>
              {BIN_FONDS.map((f, b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <span className={`inline-block w-3 h-3 rounded-sm ${f}`} />
                  {b === 0 ? `≤ ${fmtDelta(seuil).slice(1)}` :
                   b === 3 ? `> ${fmtDelta(3 * seuil).slice(1)}` :
                   `${fmtDelta(b * seuil).slice(1)} – ${fmtDelta((b + 1) * seuil).slice(1)}`}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-neutral-300 dark:bg-neutral-700" />
                Sans donnée
              </span>
            </div>
          )}

          {/* Détail par secteur en tableau (lisible sans les couleurs). */}
          <details className="text-sm">
            <summary className="cursor-pointer text-neutral-500 hover:text-pink-400 transition-colors text-xs font-semibold">
              Détail des secteurs
            </summary>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-2 py-1.5 font-bold">Secteur</th>
                    <th className="px-2 py-1.5 font-bold">Meilleur</th>
                    <th className="px-2 py-1.5 font-bold">Détenteur</th>
                    {aMesDonnees && <th className="px-2 py-1.5 font-bold">Toi</th>}
                    {aMesDonnees && <th className="px-2 py-1.5 font-bold">Écart</th>}
                  </tr>
                </thead>
                <tbody>
                  {secteurs.map((s, i) => (
                    <tr key={i} className="border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-0">
                      <td className="px-2 py-1.5 font-bold text-neutral-500">S{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono">{s.bestMs !== null ? formatTime(s.bestMs) : '—'}</td>
                      <td className="px-2 py-1.5">{s.bestPseudo ?? '—'}</td>
                      {aMesDonnees && <td className="px-2 py-1.5 font-mono">{s.mienMs !== null ? formatTime(s.mienMs) : '—'}</td>}
                      {aMesDonnees && (
                        <td className="px-2 py-1.5 font-mono font-bold">
                          {s.deltaMs === null ? '—' : s.deltaMs <= 0 ? '💜' : fmtDelta(s.deltaMs)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
