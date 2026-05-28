"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/lib/admins';


type AdminTab = 'epreuves' | 'messages';

interface PendingTrack {
  id: number;
  name: string;
  type: string;
  length_km: number | null;
  event_lab_code: string | null;
  description: string | null;
  submitted_by: string | null;
}

interface ContactMessage {
  id: string;
  gamertag: string;
  email: string;
  sujet: string;
  message: string;
  created_at: string;
  status: string;
}

export default function AdminPage() {
  const router            = useRouter();
  const { user, loading } = useAuth();

  const [adminTab, setAdminTab] = useState<AdminTab>('epreuves');
  const [notification, setNotification] = useState<{ text: string; ok: boolean } | null>(null);

  // Onglet Épreuves
  const [tracks,       setTracks]       = useState<PendingTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  // Onglet Messages
  const [messages,        setMessages]        = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesFetched, setMessagesFetched] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin(user.email))) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (isAdmin(user?.email)) fetchPending();
  }, [user]);

  useEffect(() => {
    if (adminTab === 'messages' && isAdmin(user?.email) && !messagesFetched) {
      fetchMessages();
    }
  }, [adminTab, user, messagesFetched]);

  async function fetchPending() {
    setTracksLoading(true);
    const { data } = await supabase
      .from('tracks')
      .select('id, name, type, length_km, event_lab_code, description, submitted_by')
      .eq('status', 'pending')
      .order('id', { ascending: true });
    setTracks(data ?? []);
    setTracksLoading(false);
  }

  async function fetchMessages() {
    setMessagesLoading(true);
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    setMessages(data ?? []);
    setMessagesLoading(false);
    setMessagesFetched(true);
  }

  function notify(text: string, ok: boolean) {
    setNotification({ text, ok });
    setTimeout(() => setNotification(null), 3000);
  }

  async function handleTrackAction(id: number, action: 'approved' | 'rejected') {
    const { error } = await supabase.from('tracks').update({ status: action }).eq('id', id);
    if (error) {
      notify(`Erreur : ${error.message}`, false);
    } else {
      notify(action === 'approved' ? '✅ Épreuve approuvée !' : '❌ Épreuve refusée.', action === 'approved');
      setTracks(t => t.filter(tr => tr.id !== id));
    }
  }

  async function handleMessageStatus(id: string, status: 'lu' | 'traité') {
    const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id);
    if (error) {
      notify(`Erreur : ${error.message}`, false);
    } else {
      setMessages(ms => ms.map(m => m.id === id ? { ...m, status } : m));
    }
  }

  async function handleMessageDelete(id: string) {
    if (!window.confirm('Supprimer définitivement ce message ?')) return;
    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) {
      notify(`Erreur : ${error.message}`, false);
    } else {
      setMessages(ms => ms.filter(m => m.id !== id));
      notify('Message supprimé.', true);
    }
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement...</p>
    </main>
  );

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">

        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-6">
          Administration
        </h1>

        {/* Onglets */}
        <div className="flex gap-1 mb-6 bg-neutral-900 border border-neutral-800 rounded-xl p-1 w-fit">
          {([
            { id: 'epreuves', label: '🏁 Épreuves', count: tracks.length },
            { id: 'messages', label: '✉️ Messages',  count: messages.filter(m => m.status === 'non_lu').length },
          ] as { id: AdminTab; label: string; count: number }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                adminTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  adminTab === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-700 text-neutral-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-6 px-5 py-4 rounded-xl border font-medium text-sm ${
            notification.ok
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {notification.text}
          </div>
        )}

        {/* ── ONGLET ÉPREUVES ── */}
        {adminTab === 'epreuves' && (
          tracksLoading ? (
            <p className="text-neutral-500 animate-pulse">Chargement...</p>
          ) : tracks.length === 0 ? (
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
                        Soumis par {track.submitted_by ?? '—'}
                      </p>
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleTrackAction(track.id, 'rejected')}
                        className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold rounded-lg hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-colors"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => handleTrackAction(track.id, 'approved')}
                        className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 font-bold rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        Approuver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── ONGLET MESSAGES ── */}
        {adminTab === 'messages' && (
          messagesLoading ? (
            <p className="text-neutral-500 animate-pulse">Chargement des messages...</p>
          ) : messages.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
              <p className="text-neutral-500">Aucun message de contact. 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(msg => {
                const statusColors: Record<string, string> = {
                  non_lu: 'border-neutral-700 bg-neutral-900',
                  lu:     'border-neutral-800 bg-neutral-900/50 opacity-80',
                  traité: 'border-neutral-800 bg-neutral-900/30 opacity-60',
                };
                const statusBadge: Record<string, string> = {
                  non_lu: 'bg-pink-500/20 border-pink-500/50 text-pink-400',
                  lu:     'bg-neutral-700 border-neutral-600 text-neutral-400',
                  traité: 'bg-green-500/10 border-green-500/30 text-green-600',
                };
                return (
                  <div key={msg.id} className={`border rounded-xl p-6 transition-all ${statusColors[msg.status] ?? statusColors.non_lu}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-bold text-white">{msg.gamertag}</span>
                          <span className="text-sm text-neutral-500">{msg.email}</span>
                          <span className={`px-2 py-0.5 border rounded text-xs font-bold ${statusBadge[msg.status] ?? statusBadge.non_lu}`}>
                            {msg.status.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-400">
                            {msg.sujet}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-xs text-neutral-600">
                          {new Date(msg.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {msg.status === 'non_lu' && (
                          <button
                            onClick={() => handleMessageStatus(msg.id, 'lu')}
                            className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm font-bold rounded-lg hover:bg-neutral-700 transition-colors"
                          >
                            Marquer lu
                          </button>
                        )}
                        {msg.status !== 'traité' && (
                          <button
                            onClick={() => handleMessageStatus(msg.id, 'traité')}
                            className="px-3 py-1.5 bg-green-500/20 border border-green-500/50 text-green-400 text-sm font-bold rounded-lg hover:bg-green-500/30 transition-colors"
                          >
                            Marquer traité
                          </button>
                        )}
                        <button
                          onClick={() => handleMessageDelete(msg.id)}
                          className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

      </div>
    </main>
  );
}
