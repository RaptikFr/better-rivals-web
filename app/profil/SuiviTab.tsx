"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/hooks/usePreferences';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import type { Drivetrain } from '@/types/supabase';
import { LapTimeChart, EmptyState, formatDate, type ProfileLap, type HistoryEntry } from './profilShared';

const SUIVI_COLORS = ['#e91e8c', '#7c3aed', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4'];

export function SuiviTab({ playerId, laps }: { playerId: string; laps: ProfileLap[] }) {
  const { formatTime } = usePreferences();
  const [history,      setHistory]      = useState<HistoryEntry[]>([]);
  const [currentBests, setCurrentBests] = useState<Map<string, number>>(new Map());
  const [loadedAt,     setLoadedAt]     = useState<number | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [chartTrack,   setChartTrack]   = useState('');
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('Tous');
  const [showTrackDrop, setShowTrackDrop] = useState(false);
  const [carSearch,   setCarSearch]   = useState('');
  const [selectedCar, setSelectedCar] = useState('Toutes');
  const [showCarDrop, setShowCarDrop] = useState(false);

  const chartTracks = useMemo(() =>
    Array.from(new Set(history.map(h => h.tracks?.name ?? ''))).filter(Boolean).sort(),
    [history]
  );

  const chartData = useMemo(() => {
    if (!chartTrack || loadedAt === null) return null;

    const now = loadedAt;
    const trackHistory = history
      .filter(h => h.tracks?.name === chartTrack)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    if (trackHistory.length === 0) return null;

    const byConfig = new Map<string, { label: string; trackId: number; carOrdinal: number; carClass: string; drivetrain: string; points: { ts: number; ms: number }[] }>();
    for (const h of trackHistory) {
      const key = `${h.car_ordinal}_${h.car_class}_${h.drivetrain}`;
      if (!byConfig.has(key)) {
        const label = `${h.cars?.year ?? ''} ${h.cars?.manufacturer ?? ''} ${h.cars?.name ?? ''} — ${h.car_class}/${h.drivetrain}`.trim();
        byConfig.set(key, { label, trackId: h.track_id, carOrdinal: h.car_ordinal, carClass: h.car_class, drivetrain: h.drivetrain, points: [] });
      }
      byConfig.get(key)!.points.push({ ts: new Date(h.recorded_at).getTime(), ms: h.time_ms });
    }

    for (const [, config] of byConfig) {
      const bestKey = `${config.trackId}-${config.carOrdinal}-${config.carClass}-${config.drivetrain}`;
      const currentBest = currentBests.get(bestKey);
      if (currentBest !== undefined) {
        config.points.push({ ts: now, ms: currentBest });
      }
    }

    const allTs = new Set<number>();
    for (const { points } of byConfig.values()) {
      for (const { ts } of points) allTs.add(ts);
    }
    const sortedTs = [...allTs].sort((a, b) => a - b);

    const data = sortedTs.map(ts => {
      const isNow = ts === now;
      const d = new Date(ts);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mn = String(d.getMinutes()).padStart(2, '0');
      const row: Record<string, unknown> = {
        ts,
        label: isNow ? 'Actuel' : `${dd}/${mm} ${hh}:${mn}`,
        full: isNow ? 'Record actuel' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      };
      for (const [key, { points }] of byConfig) {
        const point = points.find(p => p.ts === ts);
        if (point) row[key] = point.ms;
      }
      return row;
    });

    const configKeys = [...byConfig.keys()];
    const totalPoints = data.reduce((sum, row) => sum + configKeys.filter(k => row[k] !== undefined).length, 0);

    return { data, byConfig, configKeys, totalPoints };
  }, [history, currentBests, chartTrack, loadedAt]);

  useEffect(() => {
    Promise.all([
      supabase
        .from('lap_times_history')
        .select('id, time_ms, car_class, car_ordinal, drivetrain, car_pi, track_id, recorded_at, cars(manufacturer, name, year), tracks(name)')
        .eq('player_id', playerId)
        .order('recorded_at', { ascending: false }),
      supabase
        .from('lap_times')
        .select('track_id, car_ordinal, car_class, drivetrain, time_ms')
        .eq('player_id', playerId),
    ]).then(([histRes, bestRes]) => {
      setHistory((histRes.data ?? []) as unknown as HistoryEntry[]);
      const bestMap = new Map<string, number>();
      for (const b of (bestRes.data ?? [])) {
        bestMap.set(`${b.track_id}-${b.car_ordinal}-${b.car_class}-${b.drivetrain}`, b.time_ms);
      }
      setCurrentBests(bestMap);
      setLoadedAt(Date.now());
      setLoading(false);
    });
  }, [playerId]);

  const uniqueTracks = useMemo(() =>
    Array.from(new Set(history.map(h => h.tracks?.name ?? ''))).filter(Boolean).sort(),
    [history]
  );
  const uniqueCars = useMemo(() =>
    Array.from(new Set(history.map(h => `${h.cars?.year ?? ''} ${h.cars?.manufacturer ?? ''} ${h.cars?.name ?? ''}`.trim()))).filter(Boolean).sort(),
    [history]
  );
  const filteredTracks = useMemo(() =>
    uniqueTracks.filter(t => t.toLowerCase().includes(trackSearch.toLowerCase())),
    [uniqueTracks, trackSearch]
  );
  const filteredCars = useMemo(() =>
    uniqueCars.filter(c => c.toLowerCase().includes(carSearch.toLowerCase())),
    [uniqueCars, carSearch]
  );
  const filtered = useMemo(() =>
    history.filter(h => {
      const matchTrack = selectedTrack === 'Tous' || h.tracks?.name === selectedTrack;
      const carLabel   = `${h.cars?.year ?? ''} ${h.cars?.manufacturer ?? ''} ${h.cars?.name ?? ''}`.trim();
      const matchCar   = selectedCar === 'Toutes' || carLabel === selectedCar;
      return matchTrack && matchCar;
    }),
    [history, selectedTrack, selectedCar]
  );

  const filteredCurrentBests = useMemo(() =>
    laps.filter(lap => {
      const matchTrack = selectedTrack === 'Tous' || lap.tracks?.name === selectedTrack;
      const carLabel   = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
      const matchCar   = selectedCar === 'Toutes' || carLabel === selectedCar;
      if (!matchTrack || !matchCar) return false;
      const key = `${lap.track_id}-${lap.car_ordinal}-${lap.car_class}-${lap.drivetrain}`;
      return history.some(h => `${h.track_id}-${h.car_ordinal}-${h.car_class}-${h.drivetrain}` === key);
    }),
    [laps, selectedTrack, selectedCar, history]
  );

  const filteredWithDiffs = useMemo(() => {
    const groups = new Map<string, HistoryEntry[]>();
    for (const h of filtered) {
      const key = `${h.track_id}-${h.car_ordinal}-${h.car_class}-${h.drivetrain}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h);
    }
    for (const entries of groups.values()) {
      entries.sort((a, b) => b.time_ms - a.time_ms); // pire en premier
    }
    return filtered.map(h => {
      const key      = `${h.track_id}-${h.car_ordinal}-${h.car_class}-${h.drivetrain}`;
      const group    = groups.get(key)!;
      const idx      = group.findIndex(e => e.id === h.id);
      const next     = idx < group.length - 1 ? group[idx + 1] : null;
      const best     = currentBests.get(key) ?? null;
      return {
        ...h,
        diffVsBest: best !== null ? h.time_ms - best : null,
        diffVsNext: next ? h.time_ms - next.time_ms : null,
      };
    });
  }, [filtered, currentBests]);

  if (loading) return <p className="text-neutral-500 animate-pulse p-4">Chargement de l&apos;historique...</p>;
  if (history.length === 0) return <EmptyState message="Aucun historique disponible — il se remplit à chaque fois que tu bats ton propre record." />;

  return (
    <div className="space-y-4">

      {/* ── GRAPHIQUE DE PROGRESSION ── */}
      <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Progression sur circuit</p>
        <select
          value={chartTrack}
          onChange={e => setChartTrack(e.target.value)}
          className="w-full md:w-72 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
        >
          <option value="">Sélectionne un circuit</option>
          {chartTracks.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {chartTrack && (
          chartData && chartData.totalPoints >= 2 ? (
            <LapTimeChart
              data={chartData.data}
              series={chartData.configKeys.map(key => ({ key, name: chartData.byConfig.get(key)!.label }))}
              colors={SUIVI_COLORS}
              yTickFormatter={ms => {
                const min = Math.floor(ms / 60000);
                const sec = Math.floor((ms % 60000) / 1000);
                const msRem = Math.floor(ms % 1000);
                return `${min}:${String(sec).padStart(2, '0')}.${String(msRem).padStart(3, '0').slice(0, 2)}`;
              }}
            />
          ) : (
            <p className="text-sm text-neutral-500 py-4">
              Bats ton record au moins une fois sur ce circuit pour voir ta progression.
            </p>
          )
        )}
      </div>

      {/* ── HISTORIQUE ── */}
      <div className="flex flex-col md:flex-row gap-3 p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <div className="flex flex-col relative flex-1">
          <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Circuit :</label>
          <div className="relative">
            <input type="text"
              value={selectedTrack !== 'Tous' ? selectedTrack : trackSearch}
              onChange={e => { setTrackSearch(e.target.value); setSelectedTrack('Tous'); setShowTrackDrop(true); }}
              onFocus={() => setShowTrackDrop(true)}
              onBlur={() => setTimeout(() => setShowTrackDrop(false), 150)}
              placeholder="Tous les circuits"
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
            />
            {selectedTrack !== 'Tous' && (
              <button onClick={() => { setSelectedTrack('Tous'); setTrackSearch(''); }} aria-label="Effacer le filtre circuit" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
            )}
          </div>
          {showTrackDrop && filteredTracks.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {filteredTracks.map(t => (
                <button key={t} onMouseDown={() => { setSelectedTrack(t); setTrackSearch(''); setShowTrackDrop(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedTrack === t ? 'bg-pink-500/20 text-pink-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col relative flex-1">
          <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Voiture :</label>
          <div className="relative">
            <input type="text"
              value={selectedCar !== 'Toutes' ? selectedCar : carSearch}
              onChange={e => { setCarSearch(e.target.value); setSelectedCar('Toutes'); setShowCarDrop(true); }}
              onFocus={() => setShowCarDrop(true)}
              onBlur={() => setTimeout(() => setShowCarDrop(false), 150)}
              placeholder="Toutes les voitures"
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
            />
            {selectedCar !== 'Toutes' && (
              <button onClick={() => { setSelectedCar('Toutes'); setCarSearch(''); }} aria-label="Effacer le filtre voiture" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
            )}
          </div>
          {showCarDrop && filteredCars.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {filteredCars.map(c => (
                <button key={c} onMouseDown={() => { setSelectedCar(c); setCarSearch(''); setShowCarDrop(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedCar === c ? 'bg-pink-500/20 text-pink-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-neutral-500">{filtered.length + filteredCurrentBests.length} entrée{(filtered.length + filteredCurrentBests.length) !== 1 ? 's' : ''} dans l&apos;historique</p>

      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-sm">
        {/* En-tête de colonnes (≥ sm) */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
          <span className="w-36">DATE</span>
          <span className="w-56">TEMPS</span>
          <span className="flex-1">VOITURE</span>
          <span className="w-32">CLASSE / PI</span>
          <span className="w-28">TRANSMISSION</span>
          <span className="flex-1">CIRCUIT</span>
        </div>
        {filteredCurrentBests.map(lap => (
          <div key={`best-${lap.id}`} className="flex flex-col gap-2 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors bg-green-950/10 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs text-neutral-500 sm:w-36">{formatDate(lap.created_at)}</span>
            <span className="font-mono sm:w-56">
              <span className="font-bold text-green-400">{formatTime(lap.time_ms)}</span>
              <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">Record actuel</span>
            </span>
            <span className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</span>
            <span className="sm:w-32 flex items-center gap-2">
              <span className="px-2 py-1 rounded text-xs font-bold" style={CLASS_STYLES[lap.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>{lap.car_class}</span>
              <span className="text-sm text-neutral-500 font-mono">PI {lap.car_pi ?? '—'}</span>
            </span>
            <span className="sm:w-28"><DrivetrainBadge drivetrain={lap.drivetrain} /></span>
            <span className="text-neutral-600 dark:text-neutral-400 sm:flex-1 sm:truncate">{lap.tracks?.name ?? '—'}</span>
          </div>
        ))}
        {filteredWithDiffs.map(h => (
          <div key={h.id} className="flex flex-col gap-2 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs text-neutral-500 sm:w-36">{formatDate(h.recorded_at)}</span>
            <span className="font-mono sm:w-56">
              <span className="font-bold text-neutral-400 dark:text-neutral-500">{formatTime(h.time_ms)}</span>
              {h.diffVsBest !== null && (
                <span className="ml-2 text-xs text-orange-400" title="Écart avec ton record actuel">
                  +{(h.diffVsBest / 1000).toFixed(3).replace('.', ',')}s
                  {h.diffVsNext !== null && (
                    <span className="text-neutral-500 ml-1" title="Gain par rapport à l'ancien record précédent">(+{(h.diffVsNext / 1000).toFixed(3).replace('.', ',')}s)</span>
                  )}
                </span>
              )}
            </span>
            <span className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{h.cars?.year} {h.cars?.manufacturer} {h.cars?.name}</span>
            <span className="sm:w-32 flex items-center gap-2">
              <span className="px-2 py-1 rounded text-xs font-bold" style={CLASS_STYLES[h.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>{h.car_class}</span>
              <span className="text-sm text-neutral-500 font-mono">PI {h.car_pi ?? '—'}</span>
            </span>
            <span className="sm:w-28"><DrivetrainBadge drivetrain={h.drivetrain as Drivetrain} /></span>
            <span className="text-neutral-600 dark:text-neutral-400 sm:flex-1 sm:truncate">{h.tracks?.name ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
