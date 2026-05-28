"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface Notification {
  id:         number;
  message:    string;
  read:       boolean;
  created_at: string;
  type:       'exact' | 'drivetrain' | 'class';
  link:       string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const [playerId,      setPlayerId]      = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) { setPlayerId(null); setNotifications([]); return; }
    supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setPlayerId(data?.id ?? null));
  }, [user]);

  useEffect(() => {
    if (!playerId) return;

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

  return { notifications, unreadCount, markAllAsRead, markOneAsRead };
}
