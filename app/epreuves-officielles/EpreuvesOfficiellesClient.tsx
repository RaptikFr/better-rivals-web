"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { TrackCategory } from '@/types/supabase';
import { TypeBadge } from '@/components/TypeBadge';
import { getTypeIcon, getSprintIcon } from '@/lib/trackIcons';

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
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/classements?track_id=${track.id}`)}
      className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-pink-500/50 rounded-xl p-5 transition-colors cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-lg leading-tight">{getTypeIcon(track.type)} {getSprintIcon(track.is_sprint ?? false)} {track.name}</h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <TypeBadge type={track.type} />
        </div>
      </div>
      {track.description && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{track.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
        {track.length_km && <span>📏 {track.length_km} km</span>}
        {track.event_lab_code && (
          <span className="font-mono bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded text-xs text-neutral-700 dark:text-neutral-300">
            🔑 {track.event_lab_code}
          </span>
        )}
      </div>
      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <span className="text-xs text-neutral-500 group-hover:text-pink-400 transition-colors">
          Voir les classements →
        </span>
      </div>
    </div>
  );
}

export default function EpreuvesOfficiellesClient() {
  const [tracks,     setTracks]     = useState<Track[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [filterType,   setFilterType]   = useState('Tous');
  const [searchQuery,  setSearchQuery]  = useState('');

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

  useEffect(() => { fetchData(); }, []);

  const allTypes = ['Tous', ...Array.from(new Set(tracks.map(t => t.type))).sort()];
  const filtered = tracks.filter(t =>
    (filterType === 'Tous' || t.type === filterType) &&
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une épreuve..."
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2.5 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
          />
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
            <p className="text-neutral-500 text-sm">Aucune épreuve ne correspond à cette recherche.</p>
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
