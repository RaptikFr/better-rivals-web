"use client";

// Replay 2D sur la carte du circuit : deux points (moi + le meilleur autre
// pilote tracé de la config) rejouent leur tour en simultané, façon ghost.
// Données : GET /api/replay (traces réduites à d/t/v). La position sur la carte
// est obtenue par FRACTION de distance (d/dTotal → fraction × longueur
// géométrique) : le sous-comptage ~15 % du compteur Forza est un biais
// d'échelle, il s'annule dans la fraction.
//
// Perf : l'animation met à jour positions et compteurs par refs DOM directes
// (requestAnimationFrame), sans re-render React à chaque frame. Les données du
// replay vivent dans une ref (l'état React ne sert qu'au montage du JSX), ce
// qui permet de lancer la lecture depuis le gestionnaire de clic sans setState
// dans un effet. ⚠️ Monter ce composant avec key={config.key} : le changement
// de config remet tout à zéro par remontage.

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/hooks/usePlayer';
import { usePreferences } from '@/hooks/usePreferences';
import { pointADistance, type CarteCircuit } from '@/lib/circuitGeometry';
import type { ConfigCarte } from '@/components/CircuitMap';

interface ReplayLap {
  time_ms: number;
  pseudo:  string | null;
  d: number[];
  t: number[];
  v: number[];
}

/** Trace prête pour l'animation : distance normalisée 0..1 + fin de tour. */
interface TracePrete {
  time_ms: number;
  pseudo:  string | null;
  t:       number[];
  dNorm:   number[];
  v:       number[];
  tLast:   number;
}

type Phase = 'repos' | 'chargement' | 'lecture' | 'vide' | 'erreur';

// Couleurs de DONNÉE (hors rampe rose/violet des secteurs, lisibles dessus) :
// moi = bleu ciel, rival = ambre. Liseré blanc pour le contraste sur tout trait.
const DOT_MOI   = '#0ea5e9';
const DOT_RIVAL = '#f59e0b';
// Écart : mêmes familles que la carte (rose = je perds, violet = je mène),
// en tons médians lisibles sur la barre claire comme sombre.
const ECART_RETARD = '#e11d48';
const ECART_AVANCE = '#8b5cf6';

/** Interpolation linéaire de ys en x sur la grille croissante xs (bornée). */
function interp(xs: number[], ys: number[], x: number): number {
  const n = xs.length;
  if (n === 0) return 0;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let lo = 0, hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < x) lo = mid + 1; else hi = mid;
  }
  const a = xs[lo - 1], b = xs[lo];
  const t = b === a ? 0 : (x - a) / (b - a);
  return ys[lo - 1] + t * (ys[lo] - ys[lo - 1]);
}

function preparer(lap: ReplayLap | null): TracePrete | null {
  if (!lap || lap.d.length < 2 || lap.t.length !== lap.d.length) return null;
  const dTotal = lap.d[lap.d.length - 1];
  if (!(dTotal > 0)) return null;
  return {
    time_ms: lap.time_ms,
    pseudo:  lap.pseudo,
    t:       lap.t,
    dNorm:   lap.d.map(x => x / dTotal),
    v:       lap.v,
    tLast:   lap.t[lap.t.length - 1],
  };
}

/** Fraction du tour accomplie (0..1) à l'instant tau (s). */
function fractionA(trace: TracePrete, tau: number): number {
  return Math.max(0, Math.min(1, interp(trace.t, trace.dNorm, tau)));
}

