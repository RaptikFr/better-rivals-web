"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatTime } from '@/components/formatTime';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DiscordTag } from '@/components/DiscordTag';
import { getTypeIcon, getSprintIcon } from '@/app/lib/trackIcons';

interface Track {
  id: number;
  name: string;
  type: string;
  length_km: number | null;
  is_sprint: boolean | null;
}

interface Car {
  id: number;
  car_ordinal: number | null;
  manufacturer: string | null;
  name: string;
  year: number | null;
}

interface Defi {
  id: string;
  track_id: number;
  car_id: number | null;
  car_class: string;
  week_start: string;
  week_end: string;
  tracks: Track;
  cars: Car | null;
}

interface LapEntry {
  player_id: string;
  pseudo: string;
  discord_tag: string | null;
  car_label: string;
  time_ms: number;
}

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!target) return;
    function update() {
      const diff = new Date(target!).getTime() - Date.now();
      if (diff <= 0) { setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setRemaining({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000)  / 60000),
        seconds: Math.floor((diff % 60000)    / 1000),
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-neutral-200/60 dark:bg-neutral-800 rounded-xl px-4 py-3 min-w-[64px]">
      <span className="text-2xl font-extrabold tabular-nums text-neutral-900 dark:text-white">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs text-neutral-500 mt-0.5">{label}</span>
    </div>
  );
}

