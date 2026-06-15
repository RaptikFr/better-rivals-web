"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface PlayerProfile {
  id:          string;
  pseudo:      string;
  discord_tag: string | null;
}

// Cache module : une seule requête players par utilisateur connecté,
// partagée entre tous les composants qui montent le hook.
let cachedUserId: string | null = null;
let cachedPromise: Promise<PlayerProfile | null> | null = null;

async function fetchPlayer(userId: string): Promise<PlayerProfile | null> {
  const { data } = await supabase
    .from('players')
    .select('id, pseudo, discord_tag:discord_tag_public')
    .eq('user_id', userId)
    .single();
  return data ?? null;
}

export function usePlayer() {
  const { user, loading: authLoading } = useAuth();
  const [player,  setPlayer]  = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      cachedUserId = null;
      cachedPromise = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset volontaire du profil à la déconnexion
      setPlayer(null);
      setLoading(false);
      return;
    }
    if (cachedUserId !== user.id || !cachedPromise) {
      cachedUserId = user.id;
      cachedPromise = fetchPlayer(user.id);
    }
    let cancelled = false;
    cachedPromise.then(p => {
      if (!cancelled) { setPlayer(p); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { player, loading };
}
