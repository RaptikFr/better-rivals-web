"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/hooks/usePreferences';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import type { Drivetrain, CarClass } from '@/types/supabase';

// recharts (~100 KB gz) n'est chargé que lorsqu'un graphique est affiché
export const LapTimeChart = dynamic(() => import('./LapTimeChart'), {
  ssr: false,
  loading: () => <p className="text-neutral-500 animate-pulse text-sm py-8">Chargement du graphique…</p>,
});

export interface ProfileLap {
  id: string;
  time_ms: number;
  car_class: CarClass;
  car_pi: number;
  drivetrain: Drivetrain;
  car_ordinal: number;
  track_id: number;
  created_at: string;
  share_code: string | null;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
  tracks: { name: string; length_km: number | null } | null;
}

export interface Stats {
  totalLaps: number;
  totalCircuits: number;
  totalVoitures: number;
  classFavorite: string;
  drivetrainFavorite: string;
}

export interface HistoryEntry {
  id: string;
  time_ms: number;
  car_class: string;
  car_ordinal: number;
  drivetrain: string;
  car_pi: number | null;
  track_id: number;
  recorded_at: string;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
  tracks: { name: string } | null;
}

export interface FollowedPlayer {
  id: string;
  pseudo: string;
  discord_tag: string | null;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const CHART_COLORS = ['#e91e8c', '#7c3aed', '#22c55e', '#f59e0b', '#3b82f6'];

export function ProgressionChart({ laps, trackName }: { laps: ProfileLap[]; trackName: string }) {
  const trackLaps = laps.filter(l => l.tracks?.name === trackName);

  const byConfig = new Map<string, ProfileLap[]>();
  for (const lap of trackLaps) {
    const car = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
    const key = `${car} — ${lap.car_class} / ${lap.drivetrain}`;
    if (!byConfig.has(key)) byConfig.set(key, []);
    byConfig.get(key)!.push(lap);
  }
  for (const arr of byConfig.values()) {
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // Timestamps uniques triés (axe X numérique)
  const allTs = [...new Set(trackLaps.map(l => new Date(l.created_at).getTime()))].sort((a, b) => a - b);

  const data = allTs.map(ts => {
    const d = new Date(ts);
    const row: Record<string, number | string> = {
      ts,
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      full:  d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    for (const [key, arr] of byConfig) {
      const lap = arr.find(l => new Date(l.created_at).getTime() === ts);
      if (lap) row[key] = lap.time_ms;
    }
    return row;
  });

  const totalPoints = data.reduce(
    (sum, row) => sum + [...byConfig.keys()].filter(k => row[k] !== undefined).length,
    0
  );
  if (totalPoints < 2) return null;

  const configKeys = [...byConfig.keys()];

  return (
    <div className="mb-5 p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
        Progression — {trackName}
      </p>
      <LapTimeChart
        data={data}
        series={configKeys.map(key => ({ key, name: key }))}
        colors={CHART_COLORS}
        yTickFormatter={ms => {
          const m = Math.floor(ms / 60000);
          const s = Math.floor((ms % 60000) / 1000);
          return `${m}:${String(s).padStart(2, '0')}`;
        }}
      />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
      <p className="text-neutral-500">{message}</p>
    </div>
  );
}

function ShareCodeCell({ lapId, initialCode }: { lapId: string; initialCode: string | null }) {
  const [code, setCode] = useState(initialCode ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(value: string) {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    await fetch(`/api/times/${lapId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ share_code: value.trim() }),
    });
    setCode(value.trim());
    setSaving(false);
    setEditing(false);
  }

  if (saving) return <span className="text-neutral-400 text-xs animate-pulse font-mono">...</span>;

  if (editing) {
    return (
      <input
        autoFocus
        value={code}
        onChange={e => setCode(e.target.value)}
        onBlur={() => save(code)}
        onKeyDown={e => {
          if (e.key === 'Enter') save(code);
          if (e.key === 'Escape') setEditing(false);
        }}
        placeholder="Code de réglage"
        className="w-28 bg-white dark:bg-neutral-950 border border-pink-500 rounded px-2 py-0.5 text-xs font-mono focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title={code ? 'Modifier le code de réglage' : 'Ajouter un code de réglage'}
      className={`font-mono text-sm transition-colors ${code ? 'text-violet-400 hover:text-violet-300' : 'text-neutral-400 hover:text-neutral-300 text-xs'}`}
    >
      {code || '+ code'}
    </button>
  );
}

export function LapTable({ laps, showDate, hideCircuit, isEditable }: { laps: ProfileLap[]; showDate?: boolean; hideCircuit?: boolean; isEditable?: boolean }) {
  const { formatTime } = usePreferences();
  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-sm">
      {/* En-tête de colonnes (≥ sm) */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
        {showDate && <span className="w-36">DATE</span>}
        <span className="w-24">TEMPS</span>
        {isEditable && <span className="w-24">RÉGLAGE</span>}
        <span className="flex-1">VOITURE</span>
        <span className="w-32">CLASSE / PI</span>
        <span className="w-28">TRANSMISSION</span>
        {!hideCircuit && <span className="flex-1">CIRCUIT</span>}
      </div>
      {laps.map((lap, i) => (
        <div
          key={lap.id ?? i}
          className="flex flex-col gap-2 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors
                     sm:flex-row sm:items-center sm:gap-3"
        >
          <div className="flex items-center justify-between gap-3 sm:contents">
            {showDate && <span className="text-xs text-neutral-500 order-2 sm:order-none sm:w-36">{formatDate(lap.created_at)}</span>}
            <span className="font-mono font-bold text-pink-400 text-lg order-1 sm:order-none sm:text-base sm:w-24">{formatTime(lap.time_ms)}</span>
          </div>
          {isEditable && (
            <span className="sm:w-24">
              <span className="sm:hidden text-xs text-neutral-500 mr-2">Réglage :</span>
              <ShareCodeCell lapId={lap.id} initialCode={lap.share_code ?? null} />
            </span>
          )}
          <span className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</span>
          <span className="sm:w-32 flex items-center gap-2">
            <span className="px-2 py-1 rounded text-xs font-bold" style={CLASS_STYLES[lap.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>
              {lap.car_class}
            </span>
            <span className="text-sm text-neutral-500 font-mono">PI {lap.car_pi}</span>
          </span>
          <span className="sm:w-28"><DrivetrainBadge drivetrain={lap.drivetrain} /></span>
          {!hideCircuit && (
            <span className="text-neutral-600 dark:text-neutral-400 sm:flex-1 sm:truncate">
              {lap.tracks?.name ?? '—'}{lap.tracks?.length_km ? ` (${lap.tracks.length_km} km)` : ''}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
