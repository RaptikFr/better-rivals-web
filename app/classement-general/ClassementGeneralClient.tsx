"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const POINTS_TABLE = [10, 7, 5, 3, 1];

function getPoints(zeroBasedIndex: number): number {
  return POINTS_TABLE[zeroBasedIndex] ?? 0;
}

interface RawLap {
  time_ms:     number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  track_id:    number;
  player_id:   string;
  players:     { pseudo: string } | null;
}

interface PlayerRanking {
  player_id: string;
  pseudo:    string;
  points:    number;
  gold:      number;
  silver:    number;
  bronze:    number;
  configs:   number;
}

export default function ClassementGeneralClient() {
  const { user } = useAuth();

  const [ranking,       setRanking]       = useState<PlayerRanking[]>([]);
  const [currentPseudo, setCurrentPseudo] = useState<string | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('players')
      .select('pseudo')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setCurrentPseudo(data?.pseudo ?? null));
  }, [user]);

  useEffect(() => {
    async function fetchAndCompute() {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('lap_times')
        .select('time_ms, car_ordinal, car_class, drivetrain, track_id, player_id, players ( pseudo )');

      if (fetchError || !data) {
        setError("Impossible de charger le classement général.");
        setIsLoading(false);
        return;
      }

      const allLaps = data as RawLap[];

      // Étape 1 : meilleur temps par (config × joueur)
      // config key = track_id-car_ordinal-car_class-drivetrain
      const configs = new Map<string, Map<number, { pseudo: string; time_ms: number }>>();

      for (const lap of allLaps) {
        const key = `${lap.track_id}-${lap.car_ordinal}-${lap.car_class}-${lap.drivetrain}`;
        if (!configs.has(key)) configs.set(key, new Map());
        const playerMap = configs.get(key)!;
        const existing = playerMap.get(lap.player_id);
        if (!existing || lap.time_ms < existing.time_ms) {
          playerMap.set(lap.player_id, {
            pseudo:  lap.players?.pseudo ?? 'Inconnu',
            time_ms: lap.time_ms,
          });
        }
      }

      // Étape 2 : attribution des points pour chaque config
      const playerScores = new Map<string, PlayerRanking>();

      for (const [, playerMap] of configs) {
        const sorted = [...playerMap.entries()].sort((a, b) => a[1].time_ms - b[1].time_ms);

        sorted.forEach(([playerId, { pseudo }], index) => {
          if (!playerScores.has(playerId)) {
            playerScores.set(playerId, {
              player_id: playerId,
              pseudo,
              points: 0,
              gold:   0,
              silver: 0,
              bronze: 0,
              configs: 0,
            });
          }
          const score = playerScores.get(playerId)!;
          score.points  += getPoints(index);
          score.configs += 1;
          if (index === 0) score.gold++;
          else if (index === 1) score.silver++;
          else if (index === 2) score.bronze++;
        });
      }

      // Étape 3 : tri par points desc, puis podiums comme départage
      const ranked = [...playerScores.values()].sort((a, b) =>
        b.points - a.points ||
        b.gold   - a.gold   ||
        b.silver - a.silver ||
        b.bronze - a.bronze
      );

      setRanking(ranked);
      setIsLoading(false);
    }

    fetchAndCompute();
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
                        {player.pseudo}
                        {isMe && (
                          <span className="ml-2 px-1.5 py-0.5 bg-pink-500/20 border border-pink-500/40 text-pink-500 text-xs font-bold rounded">
                            Toi
                          </span>
                        )}
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
