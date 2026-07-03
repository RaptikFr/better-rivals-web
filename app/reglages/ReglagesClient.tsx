"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePreferences } from '@/hooks/usePreferences';
import { usePlayer } from '@/hooks/usePlayer';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { ShareTuneModal } from './ShareTuneModal';

// recharts (~100 KB gz) n'est chargé que si un réglage a des stats de perf
const ReglagePerfBlock = dynamic(
  () => import('./ReglagePerfBlock').then((m) => m.ReglagePerfBlock),
  {
    ssr: false,
    loading: () => <p className="text-neutral-500 animate-pulse text-sm py-8">Chargement des performances…</p>,
  }
);
import type { ReglageEntry } from '@/lib/reglages';
import type { Drivetrain } from '@/types/supabase';

const normCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ');

const CLASS_ORDER = ['D', 'C', 'B', 'A', 'S1', 'S2', 'R', 'X'];
type Sort = 'pertinence' | 'rapides' | 'utilises';

export default function ReglagesClient({ reglages }: { reglages: ReglageEntry[] }) {
  const { formatTime } = usePreferences();
  const { player } = usePlayer();
  // Liste locale : permet l'ajout optimiste après partage (le cache serveur
  // de /reglages se rafraîchit au plus toutes les 5 min).
  const [list,          setList]          = useState(reglages);
  const [shareOpen,     setShareOpen]     = useState(false);
  const [toast,         setToast]         = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [filterClass,   setFilterClass]   = useState('Toutes');
  const [filterDt,      setFilterDt]      = useState<'Tous' | Drivetrain>('Tous');
  const [originalsOnly, setOriginalsOnly] = useState(false);
  const [sort,          setSort]          = useState<Sort>('pertinence');

  function handleShared(entry: ReglageEntry) {
    setList(prev => {
      const i = prev.findIndex(e => e.carOrdinal === entry.carOrdinal && normCode(e.shareCode) === normCode(entry.shareCode));
      if (i >= 0) {
        // Le code existe déjà (dérivé d'un temps) : on y applique la revendication.
        const next = [...prev];
        next[i] = {
          ...next[i],
          label:         entry.label ?? next[i].label,
          isOriginal:    entry.isOriginal || next[i].isOriginal,
          author:        entry.authorClaimed ? entry.author : next[i].author,
          authorClaimed: entry.authorClaimed || next[i].authorClaimed,
        };
        return next;
      }
      return [entry, ...prev];
    });
    setShareOpen(false);
    setToast('Réglage partagé ! Il apparaîtra pour tous dans la bibliothèque sous peu.');
    setTimeout(() => setToast(null), 4000);
  }

  // Facettes disponibles, dérivées des données.
  const classesDispo = useMemo(() => {
    const s = new Set<string>();
    list.forEach(r => r.classes.forEach(c => s.add(c)));
    return CLASS_ORDER.filter(c => s.has(c));
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = list.filter(r => {
      if (originalsOnly && !r.isOriginal) return false;
      if (filterClass !== 'Toutes' && !r.classes.includes(filterClass)) return false;
      if (filterDt !== 'Tous' && !r.drivetrains.includes(filterDt)) return false;
      if (q) {
        const hay = `${r.carLabel} ${r.author ?? ''} ${r.label ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'rapides') {
      out.sort((a, b) => (a.bestTimeMs ?? Infinity) - (b.bestTimeMs ?? Infinity));
    } else if (sort === 'utilises') {
      out.sort((a, b) => b.usageCount - a.usageCount);
    }
    // 'pertinence' : conserve l'ordre serveur (originaux d'abord).
    return out;
  }, [list, search, filterClass, filterDt, originalsOnly, sort]);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">🔧 Bibliothèque de réglages</h1>
            <p className="text-neutral-500 max-w-2xl">
              Les réglages (tunes) partagés par la communauté, par modèle de voiture. Copie un code, va l’appliquer
              dans Forza, et chasse le meilleur temps obtenu avec.
            </p>
          </div>
          {player && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 transition-opacity"
            >
              + Partager un réglage
            </button>
          )}
        </div>

        {toast && (
          <div className="mb-5 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-600 dark:text-green-400 text-sm font-semibold">
            {toast}
          </div>
        )}

        {shareOpen && player && (
          <ShareTuneModal myPseudo={player.pseudo} onClose={() => setShareOpen(false)} onShared={handleShared} />
        )}

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Voiture, auteur, libellé…"
            className="flex-1 min-w-[200px] bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 transition-colors"
          />
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
          >
            <option value="Toutes">Toutes classes</option>
            {classesDispo.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterDt}
            onChange={e => setFilterDt(e.target.value as 'Tous' | Drivetrain)}
            className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
          >
            {(['Tous', 'AWD', 'RWD', 'FWD'] as const).map(d => <option key={d} value={d}>{d === 'Tous' ? 'Toutes transm.' : d}</option>)}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as Sort)}
            className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
          >
            <option value="pertinence">Pertinence</option>
            <option value="rapides">Plus rapides</option>
            <option value="utilises">Plus utilisés</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
            <input type="checkbox" checked={originalsOnly} onChange={e => setOriginalsOnly(e.target.checked)} className="accent-pink-500" />
            ⭐ Originaux
          </label>
        </div>

        <p className="text-xs text-neutral-500 mb-4">{filtered.length} réglage{filtered.length !== 1 ? 's' : ''}</p>

        {filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
            <p className="text-5xl mb-4">🔧</p>
            <p className="text-neutral-600 dark:text-neutral-300 font-semibold mb-1">Aucun réglage pour ces filtres</p>
            <p className="text-neutral-500 text-sm">
              Les réglages apparaissent dès qu’un pilote enregistre un temps avec un code de partage.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => <ReglageCard key={`${r.carOrdinal}-${r.shareCode}`} r={r} formatTime={formatTime} />)}
          </div>
        )}
      </div>
    </main>
  );
}

function ReglageCard({ r, formatTime }: { r: ReglageEntry; formatTime: (ms: number) => string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(r.shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`bg-neutral-100 dark:bg-neutral-900 border rounded-xl p-4 flex flex-col gap-3 ${
      r.isOriginal ? 'border-amber-500/40' : 'border-neutral-200 dark:border-neutral-800'
    }`}>
      {/* Voiture + classes/transmissions */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <Link href={`/voitures/${r.carSlug}`} className="font-bold text-neutral-900 dark:text-white hover:text-pink-400 transition-colors leading-tight">
            {r.carLabel}
          </Link>
          {r.isOriginal && (
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap" title="Réglage revendiqué comme original">⭐ Original</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          {r.classes.map(c => (
            <span key={c} className="px-1.5 py-0.5 rounded text-[11px] font-bold" style={CLASS_STYLES[c] ?? { backgroundColor: '#555', color: '#fff' }}>{c}</span>
          ))}
          {r.drivetrains.map(d => <DrivetrainBadge key={d} drivetrain={d as Drivetrain} />)}
        </div>
      </div>

      {r.label && <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">« {r.label} »</p>}
      {r.optimizedFor && <p className="text-xs text-neutral-500">🎯 Optimisé pour {r.optimizedFor}</p>}

      {/* Code copiable */}
      <button
        onClick={copy}
        title="Copier le code de réglage"
        className="flex items-center justify-between gap-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 hover:border-pink-400 transition-colors group"
      >
        <span className="font-mono font-semibold text-sm text-neutral-800 dark:text-neutral-200 truncate">{r.shareCode}</span>
        <span className="text-xs font-bold flex-shrink-0 text-neutral-400 group-hover:text-pink-400 transition-colors">
          {copied ? <span className="text-green-500">Copié !</span> : 'Copier'}
        </span>
      </button>

      {/* Méta : auteur + usage + meilleur temps */}
      <div className="text-xs text-neutral-500 space-y-1 mt-auto">
        {r.author && (
          <p>
            {r.authorClaimed ? 'Par ' : 'Meilleur pilote : '}
            <Link href={`/joueurs/${encodeURIComponent(r.author)}`} className="font-semibold text-neutral-700 dark:text-neutral-300 hover:text-pink-400 transition-colors">{r.author}</Link>
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span>{r.usageCount > 0 ? `Utilisé par ${r.usageCount} pilote${r.usageCount > 1 ? 's' : ''}` : 'Pas encore utilisé'}</span>
          {r.bestTimeMs !== null && (
            <span className="font-mono font-bold text-pink-400" title={`${r.bestTimeClass}/${r.bestTimeDrivetrain}${r.bestTimeTrackName ? ` sur ${r.bestTimeTrackName}` : ''}`}>
              {formatTime(r.bestTimeMs)}
            </span>
          )}
        </div>
      </div>

      {r.perfStats && <ReglagePerfBlock stats={r.perfStats} />}
    </div>
  );
}
