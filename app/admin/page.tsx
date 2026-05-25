"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ⚠️ Remplace par ton email Supabase
const ADMIN_EMAIL = "codraptik@gmail.com";

interface PendingTrack {
  id: number;
  name: string;
  type: string;
  length_km: number | null;
  event_lab_code: string | null;
  description: string | null;
  submitted_by: string | null;
  created_at: string;
}

export default function AdminPage() {
  const router             = useRouter();
  const { user, loading }  = useAuth();
  const [tracks, setTracks] = useState<PendingTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage]     = useState<{ text: string; ok: boolean } | null>(null);

  // Protection admin
  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) fetchPending();
  }, [user]);

  async function fetchPending() {
    setIsLoading(true);
    const { data } = await supabase
      .from('tracks')
      .select('id, name, type, length_km, event_lab_code, description, submitted_by, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setTracks(data ?? []);
    setIsLoading(false);
  }

  async function handleAction(id: number, action: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('tracks')
      .update({ status: action })
      .eq('id', id);

    if (error) {
      setMessage({ text: `Erreur : ${error.message}`, ok: false });
    } else {
      setMessage({
        text: action === 'approved' ? '✅ Épreuve approuvée !' : '❌ Épreuve refusée.',
        ok: action === 'approved'
      });
      setTracks(t => t.filter(tr => tr.id !== id));
    }
    setTimeout(() => setMessage(null), 3000);
  }

  if (loading || isLoading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement...</p>
    </main>
  );

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-2">
          Administration
        </h1>
        <p className="text-neutral-400 mb-8">Épreuves en attente de validation.</p>

        {message && (
          <div className={`mb-6 px-5 py-4 rounded-xl border font-medium text-sm ${
            message.ok
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {tracks.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-neutral-500">Aucune épreuve en attente. 🎉</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tracks.map(track => (
              <div key={track.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{track.name}</h3>
                      <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded text-xs font-bold">
                        En attente
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-neutral-400">
                      <span>📂 {track.type}</span>
                      {track.length_km && <span>📏 {track.length_km} km</span>}
                      {track.event_lab_code && (
                        <span className="font-mono bg-neutral-800 px-2 py-0.5 rounded text-xs text-neutral-300">
                          🔑 {track.event_lab_code}
                        </span>
                      )}
                    </div>

                    {track.description && (
                      <p className="text-sm text-neutral-500 italic">{track.description}</p>
                    )}

                    <p className="text-xs text-neutral-600">
                      Soumis le {new Date(track.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleAction(track.id, 'rejected')}
                      className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold rounded-lg hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-colors"
                    >
                      Refuser
                    </button>
                    <button
                      onClick={() => handleAction(track.id, 'approved')}
                      className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 font-bold rounded-lg hover:bg-green-500/30 transition-colors"
                    >
                      Approuver
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
