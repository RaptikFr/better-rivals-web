"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/hooks/usePreferences';
import type { Drivetrain, CarClass } from '@/types/supabase';

export interface LapTime {
  id: string;
  time_ms: number;
  car_class: CarClass;
  car_pi: number;
  car_ordinal: number;
  player_id: string;
  track_id: number;
  drivetrain: Drivetrain;
  share_code: string | null;
  setup_author: string | null;
  previous_time_ms: number | null;
  // Durées de chaque secteur (ms), reconstruites par le relais via la distance.
  // null pour les tours posés avant la feature ou par un vieux relais.
  sectors_ms: number[] | null;
  players: { pseudo: string; discord_tag: string | null } | null;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
  tracks: { name: string; length_km: number | null; type: string | null; is_sprint: boolean | null } | null;
}

export interface Track {
  id: number;
  name: string;
  is_official?: boolean;
}

export interface RankedLap extends LapTime {
  rank: number;
}

export interface SubGroup {
  key: string;
  carClass: CarClass;
  drivetrain: Drivetrain;
  carLabel: string;
  laps: RankedLap[];
  optimal?: TheoreticalLap | null;   // tour optimal (best_sectors, tous tours) si dispo
}

export interface CircuitGroup {
  trackId: number;
  trackName: string;
  trackLengthKm: number | null;
  trackType: string | null;
  trackIsSprint: boolean | null;
  subGroups: SubGroup[];
}

export const CAR_CLASS_ORDER = ['D', 'C', 'B', 'A', 'S1', 'S2', 'R', 'X'];
export const CIRCUITS_PER_PAGE = 5;
export const STORAGE_KEY = 'br_classements_filters';
export const CAR_CLASSES: Array<"Toutes" | CarClass> = ["Toutes", "D", "C", "B", "A", "S1", "S2", "R", "X"];
export const DRIVETRAIN_OPTIONS: Array<"Tous" | Drivetrain> = ["Tous", "AWD", "RWD", "FWD"];
const RAISONS = ['Temps impossible', 'Mauvais circuit sélectionné', 'Autre'] as const;
type Raison = typeof RAISONS[number];

export function TuneCell({ lap }: { lap: LapTime }) {
  const [copied, setCopied] = useState(false);

  if (!lap.share_code) return <span className="text-neutral-600">—</span>;

  async function handleCopy() {
    await navigator.clipboard.writeText(lap.share_code!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      title="Copier le code de réglage"
      className="font-mono text-sm text-neutral-700 dark:text-neutral-300 hover:text-pink-400 transition-colors"
    >
      {copied ? <span className="text-green-400 font-bold not-italic">Copié !</span> : lap.share_code}
    </button>
  );
}

// « Réglage du n°1 » : met en avant, sous l'en-tête d'une config, le code de
// réglage derrière le meilleur temps (toujours visible, même config repliée),
// avec l'auteur du réglage crédité s'il est renseigné. Copiable en un clic.
export function LeaderTuneCell({ shareCode, author }: { shareCode: string; author: string | null }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs bg-amber-500/[0.06] border-t border-amber-500/20">
      <span className="font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">🔧 Réglage du n°1</span>
      <button
        onClick={handleCopy}
        title="Copier le code de réglage du leader"
        className="font-mono font-semibold text-neutral-700 dark:text-neutral-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors truncate"
      >
        {copied ? <span className="text-green-500 font-bold">Copié !</span> : shareCode}
      </button>
      {author && (
        <span className="text-neutral-500 whitespace-nowrap truncate">par {author}</span>
      )}
    </div>
  );
}

// ── Tour théorique (brique télémétrie #2) ──
// Combine les MEILLEURS secteurs parmi tous les pilotes d'une même config pour
// reconstituer le tour parfait atteignable. Ne compare que les tours ayant le
// même nombre de secteurs (les bornes de découpe diffèrent sinon) — en pratique
// tous les tours d'un circuit ont le même N, déduit de sa longueur.
export interface TheoreticalLap {
  totalMs:    number;
  sectors:    number[];            // meilleur temps par index de secteur
  holders:    (string | null)[];   // pseudo détenteur de chaque meilleur secteur
  realBestMs: number;              // meilleur temps réel parmi ceux à secteurs
  count:      number;              // nb de pilotes éligibles (même N)
}

