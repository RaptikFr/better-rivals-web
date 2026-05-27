"use client";

import { useState, useEffect, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const SUJETS = ['Conflit de réglage', 'Signaler un temps suspect', 'Autre'];

export default function ContactClient() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    gamertag: '',
    email:    '',
    sujet:    SUJETS[0],
    message:  '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Pré-remplissage si connecté
  useEffect(() => {
    if (!user) return;
    setForm(f => ({ ...f, email: user.email ?? '' }));
    supabase
      .from('players')
      .select('pseudo')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.pseudo) setForm(f => ({ ...f, gamertag: data.pseudo }));
      });
  }, [user]);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('contact_messages')
      .insert([{
        gamertag: form.gamertag.trim(),
        email:    form.email.trim(),
        sujet:    form.sujet,
        message:  form.message.trim(),
      }]);

    if (insertError) {
      setError("Erreur lors de l'envoi. Réessaie dans quelques instants.");
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-5xl">✅</p>
          <h2 className="text-2xl font-extrabold text-white">Message envoyé !</h2>
          <p className="text-neutral-400">
            On a bien reçu ton message. On te répondra dès que possible.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-3">
            Contact
          </h1>
          <p className="text-neutral-400 text-lg">
            Une question, un problème ou un conflit à signaler ? On te répond.
          </p>
        </div>

        {/* Discord */}
        <a
          href="https://discord.gg/d75NxScNCa"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5 mb-6 hover:bg-indigo-500/20 transition-colors group"
        >
          <svg className="w-9 h-9 flex-shrink-0 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Rejoindre le Discord</p>
            <p className="text-neutral-400 text-sm mt-0.5">Pour une réponse rapide, rejoins la communauté Better Rivals.</p>
          </div>
          <span className="text-indigo-400 text-sm font-semibold group-hover:translate-x-1 transition-transform">Rejoindre →</span>
        </a>

        <p className="text-neutral-500 text-sm text-center mb-6">— ou envoie un message —</p>

        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2">
                Gamertag Xbox
              </label>
              <input
                type="text"
                required
                value={form.gamertag}
                onChange={e => setForm(f => ({ ...f, gamertag: e.target.value }))}
                placeholder="Ton Gamertag"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-300 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="ton@email.com"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">Sujet</label>
            <select
              value={form.sujet}
              onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors"
            >
              {SUJETS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">Message</label>
            <textarea
              required
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Décris ton problème en détail..."
              rows={5}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Envoi en cours...' : 'Envoyer le message'}
          </button>
        </form>

      </div>
    </main>
  );
}
