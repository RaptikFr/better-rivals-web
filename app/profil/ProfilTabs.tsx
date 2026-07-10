"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/hooks/usePreferences';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { RivalsCell } from '@/components/RivalsCell';
import type { ConfigRivals } from '@/lib/rivals';
import { rivalsFor } from '@/lib/playerRankings';
import { EmptyState, type ProfileLap, type Stats, type FollowedPlayer } from './profilShared';
import { RegulariteSection } from './RegulariteSection';

export function ClassementsTab({ laps, rivalsByConfig }: { laps: ProfileLap[]; rivalsByConfig: Map<string, ConfigRivals> }) {
  const { formatTime } = usePreferences();
  // Rang, total et rivaux directs issus du calcul serveur (RPC) — aucune
  // requête supplémentaire.
  const rankings = useMemo(() =>
    laps
      .filter(lap => lap.tracks?.name)
      .map(lap => ({ lap, rivals: rivalsFor(rivalsByConfig, lap) }))
      .sort((a, b) => a.rivals.rank - b.rivals.rank),
    [laps, rivalsByConfig]
  );

  if (rankings.length === 0) return <EmptyState message="Aucun classement disponible pour l'instant." />;

  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-sm">
      {/* En-tête de colonnes (≥ sm) */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
        <span className="w-24">POSITION</span>
        <span className="flex-1">CIRCUIT</span>
        <span className="flex-1">VOITURE</span>
        <span className="w-28">TRANSMISSION</span>
        <span className="w-28">TEMPS</span>
        <span className="w-56">RIVAUX</span>
      </div>
      {rankings.map(({ lap, rivals }, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors
                     sm:flex-row sm:items-center sm:gap-3"
        >
          <div className="flex items-center justify-between gap-3 sm:contents">
            <span className="sm:w-24 flex-shrink-0">
              <span className={`text-lg font-extrabold ${rivals.rank === 1 ? 'text-yellow-400' : rivals.rank === 2 ? 'text-neutral-400 dark:text-neutral-300' : rivals.rank === 3 ? 'text-amber-600' : 'text-neutral-500'}`}>
                {rivals.rank === 1 ? '🥇' : rivals.rank === 2 ? '🥈' : rivals.rank === 3 ? '🥉' : `#${rivals.rank}`}
              </span>
              <span className="text-xs text-neutral-400 dark:text-neutral-600 ml-2">/ {rivals.total}</span>
            </span>
            <span className="font-mono font-bold text-pink-400 sm:hidden">{formatTime(lap.time_ms)}</span>
          </div>
          <span className="text-neutral-700 dark:text-neutral-300 font-semibold sm:flex-1 sm:truncate">{lap.tracks?.name ?? '—'}</span>
          <span className="text-neutral-600 dark:text-neutral-400 sm:flex-1 sm:truncate">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</span>
          <span className="sm:w-28"><DrivetrainBadge drivetrain={lap.drivetrain} /></span>
          <span className="hidden sm:block font-mono font-bold text-pink-400 sm:w-28">{formatTime(lap.time_ms)}</span>
          <span className="sm:w-56"><RivalsCell rivals={rivals} /></span>
        </div>
      ))}
    </div>
  );
}

