"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/hooks/usePreferences';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { loadPlayerRankings, rivalsFor, type PlayerRankings } from '@/lib/playerRankings';
import { computeBadges } from '@/lib/badges';
import { BadgesBar } from '@/components/BadgesBar';
import { RivalsCell } from '@/components/RivalsCell';
import { FollowButton } from '@/components/FollowButton';
import { TargetButton } from '@/components/TargetButton';
import { ChallengeButton } from '@/components/ChallengeButton';
import { objectifConfigKey } from '@/lib/objectifs';
import { usePlayer } from '@/hooks/usePlayer';
import { suggestDuels, type OwnLap } from '@/lib/garage';
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
  const { formatTime } = usePreferences();
  const { player: me } = usePlayer();
  const [laps,         setLaps]         = useState<Lap[]>([]);
  const [playerId,     setPlayerId]     = useState<string | null>(null);
  const [rankings,     setRankings]     = useState<PlayerRankings | null>(null);
  const [podiums,      setPodiums]      = useState({ gold: 0, silver: 0, bronze: 0 });
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [openCircuits, setOpenCircuits] = useState<Set<number>>(new Set());
  // Configs sur lesquelles j'ai déjà un objectif visant ce joueur (état initial
  // des boutons « 🎯 »). Vide si je ne suis pas connecté.
  const [myObjectifKeys, setMyObjectifKeys] = useState<Set<string>>(new Set());
  // Suggestions de défi : mes temps sur des modèles que CE joueur déclare
  // posséder (garage), même s'il n'a jamais roulé la config exacte.
  const [theirGarage,   setTheirGarage]   = useState<{ car_ordinal: number; cars: { manufacturer: string | null; name: string; year: number | null } | null }[]>([]);
  const [myMatchingLaps, setMyMatchingLaps] = useState<Lap[]>([]);

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
      // Le joueur consulté et la session du visiteur sont indépendants : on
      // les résout en parallèle plutôt qu'en cascade.
      const [{ data: player, error: playerError }, { data: { session } }] = await Promise.all([
        supabase.from('players').select('id, pseudo').eq('pseudo', pseudo).single(),
        supabase.auth.getSession(),
      ]);

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

      // Rang, total et rivaux par config — calculés côté serveur (RPC)
      const ranks = await loadPlayerRankings(player.id, lapsData);
      setRankings(ranks);
      setPodiums(ranks.podiums);

      // Mes objectifs visant CE joueur → état initial des boutons « 🎯 »
      // (uniquement si connecté ; sinon les boutons restent masqués).
      try {
        if (session?.access_token) {
          const res = await fetch('/api/objectifs', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const { objectifs } = await res.json() as { objectifs: { target_pseudo: string; track_id: number; car_ordinal: number; car_class: string; drivetrain: string }[] };
            setMyObjectifKeys(new Set(
              objectifs.filter(o => o.target_pseudo === pseudo).map(o => objectifConfigKey(o)),
            ));
          }
        }
      } catch { /* les objectifs restent optionnels */ }

      setLoading(false);
    }
    load();
  }, [pseudo]);

  // Voitures en commun : le garage de CE joueur × mes propres temps sur ces
  // modèles. Ignoré si je ne suis pas connecté ou si je consulte mon propre
  // profil (même garde que ChallengeButton/TargetButton).
  useEffect(() => {
    if (!me || !playerId || me.id === playerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset volontaire des suggestions au changement de joueur/session (même pattern que hooks/usePlayer.ts)
      setTheirGarage([]);
      setMyMatchingLaps([]);
      return;
    }
    let cancelled = false;
    (async () => {
      // Pas de FK garage.car_ordinal → cars (même choix que duels.car_ordinal),
      // donc pas d'embed PostgREST possible : deux requêtes séparées.
      const { data: garageRows } = await supabase
        .from('garage')
        .select('car_ordinal')
        .eq('player_id', playerId);
      const ordinals = (garageRows ?? []).map(r => r.car_ordinal);
      if (cancelled) return;
      if (ordinals.length === 0) { setTheirGarage([]); setMyMatchingLaps([]); return; }

      const { data: carsRows } = await supabase
        .from('cars')
        .select('car_ordinal, manufacturer, name, year')
        .in('car_ordinal', ordinals);
      if (cancelled) return;
      const carByOrdinal = new Map((carsRows ?? []).map(c => [c.car_ordinal, c]));
      const garage = ordinals.map(car_ordinal => ({ car_ordinal, cars: carByOrdinal.get(car_ordinal) ?? null }));
      setTheirGarage(garage);

      const { data: myLaps } = await supabase
        .from('lap_times')
        .select('time_ms, car_class, car_pi, drivetrain, car_ordinal, track_id, created_at, cars(manufacturer, name, year), tracks(name, length_km)')
        .eq('player_id', me.id)
        .in('car_ordinal', garage.map(g => g.car_ordinal));
      if (!cancelled) setMyMatchingLaps((myLaps ?? []) as Lap[]);
    })();
    return () => { cancelled = true; };
  }, [me, playerId]);

  const commonCarSuggestions = useMemo(
    () => (playerId ? suggestDuels(myMatchingLaps as OwnLap[], playerId, new Set(theirGarage.map(g => g.car_ordinal))) : []),
    [myMatchingLaps, theirGarage, playerId],
  );
  const commonCarLabel = useMemo(() => {
    const byOrdinal = new Map(theirGarage.map(g => [g.car_ordinal, g.cars]));
    return (carOrdinal: number) => {
      const c = byOrdinal.get(carOrdinal);
      return c ? `${c.year ?? ''} ${c.manufacturer ?? ''} ${c.name ?? ''}`.trim() : `Voiture #${carOrdinal}`;
    };
  }, [theirGarage]);
  const commonTrackLabel = useMemo(() => {
    const byTrackId = new Map(myMatchingLaps.map(l => [l.track_id, l.tracks?.name]));
    return (trackId: number) => byTrackId.get(trackId) ?? `Circuit #${trackId}`;
  }, [myMatchingLaps]);

  const badges = useMemo(
    () => computeBadges({ laps, ranked: rankings?.ranked ?? [] }),
    [laps, rankings]
  );

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
            <BadgesBar badges={badges} />
          </div>
          {playerId && (
            <div className="self-start flex-shrink-0 flex flex-col items-end gap-2">
              <FollowButton followedPlayerId={playerId} />
              <Link
                href={`/comparaison?j1=${encodeURIComponent(pseudo)}`}
                className="text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors"
              >
                ⚔️ Comparer
              </Link>
            </div>
          )}
        </div>

        {/* Voitures en commun — suggestions de défi via le garage déclaré */}
        {commonCarSuggestions.length > 0 && (
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-8">
            <h2 className="font-bold text-neutral-900 dark:text-white mb-1">
              🚗 Voitures en commun — {commonCarSuggestions.length} défi{commonCarSuggestions.length > 1 ? 's' : ''} possible{commonCarSuggestions.length > 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-neutral-500 mb-4">
              {pseudo} déclare posséder ces modèles — tu as déjà un temps dessus, tu peux le défier directement.
            </p>
            <div className="space-y-2">
              {commonCarSuggestions.map(s => (
                <div key={`${s.trackId}-${s.carOrdinal}-${s.carClass}-${s.drivetrain}`} className="flex items-center justify-between gap-3 text-sm bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2.5">
                  <span className="text-neutral-700 dark:text-neutral-300 truncate">
                    {commonTrackLabel(s.trackId)} — {commonCarLabel(s.carOrdinal)} ({s.carClass}/{s.drivetrain})
                  </span>
                  <ChallengeButton compact config={s} />
                </div>
              ))}
            </div>
          </div>
        )}

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
                          <span className="sm:w-56"><RivalsCell rivals={rivalsFor(rankings?.rivalsByConfig ?? new Map(), lap)} /></span>
                          {playerId && (
                            <span className="sm:ml-auto flex items-center gap-2">
                              <TargetButton
                                compact
                                config={{
                                  targetPlayerId: playerId,
                                  trackId:        lap.track_id,
                                  carOrdinal:     lap.car_ordinal,
                                  carClass:       lap.car_class,
                                  drivetrain:     lap.drivetrain,
                                }}
                                initialActive={myObjectifKeys.has(objectifConfigKey({
                                  track_id:    lap.track_id,
                                  car_ordinal: lap.car_ordinal,
                                  car_class:   lap.car_class,
                                  drivetrain:  lap.drivetrain,
                                }))}
                              />
                              <ChallengeButton
                                compact
                                config={{
                                  targetPlayerId: playerId,
                                  trackId:        lap.track_id,
                                  carOrdinal:     lap.car_ordinal,
                                  carClass:       lap.car_class,
                                  drivetrain:     lap.drivetrain,
                                }}
                              />
                            </span>
                          )}
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
