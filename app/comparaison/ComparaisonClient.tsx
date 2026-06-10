"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { formatTime } from '@/components/formatTime';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { getTypeIcon } from '@/lib/trackIcons';

interface Player {
  id: string;
  pseudo: string;
  discord_tag: string | null;
}

interface LapWithJoins {
  time_ms: number;
  car_class: string;
  car_ordinal: number;
  player_id: string;
  track_id: number;
  drivetrain: string;
  tracks: { name: string; type: string | null; is_sprint: boolean | null } | null;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
}

interface MatchResult {
  key: string;
  trackName: string;
  trackType: string | null;
  carClass: string;
  drivetrain: string;
  carLabel: string;
  time1: number;
  time2: number;
  delta: number; // time2 - time1; positive = P1 wins
}

function formatDelta(absMs: number): string {
  const s = Math.floor(absMs / 1000);
  const ms = absMs % 1000;
  return `${s}.${ms.toString().padStart(3, '0')}s`;
}

// ─── PlayerSearch ────────────────────────────────────────────────────────────

function PlayerSearch({
  label,
  selected,
  onSelect,
  excludeId,
}: {
  label: string;
  selected: Player | null;
  onSelect: (p: Player | null) => void;
  excludeId?: string;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const { data } = await supabase
      .from('players')
      .select('id, pseudo, discord_tag')
      .ilike('pseudo', `%${q}%`)
      .limit(8);
    const filtered = (data ?? []).filter((p) => p.id !== excludeId);
    setSuggestions(filtered);
    setOpen(filtered.length > 0);
  }

  function select(p: Player) {
    onSelect(p);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setQuery('');
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
        {label}
      </label>
      {selected ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
          <span className="flex-1 font-semibold text-neutral-900 dark:text-white truncate">
            {selected.pseudo}
          </span>
          <button
            onClick={clear}
            className="text-neutral-400 hover:text-red-400 transition-colors text-xl leading-none"
            aria-label="Effacer"
          >
            ×
          </button>
        </div>
      ) : (
        <div ref={ref} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Rechercher un joueur…"
            className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-colors"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-50 overflow-hidden py-1">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  onMouseDown={() => select(p)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <span className="font-semibold text-neutral-900 dark:text-white">{p.pseudo}</span>
                  {p.discord_tag && (
                    <span className="text-xs text-neutral-500 truncate">{p.discord_tag}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ComparaisonClient() {
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function compare() {
    if (!player1 || !player2) return;
    setLoading(true);
    setError(null);
    setResults(null);

    const fields =
      'time_ms, car_class, car_ordinal, player_id, track_id, drivetrain, tracks(name, type, is_sprint), cars(manufacturer, name, year)';

    const [{ data: laps1, error: e1 }, { data: laps2, error: e2 }] = await Promise.all([
      fetchAllRows<LapWithJoins>((from, to) =>
        supabase.from('lap_times').select(fields).eq('player_id', player1.id).order('id').range(from, to)
      ),
      fetchAllRows<LapWithJoins>((from, to) =>
        supabase.from('lap_times').select(fields).eq('player_id', player2.id).order('id').range(from, to)
      ),
    ]);

    if (e1 || e2) {
      setError('Erreur lors du chargement des données.');
      setLoading(false);
      return;
    }

    const map2 = new Map(
      laps2.map((l) => [`${l.track_id}-${l.car_class}-${l.drivetrain}-${l.car_ordinal}`, l])
    );

    const matches: MatchResult[] = [];
    for (const l1 of laps1) {
      const key = `${l1.track_id}-${l1.car_class}-${l1.drivetrain}-${l1.car_ordinal}`;
      const l2 = map2.get(key);
      if (!l2) continue;
      matches.push({
        key,
        trackName: l1.tracks?.name ?? 'Circuit inconnu',
        trackType: l1.tracks?.type ?? null,
        carClass: l1.car_class,
        drivetrain: l1.drivetrain,
        carLabel: l1.cars
          ? [l1.cars.year, l1.cars.manufacturer, l1.cars.name].filter(Boolean).join(' ')
          : 'Voiture inconnue',
        time1: l1.time_ms,
        time2: l2.time_ms,
        delta: l2.time_ms - l1.time_ms,
      });
    }

    matches.sort((a, b) => a.trackName.localeCompare(b.trackName, 'fr'));
    setResults(matches);
    setLoading(false);
  }

  const stats = useMemo(() => {
    if (!results) return null;
    const p1Wins = results.filter((r) => r.delta > 0).length;
    const p2Wins = results.filter((r) => r.delta < 0).length;
    const ties = results.filter((r) => r.delta === 0).length;
    return { p1Wins, p2Wins, ties, total: results.length };
  }, [results]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Comparaison joueurs
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Comparez vos temps circuit par circuit avec un autre joueur.
        </p>
      </div>

      {/* Selection */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <PlayerSearch
            label="Joueur 1"
            selected={player1}
            onSelect={(p) => { setPlayer1(p); setResults(null); }}
            excludeId={player2?.id}
          />

          <div className="flex-shrink-0 pb-[14px]">
            <span className="text-lg font-extrabold text-neutral-300 dark:text-neutral-600">VS</span>
          </div>

          <PlayerSearch
            label="Joueur 2"
            selected={player2}
            onSelect={(p) => { setPlayer2(p); setResults(null); }}
            excludeId={player1?.id}
          />

          <button
            onClick={compare}
            disabled={!player1 || !player2 || loading}
            className="flex-shrink-0 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? 'Chargement…' : 'Comparer'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats globales */}
      {stats && player1 && player2 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 text-center">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 truncate">
              {player1.pseudo}
            </p>
            <p className="text-4xl font-extrabold text-green-500">{stats.p1Wins}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              circuit{stats.p1Wins !== 1 ? 's' : ''} devant
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 text-center">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Égalité
            </p>
            <p className="text-4xl font-extrabold text-neutral-400 dark:text-neutral-500">{stats.ties}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              circuit{stats.ties !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 text-center">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 truncate">
              {player2.pseudo}
            </p>
            <p className="text-4xl font-extrabold text-blue-500">{stats.p2Wins}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              circuit{stats.p2Wins !== 1 ? 's' : ''} devant
            </p>
          </div>
        </div>
      )}

      {/* Résultats */}
      {results !== null && (
        results.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">Aucun circuit en commun</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Ces deux joueurs n&apos;ont aucun temps sur le même circuit avec la même voiture, classe et transmission.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {stats?.total} configuration{(stats?.total ?? 0) > 1 ? 's' : ''} en commun
            </p>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
              {/* En-têtes */}
              <div className="hidden sm:grid grid-cols-[1fr_56px_60px_140px_100px_140px] gap-x-3 px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Circuit / Voiture</span>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">Classe</span>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">Trans.</span>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-right truncate">{player1?.pseudo}</span>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">Écart</span>
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-left truncate">{player2?.pseudo}</span>
              </div>

              {/* Lignes */}
              {results.map((match, i) => {
                const p1Wins = match.delta > 0;
                const p2Wins = match.delta < 0;
                const tied = match.delta === 0;
                const absDelta = Math.abs(match.delta);
                const classStyle = CLASS_STYLES[match.carClass] ?? { backgroundColor: '#888', color: '#fff' };

                return (
                  <div
                    key={`${match.key}-${i}`}
                    className={`flex flex-col sm:grid sm:grid-cols-[1fr_56px_60px_140px_100px_140px] gap-x-3 gap-y-2 px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 items-center ${
                      i % 2 === 0 ? '' : 'bg-neutral-50/50 dark:bg-neutral-800/20'
                    }`}
                  >
                    {/* Circuit + voiture */}
                    <div className="min-w-0 w-full">
                      <p className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                        {getTypeIcon(match.trackType ?? '')} {match.trackName}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {match.carLabel}
                      </p>
                    </div>

                    {/* Classe */}
                    <div className="flex sm:justify-center">
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-bold"
                        style={{ backgroundColor: classStyle.backgroundColor, color: classStyle.color }}
                      >
                        {match.carClass}
                      </span>
                    </div>

                    {/* Transmission */}
                    <div className="flex sm:justify-center">
                      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        {match.drivetrain}
                      </span>
                    </div>

                    {/* Temps P1 */}
                    <div className="flex sm:justify-end items-center gap-1.5">
                      {p1Wins && <span className="text-base leading-none">🏆</span>}
                      <span className={`text-sm font-mono font-bold tabular-nums ${
                        p1Wins ? 'text-green-500' : p2Wins ? 'text-red-400 dark:text-red-500' : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {formatTime(match.time1)}
                      </span>
                    </div>

                    {/* Écart */}
                    <div className="flex justify-center">
                      {tied ? (
                        <span className="text-xs font-bold text-neutral-400">=</span>
                      ) : (
                        <span className={`text-xs font-bold ${p1Wins ? 'text-green-500' : 'text-blue-500'}`}>
                          +{formatDelta(absDelta)}
                        </span>
                      )}
                    </div>

                    {/* Temps P2 */}
                    <div className="flex sm:justify-start items-center gap-1.5">
                      <span className={`text-sm font-mono font-bold tabular-nums ${
                        p2Wins ? 'text-blue-500' : p1Wins ? 'text-red-400 dark:text-red-500' : 'text-neutral-700 dark:text-neutral-300'
                      }`}>
                        {formatTime(match.time2)}
                      </span>
                      {p2Wins && <span className="text-base leading-none">🏆</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
