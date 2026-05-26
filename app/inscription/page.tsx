"use client";

import { useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function InscriptionPage() {
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo]     = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1. Créer le compte Auth Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setError("Erreur lors de la création du compte.");
      setLoading(false);
      return;
    }

    // 2. Créer le profil joueur lié au compte Auth
    const { error: playerError } = await supabase
      .from('players')
      .insert([{ pseudo, user_id: userId }]);

    if (playerError) {
      // Si le pseudo est déjà pris
      if (playerError.code === '23505') {
        setError("Ce Gamertag est déjà utilisé. Choisis-en un autre.");
      } else {
        setError("Erreur lors de la création du profil : " + playerError.message);
      }
      setLoading(false);
      return;
    }

    // 3. Redirection vers le profil
    router.push('/profil');
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-2">
            Créer un compte
          </h1>
          <p className="text-neutral-400 text-sm">
            Rejoins Better Rivals et retrouve tous tes chronos.
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 space-y-5">

          {/* Gamertag */}
          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">
              Gamertag Xbox
            </label>
            <input
              type="text"
              value={pseudo}
              onChange={e => setPseudo(e.target.value)}
              placeholder="Ton Gamertag exact"
              required
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
            />
            <p className="text-xs text-amber-500 mt-1">
              ⚠ Utilise ton Gamertag exact — il sera utilisé par le relais pour t&apos;identifier.
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              required
              minLength={8}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Bouton */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Création en cours..." : "Créer mon compte"}
          </button>

          {/* Lien connexion */}
          <p className="text-center text-sm text-neutral-500">
            Déjà un compte ?{' '}
            <Link href="/connexion" className="text-pink-400 hover:text-pink-300 font-semibold">
              Se connecter
            </Link>
          </p>

        </form>
      </div>
    </main>
  );
}
