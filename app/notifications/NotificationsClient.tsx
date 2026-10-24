"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePlayer } from '@/hooks/usePlayer';
import { dateRelative } from '@/lib/dateRelative';
import type { Notification } from '@/hooks/useNotifications';

// Historique complet des notifications (la cloche n'en montre que 30).
// Lecture directe via le client anon : la RLS de `notifications` limite déjà
// chaque joueur à ses propres lignes (comme useNotifications).

const PAGE = 50;

type Filtre = 'tous' | 'records' | 'rival' | 'duel' | 'objectif';

const FILTRES: { id: Filtre; label: string; types: string[] | null }[] = [
  { id: 'tous',     label: 'Toutes',     types: null },
  { id: 'records',  label: '🏆 Records', types: ['exact', 'drivetrain', 'class'] },
  { id: 'rival',    label: '🎯 Rivaux',  types: ['rival'] },
  { id: 'duel',     label: '⚔️ Duels',   types: ['duel'] },
  { id: 'objectif', label: '🎯 Objectifs', types: ['objectif'] },
];

const BORDURE: Record<string, string> = {
  exact:      'border-l-red-500',
  drivetrain: 'border-l-orange-400',
  class:      'border-l-blue-400',
  rival:      'border-l-emerald-400',
  duel:       'border-l-violet-400',
  objectif:   'border-l-violet-400',
};

export default function NotificationsClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { player } = usePlayer();
  const playerId = player?.id ?? null;

  const [filtre,  setFiltre]  = useState<Filtre>('tous');
  const [items,   setItems]   = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [plus,    setPlus]    = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/connexion');
  }, [user, authLoading, router]);

  const charger = useCallback(async (depuis: number) => {
    if (!playerId) return;
    const types = FILTRES.find(f => f.id === filtre)?.types;
    let q = supabase
      .from('notifications')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(depuis, depuis + PAGE - 1);
    if (types) q = q.in('type', types);
    const { data } = await q;
    const lignes = (data ?? []) as Notification[];
    setItems(prev => depuis === 0 ? lignes : [...prev, ...lignes]);
    setPlus(lignes.length === PAGE);
    setLoading(false);
  }, [playerId, filtre]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rechargement depuis le début quand le filtre ou le joueur change (setState après await)
    charger(0);
  }, [charger]);

  async function toutMarquerLu() {
    if (!playerId) return;
    await supabase.from('notifications').update({ read: true }).eq('player_id', playerId).eq('read', false);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function effacerLues() {
    if (!playerId) return;
    await supabase.from('notifications').delete().eq('player_id', playerId).eq('read', true);
    setItems(prev => prev.filter(n => !n.read));
  }

  async function ouvrir(n: Notification) {
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.link) router.push(n.link);
  }

  if (authLoading || (loading && items.length === 0 && !!playerId)) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement...</p>
    </main>
  );

  const nonLues = items.filter(n => !n.read).length;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Notifications</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Gère les types reçus dans <Link href="/parametres" className="underline hover:text-pink-400">tes paramètres</Link>.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toutMarquerLu}
              disabled={nonLues === 0}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:border-pink-500/50 disabled:opacity-40 transition-colors"
            >
              ✓ Tout marquer lu
            </button>
            <button
              onClick={effacerLues}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 hover:border-red-500/50 hover:text-red-400 transition-colors"
            >
              🗑️ Effacer les lues
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Filtrer par type">
          {FILTRES.map(f => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filtre === f.id}
              onClick={() => { setLoading(true); setFiltre(f.id); }}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                filtre === f.id
                  ? 'bg-pink-500 border-pink-500 text-white'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-pink-500/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="text-center text-neutral-500 py-16">Aucune notification.</p>
        ) : (
          <ul className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {items.map(n => (
              <li key={n.id}>
                <button
                  onClick={() => ouvrir(n)}
                  className={`w-full text-left px-4 py-3 border-b border-neutral-200/60 dark:border-neutral-800/60 border-l-2 ${
                    n.read ? 'border-l-transparent' : `${BORDURE[n.type] ?? 'border-l-pink-500'} bg-neutral-100 dark:bg-neutral-900`
                  } ${n.link ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer' : 'cursor-default'} transition-colors`}
                >
                  <p className={`text-sm leading-snug ${n.read ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-900 dark:text-white font-medium'}`}>
                    {n.message}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{dateRelative(n.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {plus && (
          <div className="text-center mt-4">
            <button
              onClick={() => charger(items.length)}
              className="px-5 py-2 text-sm font-semibold rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-pink-500/50 transition-colors"
            >
              Charger plus
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
