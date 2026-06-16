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
  previous_time_ms: number | null;
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
