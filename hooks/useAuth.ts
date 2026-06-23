"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupère la session courante au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Écoute les changements de session (connexion / déconnexion).
    // Supabase ré-émet un événement (TOKEN_REFRESHED / SIGNED_IN) à chaque fois
    // que l'onglet du navigateur reprend le focus, avec un nouvel objet `user`.
    // On ne met à jour l'état que si l'identité change réellement, sinon la
    // nouvelle référence relancerait inutilement tous les effets qui dépendent
    // de `user` (rechargement complet de la page, perte de l'onglet courant…).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser(prev => (prev?.id === next?.id ? prev : next));
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
