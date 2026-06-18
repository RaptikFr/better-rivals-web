"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/usePreferences';
import { formatGap } from '@/lib/rivals';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import type { ObjectifView } from '@/lib/objectifs';
import type { Drivetrain } from '@/types/supabase';

// Lien vers le classement de la config (mêmes paramètres que les notifications).
function classementLink(o: ObjectifView): string {
  const params = new URLSearchParams({
    track_id:   String(o.track_id),
    class:      o.car_class,
    drivetrain: o.drivetrain,
    car:        o.car_label,
  });
  return `/classements?${params.toString()}`;
}

export default function ObjectifsClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { formatTime } = usePreferences();

  const [objectifs, setObjectifs] = useState<ObjectifView[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [busyId,    setBusyId]    = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/connexion');
  }, [user, authLoading, router]);

  const fetchObjectifs = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setLoading(false); return; }
    const res = await fetch('/api/objectifs', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const { objectifs } = await res.json() as { objectifs: ObjectifView[] };
      setObjectifs(objectifs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des objectifs (setState après await, pas synchrone)
    if (user) fetchObjectifs();
  }, [user, fetchObjectifs]);

  async function remove(id: string) {
    setBusyId(id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/objectifs?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) setObjectifs(prev => prev.filter(o => o.id !== id));
    setBusyId(null);
  }

  if (authLoading || loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement...</p>
    </main>
  );

  const enCours  = objectifs.filter(o => !o.achieved);
  const atteints = objectifs.filter(o => o.achieved);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">🎯 Mes objectifs</h1>
          <p className="text-neutral-500">
            Bats le temps d’un pilote précis sur une configuration. Fixe un objectif depuis un{' '}
            <Link href="/classements" className="text-pink-400 hover:underline">classement</Link> ou un profil de joueur,
            puis retrouve ici l’écart qu’il te reste à combler.
          </p>
        </div>

        {objectifs.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
            <p className="text-5xl mb-4">🎯</p>
            <p className="text-neutral-600 dark:text-neutral-300 font-semibold mb-1">Aucun objectif pour l’instant</p>
            <p className="text-neutral-500 text-sm mb-6">
              Clique sur 🎯 à côté du temps d’un pilote dans un classement ou sur son profil.
            </p>
            <Link
              href="/classements"
              className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity"
            >
              Parcourir les classements
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {enCours.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  En cours ({enCours.length})
                </h2>
                <div className="space-y-3">
                  {enCours.map(o => (
                    <ObjectifCard key={o.id} o={o} busy={busyId === o.id} onRemove={remove} formatTime={formatTime} />
                  ))}
                </div>
              </section>
            )}
            {atteints.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  Atteints ({atteints.length})
                </h2>
                <div className="space-y-3">
                  {atteints.map(o => (
                    <ObjectifCard key={o.id} o={o} busy={busyId === o.id} onRemove={remove} formatTime={formatTime} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ObjectifCard({
  o, busy, onRemove, formatTime,
}: {
  o: ObjectifView;
  busy: boolean;
  onRemove: (id: string) => void;
  formatTime: (ms: number) => string;
}) {
  const cibleDisparue = o.target_time_ms === 0;

  return (
    <div
      className={`bg-neutral-100 dark:bg-neutral-900 border rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${
        o.achieved
          ? 'border-emerald-500/40'
          : 'border-neutral-200 dark:border-neutral-800'
      }`}
    >
      {/* Cible + config */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm text-neutral-500">Battre</span>
          <Link
            href={`/joueurs/${encodeURIComponent(o.target_pseudo)}`}
            className="font-bold text-neutral-900 dark:text-white hover:text-pink-400 transition-colors"
          >
            {o.target_pseudo}
          </Link>
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={CLASS_STYLES[o.car_class] ?? { backgroundColor: '#555', color: '#fff' }}
          >
            {o.car_class}
          </span>
          <DrivetrainBadge drivetrain={o.drivetrain as Drivetrain} />
        </div>
        <Link href={classementLink(o)} className="text-sm text-neutral-700 dark:text-neutral-300 hover:text-pink-400 transition-colors">
          {o.track_name} · {o.car_label}
        </Link>
      </div>

      {/* Temps + écart */}
      <div className="flex items-center gap-5 sm:gap-6 flex-shrink-0">
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Cible</div>
          <div className="font-mono font-bold text-neutral-900 dark:text-white">
            {cibleDisparue ? '—' : formatTime(o.target_time_ms)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Toi</div>
          <div className="font-mono font-bold text-pink-400">
            {o.my_time_ms !== null ? formatTime(o.my_time_ms) : '—'}
          </div>
        </div>
        <div className="text-right min-w-[5.5rem]">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Statut</div>
          {o.achieved ? (
            <div className="font-bold text-emerald-500 text-sm">✅ Atteint</div>
          ) : cibleDisparue ? (
            <div className="font-semibold text-neutral-500 text-sm">Cible partie</div>
          ) : o.gap_ms === null ? (
            <div className="font-semibold text-amber-500 text-sm">Pas couru</div>
          ) : (
            <div className="font-mono font-bold text-amber-500 text-sm" title="Écart à combler">
              +{formatGap(o.gap_ms)}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onRemove(o.id)}
        disabled={busy}
        title="Retirer cet objectif"
        aria-label="Retirer cet objectif"
        className="self-end sm:self-auto text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
