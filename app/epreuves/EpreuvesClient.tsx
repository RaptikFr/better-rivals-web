"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { TrackCategory } from '@/types/supabase';

interface Track {
  id: number;
  name: string;
  type: TrackCategory;
  length_km: number | null;
  event_lab_code: string | null;
  description: string | null;
  is_official: boolean;
  is_sprint: boolean;
}

// Types 100% sprints à masquer dans les épreuves officielles
const TYPES_SPRINT_ONLY = ['Course de rue', 'Toge', 'Course de drag'];

const TRACK_TYPES = [
  'Course sur route',
  'Course tous chemins',
  'Cross-country',
  'Toge',
  'Course de rue',
  'Course de drag',
];

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
      track.is_sprint
        ? 'border-neutral-800 opacity-60'
        : 'border-neutral-800 hover:border-neutral-600'
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
        <p className="text-xs text-neutral-600 mb-3 italic">
          Non supporté par la télémétrie UDP de Forza.
        </p>
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

function SoumissionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', event_lab_code: '', type: 'Course sur route', length_km: '', description: '', is_sprint: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Session expirée. Reconnecte-toi.");
      setLoading(false);
      return;
    }

    const res = await fetch('/api/epreuves', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erreur lors de la soumission.");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl">

        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h2 className="text-xl font-bold text-white">Proposer une épreuve</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">Nom du circuit *</label>
            <input type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Circuit de la montagne"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">Code EventLab *</label>
            <input type="text" required value={form.event_lab_code}
              onChange={e => setForm(f => ({ ...f, event_lab_code: e.target.value.toUpperCase() }))}
              placeholder="Ex: 123-456-789"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2">Type *</label>
              <select value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors"
              >
                {TRACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2">Longueur (km)</label>
              <input type="number" step="0.1" min="0" value={form.length_km}
                onChange={e => setForm(f => ({ ...f, length_km: e.target.value }))}
                placeholder="Ex: 3.5"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

          {/* Case à cocher Sprint */}
          <div className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
            <input
              type="checkbox"
              id="is_sprint"
              checked={form.is_sprint}
              onChange={e => setForm(f => ({ ...f, is_sprint: e.target.checked }))}
              className="w-4 h-4 accent-pink-500"
            />
            <label htmlFor="is_sprint" className="text-sm text-neutral-300 cursor-pointer">
              C&apos;est un sprint (point A → point B)
            </label>
          </div>
          {form.is_sprint && (
            <p className="text-xs text-amber-500">
              ⚠️ Les sprints ne sont pas supportés par la télémétrie UDP de Forza — les temps ne seront pas enregistrés automatiquement.
            </p>
          )}

          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">
              Description <span className="text-neutral-500 font-normal">(optionnel)</span>
            </label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Décris ton circuit en quelques mots..."
              rows={3}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          <p className="text-xs text-neutral-500">⚠ Ton épreuve sera visible après validation par un administrateur.</p>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-neutral-800 text-neutral-300 font-bold rounded-lg hover:bg-neutral-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? "Envoi..." : "Soumettre"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default function EpreuvesClient() {
  const { user } = useAuth();

  const [officielles,  setOfficielles]  = useState<Track[]>([]);
  const [communaute,   setCommunaute]   = useState<Track[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);
  const [filterType,   setFilterType]   = useState('Tous');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('tracks')
      .select('id, name, type, length_km, event_lab_code, description, is_official, is_sprint')
      .eq('status', 'approved')
      .order('name', { ascending: true });

    if (error) {
      setError("Impossible de charger les épreuves.");
    } else if (data) {
      // Pour les officielles : masquer les catégories 100% sprints
      setOfficielles(
        data.filter(t => t.is_official && !TYPES_SPRINT_ONLY.includes(t.type))
      );
      setCommunaute(data.filter(t => !t.is_official));
    }
    setIsLoading(false);
  }

  function handleSuccess() {
    setShowModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  }

  const allTypes = ['Tous', ...Array.from(new Set([...officielles, ...communaute].map(t => t.type))).sort()];
  const filterFn = (t: Track) => filterType === 'Tous' || t.type === filterType;

  const officiellesFiltrees = officielles.filter(filterFn);
  const communauteFiltrees  = communaute.filter(filterFn);

  // Séparer circuits bouclés et sprints pour l'affichage
  const officiellesBouclees = officiellesFiltrees.filter(t => !t.is_sprint);
  const officiellesSprints  = officiellesFiltrees.filter(t => t.is_sprint);

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
      {showModal && (
        <SoumissionModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}

      <div className="max-w-6xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-2">
              Épreuves
            </h1>
            <p className="text-neutral-400 text-lg">Circuits officiels et créations de la communauté.</p>
          </div>
          {user && (
            <button onClick={() => setShowModal(true)}
              className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity">
              ＋ Proposer une épreuve
            </button>
          )}
        </div>

        {showSuccess && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-4 text-green-400 font-medium">
            ✅ Épreuve soumise avec succès ! Elle sera visible après validation.
          </div>
        )}

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

        {/* ── ÉPREUVES OFFICIELLES ── */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-2xl font-extrabold text-white">🏆 Épreuves officielles</h2>
            <span className="text-sm text-neutral-500 font-mono">
              {officiellesBouclees.length} circuit{officiellesBouclees.length !== 1 ? 's' : ''} supporté{officiellesBouclees.length !== 1 ? 's' : ''}
            </span>
          </div>

          {officiellesBouclees.length === 0 ? (
            <p className="text-neutral-500 text-sm">Aucune épreuve officielle pour ce filtre.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {officiellesBouclees.map(track => <TrackCard key={track.id} track={track} />)}
            </div>
          )}

          {/* Sprints officiels — affichés en bas, grisés */}
          {officiellesSprints.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-neutral-600 font-bold mb-3">
                ⚠️ Sprints ({officiellesSprints.length}) — non supportés par la télémétrie
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {officiellesSprints.map(track => <TrackCard key={track.id} track={track} />)}
              </div>
            </div>
          )}
        </section>

        {/* ── ÉPREUVES COMMUNAUTÉ ── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-2xl font-extrabold text-white">🎮 Épreuves de la communauté</h2>
            <span className="text-sm text-neutral-500 font-mono">
              {communauteFiltrees.length} épreuve{communauteFiltrees.length !== 1 ? 's' : ''}
            </span>
          </div>

          {communauteFiltrees.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center">
              <p className="text-neutral-500 mb-4">Aucune épreuve communauté pour l&apos;instant.</p>
              {user ? (
                <button onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity">
                  Sois le premier à en proposer une !
                </button>
              ) : (
                <p className="text-neutral-600 text-sm">Connecte-toi pour proposer une épreuve.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communauteFiltrees.map(track => <TrackCard key={track.id} track={track} />)}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
