"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Gestion des notifications du joueur (email + récap hebdo + types in-app),
// déplacée du profil vers /parametres. Composant autonome : il lit et écrit
// directement les colonnes de préférence sur `players` (liées au compte).

const NOTIF_TYPES = [
  { key: 'notify_exact',      label: 'Record battu (config exacte)' },
  { key: 'notify_drivetrain', label: 'Record battu (autre transmission)' },
  { key: 'notify_class',      label: 'Record battu (autre voiture, même classe)' },
  { key: 'notify_rival',      label: 'Un pilote suivi me dépasse' },
] as const;

type NotifTypeKey = (typeof NOTIF_TYPES)[number]['key'];
type NotifColumn  = 'email_notifications_enabled' | 'notify_weekly' | NotifTypeKey;

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
        {hint && <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>}
      </div>
      <div role="group" aria-label={label} className="flex shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
        {[{ v: false, l: 'Non' }, { v: true, l: 'Oui' }].map(o => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={o.v === value}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              o.v === value
                ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NotificationSettings() {
  const { user, loading: authLoading } = useAuth();
  const [playerId,    setPlayerId]    = useState<string | null>(null);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [weeklyEmail, setWeeklyEmail] = useState(false);
  const [types,       setTypes]       = useState<Record<NotifTypeKey, boolean>>({
    notify_exact: true, notify_drivetrain: true, notify_class: true, notify_rival: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fin de chargement quand non connecté
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('players')
        .select('id, email_notifications_enabled, notify_weekly, notify_exact, notify_drivetrain, notify_class, notify_rival')
        .eq('user_id', user.id)
        .single();
      if (cancelled) return;
      if (data) {
        setPlayerId(data.id);
        setEmailNotifs(data.email_notifications_enabled ?? false);
        setWeeklyEmail(data.notify_weekly ?? false);
        setTypes({
          notify_exact:      data.notify_exact      ?? true,
          notify_drivetrain: data.notify_drivetrain ?? true,
          notify_class:      data.notify_class      ?? true,
          notify_rival:      data.notify_rival      ?? true,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  async function persist(col: NotifColumn, value: boolean) {
    if (!playerId) return;
    const updates: Partial<Record<NotifColumn, boolean>> = { [col]: value };
    await supabase.from('players').update(updates).eq('id', playerId);
  }

  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6">
      <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4">Notifications</h2>

      {authLoading || loading ? (
        <p className="text-sm text-neutral-500">Chargement…</p>
      ) : !user ? (
        <p className="text-sm text-neutral-500">Connecte-toi pour gérer tes notifications.</p>
      ) : (
        <div className="flex flex-col gap-5 divide-y divide-neutral-100 dark:divide-neutral-800 [&>*]:pt-5 [&>*:first-child]:pt-0">
          <ToggleRow
            label="Notifications email"
            hint="Email quand tu te fais dépasser à la 1ʳᵉ place sur une config exacte."
            value={emailNotifs}
            onChange={v => { setEmailNotifs(v); persist('email_notifications_enabled', v); }}
          />
          <ToggleRow
            label="Récap hebdomadaire"
            hint="Un email chaque semaine avec tes records pris et perdus."
            value={weeklyEmail}
            onChange={v => { setWeeklyEmail(v); persist('notify_weekly', v); }}
          />
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">Types de notifications in-app</p>
              <p className="text-xs text-neutral-500 mt-0.5">Active ou coupe chaque type indépendamment (cloche 🔔).</p>
            </div>
            {NOTIF_TYPES.map(({ key, label }) => (
              <ToggleRow
                key={key}
                label={label}
                value={types[key]}
                onChange={v => { setTypes(t => ({ ...t, [key]: v })); persist(key, v); }}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
