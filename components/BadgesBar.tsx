"use client";

import { useState } from 'react';
import type { Badge, BadgeTone } from '@/lib/badges';

// Couleurs discrètes par ton — bordure + fond très légers pour ne pas
// surcharger le profil. Le détail n'apparaît qu'au dépliage.
const TONE_STYLES: Record<BadgeTone, string> = {
  gold:    'border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300',
  violet:  'border-violet-400/40 bg-violet-400/10 text-violet-600 dark:text-violet-300',
  pink:    'border-pink-400/40 bg-pink-400/10 text-pink-600 dark:text-pink-300',
  neutral: 'border-neutral-300 dark:border-neutral-700 bg-neutral-200/40 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300',
};

export function BadgesBar({ badges }: { badges: Badge[] }) {
  const [open, setOpen] = useState(false);
  if (badges.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={`${open ? 'Masquer' : 'Voir'} les ${badges.length} badge${badges.length > 1 ? 's' : ''}`}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
      >
        <span>🏅</span>
        <span>Badges ({badges.length})</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul className="flex flex-wrap gap-2 mt-2">
          {badges.map(b => (
            <li
              key={b.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${TONE_STYLES[b.tone]}`}
            >
              <span aria-hidden="true">{b.emoji}</span>
              <span>{b.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
