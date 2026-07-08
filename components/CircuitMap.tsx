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
  typeVirage,
  interpoler,
  type CarteCircuit,
  type PointCarte,
  type Virage,
} from '@/lib/circuitGeometry';
import CircuitReplay from '@/components/CircuitReplay';

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

// Trace réduite (GET /api/replay) — mêmes données que le replay 2D, réutilisées
// ici pour chronométrer chaque VIRAGE (fenêtre exacte distDebutM→distFinM), au
// lieu des tranches égales des secteurs qui peuvent chevaucher plusieurs virages.
type ReplayLap = {
  time_ms: number;
  pseudo:  string | null;
  d: number[];
  t: number[];
  v: number[];
};

// Candidat au rôle de rival (autre pilote tracé de la config) — pour peupler
// le sélecteur. Renvoyé par /api/replay à chaque appel.
type RivalDisponible = {
  player_id: string;
  pseudo:    string | null;
  time_ms:   number;
};

interface PerteVirage {
  virage:      Virage;
  moiS:        number;
  rivalS:      number;
  rivalPseudo: string | null;
  /** moi − rival (s), positif = je perds du temps dans ce virage. */
  deltaS:      number;
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
  virages = [],
}: {
  trackId:   number;
  carte:     CarteCircuit;
  configs:   ConfigCarte[];
  virages?:  Virage[];
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
  // Slot DOM sous la carte où le replay téléporte sa barre de contrôle
  // (en state : le portal doit se re-rendre quand le nœud est monté).
  const [replaySlot, setReplaySlot] = useState<HTMLDivElement | null>(null);
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

  // Traces (moi + rival) de la config affichée, pour chronométrer les virages —
  // best-effort : réservé aux connectés (lap_traces fermée par RLS), silencieux sinon.
  const [traces, setTraces]               = useState<{ moi: ReplayLap | null; rival: ReplayLap | null; rivalsDisponibles?: RivalDisponible[] } | null>(null);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [tracesAuth, setTracesAuth]       = useState(true);
  // Rival choisi explicitement dans le sélecteur : soit l'id d'un joueur, soit
  // un fantôme virtuel encodé `ghost:<clé>` (ex. `ghost:optimal_config`). Sinon
  // (null) : meilleur autre, comportement par défaut de l'API. Remis à zéro à
  // chaque changement de config — la liste de candidats tracés change avec elle.
  const [selectedRivalId, setSelectedRivalId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset synchrone du rival choisi quand la config change (ses candidats ne valent plus)
    setSelectedRivalId(null);
  }, [configActive?.key]);

  useEffect(() => {
    if (!configActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset synchrone quand aucune config n'est active (pas de fetch à lancer)
      setTraces(null);
      return;
    }
    let annule = false;
    (async () => {
      setTracesLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          if (!annule) { setTraces(null); setTracesAuth(false); setTracesLoading(false); }
          return;
        }
        if (!annule) setTracesAuth(true);
        const qs = new URLSearchParams({
          track_id:    String(trackId),
          car_ordinal: String(configActive.carOrdinal),
          car_class:   configActive.carClass,
          drivetrain:  configActive.drivetrain,
        });
        if (selectedRivalId?.startsWith('ghost:')) qs.set('ghost', selectedRivalId.slice('ghost:'.length));
        else if (selectedRivalId) qs.set('rival_player_id', selectedRivalId);
        const res = await fetch(`/api/replay?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 204 || !res.ok) { if (!annule) setTraces(null); return; }
        const json = await res.json();
        if (!annule) setTraces(json);
      } catch {
        if (!annule) setTraces(null);
      } finally {
        if (!annule) setTracesLoading(false);
      }
    })();
    return () => { annule = true; };
  }, [configActive, trackId, selectedRivalId]);

  const rivalsDisponibles = traces?.rivalsDisponibles ?? [];

  // Durée dans chaque virage (fenêtre distDebutM→distFinM interpolée sur la
  // trace, indépendante du découpage en secteurs) — nécessite les deux traces.
  const perVirage = useMemo((): PerteVirage[] | null => {
    if (!traces?.moi || !traces?.rival || virages.length === 0 || !(carte.longueurM > 0)) return null;
    const prep = (lap: ReplayLap) => {
      if (lap.d.length < 2 || lap.t.length !== lap.d.length) return null;
      const dTotal = lap.d[lap.d.length - 1];
      if (!(dTotal > 0)) return null;
      return { dNorm: lap.d.map(x => x / dTotal), t: lap.t };
    };
    const moi = prep(traces.moi), rival = prep(traces.rival);
    if (!moi || !rival) return null;
    return virages.map(v => {
      const f0 = v.distDebutM / carte.longueurM;
      const f1 = v.distFinM   / carte.longueurM;
      const moiS   = interpoler(moi.dNorm,   moi.t,   f1) - interpoler(moi.dNorm,   moi.t,   f0);
      const rivalS = interpoler(rival.dNorm, rival.t, f1) - interpoler(rival.dNorm, rival.t, f0);
      return { virage: v, moiS, rivalS, rivalPseudo: traces.rival!.pseudo, deltaS: moiS - rivalS };
    });
  }, [traces, virages, carte.longueurM]);

  const piresVirages = useMemo(
    () => (perVirage ?? []).filter(p => p.deltaS > 0).sort((a, b) => b.deltaS - a.deltaS),
    [perVirage],
  );

  // Un SecteurInfo par secteur : meilleur de la config (+ détenteur) et mon
  // temps. ⚠️ `sector_index` est 1-BASED en base (RPC enregistrer_meilleurs_
  // secteurs, tableaux Postgres) — même piège que l'off-by-one corrigé dans
  // /api/coach : le secteur k du tour est à l'indice k-1 ici.
  const secteurs = useMemo<SecteurInfo[]>(() => {
    if (!configActive) return [];
    const lignes = rowsParConfig.get(configActive.key)!;
    const n = Math.max(...lignes.map(r => r.sector_index));
    const infos: SecteurInfo[] = Array.from({ length: n }, () => ({
      bestMs: null, bestPseudo: null, mienMs: null, deltaMs: null,
    }));
    for (const r of lignes) {
      const s = infos[r.sector_index - 1];
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

  /** Virages dont l'apex tombe dans le secteur i, ou [] (ligne droite). */
  const viragesDuSecteur = useCallback((i: number): Virage[] => {
    if (secteurs.length === 0) return [];
    const d0 = (i * carte.longueurM) / secteurs.length;
    const d1 = ((i + 1) * carte.longueurM) / secteurs.length;
    return virages.filter(v => v.distApexM >= d0 && v.distApexM < d1);
  }, [virages, secteurs.length, carte.longueurM]);

  /** « virage 3 » / « virages 3–5 » / « ligne droite ». */
  const libelleVirages = useCallback((i: number): string => {
    const vs = viragesDuSecteur(i);
    if (vs.length === 0) return 'ligne droite';
    if (vs.length === 1) return `virage ${vs[0].numero}`;
    return `virages ${vs[0].numero}–${vs[vs.length - 1].numero}`;
  }, [viragesDuSecteur]);

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
        {rivalsDisponibles.length >= 1 && (
          <select
            value={selectedRivalId ?? ''}
            onChange={e => setSelectedRivalId(e.target.value || null)}
            aria-label="Rival affiché sur le replay et les écarts par virage"
            title="Choisis qui comparer : un pilote tracé, ou un fantôme recollé (meilleurs secteurs enchaînés)"
            className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white max-w-full"
          >
            <option value="">🏆 Meilleur autre (auto)</option>
            <option value="ghost:optimal_config">
              🧮 Fantôme optimal — tous pilotes
            </option>
            <optgroup label="Pilotes tracés">
              {rivalsDisponibles.map(r => (
                <option key={r.player_id} value={r.player_id}>
                  {r.pseudo ?? 'Inconnu'} · {formatTime(r.time_ms)}
                </option>
              ))}
            </optgroup>
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

        {/* Pastilles numérotées à l'apex de chaque virage, décalées vers
            l'extérieur du virage pour ne pas couvrir le tracé. */}
        {virages.map(v => (
          <span
            key={v.numero}
            title={`Virage ${v.numero} — ${v.direction} (${typeVirage(v)}), ≈${Math.round(v.angleDeg)}°, r ≈ ${Math.round(v.rayonMinM)} m`}
            className="absolute w-[18px] h-[18px] rounded-full bg-white dark:bg-neutral-800 border border-neutral-400 dark:border-neutral-500 text-[10px] font-bold text-neutral-700 dark:text-neutral-200 flex items-center justify-center shadow-sm select-none cursor-help"
            style={{
              ...enPourcent(v.apex),
              transform: `translate(calc(-50% + ${(v.normale.x * 16).toFixed(1)}px), calc(-50% + ${(v.normale.z * 16).toFixed(1)}px))`,
            }}
          >
            {v.numero}
          </span>
        ))}

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
            <p className="font-bold text-neutral-900 dark:text-white mb-0.5">
              Secteur {survol.idx + 1}
              {virages.length > 0 && (
                <span className="font-normal text-neutral-500"> · {libelleVirages(survol.idx)}</span>
              )}
            </p>
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

        {/* Replay 2D toi vs rival — remonté à chaque changement de config ou de
            rival choisi (repart proprement de « ▶ Replay », comme un changement
            de config : évite de threader un refetch dans un composant déjà en lecture). */}
        <CircuitReplay
          key={`${configActive?.key ?? 'aucune'}|${selectedRivalId ?? 'auto'}`}
          trackId={trackId}
          carte={carte}
          config={configActive}
          barreSlot={replaySlot}
          rivalPlayerId={selectedRivalId}
        />
      </div>

      {/* Slot de la barre de contrôle du replay : sous la carte, dans le flux,
          pour ne jamais chevaucher le tracé. Vide (masqué) hors lecture. */}
      <div ref={setReplaySlot} className="mt-3 flex justify-center empty:hidden" />

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
                      <strong>secteur {p.i + 1}</strong>
                      {' ('}
                      {virages.length > 0 && <>{libelleVirages(p.i)} · </>}
                      {fmtDelta(p.delta)})
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

          {/* Perte par virage : fenêtre exacte du virage (trace), pas la tranche du
              secteur qui peut en chevaucher plusieurs (ex. « virages 5–6 »). */}
          {virages.length > 0 && (
            <details open className="text-sm">
              <summary className="cursor-pointer text-neutral-500 hover:text-pink-400 transition-colors text-xs font-semibold">
                🌀 Perte par virage
              </summary>
              <div className="mt-2">
                {!tracesAuth ? (
                  <p className="text-xs text-neutral-500">
                    Connecte-toi pour comparer virage par virage avec un tour tracé de cette config.
                  </p>
                ) : tracesLoading ? (
                  <p className="text-xs text-neutral-500 animate-pulse">Chargement des tracés…</p>
                ) : !perVirage ? (
                  <p className="text-xs text-neutral-500">
                    {traces?.moi || traces?.rival
                      ? "Il manque l'une des deux traces (toi ou le rival) pour calculer la perte par virage."
                      : 'Pas encore de tour tracé sur cette config — pose un temps avec le relais pour débloquer ce calcul.'}
                  </p>
                ) : (
                  <>
                    {piresVirages.length > 0 && (
                      <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                        🔻 Le plus gros écart :{' '}
                        {piresVirages.slice(0, 3).map((p, j) => (
                          <span key={p.virage.numero}>
                            {j > 0 && (j === Math.min(piresVirages.length, 3) - 1 ? ' puis ' : ', ')}
                            <strong>virage {p.virage.numero}</strong> ({fmtDelta(Math.round(p.deltaS * 1000))})
                          </span>
                        ))}.
                      </p>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                            <th className="px-2 py-1.5 font-bold">Virage</th>
                            <th className="px-2 py-1.5 font-bold">Type</th>
                            <th className="px-2 py-1.5 font-bold">Toi</th>
                            <th className="px-2 py-1.5 font-bold">{perVirage[0]?.rivalPseudo ?? 'Rival'}</th>
                            <th className="px-2 py-1.5 font-bold">Écart</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perVirage.map(p => (
                            <tr key={p.virage.numero} className="border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-0">
                              <td className="px-2 py-1.5 font-bold text-neutral-500">V{p.virage.numero}</td>
                              <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400">
                                {p.virage.direction} · {typeVirage(p.virage)}
                              </td>
                              <td className="px-2 py-1.5 font-mono">{p.moiS.toFixed(2).replace('.', decSep)} s</td>
                              <td className="px-2 py-1.5 font-mono">{p.rivalS.toFixed(2).replace('.', decSep)} s</td>
                              <td className={`px-2 py-1.5 font-mono font-bold ${
                                p.deltaS > 0 ? 'text-pink-500' : p.deltaS < 0 ? 'text-violet-500' : ''
                              }`}>
                                {p.deltaS === 0
                                  ? `±0${decSep}00 s`
                                  : `${p.deltaS > 0 ? '+' : '−'}${Math.abs(p.deltaS).toFixed(2).replace('.', decSep)} s`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </details>
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
                    {virages.length > 0 && <th className="px-2 py-1.5 font-bold">Virages</th>}
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
                      {virages.length > 0 && (
                        <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400">
                          {viragesDuSecteur(i).length > 0
                            ? viragesDuSecteur(i).map(v => `V${v.numero}`).join(', ')
                            : '—'}
                        </td>
                      )}
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
