"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { usePreferences } from '@/hooks/usePreferences';
import { formatTime } from '@/components/formatTime';
import { dateAbsolute } from '@/lib/dateAbsolute';
import { dateRelative } from '@/lib/dateRelative';
import type { TableColumns } from '@/lib/preferences';

/** Contrôle segmenté générique (boutons radio stylés). */
function Segmented<T extends string | boolean>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
        {hint && <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>}
      </div>
      <div
        role="group"
        aria-label={label}
        className="flex shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1"
      >
        {options.map(opt => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                active
                  ? 'bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6">
      <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4">{title}</h2>
      <div className="flex flex-col gap-5 divide-y divide-neutral-100 dark:divide-neutral-800 [&>*]:pt-5 [&>*:first-child]:pt-0">
        {children}
      </div>
    </section>
  );
}

const SAMPLE_MS = 83456; // 1:23.456
const SAMPLE_DATE = new Date(Date.now() - 2 * 86400 * 1000).toISOString();

const COLUMN_OPTIONS: { key: keyof TableColumns; label: string }[] = [
  { key: 'previousTime', label: 'Ancien meilleur temps' },
  { key: 'diff',         label: 'Différence (gain)' },
  { key: 'gapLeader',    label: 'Écart avec le n°1' },
  { key: 'gapPrev',      label: 'Écart avec le joueur précédent' },
  { key: 'gapNext',      label: 'Écart avec le joueur suivant' },
  { key: 'pi',           label: 'Indice de performance (PI)' },
  { key: 'tune',         label: 'Réglage (share code)' },
  { key: 'discord',      label: 'Tag Discord' },
];

export default function ParametresClient() {
  const { prefs, setPref, reset } = usePreferences();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- pattern d'hydratation (le thème courant n'est connu que côté client)
  useEffect(() => setMounted(true), []);

  const timePreview = formatTime(SAMPLE_MS, { style: prefs.timeStyle, decimalSep: prefs.decimalSep });
  const datePreview = prefs.dateStyle === 'absolute' ? dateAbsolute(SAMPLE_DATE) : dateRelative(SAMPLE_DATE);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">Paramètres</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Ces préférences sont enregistrées sur cet appareil (navigateur) et s&apos;appliquent à tout le site.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Section title="Apparence">
          <Segmented
            label="Thème"
            hint="« Système » suit le réglage clair/sombre de votre appareil."
            value={mounted ? (theme ?? 'system') : 'system'}
            onChange={v => setTheme(v)}
            options={[
              { value: 'light', label: '☀️ Clair' },
              { value: 'dark', label: '🌙 Sombre' },
              { value: 'system', label: '💻 Système' },
            ]}
          />
          <Segmented
            label="Couleurs d'accentuation"
            hint="Recolore dégradés, badges et liens actifs de tout le site."
            value={prefs.accent}
            onChange={v => setPref('accent', v)}
            options={[
              { value: 'pink-violet', label: 'Rose · Violet' },
              { value: 'red-green', label: 'Rouge · Vert' },
              { value: 'blue-yellow', label: 'Bleu · Jaune' },
            ]}
          />
          <Segmented
            label="Taille du texte"
            hint="« Grande » agrandit le texte de tout le site (accessibilité)."
            value={prefs.fontSize}
            onChange={v => setPref('fontSize', v)}
            options={[
              { value: 'normal', label: 'Normale' },
              { value: 'large', label: 'Grande' },
            ]}
          />
          <Segmented
            label="Réduire les animations"
            hint="Désactive transitions et effets de mouvement."
            value={prefs.reduceMotion}
            onChange={v => setPref('reduceMotion', v)}
            options={[
              { value: false, label: 'Non' },
              { value: true, label: 'Oui' },
            ]}
          />
          <Segmented
            label="Contraste élevé"
            hint="Renforce les textes secondaires et les bordures (accessibilité)."
            value={prefs.contrast}
            onChange={v => setPref('contrast', v)}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'Élevé' },
            ]}
          />
        </Section>

        <Section title="Tableaux & temps">
          <Segmented
            label="Format des temps"
            hint={`Aperçu : ${timePreview}`}
            value={prefs.timeStyle}
            onChange={v => setPref('timeStyle', v)}
            options={[
              { value: 'chrono', label: '1:23.456' },
              { value: 'seconds', label: '83.456 s' },
            ]}
          />
          <Segmented
            label="Séparateur décimal"
            value={prefs.decimalSep}
            onChange={v => setPref('decimalSep', v)}
            options={[
              { value: 'point', label: 'Point (.)' },
              { value: 'comma', label: 'Virgule (,)' },
            ]}
          />
          <Segmented
            label="Densité des tableaux"
            hint="« Compact » resserre les lignes (utile sur grand écran)."
            value={prefs.density}
            onChange={v => setPref('density', v)}
            options={[
              { value: 'comfortable', label: 'Confortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
          <Segmented
            label="Affichage des classements"
            hint="« Tableau » aligne tout en colonnes (Catégorie, écarts, réglage…)."
            value={prefs.rankingLayout}
            onChange={v => setPref('rankingLayout', v)}
            options={[
              { value: 'cards', label: 'Cartes' },
              { value: 'table', label: 'Tableau' },
            ]}
          />
        </Section>

        <Section title="Colonnes des classements (PC)">
          <p className="text-xs text-neutral-500 -mt-1">
            S&apos;applique à la vue « Tableau » des classements (réglée ci-dessus). Masque les
            colonnes dont tu ne veux pas pour alléger le tableau.
          </p>
          {COLUMN_OPTIONS.map(col => (
            <Segmented
              key={col.key}
              label={col.label}
              value={prefs.tableColumns[col.key]}
              onChange={v => setPref('tableColumns', { ...prefs.tableColumns, [col.key]: v })}
              options={[
                { value: true, label: 'Affichée' },
                { value: false, label: 'Masquée' },
              ]}
            />
          ))}
        </Section>

        <Section title="Dates">
          <Segmented
            label="Format des dates"
            hint={`Aperçu : ${datePreview}`}
            value={prefs.dateStyle}
            onChange={v => setPref('dateStyle', v)}
            options={[
              { value: 'relative', label: 'Relatif' },
              { value: 'absolute', label: 'Absolu' },
            ]}
          />
        </Section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Réinitialiser les préférences
          </button>
        </div>
      </div>
    </main>
  );
}
