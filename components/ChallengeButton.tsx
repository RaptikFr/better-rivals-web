"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/hooks/usePlayer';
import type { TargetConfig } from '@/components/TargetButton';

/**
 * Bouton « ⚔️ Défier » : envoie un défi à un pilote sur une config. À placer à
 * côté de TargetButton (même objet `config`, la cible devient l'adversaire).
 * Autonome (token de session). Masqué si non connecté ou si la cible est soi.
 *
 * Contrairement à l'objectif (bascule), un défi est une action one-shot : une
 * fois envoyé, le bouton passe en « envoyé ». L'API exige que je possède un
 * temps sur la config (on défie sur son propre terrain) — sinon message d'aide.
 */
export function ChallengeButton({
  config,
  compact = false,
}: {
  config: TargetConfig;
  compact?: boolean;
}) {
  const { player } = usePlayer();
  const meId = player?.id ?? null;
  const isSelf = meId !== null && meId === config.targetPlayerId;

  const [status, setStatus] = useState<'idle' | 'sent'>('idle');
  const [busy,   setBusy]   = useState(false);
  const [title,  setTitle]  = useState('Défier ce pilote sur cette config');

  if (!meId || isSelf) return null;

  async function send() {
    if (busy || status === 'sent') return;
    if (!window.confirm('Envoyer un défi à ce pilote sur cette configuration ? (durée : 7 jours)')) return;
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setBusy(false); return; }

    try {
      const res = await fetch('/api/duels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          opponent_id: config.targetPlayerId,
          track_id:    config.trackId,
          car_ordinal: config.carOrdinal,
          car_class:   config.carClass,
          drivetrain:  config.drivetrain,
        }),
      });
      if (res.ok) {
        setStatus('sent');
        setTitle('Défi envoyé ✓');
      } else {
        const json = await res.json().catch(() => ({}));
        setTitle(json.error ?? 'Impossible d’envoyer le défi.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={send}
        disabled={busy || status === 'sent'}
        title={title}
        aria-label="Défier ce pilote"
        className={`transition-colors text-sm disabled:opacity-50 ${
          status === 'sent' ? 'text-violet-400' : 'text-neutral-500 hover:text-violet-400'
        }`}
      >
        ⚔️
      </button>
    );
  }

  return (
    <button
      onClick={send}
      disabled={busy || status === 'sent'}
      title={title}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-60 ${
        status === 'sent'
          ? 'bg-violet-500/15 border border-violet-500/40 text-violet-400'
          : 'bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-violet-400 hover:text-violet-400'
      }`}
    >
      {status === 'sent' ? '✓ Défi envoyé' : '⚔️ Défier'}
    </button>
  );
}
