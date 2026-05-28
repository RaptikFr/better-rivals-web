"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASS_STYLES } from '@/components/ClassStyles';

const ITEMS_PER_PAGE = 50;

const ALL_CLASSES = ['D', 'C', 'B', 'A', 'S1', 'S2', 'R', 'X'] as const;

interface Car {
  id: number;
  manufacturer: string;
  name: string;
  year: number;
  car_type: string | null;
  initial_class: string | null;
}

export default function VoituresClient() {
  const [cars,        setCars]        = useState<Car[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [filterClass, setFilterClass] = useState('Toutes');
  const [filterType,  setFilterType]  = useState('Tous');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('cars')
        .select('id, manufacturer, name, year, car_type, initial_class')
        .order('manufacturer')
        .order('name');

      if (error) {
        setError('Impossible de charger les voitures.');
      } else {
        setCars((data ?? []) as Car[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const uniqueTypes = useMemo(() =>
    ['Tous', ...Array.from(new Set(cars.map(c => c.car_type ?? '').filter(Boolean))).sort()],
    [cars]
  );

  const filtered = useMemo(() =>
    cars.filter(car => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        car.manufacturer.toLowerCase().includes(q) ||
        car.name.toLowerCase().includes(q);
      const matchClass = filterClass === 'Toutes' || car.initial_class === filterClass;
      const matchType  = filterType  === 'Tous'   || car.car_type      === filterType;
      return matchSearch && matchClass && matchType;
    }),
    [cars, search, filterClass, filterType]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, filterClass, filterType]);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto">

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600 mb-3">
            Voitures
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-lg">
            Toutes les voitures de Forza Horizon 6 disponibles sur Better Rivals.
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Rechercher un constructeur ou modèle…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors"
            />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-pink-500 transition-colors"
            >
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Boutons de classe */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterClass('Toutes')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                filterClass === 'Toutes'
                  ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Toutes
            </button>
            {ALL_CLASSES.map(cls => {
              const active = filterClass === cls;
              const c = CLASS_STYLES[cls];
              return (
                <button
                  key={cls}
                  onClick={() => setFilterClass(cls)}
                  style={active ? c : undefined}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    active
                      ? ''
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {cls}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compteur */}
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          {loading
            ? 'Chargement…'
            : `${filtered.length} voiture${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {/* Erreur */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Tableau */}
        {!loading && !error && (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                  {['Constructeur', 'Modèle', 'Année', 'Classe', 'Type'].map(col => (
                    <th key={col} className="text-left px-4 py-3 font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-xs whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                      Aucune voiture trouvée.
                    </td>
                  </tr>
                ) : paginated.map(car => {
                  const c = car.initial_class ? CLASS_STYLES[car.initial_class] : null;
                  return (
                    <tr
                      key={car.id}
                      className="border-b border-neutral-100 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 font-semibold whitespace-nowrap">
                        {car.manufacturer}
                      </td>
                      <td className="px-4 py-3 text-neutral-900 dark:text-white font-bold">
                        {car.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                        {car.year}
                      </td>
                      <td className="px-4 py-3">
                        {car.initial_class && c ? (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-bold"
                            style={c}
                          >
                            {car.initial_class}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        {car.car_type ?? '—'}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Précédent
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - safePage) <= 1
                )
                .reduce<(number | '...')[]>((acc, page, i, arr) => {
                  if (i > 0 && page - (arr[i - 1] as number) > 1) acc.push('...');
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-2 text-neutral-500 dark:text-neutral-600 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item as number)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                        safePage === item
                          ? 'bg-pink-500 text-white border border-pink-500'
                          : 'border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-500'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )
              }
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Suivant →
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
