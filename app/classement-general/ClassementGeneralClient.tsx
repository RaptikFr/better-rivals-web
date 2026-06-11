"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlayer } from '@/hooks/usePlayer';
import { DiscordTag } from '@/components/DiscordTag';
import type { PlayerRanking } from '@/app/api/classement-general/route';

export default function ClassementGeneralClient() {
  const { player } = usePlayer();
  const currentPseudo = player?.pseudo ?? null;

  const [ranking,       setRanking]       = useState<PlayerRanking[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    async function fetchRanking() {
      setIsLoading(true);
      setError(null);

      try {
        // Classement calculé et mis en cache côté serveur (60 s, partagé entre visiteurs)
        const res = await fetch('/api/classement-general');
        if (!res.ok) throw new Error();
        const { ranking } = await res.json();
        setRanking(ranking);
      } catch {
        setError("Impossible de charger le classement général.");
      }
      setIsLoading(false);
    }

    fetchRanking();
  }, []);

  if (isLoading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Calcul du classement général...</p>
    </main>
  );

  if (error) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-red-400">{error}</p>
    </main>
  );

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-2">
            Classement général
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">
            Points attribués par position sur chaque configuration (circuit + voiture + classe + transmission).
          </p>
        </div>

        {/* Barème */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            { label: '🥇 1ère place', pts: 10 },
            { label: '🥈 2ème place', pts: 7  },
            { label: '🥉 3ème place', pts: 5  },
            { label: '4ème place',    pts: 3  },
            { label: '5ème place',    pts: 1  },
          ].map(({ label, pts }) => (
            <div key={label} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2 flex items-center gap-2 text-sm">
              <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">+{pts} pts</span>
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">#</th>
                <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">PILOTE</th>
                <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">POINTS</th>
                <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">PODIUMS</th>
                <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">CONFIGS</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-neutral-500">
                    Aucune donnée disponible.
                  </td>
                </tr>
              ) : (
                ranking.map((player, index) => {
                  const pos = index + 1;
                  const isMe = currentPseudo !== null && player.pseudo === currentPseudo;

                  return (
                    <tr
                      key={player.player_id}
                      className={`border-b border-neutral-200/50 dark:border-neutral-800/50 transition-colors ${
                        isMe
                          ? 'bg-pink-50 dark:bg-pink-500/10 border-l-2 border-pink-400 dark:border-pink-500'
                          : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <td className="p-4 font-bold text-lg w-16">
                        {pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : (
                          <span className="text-neutral-500 text-base">#{pos}</span>
                        )}
                      </td>

                      <td className="p-4 font-bold text-neutral-900 dark:text-white">
                        <Link
                          href={`/joueurs/${encodeURIComponent(player.pseudo)}`}
                          className="hover:text-pink-400 transition-colors"
                        >
                          {player.pseudo}
                        </Link>
                        {isMe && (
                          <span className="ml-2 px-1.5 py-0.5 bg-pink-500/20 border border-pink-500/40 text-pink-500 text-xs font-bold rounded">
                            Toi
                          </span>
                        )}
                        <DiscordTag tag={player.discord_tag} />
                      </td>

                      <td className="p-4">
                        <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
                          {player.points}
                        </span>
                        <span className="text-neutral-500 text-sm ml-1">pts</span>
                      </td>

                      <td className="p-4">
                        <span className="text-sm flex items-center gap-3">
                          {player.gold > 0 && (
                            <span className="flex items-center gap-1">🥇 <span className="font-bold">{player.gold}</span></span>
                          )}
                          {player.silver > 0 && (
                            <span className="flex items-center gap-1">🥈 <span className="font-bold">{player.silver}</span></span>
                          )}
                          {player.bronze > 0 && (
                            <span className="flex items-center gap-1">🥉 <span className="font-bold">{player.bronze}</span></span>
                          )}
                          {player.gold === 0 && player.silver === 0 && player.bronze === 0 && (
                            <span className="text-neutral-500">—</span>
                          )}
                        </span>
                      </td>

                      <td className="p-4 text-neutral-600 dark:text-neutral-400 font-mono text-sm">
                        {player.configs}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}
