"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatTime } from '@/components/formatTime';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DiscordTag } from '@/components/DiscordTag';

interface Chrono {
  id:         string;
  time_ms:    number;
  car_class:  string;
  drivetrain: string | null;
  created_at: string;
  players:    { pseudo: string; discord_tag: string | null } | null;
  cars:       { manufacturer: string | null; name: string; year: number | null } | null;
  tracks:     { name: string } | null;
}

function dateRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} heure${Math.floor(diff / 3600) > 1 ? 's' : ''}`;
  if (diff < 172800) return 'hier';
  return `il y a ${Math.floor(diff / 86400)} jours`;
}

const DRIVETRAIN_COLORS: Record<string, string> = {
  AWD: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  RWD: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  FWD: 'bg-green-500/20 border-green-500/50 text-green-400',
};

export default function DerniersChronos() {
  const [chronos, setChronos] = useState<Chrono[]>([]);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    supabase
      .from('lap_times')
      .select('id, time_ms, car_class, drivetrain, created_at, players ( pseudo, discord_tag ), cars ( manufacturer, name, year ), tracks ( name )')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!error && data) setChronos(data as Chrono[]);
        setReady(true);
      });
  }, []);

  if (!ready) return null;
  if (chronos.length === 0) return null;

  return (
    <div className="mt-24 max-w-5xl mx-auto w-full border-t border-neutral-200 dark:border-neutral-800 pt-16">
      <h2 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
        🏁 Derniers chronos
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 text-center mb-10">Les derniers temps enregistrés par la communauté.</p>

      <div className="flex flex-col gap-3">
        {chronos.map((lap) => (
          <div
            key={lap.id}
            className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
          >
            <span className="font-mono font-bold text-pink-400 text-xl shrink-0">
              {formatTime(lap.time_ms)}
            </span>

            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">
                <Link
                  href={`/joueurs/${encodeURIComponent(lap.players?.pseudo ?? '')}`}
                  className="hover:text-pink-400 transition-colors"
                >
                  {lap.players?.pseudo ?? '—'}
                </Link>
                <DiscordTag tag={lap.players?.discord_tag} />
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                {lap.cars ? `${lap.cars.year} ${lap.cars.manufacturer} ${lap.cars.name}` : '—'}
                {lap.tracks?.name ? ` · ${lap.tracks.name}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded text-xs font-bold" style={CLASS_STYLES[lap.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>
                {lap.car_class}
              </span>
              {lap.drivetrain && (
                <span className={`px-2 py-0.5 border rounded text-xs font-bold ${DRIVETRAIN_COLORS[lap.drivetrain] ?? 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
                  {lap.drivetrain}
                </span>
              )}
            </div>

            <span className="text-xs text-neutral-500 shrink-0">{dateRelative(lap.created_at)}</span>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/classements"
          className="inline-block px-6 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all"
        >
          Voir tous les classements →
        </Link>
      </div>
    </div>
  );
}
