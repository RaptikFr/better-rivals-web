"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/hooks/usePlayer';

/**
 * Bouton « Suivre » / « Suivi » d'un pilote. Suivre un joueur déclenche une
 * notification (type 'rival') quand il dépasse ton temps sur une config, à
 * n'importe quelle position. Masqué si non connecté ou sur son propre profil.
 */
export function FollowButton({ followedPlayerId }: { followedPlayerId: string }) {
  const { player } = usePlayer();
  const meId = player?.id ?? null;
  const isSelf = meId !== null && meId === followedPlayerId;

  const [following, setFollowing] = useState(false);
  const [ready,     setReady]     = useState(false);
  const [busy,      setBusy]      = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset volontaire avant de recharger l'état de suivi
    if (!meId || isSelf) { setReady(false); return; }
    let cancelled = false;
    supabase
      .from('follows')
      .select('followed_player_id')
      .eq('follower_player_id', meId)
      .eq('followed_player_id', followedPlayerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) { setFollowing(!!data); setReady(true); }
      });
    return () => { cancelled = true; };
  }, [meId, isSelf, followedPlayerId]);

  if (!meId || isSelf || !ready) return null;

  async function toggle() {
    if (!meId) return;
    setBusy(true);
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_player_id', meId)
        .eq('followed_player_id', followedPlayerId);
      setFollowing(false);
    } else {
      await supabase.from('follows')
        .insert({ follower_player_id: meId, followed_player_id: followedPlayerId });
      setFollowing(true);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={following ? 'Ne plus suivre ce pilote' : 'Être notifié quand ce pilote te dépasse'}
      className={`px-4 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 ${
        following
          ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:border-red-400 hover:text-red-400'
          : 'text-white bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90'
      }`}
    >
      {following ? '✓ Suivi' : '+ Suivre'}
    </button>
  );
}
