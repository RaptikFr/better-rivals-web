"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { TrackCategory } from '@/types/supabase';

interface Track {
  id: number;
  name: string;
  type: TrackCategory;
  length_km: number | null;
  event_lab_code: string | null;
  description: string | null;
  is_sprint: boolean;
}

const TYPES_SPRINT_ONLY = ['Course de rue', 'Toge', 'Course de drag'];

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'Course sur route':   'bg-blue-500/20 border-blue-500/50 text-blue-400',
    'Course tous chemins':'bg-amber-900/30 border-amber-800/50 text-amber-700',
    'Cross-country':      'bg-green-500/20 border-green-500/50 text-green-400',
    'Toge':               'bg-violet-500/20 border-violet-500/50 text-violet-400',
    'Course de rue':      'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    'Course de drag':     'bg-orange-500/20 border-orange-500/50 text-orange-400',
  };
  const style = colors[type] ?? 'bg-neutral-800 border-neutral-700 text-neutral-400';
  return (
    <span className={`px-2 py-0.5 border rounded text-xs font-bold ${style}`}>
      {type}
    </span>
  );
}

function TrackCard({ track }: { track: Track }) {
  return (
    <div className={`bg-neutral-900 border rounded-xl p-5 transition-colors ${
      track.is_sprint ? 'border-neutral-800 opacity-60' : 'border-neutral-800 hover:border-neutral-600'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-bold text-white text-lg leading-tight">{track.name}</h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <TypeBadge type={track.type} />
          {track.is_sprint && (
            <span className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-xs font-bold text-neutral-500">
              ⚠️ Sprint
            </span>
          )}
        </div>
      </div>
      {track.is_sprint && (
        <p className="text-xs text-neutral-600 mb-3 italic">Non supporté par la télémétrie UDP de Forza.</p>
      )}
      {track.description && (
        <p className="text-sm text-neutral-400 mb-3">{track.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
        {track.length_km && <span>📏 {track.length_km} km</span>}
        {track.event_lab_code && (
          <span className="font-mono bg-neutral-800 px-2 py-0.5 rounded text-xs text-neutral-300">
            🔑 {track.event_lab_code}
          </span>
        )}
      </div>
    </div>
  );
}

export default function EpreuvesOfficiellesClient() {
  const [tracks,    setTracks]    = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
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
      .not('type', 'in', `(${TYPES_SPRINT_ONLY.map(t => `"${t}"`).join(',')})`)
      .order('name', { ascending: true });

    if (error) setError("Impossible de charger les épreuves.");
    else setTracks(data ?? []);
    setIsLoading(false);
  }

  const allTypes = ['Tous', ...Array.from(new Set(tracks.map(t => t.type))).sort()];
  const filtered = tracks.filter(t => filterType === 'Tous' || t.type === filterType);
  const bouclees = filtered.filter(t => !t.is_sprint);
  const sprints  = filtered.filter(t => t.is_sprint);

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
          <p className="text-neutral-400 text-lg">Les circuits officiels de Forza Horizon 6.</p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-8">
          {allTypes.map(type => (
            <button key={type} onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-full border text-sm font-bold transition-all ${
                filterType === type
                  ? 'bg-white text-black border-white'
                  : 'bg-neutral-950 border-neutral-700 text-neutral-400 hover:border-neutral-500'
              }`}>
              {type}
            </button>
          ))}
        </div>

        {/* Circuits bouclés */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-2xl font-extrabold text-white">🏁 Circuits</h2>
            <span className="text-sm text-neutral-500 font-mono">
              {bouclees.length} supporté{bouclees.length !== 1 ? 's' : ''}
            </span>
          </div>
          {bouclees.length === 0 ? (
            <p className="text-neutral-500 text-sm">Aucun circuit pour ce filtre.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bouclees.map(track => <TrackCard key={track.id} track={track} />)}
            </div>
          )}
        </section>

        {/* Sprints — grisés en bas */}
        {sprints.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-neutral-600">⚠️ Sprints non supportés</h2>
              <span className="text-sm text-neutral-700 font-mono">{sprints.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sprints.map(track => <TrackCard key={track.id} track={track} />)}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
