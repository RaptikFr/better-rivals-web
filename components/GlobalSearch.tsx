"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface PlayerHit { pseudo: string }
interface TrackHit  { id: number; name: string; is_official: boolean }
interface CarHit    { id: number; manufacturer: string | null; name: string; year: number | null }

interface SearchResults {
  players: PlayerHit[];
  tracks:  TrackHit[];
  cars:    CarHit[];
}

const EMPTY: SearchResults = { players: [], tracks: [], cars: [] };

const ROW_CLASS = "w-full flex items-center gap-3 px-4 py-2 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{title}</p>
      {children}
    </div>
  );
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [searching, setSearching] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fermeture au clic extérieur (même pattern que les dropdowns de la navbar)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Échap ferme, Ctrl+K / Cmd+K ouvre
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset volontaire de la recherche à la fermeture
    else { setQuery(''); setResults(EMPTY); }
  }, [open]);

  // Recherche avec debounce
  useEffect(() => {
    // Les caractères spéciaux d'ilike et la syntaxe or() de PostgREST sont neutralisés
    const q = query.trim().replace(/[%_,()]/g, ' ').trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- vide les résultats tant que la requête est trop courte
      setResults(EMPTY);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const [playersRes, tracksRes, carsRes] = await Promise.all([
        supabase.from('players').select('pseudo').ilike('pseudo', `%${q}%`).order('pseudo').limit(5),
        supabase.from('tracks').select('id, name, is_official').ilike('name', `%${q}%`).order('name').limit(5),
        supabase.from('cars').select('id, manufacturer, name, year')
          .or(`name.ilike.%${q}%,manufacturer.ilike.%${q}%`)
          .order('manufacturer').order('name').limit(5),
      ]);
      setResults({
        players: (playersRes.data ?? []) as PlayerHit[],
        tracks:  (tracksRes.data  ?? []) as TrackHit[],
        cars:    (carsRes.data    ?? []) as CarHit[],
      });
      setSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const hasResults = results.players.length + results.tracks.length + results.cars.length > 0;
  const showPanel  = query.trim().length >= 2;

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Rechercher (Ctrl+K)"
        aria-label="Rechercher"
        className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[22rem] max-lg:fixed max-lg:left-4 max-lg:right-4 max-lg:top-16 max-lg:w-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Joueur, circuit, voiture..."
              className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          {showPanel && (
            <div className="max-h-[380px] overflow-y-auto">
              {searching && !hasResults ? (
                <p className="text-sm text-neutral-500 text-center py-6">Recherche...</p>
              ) : !hasResults ? (
                <p className="text-sm text-neutral-500 text-center py-6">Aucun résultat.</p>
              ) : (
                <>
                  {results.players.length > 0 && (
                    <Section title="Joueurs">
                      {results.players.map(p => (
                        <button key={p.pseudo} onClick={() => go(`/joueurs/${encodeURIComponent(p.pseudo)}`)} className={ROW_CLASS}>
                          <span>👤</span>
                          <span className="truncate">{p.pseudo}</span>
                        </button>
                      ))}
                    </Section>
                  )}
                  {results.tracks.length > 0 && (
                    <Section title="Circuits">
                      {results.tracks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => go(`${t.is_official ? '/classements' : '/classements-communaute'}?track_id=${t.id}`)}
                          className={ROW_CLASS}
                        >
                          <span>🏁</span>
                          <span className="truncate flex-1">{t.name}</span>
                          {!t.is_official && (
                            <span className="text-[10px] font-bold uppercase text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded">Communauté</span>
                          )}
                        </button>
                      ))}
                    </Section>
                  )}
                  {results.cars.length > 0 && (
                    <Section title="Voitures">
                      {results.cars.map(c => (
                        <button key={c.id} onClick={() => go(`/voitures?search=${encodeURIComponent(c.name)}`)} className={ROW_CLASS}>
                          <span>🚗</span>
                          <span className="truncate">{`${c.year ?? ''} ${c.manufacturer ?? ''} ${c.name}`.trim()}</span>
                        </button>
                      ))}
                    </Section>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
