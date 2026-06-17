"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { formatTime as rawFormatTime } from '@/components/formatTime';
import { dateRelative } from '@/lib/dateRelative';
import { dateAbsolute } from '@/lib/dateAbsolute';
import { supabase } from '@/lib/supabase';
import { usePlayer } from '@/hooks/usePlayer';
import type { Json } from '@/types/database.types';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  sanitizePreferences,
  type Preferences,
} from '@/lib/preferences';

interface PreferencesContextValue {
  prefs: Preferences;
  /** `false` tant que les préférences stockées ne sont pas chargées (évite un flash). */
  ready: boolean;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
  /** Formate un temps (ms) selon les préférences courantes. */
  formatTime: (ms: number) => string;
  /** Formate une date ISO selon les préférences courantes. */
  formatDate: (iso: string) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  // On démarre sur les défauts pour matcher le rendu serveur, puis on hydrate
  // depuis le localStorage au montage (évite tout mismatch d'hydratation).
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  // Sync cross-device : pour un joueur connecté, les préférences vivent aussi
  // sur son compte (players.preferences). Anon → localStorage seul.
  const { player } = usePlayer();
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  // Passe à true une fois les prefs du compte réconciliées avec le local, pour
  // ne pas écraser la base avec les défauts avant de l'avoir lue.
  const dbReconciled = useRef(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- lecture localStorage au montage (pattern d'hydratation) */
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) setPrefs(sanitizePreferences(JSON.parse(stored)));
    } catch {
      /* localStorage indisponible ou JSON invalide → on garde les défauts */
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // À la connexion : récupère les préférences du compte. Si la base en a, elles
  // priment (sync depuis un autre appareil) ; sinon on y pousse les prefs locales.
  useEffect(() => {
    dbReconciled.current = false;
    const pid = player?.id;
    if (!pid) return;
    let cancelled = false;
    supabase.from('players').select('preferences').eq('id', pid).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        // Rend visible un échec de sync (ex. migration preferences_sync non
        // appliquée → la colonne/les grants manquent et l'écriture échoue en
        // silence, chaque appareil reste alors sur son localStorage).
        if (error) console.warn('[preferences] lecture compte impossible — migration preferences_sync appliquée ?', error.message);
        const db = data?.preferences;
        if (db && typeof db === 'object' && !Array.isArray(db) && Object.keys(db).length > 0) {
          setPrefs(sanitizePreferences(db));
        } else {
          supabase.from('players').update({ preferences: prefsRef.current as unknown as Json }).eq('id', pid)
            .then(({ error: upErr }) => {
              if (upErr) console.warn('[preferences] écriture compte impossible — migration preferences_sync appliquée ?', upErr.message);
            });
        }
        dbReconciled.current = true;
      });
    return () => { cancelled = true; };
  }, [player?.id]);

  // Persiste (localStorage + compte si connecté) et applique les réglages
  // globaux (densité, animations, accent, taille, contraste) sur <html>.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* quota plein ou mode privé : on ignore */
    }
    if (player?.id && dbReconciled.current) {
      supabase.from('players').update({ preferences: prefs as unknown as Json }).eq('id', player.id)
        .then(({ error }) => {
          if (error) console.warn('[preferences] sauvegarde compte impossible — migration preferences_sync appliquée ?', error.message);
        });
    }
    const root = document.documentElement;
    root.classList.toggle('density-compact', prefs.density === 'compact');
    root.classList.toggle('reduce-motion', prefs.reduceMotion);
    root.classList.toggle('accent-red-green', prefs.accent === 'red-green');
    root.classList.toggle('accent-blue-yellow', prefs.accent === 'blue-yellow');
    root.classList.toggle('text-scale-large', prefs.fontSize === 'large');
    root.classList.toggle('contrast-high', prefs.contrast === 'high');
  }, [prefs, ready, player?.id]);

  const setPref = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setPrefs({ ...DEFAULT_PREFERENCES }), []);

  const value = useMemo<PreferencesContextValue>(() => ({
    prefs,
    ready,
    setPref,
    reset,
    formatTime: (ms: number) => rawFormatTime(ms, { style: prefs.timeStyle, decimalSep: prefs.decimalSep }),
    formatDate: (iso: string) => (prefs.dateStyle === 'absolute' ? dateAbsolute(iso) : dateRelative(iso)),
  }), [prefs, ready, setPref, reset]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences doit être utilisé dans un <PreferencesProvider>');
  return ctx;
}
