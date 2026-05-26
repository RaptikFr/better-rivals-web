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