export default function DefisClient() {
  const [defi,       setDefi]       = useState<Defi | null>(null);
  const [laps,       setLaps]       = useState<LapEntry[]>([]);
  const [pastDefis,  setPastDefis]  = useState<Defi[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [noDefi,     setNoDefi]     = useState(false);

  const countdown = useCountdown(defi?.week_end ?? null);

  const fetchLaps = useCallback(async (trackId: number, carClass: string, carOrdinal: number | null) => {
    let query = supabase
      .from('lap_times')
      .select('player_id, time_ms, players(pseudo, discord_tag), cars(manufacturer, name, year)')
      .eq('track_id', trackId)
      .eq('car_class', carClass)
      .order('time_ms', { ascending: true });

    if (carOrdinal !== null) query = query.eq('car_ordinal', carOrdinal);

    const { data } = await query;

    if (!data) return;

    // Meilleur temps par pilote
    const byPlayer = new Map<string, LapEntry>();
    for (const row of data as any[]) {
      if (!byPlayer.has(row.player_id)) {
        byPlayer.set(row.player_id, {
          player_id:   row.player_id,
          pseudo:      row.players?.pseudo ?? 'Inconnu',
          discord_tag: row.players?.discord_tag ?? null,
          car_label:   row.cars ? `${row.cars.year ?? ''} ${row.cars.manufacturer ?? ''} ${row.cars.name ?? ''}`.trim() : '—',
          time_ms:     row.time_ms,
        });
      }
    }
    setLaps([...byPlayer.values()]);
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);

      // Défi courant
      const res = await fetch('/api/defis/current');
      const json = await res.json();
      if (!json.defi) { setNoDefi(true); setIsLoading(false); return; }
      setDefi(json.defi);
      const carOrdinal = json.defi.cars?.car_ordinal ?? null;
      await fetchLaps(json.defi.track_id, json.defi.car_class, carOrdinal);

      // Défis passés
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('defis')
        .select('id, track_id, car_class, week_start, week_end, tracks(id, name, type, length_km, is_sprint)')
        .lt('week_end', now)
        .order('week_start', { ascending: false })
        .limit(10);
      if (data) setPastDefis(data as Defi[]);

      setIsLoading(false);
    }
    load();
  }, [fetchLaps]);

  if (isLoading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement du défi...</p>
    </main>
  );

  if (noDefi) return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto text-center pt-24">
        <p className="text-5xl mb-6">⏳</p>
        <h1 className="text-3xl font-extrabold mb-3">Aucun défi cette semaine</h1>
        <p className="text-neutral-500">Le prochain défi sera généré lundi matin.</p>
      </div>
    </main>
  );

  const track     = defi!.tracks;
  const car       = defi!.cars;
  const carLabel  = car ? `${car.year ?? ''} ${car.manufacturer ?? ''} ${car.name}`.trim() : null;
  const classStyle = CLASS_STYLES[defi!.car_class] ?? { backgroundColor: '#555', color: '#fff' };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-2">
            Défi de la semaine
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">
            Un circuit, une classe, le meilleur temps gagne.
          </p>
        </div>

        {/* Carte du défi */}
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Circuit</p>
              <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                {getTypeIcon(track.type)} {getSprintIcon(track.is_sprint ?? false)} {track.name}
              </h2>
              {track.length_km && (
                <p className="text-sm text-neutral-500 mt-1">📏 {track.length_km} km</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Classe</p>
              <span
                className="px-4 py-1.5 rounded-lg text-sm font-extrabold"
                style={classStyle}
              >
                {defi!.car_class}
              </span>
            </div>
          </div>

          {carLabel && (
            <div className="mb-4 p-3 bg-neutral-200/60 dark:bg-neutral-800 rounded-xl flex items-center gap-3">
              <span className="text-lg">🚗</span>
              <div>
                <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Voiture imposée</p>
                <p className="font-bold text-neutral-900 dark:text-white">{carLabel}</p>
              </div>
            </div>
          )}

          {/* Compte à rebours */}
          {countdown && (
            <div>
              <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Temps restant</p>
              <div className="flex gap-2">
                <CountdownBlock value={countdown.days}    label="jours"    />
                <CountdownBlock value={countdown.hours}   label="heures"   />
                <CountdownBlock value={countdown.minutes} label="minutes"  />
                <CountdownBlock value={countdown.seconds} label="secondes" />
              </div>
            </div>
          )}
        </div>

        {/* Classement du défi */}
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 bg-neutral-200/60 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="font-extrabold text-neutral-900 dark:text-white">🏆 Classement</h3>
            <Link
              href={`/classements?track_id=${defi!.track_id}&class=${defi!.car_class}`}
              className="text-xs text-neutral-500 hover:text-pink-400 transition-colors"
            >
              Voir dans les classements →
            </Link>
          </div>

          {laps.length === 0 ? (
            <p className="px-5 py-8 text-neutral-500 text-sm text-center">
              Aucun temps enregistré sur ce défi pour l&apos;instant.
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {laps.map((entry, i) => (
                  <tr
                    key={entry.player_id}
                    className="border-b border-neutral-200 dark:border-neutral-800 last:border-0 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <td className="py-3 px-4 w-8 font-bold text-neutral-500 text-right tabular-nums">{i + 1}</td>
                    <td className="py-3 px-3 font-bold text-neutral-900 dark:text-white">
                      <Link
                        href={`/joueurs/${encodeURIComponent(entry.pseudo)}`}
                        className="hover:text-pink-400 transition-colors"
                      >
                        {entry.pseudo}
                      </Link>
                      <DiscordTag tag={entry.discord_tag} />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-pink-400">{formatTime(entry.time_ms)}</td>
                    <td className="py-3 px-3 text-xs text-neutral-500 hidden sm:table-cell">{entry.car_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Défis passés */}
        {pastDefis.length > 0 && (
          <div>
            <h3 className="text-xl font-extrabold mb-4 text-neutral-900 dark:text-white">Défis passés</h3>
            <div className="flex flex-col gap-2">
              {pastDefis.map(d => {
                const t = d.tracks;
                const start = new Date(d.week_start);
                const end   = new Date(d.week_end);
                const fmt = (dt: Date) =>
                  dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                return (
                  <Link
                    key={d.id}
                    href={`/classements?track_id=${d.track_id}&class=${d.car_class}`}
                    className="flex items-center justify-between gap-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-pink-500/50 rounded-xl px-4 py-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                        style={CLASS_STYLES[d.car_class] ?? { backgroundColor: '#555', color: '#fff' }}
                      >
                        {d.car_class}
                      </span>
                      <span className="font-semibold text-neutral-900 dark:text-white truncate">
                        {t?.name ?? '—'}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500 flex-shrink-0">
                      {fmt(start)} – {fmt(end)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
