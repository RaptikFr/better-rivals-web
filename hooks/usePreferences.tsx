"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { formatTime as rawFormatTime } from '@/components/formatTime';
import { dateRelative } from '@/lib/dateRelative';
import { dateAbsolute } from '@/lib/dateAbsolute';
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

  // Persiste + applique les réglages globaux (densité, animations) sur <html>.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* quota plein ou mode privé : on ignore */
    }
    const root = document.documentElement;
    root.classList.toggle('density-compact', prefs.density === 'compact');
    root.classList.toggle('reduce-motion', prefs.reduceMotion);
    root.classList.toggle('accent-red-green', prefs.accent === 'red-green');
    root.classList.toggle('accent-blue-yellow', prefs.accent === 'blue-yellow');
  }, [prefs, ready]);

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