export function computeTheoretical(laps: LapTime[]): TheoreticalLap | null {
  const avecSecteurs = laps.filter(l => Array.isArray(l.sectors_ms) && l.sectors_ms.length >= 2);
  if (avecSecteurs.length === 0) return null;

  const tries = [...avecSecteurs].sort((a, b) => a.time_ms - b.time_ms);
  const n = tries[0].sectors_ms!.length;
  const eligibles = avecSecteurs.filter(l => l.sectors_ms!.length === n);

  const best: number[] = Array(n).fill(Infinity);
  const holders: (string | null)[] = Array(n).fill(null);
  for (const l of eligibles) {
    l.sectors_ms!.forEach((s, i) => {
      if (s > 0 && s < best[i]) { best[i] = s; holders[i] = l.players?.pseudo ?? null; }
    });
  }
  if (best.some(v => !Number.isFinite(v))) return null;

  const totalMs = best.reduce((a, b) => a + b, 0);
  return { totalMs, sectors: best, holders, realBestMs: tries[0].time_ms, count: eligibles.length };
}

// Une ligne de la table best_sectors (meilleur secteur par index, par config),
// alimentée par TOUS les tours (pas seulement les PB) — voir best_sectors.sql.
export interface BestSectorRow {
  sector_index: number;
  best_ms:      number;
  pseudo:       string | null;
}

// Tour optimal depuis best_sectors : meilleur temps par index de secteur à
// travers tous les tours de la config. Exige des indices contigus 1..N (sinon
// l'agrégat est incomplet → on s'abstient). `realBestMs` = meilleur temps réel
// de la config (pour afficher le gain). Préféré à computeTheoretical (qui ne
// voit que les tours-PB) quand des données best_sectors existent.
export function theoreticalFromBest(rows: BestSectorRow[], realBestMs: number): TheoreticalLap | null {
  if (!rows || rows.length < 2) return null;
  const byIdx = new Map<number, BestSectorRow>();
  for (const r of rows) {
    if (r.best_ms > 0) byIdx.set(r.sector_index, r);
  }
  const n = Math.max(...byIdx.keys());
  if (n < 2) return null;
  const sectors: number[] = [];
  const holders: (string | null)[] = [];
  for (let i = 1; i <= n; i++) {
    const r = byIdx.get(i);
    if (!r) return null;                 // index manquant → agrégat incomplet
    sectors.push(r.best_ms);
    holders.push(r.pseudo);
  }
  const totalMs = sectors.reduce((a, b) => a + b, 0);
  const count   = new Set(holders.filter(Boolean)).size || 1;
  return { totalMs, sectors, holders, realBestMs, count };
}

