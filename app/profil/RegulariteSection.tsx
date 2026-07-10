"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dateRelative } from '@/lib/dateRelative';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import type { Drivetrain } from '@/types/supabase';
import type { NiveauRegularite, ScoreRegularite } from '@/lib/regularite';
import type { RegulariteRow } from '@/app/api/regularite/route';

type Status = 'loading' | 'ready' | 'empty' | 'error';

const NIVEAUX: Record<NiveauRegularite, { label: string; classes: string }> = {
  metronome:  { label: '🎯 Métronome',  classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  regulier:   { label: '✅ Régulier',   classes: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  variable:   { label: '〰️ Variable',   classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  irregulier: { label: '⚠️ Irrégulier', classes: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
};

/** ±X,XX s — l'écart-type se lit en secondes, pas au format chrono. */
function ecart(score: ScoreRegularite): string {
  return `±${(score.ecartMs / 1000).toFixed(2).replace('.', ',')} s`;
}

/** Section « Régularité » de l'onglet 📊 Statistiques : dispersion des tours
 *  d'une même session, par config. Les tours sont collectés automatiquement à
 *  chaque tour complet envoyé par le relais (fenêtre glissante de 90 jours). */
export function RegulariteSection() {
  const [status, setStatus] = useState<Status>('loading');
  const [rows, setRows]     = useState<RegulariteRow[]>([]);

  useEffect(() => {
    let annule = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { if (!annule) setStatus('error'); return; }
      try {
        const res = await fetch('/api/regularite', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (annule) return;
        if (!res.ok) { setStatus('error'); return; }
        const json = await res.json();
        const regularites: RegulariteRow[] = json.regularites ?? [];
        setRows(regularites);
        setStatus(regularites.length ? 'ready' : 'empty');
      } catch {
        if (!annule) setStatus('error');
      }
    })();
    return () => { annule = true; };
  }, []);

  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
      <h3 className="font-bold mb-1">🎯 Régularité</h3>
      <p className="text-xs text-neutral-500 mb-4">
        Dispersion de tes tours au sein d&apos;une même session (les tours ratés sont exclus).
        Un pilote « métronome » répète son chrono à quelques dixièmes près.
      </p>

      {status === 'loading' && <p className="text-neutral-500 animate-pulse text-sm">Calcul de ta régularité…</p>}
      {status === 'error'   && <p className="text-red-400 text-sm">Impossible de charger ta régularité. Réessaie plus tard.</p>}
      {status === 'empty'   && (
        <p className="text-neutral-500 text-sm">
          Pas encore de données : enchaîne au moins 3 tours propres sur une même config
          avec le relais lancé, et ton score apparaîtra ici après la session.
        </p>
      )}

      {status === 'ready' && (
        <ul className="space-y-3">
          {rows.map(r => {
            const niveau = NIVEAUX[r.derniere.niveau];
            return (
              <li key={`${r.track_id}|${r.car_ordinal}|${r.car_class}|${r.drivetrain}`}
                className="flex flex-col gap-1.5 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 pb-3 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{r.track_name}</span>
                  <span className="text-sm text-neutral-500 truncate">{r.car_label}</span>
                  <span className="text-xs text-neutral-500">{r.car_class}</span>
                  <DrivetrainBadge drivetrain={r.drivetrain as Drivetrain} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <span className={`font-semibold rounded-full px-2.5 py-0.5 border ${niveau.classes}`}>
                    {niveau.label}
                  </span>
                  <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{ecart(r.derniere)}</span>
                  <span>{r.derniere.nbTours} tours propres{r.derniere.nbToursTotal > r.derniere.nbTours ? ` (sur ${r.derniere.nbToursTotal})` : ''}</span>
                  <span>{dateRelative(new Date(r.derniere.finSession).toISOString())}</span>
                  {r.nbSessions > 1 && r.meilleure.cv < r.derniere.cv && (
                    <span title="Ta session la plus régulière sur cette config">
                      record {ecart(r.meilleure)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