export function RivauxTab({ playerId }: { playerId: string }) {
  const [followed, setFollowed] = useState<FollowedPlayer[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('follows')
        .select('followed_player_id, created_at')
        .eq('follower_player_id', playerId)
        .order('created_at', { ascending: false });
      const ids = (rows ?? []).map(r => r.followed_player_id);
      if (ids.length === 0) {
        if (!cancelled) { setFollowed([]); setLoading(false); }
        return;
      }
      const { data: players } = await supabase
        .from('players')
        .select('id, pseudo, discord_tag:discord_tag_public')
        .in('id', ids);
      // On conserve l'ordre des suivis (du plus récent au plus ancien).
      const byId = new Map((players ?? []).map(p => [p.id, p as FollowedPlayer]));
      const ordered = ids.map(id => byId.get(id)).filter((p): p is FollowedPlayer => !!p);
      if (!cancelled) { setFollowed(ordered); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  async function unfollow(id: string) {
    setBusyId(id);
    await supabase.from('follows').delete()
      .eq('follower_player_id', playerId)
      .eq('followed_player_id', id);
    setFollowed(prev => prev.filter(p => p.id !== id));
    setBusyId(null);
  }

  if (loading) return <p className="text-neutral-500 animate-pulse p-4">Chargement de tes rivaux…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
        <span aria-hidden="true">🔔</span>
        <p>
          Tu reçois une notification dès qu&apos;un pilote suivi te dépasse sur une de tes
          configurations, quelle que soit sa position. Suis un pilote depuis sa page de profil.
        </p>
      </div>

      {followed.length === 0 ? (
        <EmptyState message="Tu ne suis aucun pilote pour l'instant. Va sur le profil d'un joueur et clique sur « + Suivre »." />
      ) : (
        <>
          <p className="text-sm text-neutral-500">{followed.length} pilote{followed.length !== 1 ? 's' : ''} suivi{followed.length !== 1 ? 's' : ''}</p>
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            {followed.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-sm font-extrabold text-white">
                  {p.pseudo.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/joueurs/${encodeURIComponent(p.pseudo)}`} className="font-bold text-neutral-900 dark:text-white hover:text-pink-400 transition-colors truncate block">
                    {p.pseudo}
                  </Link>
                  {p.discord_tag && <span className="text-xs text-indigo-400">Discord lié</span>}
                </div>
                <Link
                  href={`/joueurs/${encodeURIComponent(p.pseudo)}`}
                  className="hidden sm:inline-block px-3 py-1.5 rounded-full text-sm font-semibold text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:border-pink-400 hover:text-pink-400 transition-colors"
                >
                  Voir le profil
                </Link>
                <button
                  onClick={() => unfollow(p.id)}
                  disabled={busyId === p.id}
                  className="px-3 py-1.5 rounded-full text-sm font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {busyId === p.id ? '…' : 'Ne plus suivre'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function StatsTab({ stats, laps }: { stats: Stats; laps: ProfileLap[] }) {
  const circuitCounts: Record<string, number> = {};
  laps.forEach(l => { const name = l.tracks?.name ?? 'Inconnu'; circuitCounts[name] = (circuitCounts[name] || 0) + 1; });
  const topCircuits = Object.entries(circuitCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const carCounts: Record<string, number> = {};
  laps.forEach(l => { const name = `${l.cars?.year} ${l.cars?.manufacturer} ${l.cars?.name}`; carCounts[name] = (carCounts[name] || 0) + 1; });
  const topCars = Object.entries(carCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Chronos enregistrés', value: stats.totalLaps,          icon: '⏱' },
          { label: 'Circuits essayés',    value: stats.totalCircuits,      icon: '🏁' },
          { label: 'Voitures utilisées',  value: stats.totalVoitures,      icon: '🚗' },
          { label: 'Classe favorite',     value: stats.classFavorite,      icon: '🎯' },
          { label: 'Transmission fav.',   value: stats.drivetrainFavorite, icon: '⚙️' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">{value}</p>
            <p className="text-xs text-neutral-500 font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          <h3 className="font-bold mb-4">🏁 Circuits favoris</h3>
          {topCircuits.length === 0
            ? <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            : <ul className="space-y-3">
                {topCircuits.map(([name, count], i) => (
                  <li key={name} className="flex items-center justify-between">
                    <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                      <span className="text-neutral-400 mr-2">#{i + 1}</span>{name}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{count} tour{count > 1 ? 's' : ''}</span>
                  </li>
                ))}
              </ul>
          }
        </div>

        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          <h3 className="font-bold mb-4">🚗 Voitures favorites</h3>
          {topCars.length === 0
            ? <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            : <ul className="space-y-3">
                {topCars.map(([name, count], i) => (
                  <li key={name} className="flex items-center justify-between">
                    <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                      <span className="text-neutral-400 mr-2">#{i + 1}</span>{name}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{count} tour{count > 1 ? 's' : ''}</span>
                  </li>
                ))}
              </ul>
          }
        </div>
      </div>

      <RegulariteSection />
    </div>
  );
}
