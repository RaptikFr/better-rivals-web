"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { TrackCategory } from '@/types/supabase';
import { TypeBadge } from '@/components/TypeBadge';
import { getTypeIcon, getSprintIcon } from '@/app/lib/trackIcons';

interface Track {
  id: number;
  name: string;
  type: TrackCategory;
  length_km: number | null;
  event_lab_code: string | null;
  description: string | null;
  is_sprint: boolean | null;
}

function TrackCard({ track }: { track: Track }) {
  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl p-5 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-bold text-lg leading-tight">{getTypeIcon(track.type)} {getSprintIcon(track.is_sprint ?? false)} {track.name}</h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <TypeBadge type={track.type} />
        </div>
      </div>
      {track.description && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{track.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
        {track.length_km && <span>📏 {track.length_km} km</span>}
        {track.event_lab_code && (
          <span className="font-mono bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded text-xs text-neutral-700 dark:text-neutral-300">
            🔑 {track.event_lab_code}
          </span>
        )}
      </div>
    </div>
  );
}

export default function EpreuvesOfficiellesClient() {
  const [tracks,     setTracks]     = useState<Track[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [filterType, setFilterType] = useState('Tous');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('tracks')
      .select('id, name, type, length_km, event_lab_code, description, is_sprint')
      .eq('status', 'approved')
      .eq('is_official', true)
      .order('name', { ascending: true });

    if (error) setError("Impossible de charger les épreuves.");
    else setTracks(data ?? []);
    setIsLoading(false);
  }

  const allTypes = ['Tous', ...Array.from(new Set(tracks.map(t => t.type))).sort()];
  const filtered = tracks.filter(t => filterType === 'Tous' || t.type === filterType);

  if (isLoading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement des épreuves...</p>
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
            Épreuves officielles
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">Les circuits officiels de Forza Horizon 6.</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {allTypes.map(type => (
            <button key={type} onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-full border text-sm font-bold transition-all ${
                filterType === type
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white'
                  : 'bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500'
              }`}>
              {type}
            </button>
          ))}
        </div>

        <section>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-2xl font-extrabold">🏁 Épreuves</h2>
            <span className="text-sm text-neutral-500 font-mono">
              {filtered.length} épreuve{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          {filtered.length === 0 ? (
            <p className="text-neutral-500 text-sm">Aucune épreuve pour ce filtre.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(track => <TrackCard key={track.id} track={track} />)}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
