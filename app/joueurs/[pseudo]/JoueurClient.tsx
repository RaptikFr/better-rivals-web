"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { formatTime } from '@/components/formatTime';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { countPodiums } from '@/lib/podiums';
import { buildRivalIndex, findRivals, type RivalRow } from '@/lib/rivals';
import { RivalsCell } from '@/components/RivalsCell';
import { FollowButton } from '@/components/FollowButton';
import type { Drivetrain } from '@/types/supabase';

interface Lap {
  time_ms:     number;
  car_class:   string;
  car_pi:      number;
  drivetrain:  string;
  car_ordinal: number;
  track_id:    number;
  created_at:  string;
  cars:   { manufacturer: string; name: string; year: number } | null;
  tracks: { name: string; length_km: number | null } | null;
}

interface Circuit {
  trackId:      number;
  trackName:    string;
  trackLengthKm: number | null;
  laps:         Lap[];
}

export default function JoueurClient({ pseudo }: { pseudo: string }) {
  const [laps,         setLaps]         = useState<Lap[]>([]);
  const [playerId,     setPlayerId]     = useState<string | null>(null);
  const [allLaps,      setAllLaps]      = useState<RivalRow[]>([]);
  const [podiums,      setPodiums]      = useState({ gold: 0, silver: 0, bronze: 0 });
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [openCircuits, setOpenCircuits] = useState<Set<number>>(new Set());

  function toggleCircuit(trackId: number) {
    setOpenCircuits(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  useEffect(() => {
    async function load() {
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('id, pseudo')
        .eq('pseudo', pseudo)
        .single();

      if (playerError || !player) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: playerLaps } = await supabase
        .from('lap_times')
        .select('time_ms, car_class, car_pi, drivetrain, car_ordinal, track_id, created_at, cars(manufacturer, name, year), tracks(name, length_km)')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false });

      const lapsData = (playerLaps ?? []) as Lap[];
      setLaps(lapsData);
      setPlayerId(player.id);

      // Podiums + rivaux : compare avec tous les temps (paginés) sur les mêmes circuits
      const trackIds = [...new Set(lapsData.map(l => l.track_id))].filter(Boolean);
      if (trackIds.length > 0) {
        const { data: allLapsData } = await fetchAllRows<RivalRow>((from, to) =>
          supabase
            .from('lap_times')
            .select('time_ms, car_ordinal, car_class, drivetrain, track_id, player_id, players(pseudo)')
            .in('track_id', trackIds)
            .order('id')
            .range(from, to)
        );

        setAllLaps(allLapsData);
        setPodiums(countPodiums(lapsData, allLapsData));
      }

      setLoading(false);
    }
    load();
  }, [pseudo]);

  const rivalIndex = useMemo(() => buildRivalIndex(allLaps), [allLaps]);

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement...</p>
    </main>
  );

  if (notFound) return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <p className="text-5xl">👤</p>
        <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white">Joueur introuvable</h1>
        <p className="text-neutral-500">Le joueur « {pseudo} » n&apos;existe pas sur Better Rivals.</p>
        <Link
          href="/classements"
          className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity"
        >
          Voir les classements
        </Link>
      </div>
    </main>
  );

  const totalCircuits = new Set(laps.map(l => l.track_id)).size;
  const totalCars     = new Set(laps.map(l => l.car_ordinal)).size;
  const initial       = pseudo.charAt(0).toUpperCase();

  // Groupement par circuit, trié par nom
  const byTrack = new Map<number, Lap[]>();
  for (const lap of laps) {
    if (!byTrack.has(lap.track_id)) byTrack.set(lap.track_id, []);
    byTrack.get(lap.track_id)!.push(lap);
  }
  const circuits: Circuit[] = [...byTrack.entries()]
    .map(([trackId, trackLaps]) => ({
      trackId,
      trackName:     trackLaps[0].tracks?.name       ?? 'Circuit inconnu',
      trackLengthKm: trackLaps[0].tracks?.length_km  ?? null,
      laps:          [...trackLaps].sort((a, b) => a.time_ms - b.time_ms),
    }))
    .sort((a, b) => a.trackName.localeCompare(b.trackName));

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto">

        {/* En-tête */}
        <div className="flex items-center gap-6 mb-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-3xl font-extrabold text-white flex-shrink-0 select-none">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-1 truncate">
              {pseudo}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-neutral-500 mb-2">
              <span>{laps.length} chrono{laps.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{totalCircuits} circuit{totalCircuits !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{totalCars} voiture{totalCars !== 1 ? 's' : ''}</span>
            </div>
            {(podiums.gold > 0 || podiums.silver > 0 || podiums.bronze > 0) && (
              <div className="flex gap-3">
                {podiums.gold   > 0 && <span className="text-sm font-bold">🥇 {podiums.gold}</span>}
                {podiums.silver > 0 && <span className="text-sm font-bold">🥈 {podiums.silver}</span>}
                {podiums.bronze > 0 && <span className="text-sm font-bold">🥉 {podiums.bronze}</span>}
              </div>
            )}
          </div>
          {playerId && (
            <div className="self-start flex-shrink-0">
              <FollowButton followedPlayerId={playerId} />
            </div>
          )}
        </div>

        {/* Tableau des temps */}
        {laps.length === 0 ? (
          <p className="text-neutral-500 text-center py-16">Aucun chrono enregistré pour ce joueur.</p>
        ) : (
          <div className="space-y-4">
            {circuits.map(circuit => (
              <div
                key={circuit.trackId}
                className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden"
              >
                {/* En-tête circuit cliquable */}
                <button
                  onClick={() => toggleCircuit(circuit.trackId)}
                  className="w-full px-5 py-3 bg-neutral-200/60 dark:bg-neutral-950 flex items-center gap-3 hover:bg-neutral-300/50 dark:hover:bg-neutral-800/60 transition-colors text-left"
                >
                  <h2 className="font-extrabold text-neutral-900 dark:text-white">{circuit.trackName}</h2>
                  {circuit.trackLengthKm && (
                    <span className="text-sm text-neutral-500">· {circuit.trackLengthKm} km</span>
                  )}
                  <span className="ml-auto text-xs text-neutral-500 font-mono mr-1">
                    {circuit.laps.length} config{circuit.laps.length > 1 ? 's' : ''}
                  </span>
                  <svg
                    className={`w-4 h-4 flex-shrink-0 text-neutral-400 transition-transform ${openCircuits.has(circuit.trackId) ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Lignes — visibles si ouvert. Cartes empilées sur mobile,
                    colonnes alignées dès sm (sm:contents). */}
                {openCircuits.has(circuit.trackId) && (
                <div className="border-t border-neutral-200 dark:border-neutral-800 text-sm">
                  {circuit.laps.map((lap, i) => {
                    const carLabel = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim() || '—';
                    return (
                      <div
                        key={i}
                        className="flex flex-col gap-2 p-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0
                                   sm:flex-row sm:items-center sm:gap-3 sm:py-3 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:contents">
                          <span className="font-bold text-neutral-500 tabular-nums sm:w-8 sm:text-right">{i + 1}</span>
                          <span className="font-mono font-bold text-pink-400 text-base sm:w-28">{formatTime(lap.time_ms)}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold sm:w-14 sm:text-center"
                            style={CLASS_STYLES[lap.car_class] ?? { backgroundColor: '#555', color: '#fff' }}
                          >
                            {lap.car_class}
                          </span>
                          <span className="sm:w-20"><DrivetrainBadge drivetrain={lap.drivetrain as Drivetrain} /></span>
                        </div>
                        <div className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{carLabel}</div>
                        <div className="flex items-center justify-between gap-3 sm:contents">
                          <span className="text-neutral-500 font-mono text-xs sm:w-16">PI {lap.car_pi}</span>
                          <span className="sm:w-56"><RivalsCell rivals={findRivals(playerId ?? '', lap, rivalIndex)} /></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
