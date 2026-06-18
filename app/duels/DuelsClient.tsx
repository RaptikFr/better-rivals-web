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
import type { DuelView } from '@/lib/duels';
import type { Drivetrain } from '@/types/supabase';

function classementLink(d: DuelView): string {
  const params = new URLSearchParams({
    track_id:   String(d.track_id),
    class:      d.car_class,
    drivetrain: d.drivetrain,
    car:        d.car_label,
  });
  return `/classements?${params.toString()}`;
}

// « il reste 3 j », « il reste 5 h », « bientôt fini » pour une date limite future.
function tempsRestant(deadlineIso: string): string {
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (ms <= 0) return 'résolution imminente';
  const jours = Math.floor(ms / 86_400_000);
  if (jours >= 1) return `il reste ${jours} j`;
  const heures = Math.floor(ms / 3_600_000);
  if (heures >= 1) return `il reste ${heures} h`;
  return 'il reste moins d’1 h';
}

export default function DuelsClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { formatTime } = usePreferences();

  const [duels,   setDuels]   = useState<DuelView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/connexion');
  }, [user, authLoading, router]);

  const fetchDuels = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setLoading(false); return; }
    const res = await fetch('/api/duels', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const { duels } = await res.json() as { duels: DuelView[] };
      setDuels(duels);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial (setState après await)
    if (user) fetchDuels();
  }, [user, fetchDuels]);

  async function respond(id: string, action: 'accept' | 'decline' | 'cancel') {
    setBusyId(id);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/duels', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) await fetchDuels();
    setBusyId(null);
  }

  if (authLoading || loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement...</p>
    </main>
  );

  const recus   = duels.filter(d => d.status === 'pending' && d.role === 'opponent');
  const envoyes = duels.filter(d => d.status === 'pending' && d.role === 'challenger');
  const enCours = duels.filter(d => d.status === 'accepted');
  const termines = duels.filter(d => ['completed', 'declined', 'cancelled'].includes(d.status));

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">⚔️ Mes duels</h1>
          <p className="text-neutral-500">
            Défie un pilote sur une configuration : clique sur ⚔️ à côté de son temps dans un{' '}
            <Link href="/classements" className="text-violet-400 hover:underline">classement</Link> ou sur son profil.
            Le vainqueur est déterminé automatiquement à la date limite.
          </p>
        </div>

        {duels.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="text-neutral-600 dark:text-neutral-300 font-semibold mb-1">Aucun duel pour l’instant</p>
            <p className="text-neutral-500 text-sm mb-6">
              Lance un défi depuis un classement ou le profil d’un joueur.
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
            {recus.length > 0 && (
              <Section title={`Défis reçus (${recus.length})`}>
                {recus.map(d => (
                  <DuelCard key={d.id} d={d} busy={busyId === d.id} onAction={respond} formatTime={formatTime} />
                ))}
              </Section>
            )}
            {enCours.length > 0 && (
              <Section title={`En cours (${enCours.length})`}>
                {enCours.map(d => (
                  <DuelCard key={d.id} d={d} busy={busyId === d.id} onAction={respond} formatTime={formatTime} />
                ))}
              </Section>
            )}
            {envoyes.length > 0 && (
              <Section title={`Défis envoyés (${envoyes.length})`}>
                {envoyes.map(d => (
                  <DuelCard key={d.id} d={d} busy={busyId === d.id} onAction={respond} formatTime={formatTime} />
                ))}
              </Section>
            )}
            {termines.length > 0 && (
              <Section title={`Terminés (${termines.length})`}>
                {termines.map(d => (
                  <DuelCard key={d.id} d={d} busy={busyId === d.id} onAction={respond} formatTime={formatTime} />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DuelCard({
  d, busy, onAction, formatTime,
}: {
  d: DuelView;
  busy: boolean;
  onAction: (id: string, action: 'accept' | 'decline' | 'cancel') => void;
  formatTime: (ms: number) => string;
}) {
  // Couleur de bordure selon l'issue/état.
  const borderClass =
    d.status === 'completed'
      ? d.winner === 'me' ? 'border-emerald-500/40' : d.winner === 'them' ? 'border-red-500/40' : 'border-neutral-300 dark:border-neutral-700'
      : d.status === 'accepted' ? 'border-violet-500/40'
      : 'border-neutral-200 dark:border-neutral-800';

  return (
    <div className={`bg-neutral-100 dark:bg-neutral-900 border rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${borderClass}`}>
      {/* Adversaire + config */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm text-neutral-500">{d.role === 'challenger' ? 'Contre' : 'Défié par'}</span>
          <Link
            href={`/joueurs/${encodeURIComponent(d.opponent_pseudo)}`}
            className="font-bold text-neutral-900 dark:text-white hover:text-violet-400 transition-colors"
          >
            {d.opponent_pseudo}
          </Link>
          <span className="px-2 py-0.5 rounded text-xs font-bold" style={CLASS_STYLES[d.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>
            {d.car_class}
          </span>
          <DrivetrainBadge drivetrain={d.drivetrain as Drivetrain} />
        </div>
        <Link href={classementLink(d)} className="text-sm text-neutral-700 dark:text-neutral-300 hover:text-violet-400 transition-colors">
          {d.track_name} · {d.car_label}
        </Link>
      </div>

      {/* Temps + statut */}
      <div className="flex items-center gap-5 sm:gap-6 flex-shrink-0">
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">Toi</div>
          <div className="font-mono font-bold text-violet-400">{d.my_time_ms !== null ? formatTime(d.my_time_ms) : '—'}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-neutral-500">{d.opponent_pseudo}</div>
          <div className="font-mono font-bold text-neutral-900 dark:text-white">{d.their_time_ms !== null ? formatTime(d.their_time_ms) : '—'}</div>
        </div>
        <div className="text-right min-w-[6rem]">
          <StatusCell d={d} />
        </div>
      </div>

      {/* Actions */}
      {d.status === 'pending' && d.role === 'opponent' && (
        <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
          <button
            onClick={() => onAction(d.id, 'decline')}
            disabled={busy}
            className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm font-bold rounded-lg hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            Refuser
          </button>
          <button
            onClick={() => onAction(d.id, 'accept')}
            disabled={busy}
            className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-violet-600 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Accepter
          </button>
        </div>
      )}
      {d.status === 'pending' && d.role === 'challenger' && (
        <button
          onClick={() => onAction(d.id, 'cancel')}
          disabled={busy}
          title="Annuler ce défi"
          aria-label="Annuler ce défi"
          className="self-end sm:self-auto text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function StatusCell({ d }: { d: DuelView }) {
  if (d.status === 'completed') {
    if (d.winner === 'me')   return <div className="font-bold text-emerald-500 text-sm">🏆 Gagné</div>;
    if (d.winner === 'them') return <div className="font-bold text-red-400 text-sm">Perdu</div>;
    return <div className="font-bold text-neutral-500 text-sm">Égalité</div>;
  }
  if (d.status === 'declined')  return <div className="font-semibold text-neutral-500 text-sm">Décliné</div>;
  if (d.status === 'cancelled') return <div className="font-semibold text-neutral-500 text-sm">Annulé</div>;
  if (d.status === 'pending') {
    return <div className="font-semibold text-amber-500 text-sm">{d.role === 'opponent' ? 'À répondre' : 'En attente'}</div>;
  }
  // accepted (en cours) : écart live + temps restant
  return (
    <div>
      {d.gap_ms === null ? (
        <div className="font-semibold text-amber-500 text-sm">{d.leader === 'them' ? 'Pas couru' : 'En cours'}</div>
      ) : d.gap_ms < 0 ? (
        <div className="font-mono font-bold text-emerald-500 text-sm" title="Tu mènes">−{formatGap(-d.gap_ms)}</div>
      ) : d.gap_ms > 0 ? (
        <div className="font-mono font-bold text-red-400 text-sm" title="Tu es derrière">+{formatGap(d.gap_ms)}</div>
      ) : (
        <div className="font-bold text-neutral-500 text-sm">Égalité</div>
      )}
      <div className="text-[11px] text-neutral-500 mt-0.5">{tempsRestant(d.deadline)}</div>
    </div>
  );
}
