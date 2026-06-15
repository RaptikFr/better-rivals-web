"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/hooks/usePlayer';

export interface Notification {
  id:         number;
  message:    string;
  read:       boolean;
  created_at: string;
  type:       'exact' | 'drivetrain' | 'class' | 'rival';
  link:       string | null;
}

export function useNotifications() {
  const { player } = usePlayer();
  const playerId = player?.id ?? null;
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset volontaire quand le joueur se déconnecte
    if (!playerId) { setNotifications([]); return; }

    supabase
      .from('notifications')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setNotifications((data ?? []) as Notification[]));

    const channel = supabase
      .channel(`notifications-player-${playerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `player_id=eq.${playerId}` },
        (payload) => setNotifications(prev => [payload.new as Notification, ...prev]),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [playerId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  async function markAllAsRead() {
    if (!playerId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('player_id', playerId)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function markOneAsRead(id: number) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function deleteAllRead() {
    if (!playerId) return;
    await supabase
      .from('notifications')
      .delete()
      .eq('player_id', playerId)
      .eq('read', true);
    setNotifications(prev => prev.filter(n => !n.read));
  }

  return { notifications, unreadCount, markAllAsRead, markOneAsRead, deleteAllRead };
}