export default function CircuitReplay({
  trackId,
  carte,
  config,
}: {
  trackId: number;
  carte:   CarteCircuit;
  config:  ConfigCarte | null;
}) {
  const { player } = usePlayer();
  const { formatTime, prefs } = usePreferences();
  const decSep = prefs.decimalSep === 'comma' ? ',' : '.';

  const [phase, setPhase]         = useState<Phase>('repos');
  const [enLecture, setEnLecture] = useState(false);
  const [vitesse, setVitesse]     = useState<1 | 2 | 4>(1);
  // Miroir d'état pour le JSX ; l'animation lit donneesRef.
  const [donnees, setDonnees]     = useState<{ moi: TracePrete | null; rival: TracePrete | null } | null>(null);

  const donneesRef   = useRef<{ moi: TracePrete | null; rival: TracePrete | null } | null>(null);
  const dureeRef     = useRef(0);
  const dotMoiRef    = useRef<HTMLDivElement>(null);
  const dotRivalRef  = useRef<HTMLDivElement>(null);
  const vitMoiRef    = useRef<HTMLSpanElement>(null);
  const vitRivalRef  = useRef<HTMLSpanElement>(null);
  const chronoRef    = useRef<HTMLSpanElement>(null);
  const ecartRef     = useRef<HTMLSpanElement>(null);
  const tauRef       = useRef(0);
  const brutTsRef    = useRef<number | null>(null);
  const rafRef       = useRef(0);
  const vitesseRef   = useRef<number>(1);
  const enLectureRef = useRef(false);

  const vb = carte.viewBox;

  /** Positionne un point (ref) à la fraction f du tracé, en % du conteneur. */
  const placerDot = useCallback((el: HTMLDivElement | null, f: number) => {
    if (!el) return;
    const p = pointADistance(carte.points, f * carte.longueurM);
    el.style.left = `${(((p.x - vb.minX) / vb.largeur) * 100).toFixed(3)}%`;
    el.style.top  = `${(((p.z - vb.minZ) / vb.hauteur) * 100).toFixed(3)}%`;
  }, [carte, vb]);

  /** Dessine l'état du replay à l'instant tauRef.current (points + compteurs). */
  const dessiner = useCallback(() => {
    const d = donneesRef.current;
    if (!d) return;
    const tau = tauRef.current;

    for (const [trace, dotRef, vitRef] of [
      [d.moi, dotMoiRef, vitMoiRef],
      [d.rival, dotRivalRef, vitRivalRef],
    ] as const) {
      if (!trace) continue;
      placerDot(dotRef.current, fractionA(trace, tau));
      if (vitRef.current) {
        vitRef.current.textContent = tau >= trace.tLast
          ? '· 🏁'
          : trace.v.length > 0 ? `· ${Math.round(interp(trace.t, trace.v, tau))} km/h` : '';
      }
    }

    if (chronoRef.current) chronoRef.current.textContent = formatTime(Math.round(tau * 1000));

    // Écart : temps que le retardataire mettra pour rallier la position
    // actuelle de celui qui mène. Convention d'affichage côté « moi » :
    // positif (rose) = je suis derrière, négatif (violet) = je mène.
    if (ecartRef.current && d.moi && d.rival) {
      const fMoi = fractionA(d.moi, tau), fRival = fractionA(d.rival, tau);
      let ecartS: number;
      if (fMoi >= 1 && fRival >= 1) {
        ecartS = (d.moi.time_ms - d.rival.time_ms) / 1000; // les deux ont fini : écart final
      } else if (fMoi >= fRival) {
        ecartS = -Math.max(0, interp(d.rival.dNorm, d.rival.t, fMoi) - tau);
      } else {
        ecartS = Math.max(0, interp(d.moi.dNorm, d.moi.t, fRival) - tau);
      }
      const signe = ecartS > 0 ? '+' : ecartS < 0 ? '−' : '±';
      ecartRef.current.textContent = `${signe}${Math.abs(ecartS).toFixed(1).replace('.', decSep)} s`;
      ecartRef.current.style.color = ecartS > 0 ? ECART_RETARD : ECART_AVANCE;
    }
  }, [placerDot, formatTime, decSep]);

  const stopBoucle = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    brutTsRef.current = null;
  }, []);

  const boucle = useCallback(function pas(ts: number) {
    if (!enLectureRef.current) return;
    if (brutTsRef.current !== null) {
      tauRef.current += ((ts - brutTsRef.current) / 1000) * vitesseRef.current;
    }
    brutTsRef.current = ts;
    if (tauRef.current >= dureeRef.current) {
      tauRef.current = dureeRef.current;
      dessiner();
      enLectureRef.current = false;
      setEnLecture(false);
      brutTsRef.current = null;
      return;
    }
    dessiner();
    rafRef.current = requestAnimationFrame(pas);
  }, [dessiner]);

  const jouer = useCallback(() => {
    if (tauRef.current >= dureeRef.current) tauRef.current = 0; // relire depuis le début
    enLectureRef.current = true;
    setEnLecture(true);
    stopBoucle();
    rafRef.current = requestAnimationFrame(boucle);
  }, [boucle, stopBoucle]);

  const mettreEnPause = useCallback(() => {
    enLectureRef.current = false;
    setEnLecture(false);
    stopBoucle();
  }, [stopBoucle]);

  const redemarrer = useCallback(() => {
    tauRef.current = 0;
    dessiner();
    if (!enLectureRef.current) jouer();
  }, [dessiner, jouer]);

  const fermer = useCallback(() => {
    mettreEnPause();
    donneesRef.current = null;
    setDonnees(null);
    setPhase('repos');
  }, [mettreEnPause]);

  // Nettoyage à la destruction (fermeture de page, changement de config par key).
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const charger = useCallback(async () => {
    if (!config) return;
    setPhase('chargement');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setPhase('erreur'); return; }
      const qs = new URLSearchParams({
        track_id:    String(trackId),
        car_ordinal: String(config.carOrdinal),
        car_class:   config.carClass,
        drivetrain:  config.drivetrain,
      });
      const res = await fetch(`/api/replay?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 204) { setPhase('vide'); return; }
      if (!res.ok) { setPhase('erreur'); return; }
      const json = (await res.json()) as { moi: ReplayLap | null; rival: ReplayLap | null };
      const pret = { moi: preparer(json.moi), rival: preparer(json.rival) };
      if (!pret.moi && !pret.rival) { setPhase('vide'); return; }

      donneesRef.current = pret;
      dureeRef.current   = Math.max(pret.moi?.tLast ?? 0, pret.rival?.tLast ?? 0);
      tauRef.current     = 0;
      setDonnees(pret);
      setPhase('lecture');
      // Les dots sont montés par le re-render (sync) avant la frame suivante :
      // la boucle rAF les trouvera via les refs.
      jouer();
    } catch {
      setPhase('erreur');
    }
  }, [config, trackId, jouer]);

  const changerVitesse = useCallback(() => {
    setVitesse(v => {
      const suivante = v === 1 ? 2 : v === 2 ? 4 : 1;
      vitesseRef.current = suivante;
      return suivante;
    });
  }, []);

  if (!player || !config) return null;

  // ── Bouton de lancement (au repos) ─────────────────────────────────────────
  if (phase !== 'lecture') {
    return (
      <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2">
        {phase === 'vide' && (
          <span className="px-2 py-1 rounded-md bg-white/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-700 text-[11px] text-neutral-500">
            Pas encore de trace sur cette config.
          </span>
        )}
        {phase === 'erreur' && (
          <span className="px-2 py-1 rounded-md bg-white/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-700 text-[11px] text-pink-500">
            Replay indisponible — réessaie plus tard.
          </span>
        )}
        <button
          onClick={charger}
          disabled={phase === 'chargement'}
          title="Rejoue ton tour contre le meilleur pilote tracé de cette config"
          className="px-3 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:border-pink-400 hover:text-pink-500 transition-colors shadow-sm disabled:opacity-60"
        >
          {phase === 'chargement' ? 'Chargement…' : '▶ Replay'}
        </button>
      </div>
    );
  }

  // ── Replay actif : points + barre de contrôle ──────────────────────────────
  return (
    <>
      {donnees?.moi && (
        <div ref={dotMoiRef} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span
            className="block w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: DOT_MOI }}
          />
          <span
            className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+3px)] px-1.5 py-px rounded text-[9px] font-bold text-white whitespace-nowrap shadow"
            style={{ backgroundColor: DOT_MOI }}
          >
            Toi <span ref={vitMoiRef} className="font-normal opacity-90" />
          </span>
        </div>
      )}
      {donnees?.rival && (
        <div ref={dotRivalRef} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span
            className="block w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: DOT_RIVAL }}
          />
          <span
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+3px)] px-1.5 py-px rounded text-[9px] font-bold text-black whitespace-nowrap shadow"
            style={{ backgroundColor: DOT_RIVAL }}
          >
            {donnees.rival.pseudo ?? 'Rival'} <span ref={vitRivalRef} className="font-normal opacity-80" />
          </span>
        </div>
      )}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur border border-neutral-300 dark:border-neutral-700 shadow-lg text-xs">
        <button
          onClick={enLecture ? mettreEnPause : jouer}
          aria-label={enLecture ? 'Pause' : 'Lecture'}
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          {enLecture ? '⏸' : '▶'}
        </button>
        <button
          onClick={redemarrer}
          aria-label="Recommencer"
          className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          ↺
        </button>
        <button
          onClick={changerVitesse}
          aria-label={`Vitesse de lecture ×${vitesse}`}
          className="px-1.5 h-7 rounded-full font-mono font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          ×{vitesse}
        </button>
        <span ref={chronoRef} className="font-mono font-bold text-neutral-900 dark:text-white min-w-[64px] text-center" />
        {donnees?.moi && donnees?.rival && (
          <span ref={ecartRef} className="font-mono font-bold min-w-[52px] text-center" />
        )}
        <button
          onClick={fermer}
          aria-label="Fermer le replay"
          className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          ✕
        </button>
      </div>
    </>
  );
}
