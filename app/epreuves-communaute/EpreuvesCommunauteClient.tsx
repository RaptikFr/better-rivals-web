"use client";

import { useState, useEffect, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { TrackCategory } from '@/types/supabase';
import { TypeBadge } from '@/components/TypeBadge';

interface Track {
  id: number;
  name: string;
  type: TrackCategory;
  length_km: number | null;
  event_lab_code: string | null;
  description: string | null;
  is_sprint: boolean | null;
  votes: { vote: boolean; user_id: string }[];
}

const TRACK_TYPES = [
  'Course sur route', 'Course tous chemins', 'Cross-country',
  'Toge', 'Course de rue', 'Course de drag',
];

function TrackCard({ track, userId }: { track: Track; userId: string | null }) {
  const [voted,      setVoted]      = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [thumbsUp,   setThumbsUp]   = useState(track.votes.filter(v => v.vote).length);
  const [thumbsDown, setThumbsDown] = useState(track.votes.filter(v => !v.vote).length);

  useEffect(() => {
    if (userId) setVoted(track.votes.some(v => v.user_id === userId));
  }, [userId, track.votes]);

  async function handleVote(vote: boolean) {
    if (!userId || voted || loading) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ track_id: track.id, vote }),
    });
    if (res.ok) {
      setVoted(true);
      if (vote) setThumbsUp(n => n + 1);
      else setThumbsDown(n => n + 1);
    }
    setLoading(false);
  }

  return (
    <div className={`bg-neutral-100 dark:bg-neutral-900 border rounded-xl p-5 transition-colors flex flex-col gap-3 ${
      track.is_sprint ? 'border-neutral-200 dark:border-neutral-800 opacity-60' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-lg leading-tight">{track.name}</h3>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <TypeBadge type={track.type} />
          {track.is_sprint && (
            <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-bold text-neutral-500">
              ⚠️ Sprint
            </span>
          )}
        </div>
      </div>

      {track.is_sprint && (
        <p className="text-xs text-neutral-500 italic">Non supporté par la télémétrie UDP de Forza.</p>
      )}

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

      <div className="flex items-center gap-3 pt-1 border-t border-neutral-200 dark:border-neutral-800">
        <button onClick={() => handleVote(true)} disabled={!userId || voted || loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
            voted ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed'
            : userId ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 cursor-pointer'
            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}>
          👍 <span>{thumbsUp}</span>
        </button>
        <button onClick={() => handleVote(false)} disabled={!userId || voted || loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
            voted ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed'
            : userId ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 cursor-pointer'
            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}>
          👎 <span>{thumbsDown}</span>
        </button>
        {!userId && <span className="text-xs text-neutral-500 ml-1">Connecte-toi pour voter</span>}
        {voted  && <span className="text-xs text-neutral-500 ml-1">Vote enregistré ✓</span>}
      </div>
    </div>
  );
}

function SoumissionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '', event_lab_code: '', type: 'Course sur route',
    length_km: '', description: '', is_sprint: false
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Session expirée."); setLoading(false); return; }
    const res = await fetch('/api/epreuves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Erreur."); setLoading(false); return; }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold">Proposer une épreuve</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
            <p className="font-bold text-neutral-800 dark:text-neutral-300">Pour être éligible, ton épreuve doit :</p>
            <ul className="space-y-1.5 pl-1">
              <li>🏁 Être un <strong className="text-neutral-900 dark:text-neutral-200">circuit bouclé</strong> (pas un sprint point A → B)</li>
              <li>🔄 Avoir au moins <strong className="text-neutral-900 dark:text-neutral-200">3 tours</strong> configurés dans les paramètres de l&apos;épreuve</li>
              <li>🚫 Ne pas avoir d&apos;<strong className="text-neutral-900 dark:text-neutral-200">adversaire</strong> — mode solo uniquement, équivalent au mode Rivaux</li>
              <li>🔑 Avoir un <strong className="text-neutral-900 dark:text-neutral-200">code EventLab valide</strong> et accessible</li>
            </ul>
            <p className="text-xs text-neutral-500 pt-1">
              Si ton épreuve remplit ces conditions, soumets-la ci-dessous. Un administrateur l&apos;approuvera ou non.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Nom du circuit *</label>
            <input type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Circuit de la montagne"
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-3 placeholder-neutral-400 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Code EventLab *</label>
            <input type="text" required value={form.event_lab_code}
              onChange={e => setForm(f => ({ ...f, event_lab_code: e.target.value.toUpperCase() }))}
              placeholder="Ex: 123-456-789"
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-3 placeholder-neutral-400 font-mono focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Type *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500 transition-colors">
                {TRACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Longueur (km)</label>
              <input type="number" step="0.1" min="0" value={form.length_km}
                onChange={e => setForm(f => ({ ...f, length_km: e.target.value }))}
                placeholder="Ex: 3.5"
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-3 placeholder-neutral-400 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg">
            <input type="checkbox" id="is_sprint" checked={form.is_sprint}
              onChange={e => setForm(f => ({ ...f, is_sprint: e.target.checked }))}
              className="w-4 h-4 accent-pink-500"
            />
            <label htmlFor="is_sprint" className="text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer">
              C&apos;est un sprint (point A → point B)
            </label>
          </div>
          {form.is_sprint && <p className="text-xs text-amber-500">⚠️ Les sprints ne sont pas supportés par la télémétrie UDP de Forza.</p>}
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
              Description <span className="text-neutral-500 font-normal">(optionnel)</span>
            </label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Décris ton circuit en quelques mots..."
              rows={3}
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-3 placeholder-neutral-400 focus:outline-none focus:border-pink-500 transition-colors resize-none"
            />
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}
          <p className="text-xs text-neutral-500">⚠ Ton épreuve sera visible après validation par un administrateur.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors">
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

export default function EpreuvesCommunauteClient() {
  const { user } = useAuth();
  const [tracks,      setTracks]      = useState<Track[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [filterType,  setFilterType]  = useState('Tous');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('tracks')
      .select('id, name, type, length_km, event_lab_code, description, is_sprint, votes(vote, user_id)')
      .eq('status', 'approved')
      .eq('is_official', false)
      .order('name', { ascending: true });

    if (error) setError("Impossible de charger les épreuves.");
    else setTracks((data ?? []) as Track[]);
    setIsLoading(false);
  }

  function handleSuccess() {
    setShowModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
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
      {showModal && <SoumissionModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}

      <div className="max-w-screen-xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-2">
              Épreuves communauté
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg">Les circuits créés par la communauté Better Rivals.</p>
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
            ✅ Épreuve soumise ! Elle sera visible après validation.
          </div>
        )}

        <div className="mb-8 bg-neutral-100 dark:bg-neutral-900 border border-violet-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">📋</span>
            <div>
              <h3 className="font-bold mb-2">Critères d&apos;éligibilité</h3>
              <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                <li>✅ L&apos;épreuve doit être un <strong className="text-neutral-900 dark:text-neutral-200">circuit bouclé</strong> (pas un sprint)</li>
                <li>✅ Au moins <strong className="text-neutral-900 dark:text-neutral-200">3 tours</strong> configurés</li>
                <li>✅ <strong className="text-neutral-900 dark:text-neutral-200">Aucun adversaire</strong> (équivalent au mode Rivaux)</li>
                <li>✅ Un <strong className="text-neutral-900 dark:text-neutral-200">code EventLab valide</strong></li>
              </ul>
              {!user && (
                <p className="text-xs text-neutral-500 mt-3">Connecte-toi pour proposer une épreuve.</p>
              )}
              <Link
                href="/criteres-eligibilite"
                className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors mt-3"
              >
                En savoir plus sur les critères →
              </Link>
            </div>
          </div>
        </div>

        {tracks.length > 0 && (
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
        )}

        {filtered.length === 0 ? (
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-neutral-500 mb-4">
              {tracks.length === 0 ? "Aucune épreuve communauté pour l'instant." : "Aucune épreuve pour ce filtre."}
            </p>
            {user && tracks.length === 0 && (
              <button onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity">
                Sois le premier à en proposer une !
              </button>
            )}
            {!user && tracks.length === 0 && (
              <p className="text-neutral-500 text-sm">Connecte-toi pour proposer une épreuve.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(track => (
              <TrackCard key={track.id} track={track} userId={user?.id ?? null} />
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
