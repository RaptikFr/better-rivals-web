"use client";

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import NotificationSettings from '@/components/NotificationSettings';
import { usePreferences } from '@/hooks/usePreferences';
import { formatTime } from '@/components/formatTime';
import { dateAbsolute } from '@/lib/dateAbsolute';
import { dateRelative } from '@/lib/dateRelative';
import type { TableColumns, Skin } from '@/lib/preferences';

/** Contrôle segmenté générique (boutons radio stylés). */
function Segmented<T extends string | boolean>({
  label,
  hint,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
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
        className={`flex shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1 ${disabled ? 'opacity-50' : ''}`}
      >
        {options.map(opt => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${disabled ? 'cursor-not-allowed' : ''} ${
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

const SKIN_OPTIONS: { value: Skin; name: string; desc: string; swatch: React.CSSProperties }[] = [
  {
    value: 'classic',
    name: 'Classic',
    desc: "Le thème d'origine, rose & violet (clair ou sombre).",
    swatch: { background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' },
  },
  {
    value: 'apex',
    name: 'Apex',
    desc: 'Sombre & racing premium, accent orange.',
    swatch: {
      background: 'radial-gradient(120px 60px at 80% 0, rgba(255,94,26,.5), transparent), #0A0B0D',
      boxShadow: 'inset 0 0 0 2px #FF5E1A33',
    },
  },
  {
    value: 'telemetry',
    name: 'Telemetry',
    desc: 'Tech e-sport, cyan + magenta, coins nets.',
    swatch: { background: 'linear-gradient(135deg, #2DE2E6, #04060A 55%, #FF2E97)' },
  },
  {
    value: 'arcade',
    name: 'Arcade',
    desc: 'Coloré & ludique, vert + corail, formes rondes.',
    swatch: { background: 'linear-gradient(135deg, #FFC93C, #FF5C7A 45%, #A678FF)' },
  },
];

/** Sélecteur « Style d'interface » : 4 cartes câblées sur setPref('skin', …). */
function SkinPicker({ value, onChange }: { value: Skin; onChange: (v: Skin) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-neutral-900 dark:text-white">Style d&apos;interface</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          Change toute l&apos;ambiance du site (couleurs, typo, formes). Les skins Apex, Telemetry
          et Arcade sont sombres : le thème clair est désactivé tant que l&apos;un d&apos;eux est actif.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SKIN_OPTIONS.map(skin => {
          const active = skin.value === value;
          return (
            <button
              key={skin.value}
              type="button"
              onClick={() => onChange(skin.value)}
              aria-pressed={active}
              className={`relative text-left rounded-xl border-2 p-3 transition-colors ${
                active
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              {active && (
                <span className="absolute top-2 right-2 grid place-items-center w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold">
                  ✓
                </span>
              )}
              <span className="block h-12 rounded-lg mb-2 border border-white/10" style={skin.swatch} />
              <span className="block text-sm font-bold text-neutral-900 dark:text-white">{skin.name}</span>
              <span className="block text-xs text-neutral-500 leading-tight mt-0.5">{skin.desc}</span>
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
  const darkLocked = prefs.skin !== 'classic'; // skins sombres → thème clair verrouillé

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">Paramètres</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Connecté, tes préférences sont liées à ton compte et te suivent sur tous tes appareils. Déconnecté, elles restent enregistrées sur ce navigateur.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Section title="Apparence">
          <SkinPicker value={prefs.skin} onChange={v => setPref('skin', v)} />
          <Segmented
            label="Thème"
            hint={darkLocked
              ? 'Verrouillé sur sombre par le style d’interface actif (repasse en « Classic » pour le débloquer).'
              : '« Système » suit le réglage clair/sombre de votre appareil.'}
            value={mounted ? (darkLocked ? 'dark' : (theme ?? 'system')) : 'system'}
            onChange={v => setTheme(v)}
            disabled={darkLocked}
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
          <Segmented
            label="Tour optimal par pilote"
            hint="Affiche, sous le temps de chaque pilote, son « tour optimal » personnel (ses meilleurs secteurs combinés de tous ses tours), façon tour optimal de la config mais juste pour lui. N'apparaît que pour les pilotes ayant des données de secteurs."
            value={prefs.showPlayerOptimal}
            onChange={v => setPref('showPlayerOptimal', v)}
            options={[
              { value: false, label: 'Masqué' },
              { value: true, label: 'Affiché' },
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

        <Section title="Coach &amp; copilote">
          <Segmented
            label="Conseils sur ton profil"
            hint="Débloque deux onglets sur ton profil : 🧠 Coach (analyse de ta trace par secteur — où tu perds du temps, freinage, dosage du gaz) et 🔧 Copilote (compte rendu des soucis de réglage relevés en jeu par le relais). Désactivé par défaut : aucun conseil tant que tu ne l'actives pas."
            value={prefs.coachReport}
            onChange={v => setPref('coachReport', v)}
            options={[
              { value: false, label: 'Désactivé' },
              { value: true, label: 'Activé' },
            ]}
          />
        </Section>

        <NotificationSettings />

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
