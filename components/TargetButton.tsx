"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/hooks/usePlayer';

export interface TargetConfig {
  targetPlayerId: string;
  trackId:        number;
  carOrdinal:     number;
  carClass:       string;
  drivetrain:     string;
}

/**
 * Bouton « 🎯 Battre ce temps » : fixe (ou retire) un objectif visant le temps
 * d'un pilote précis sur une config. Autonome (comme FollowButton) : gère son
 * propre appel API avec le token de session. Masqué si non connecté ou si la
 * cible est soi-même.
 *
 * `initialActive` permet à un parent qui connaît déjà mes objectifs (ex. profil)
 * d'afficher le bon état au montage ; sinon le bouton démarre « inactif » et se
 * corrige au premier clic (un POST sur un objectif existant est idempotent).
 */
export function TargetButton({
  config,
  initialActive = false,
  compact = false,
}: {
  config: TargetConfig;
  initialActive?: boolean;
  compact?: boolean;
}) {
  const { player } = usePlayer();
  const meId = player?.id ?? null;
  const isSelf = meId !== null && meId === config.targetPlayerId;

  const [active, setActive] = useState(initialActive);
  const [busy,   setBusy]   = useState(false);

  if (!meId || isSelf) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setBusy(false); return; }

    try {
      if (active) {
        const params = new URLSearchParams({
          target_player_id: config.targetPlayerId,
          track_id:         String(config.trackId),
          car_ordinal:      String(config.carOrdinal),
          car_class:        config.carClass,
          drivetrain:       config.drivetrain,
        });
        const res = await fetch(`/api/objectifs?${params.toString()}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setActive(false);
      } else {
        const res = await fetch('/api/objectifs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            target_player_id: config.targetPlayerId,
            track_id:         config.trackId,
            car_ordinal:      config.carOrdinal,
            car_class:        config.carClass,
            drivetrain:       config.drivetrain,
          }),
        });
        // 201 (créé) ou 200 (déjà présent) → objectif actif
        if (res.ok) setActive(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        title={active ? 'Objectif fixé — cliquer pour retirer' : 'Se fixer comme objectif de battre ce temps'}
        aria-label={active ? 'Retirer cet objectif' : 'Battre ce temps'}
        className={`transition-colors text-sm disabled:opacity-50 ${
          active ? 'text-pink-400 hover:text-pink-300' : 'text-neutral-500 hover:text-pink-400'
        }`}
      >
        🎯
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={active ? 'Objectif fixé — cliquer pour retirer' : 'Se fixer comme objectif de battre ce temps'}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${
        active
          ? 'bg-pink-500/15 border border-pink-500/40 text-pink-400 hover:bg-pink-500/25'
          : 'bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-pink-400 hover:text-pink-400'
      }`}
    >
      {active ? '✓ Objectif' : '🎯 Battre ce temps'}
    </button>
  );
}