// Bannière compacte sous l'en-tête d'une config : tour théorique + gain vs
// meilleur réel + détail des secteurs (détenteur en infobulle). Rien si aucun
// tour de la config n'a de données de secteurs.
export function TheoreticalLapBanner({ laps, optimal }: { laps: LapTime[]; optimal?: TheoreticalLap | null }) {
  const { formatTime, prefs } = usePreferences();
  // `optimal` (best_sectors, tous les tours) est prioritaire ; sinon repli sur le
  // calcul depuis les seuls tours-PB chargés.
  const theo = optimal ?? computeTheoretical(laps);
  if (!theo) return null;

  // Meilleur temps réel de la config (laps triés par temps). Si le tour optimal
  // est PLUS LENT (le vrai meilleur tour n'a pas de données de secteurs, ex. un
  // tour d'avant la télémétrie), l'agrégat est incomplet → on n'affiche rien
  // plutôt qu'un « optimal » incohérent, plus lent que le n°1.
  const realBest = laps.length ? laps[0].time_ms : theo.realBestMs;
  if (theo.totalMs > realBest) return null;

  const decSep   = prefs.decimalSep === 'comma' ? ',' : '.';
  const gain     = realBest - theo.totalMs;
  const optimise = optimal != null;

  // Les secteurs ne sont PAS ceux du jeu (Forza n'expose pas de checkpoint) :
  // le tour est découpé en N tronçons ÉGAUX EN DISTANCE. On ancre donc chaque
  // secteur pour le joueur — secteur i+1 = de i/N à (i+1)/N du tour — en % et,
  // si la longueur du circuit est connue, en ≈ km (les fractions égales se
  // mappent sur la longueur officielle même si la distance télémétrie est faussée).
  const n        = theo.sectors.length;
  const lengthKm = laps.find(l => l.tracks?.length_km)?.tracks?.length_km ?? null;
  const portionSecteur = (i: number) => {
    const pct = `${Math.round((i / n) * 100)}–${Math.round(((i + 1) / n) * 100)} % du tour`;
    if (!lengthKm) return pct;
    const a = ((i / n) * lengthKm).toFixed(2).replace('.', decSep);
    const b = (((i + 1) / n) * lengthKm).toFixed(2).replace('.', decSep);
    return `${pct} · ≈ ${a}–${b} km`;
  };

  return (
    <div className="px-4 py-2 text-xs bg-sky-500/[0.06] border-t border-sky-500/20">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap"
          title={optimise
            ? 'Meilleur temps de chaque secteur sur TOUS les tours enregistrés (pas seulement les tours-record)'
            : 'Meilleur temps de chaque secteur parmi les tours-record chargés'}
        >
          🧮 Tour {optimise ? 'optimal' : 'théorique'}
        </span>
        <span className="font-mono font-bold text-neutral-800 dark:text-neutral-100">{formatTime(theo.totalMs)}</span>
        {gain > 0 && (
          <span className="font-mono text-emerald-500" title="Gain par rapport au meilleur temps réel de la config">
            −{(gain / 1000).toFixed(3).replace('.', decSep)}s vs meilleur réel
          </span>
        )}
        <span className="text-neutral-500">
          · meilleurs secteurs combinés{theo.count > 1 ? ` de ${theo.count} pilotes` : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {theo.sectors.map((s, i) => (
          <span
            key={i}
            title={`Secteur ${i + 1}/${n} · ${portionSecteur(i)}${theo.holders[i] ? ` — meilleur : ${theo.holders[i]}` : ''}`}
            className="font-mono px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-help"
          >
            S{i + 1} {formatTime(s)}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
        Les secteurs découpent le tour en {n} tronçons égaux en distance (ce ne sont pas les secteurs du jeu). Survole un secteur pour voir sa portion du tour.
      </p>
    </div>
  );
}

export function ReportModal({
  lap,
  onClose,
  onSuccess,
}: {
  lap: LapTime;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { formatTime } = usePreferences();
  const [raison, setRaison] = useState<Raison>(RAISONS[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        lap_time_id: lap.id,
        raison,
        details: details.trim() || null,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      onSuccess();
    } else {
      setError(json.error ?? 'Erreur lors du signalement.');
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-5">
        <div>
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mb-1">🚩 Signaler un temps suspect</h2>
          <p className="text-sm text-neutral-500">Ce signalement sera examiné par l&apos;équipe Better Rivals.</p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-1.5 text-sm">
          <p><span className="text-neutral-500">Pilote :</span> <span className="text-neutral-900 dark:text-white font-bold ml-1">{lap.players?.pseudo ?? '—'}</span></p>
          <p><span className="text-neutral-500">Voiture :</span> <span className="text-neutral-700 dark:text-neutral-300 ml-1">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</span></p>
          <p><span className="text-neutral-500">Circuit :</span> <span className="text-neutral-700 dark:text-neutral-300 ml-1">{lap.tracks?.name ?? '—'}</span></p>
          <p><span className="text-neutral-500">Temps :</span> <span className="font-mono font-bold text-pink-400 ml-1">{formatTime(lap.time_ms)}</span></p>
        </div>
        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Raison</label>
          <select
            value={raison}
            onChange={e => setRaison(e.target.value as Raison)}
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-pink-500 transition-colors"
          >
            {RAISONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
            Détails <span className="text-neutral-500 font-normal">(optionnel)</span>
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Précise ce qui te semble suspect..."
            rows={3}
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
          />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-bold rounded-lg hover:bg-red-500/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Envoi...' : '🚩 Signaler'}
          </button>
        </div>
      </div>
    </div>
  );
}
