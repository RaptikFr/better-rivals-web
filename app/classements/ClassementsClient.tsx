"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Drivetrain, CarClass } from '@/types/supabase';
import { formatTime } from '@/components/formatTime';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DiscordTag } from '@/components/DiscordTag';

interface TuneSetup {
  player_id: string;
  car_ordinal: number;
  share_code: string;
  is_original: boolean | null;
  label: string | null;
  track_id: number | null;
}

interface LapTime {
  id: string;
  time_ms: number;
  car_class: CarClass;
  car_pi: number;
  car_ordinal: number;
  player_id: string;
  track_id: number;
  drivetrain: Drivetrain;
  players: { pseudo: string; discord_tag: string | null } | null;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
  tracks: { name: string; length_km: number | null } | null;
}

interface Track {
  id: number;
  name: string;
}

type SortKey = 'time_ms' | 'pseudo' | 'car' | 'car_pi' | 'drivetrain' | 'track';

const ITEMS_PER_PAGE = 20;
const CAR_CLASSES: Array<"Toutes" | CarClass> = ["Toutes", "D", "C", "B", "A", "S1", "S2", "X"];

function TuneCell({ lap, setups }: { lap: LapTime; setups: TuneSetup[] }) {
  const [copied, setCopied] = useState(false);

  const carSetups = setups.filter(s => s.player_id === lap.player_id && s.car_ordinal === lap.car_ordinal);
  const tune = carSetups.find(s => s.track_id === lap.track_id)
            ?? carSetups.find(s => s.track_id === null)
            ?? null;

  if (!tune) return <span className="text-neutral-600">—</span>;

  async function handleCopy() {
    await navigator.clipboard.writeText(tune!.share_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-1.5">
      <span title={tune.is_original ? 'Réglage original' : 'Réglage partagé'}>{tune.is_original ? '🔧' : '📋'}</span>
      <button
        onClick={handleCopy}
        title="Copier le code de réglage"
        className="font-mono text-sm text-neutral-700 dark:text-neutral-300 hover:text-pink-400 transition-colors"
      >
        {copied ? <span className="text-green-400 font-bold not-italic">Copié !</span> : tune.share_code}
      </button>
    </div>
  );
}

const RAISONS = ['Temps impossible', 'Mauvais circuit sélectionné', 'Autre'] as const;
type Raison = typeof RAISONS[number];

function ReportModal({
  lap,
  onClose,
  onSuccess,
}: {
  lap: LapTime;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [raison, setRaison] = useState<Raison>(RAISONS[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        lap_time_id: lap.id,
        raison,
        details: details.trim() || null,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      onSuccess();
    } else {
      setError(json.error ?? 'Erreur lors du signalement.');
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-5">
        <div>
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mb-1">🚩 Signaler un temps suspect</h2>
          <p className="text-sm text-neutral-500">Ce signalement sera examiné par l&apos;équipe Better Rivals.</p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-1.5 text-sm">
          <p><span className="text-neutral-500">Pilote :</span> <span className="text-neutral-900 dark:text-white font-bold ml-1">{lap.players?.pseudo ?? '—'}</span></p>
          <p><span className="text-neutral-500">Voiture :</span> <span className="text-neutral-700 dark:text-neutral-300 ml-1">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</span></p>
          <p><span className="text-neutral-500">Circuit :</span> <span className="text-neutral-700 dark:text-neutral-300 ml-1">{lap.tracks?.name ?? '—'}</span></p>
          <p><span className="text-neutral-500">Temps :</span> <span className="font-mono font-bold text-pink-400 ml-1">{formatTime(lap.time_ms)}</span></p>
        </div>
        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Raison</label>
          <select
            value={raison}
            onChange={e => setRaison(e.target.value as Raison)}
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-pink-500 transition-colors"
          >
            {RAISONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
            Détails <span className="text-neutral-500 font-normal">(optionnel)</span>
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Précise ce qui te semble suspect..."
            rows={3}
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
          />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-bold rounded-lg hover:bg-red-500/30 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Envoi...' : '🚩 Signaler'}
          </button>
        </div>
      </div>
    </div>
  );
}

const DRIVETRAIN_OPTIONS: Array<"Tous" | Drivetrain> = ["Tous", "AWD", "RWD", "FWD"];

export default function ClassementsClient({
  initialTrackId,
  initialClass,
  initialDrivetrain,
  initialCar,
}: {
  initialTrackId?:    number | null;
  initialClass?:      string;
  initialDrivetrain?: string;
  initialCar?:        string;
} = {}) {

  const { user } = useAuth();

  const [lapTimes,   setLapTimes]   = useState<LapTime[]>([]);
  const [tuneSetups, setTuneSetups] = useState<TuneSetup[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [currentPlayerId,    setCurrentPlayerId]    = useState<string | null>(null);
  const [reportTarget,       setReportTarget]       = useState<LapTime | null>(null);
  const [reportSuccessMsg,   setReportSuccessMsg]   = useState<string | null>(null);

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>('time_ms');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  }

  // Filtres serveur
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(initialTrackId ?? null);
  const [selectedClass, setSelectedClass] = useState(initialClass ?? "Toutes");
  const [selectedDrivetrain, setSelectedDrivetrain] = useState<"Tous" | Drivetrain>(
    (initialDrivetrain as Drivetrain | undefined) ?? "Tous"
  );

  // Filtre circuit avec recherche
  const [trackSearch, setTrackSearch] = useState('');
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);

  // Filtre voiture (client-side)
  const [selectedCar, setSelectedCar] = useState(initialCar ?? 'Toutes');
  const [carSearch, setCarSearch] = useState('');
  const [showCarDropdown, setShowCarDropdown] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Charger la liste des circuits au montage
  useEffect(() => {
    async function fetchTracks() {
      const res = await fetch('/api/circuits');
      if (res.ok) {
        const { circuits } = await res.json();
        setAllTracks(circuits ?? []);
      }
    }
    fetchTracks();
  }, []);

  // Charger le player_id courant si connecté
  useEffect(() => {
    if (!user) { setCurrentPlayerId(null); return; }
    supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setCurrentPlayerId(data?.id ?? null));
  }, [user]);

  // Requête Supabase — se redéclenche quand les filtres serveur changent
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedCar('Toutes');
    setCarSearch('');
    setCurrentPage(1);

    let query = supabase
      .from('lap_times')
      .select(`
        id, time_ms, car_class, car_pi, drivetrain, car_ordinal, player_id, track_id,
        players ( pseudo, discord_tag ),
        cars ( manufacturer, name, year ),
        tracks ( name, length_km )
      `)
      .order('time_ms', { ascending: true });

    if (selectedTrackId !== null) query = query.eq('track_id', selectedTrackId);
    if (selectedClass !== 'Toutes')    query = query.eq('car_class', selectedClass);
    if (selectedDrivetrain !== 'Tous') query = query.eq('drivetrain', selectedDrivetrain);

    // Sans filtre : limite à 200 pour ne pas charger toute la table
    if (selectedTrackId === null && selectedClass === 'Toutes' && selectedDrivetrain === 'Tous') {
      query = query.limit(200);
    }

    const [{ data, error }, { data: setupsData }] = await Promise.all([
      query,
      supabase
        .from('tune_setups')
        .select('player_id, car_ordinal, share_code, is_original, label, track_id'),
    ]);

    if (error) {
      setError("Impossible de charger les classements. Vérifie ta connexion ou réessaie dans quelques instants.");
    } else if (data) {
      setLapTimes(data as LapTime[]);
      setTuneSetups((setupsData ?? []) as TuneSetup[]);
    }
    setIsLoading(false);
  }, [selectedTrackId, selectedClass, selectedDrivetrain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Remettre à la page 1 quand le filtre voiture change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCar]);

  // Fermer les dropdowns au clic en dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.car-dropdown-wrapper'))   setShowCarDropdown(false);
      if (!target.closest('.track-dropdown-wrapper')) setShowTrackDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredTrackOptions = useMemo(() =>
    allTracks.filter(t => t.name.toLowerCase().includes(trackSearch.toLowerCase())),
    [allTracks, trackSearch]
  );

  const selectedTrackName = useMemo(() =>
    allTracks.find(t => t.id === selectedTrackId)?.name ?? '',
    [allTracks, selectedTrackId]
  );

  const uniqueCars = useMemo(() =>
    Array.from(new Set(
      lapTimes.map(lap => `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim())
    )).filter(Boolean).sort(),
    [lapTimes]
  );
  const filteredCarOptions = useMemo(() =>
    uniqueCars.filter(car => car.toLowerCase().includes(carSearch.toLowerCase())),
    [uniqueCars, carSearch]
  );

  const filteredLaps = useMemo(() =>
    lapTimes.filter((lap) => {
      if (selectedCar === 'Toutes') return true;
      const carLabel = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
      return carLabel === selectedCar;
    }),
    [lapTimes, selectedCar]
  );

  const sortedLaps = useMemo(() =>
    [...filteredLaps].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'time_ms':    cmp = a.time_ms - b.time_ms; break;
        case 'pseudo':     cmp = (a.players?.pseudo ?? '').localeCompare(b.players?.pseudo ?? ''); break;
        case 'car':        cmp = (`${a.cars?.manufacturer ?? ''} ${a.cars?.name ?? ''}`).localeCompare(`${b.cars?.manufacturer ?? ''} ${b.cars?.name ?? ''}`); break;
        case 'car_pi':     cmp = a.car_pi - b.car_pi; break;
        case 'drivetrain': cmp = (a.drivetrain ?? '').localeCompare(b.drivetrain ?? ''); break;
        case 'track':      cmp = (a.tracks?.name ?? '').localeCompare(b.tracks?.name ?? ''); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    }),
    [filteredLaps, sortKey, sortDir]
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedLaps.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLaps = sortedLaps.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );
  const globalOffset = (safePage - 1) * ITEMS_PER_PAGE;

  const hasFilters = selectedTrackId !== null || selectedClass !== 'Toutes' || selectedDrivetrain !== 'Tous' || selectedCar !== 'Toutes';

  return (
    <main className="min-h-screen p-6">

      <div className="max-w-screen-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
          Leaderboards
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8 text-lg">
          Filtrez les résultats pour comparer ce qui est comparable.
        </p>

        {/* --- ZONE DES FILTRES --- */}
        <div className="flex flex-col gap-4 mb-6 p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">

          {/* Ligne 1 : Circuit + Classe */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex flex-col relative track-dropdown-wrapper">
              <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Circuit :</label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedTrackId !== null ? selectedTrackName : trackSearch}
                  onChange={e => {
                    setTrackSearch(e.target.value);
                    setSelectedTrackId(null);
                    setShowTrackDropdown(true);
                  }}
                  onFocus={() => setShowTrackDropdown(true)}
                  placeholder="Tous les circuits"
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
                />
                {selectedTrackId !== null && (
                  <button
                    onClick={() => { setSelectedTrackId(null); setTrackSearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >✕</button>
                )}
              </div>
              {showTrackDropdown && filteredTrackOptions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredTrackOptions.map(track => (
                    <button
                      key={track.id}
                      onClick={() => {
                        setSelectedTrackId(track.id);
                        setTrackSearch('');
                        setShowTrackDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        selectedTrackId === track.id
                          ? 'bg-pink-500/20 text-pink-400'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {track.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Classe :</label>
              <select
                className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 rounded-lg focus:outline-none focus:border-pink-500"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {CAR_CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ligne 1b : Voiture avec recherche */}
          <div className="flex flex-col relative car-dropdown-wrapper">
            <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Voiture :</label>
            <div className="relative">
              <input
                type="text"
                value={selectedCar === 'Toutes' ? carSearch : selectedCar}
                onChange={e => {
                  setCarSearch(e.target.value);
                  setSelectedCar('Toutes');
                  setShowCarDropdown(true);
                }}
                onFocus={() => setShowCarDropdown(true)}
                placeholder="Toutes les voitures"
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
              />
              {selectedCar !== 'Toutes' && (
                <button
                  onClick={() => { setSelectedCar('Toutes'); setCarSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                >✕</button>
              )}
            </div>
            {showCarDropdown && filteredCarOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {filteredCarOptions.map((car, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedCar(car);
                      setCarSearch('');
                      setShowCarDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedCar === car
                        ? 'bg-pink-500/20 text-pink-400'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {car}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ligne 2 : Transmission */}
          <div className="flex flex-col">
            <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-2">Transmission :</label>
            <div className="flex flex-wrap gap-2">
              {DRIVETRAIN_OPTIONS.map((dt) => {
                const isActive = selectedDrivetrain === dt;
                const activeColors: Record<typeof dt, string> = {
                  Tous: "bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white",
                  AWD: "bg-blue-500 text-white border-blue-500",
                  RWD: "bg-orange-500 text-white border-orange-500",
                  FWD: "bg-green-500 text-white border-green-500",
                };
                return (
                  <button
                    key={dt}
                    onClick={() => setSelectedDrivetrain(dt)}
                    className={`px-4 py-1.5 rounded-full border text-sm font-bold transition-all ${
                      isActive
                        ? activeColors[dt]
                        : "bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500"
                    }`}
                  >
                    {dt}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Compteur de résultats */}
        {!isLoading && !error && (
          <p className="text-sm text-neutral-500 mb-3">
            {filteredLaps.length} résultat{filteredLaps.length !== 1 ? "s" : ""}
            {hasFilters ? " avec les filtres actuels" : " au total"}
            {totalPages > 1 && ` — page ${safePage} / ${totalPages}`}
          </p>
        )}

        {/* Tableau des temps */}
        <div className="overflow-x-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                {(
                  [
                    { label: '#',            key: 'time_ms'    },
                    { label: 'PILOTE',       key: 'pseudo'     },
                    { label: 'TEMPS',        key: 'time_ms'    },
                    { label: 'VOITURE',      key: 'car'        },
                    { label: 'CLASSE / PI',  key: 'car_pi'     },
                    { label: 'TRANSMISSION', key: 'drivetrain' },
                  ] as { label: string; key: SortKey }[]
                ).map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={() => handleSort(key)}
                    className={`p-4 font-bold tracking-wider cursor-pointer select-none transition-colors ${
                      sortKey === key
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    {label}
                    {sortKey === key && (
                      <span className="text-pink-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
                <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">RÉGLAGES</th>
                <th className="p-4 w-12"></th>
                <th
                  onClick={() => handleSort('track')}
                  className={`p-4 font-bold tracking-wider cursor-pointer select-none transition-colors ${
                    sortKey === 'track'
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  CIRCUIT
                  {sortKey === 'track' && (
                    <span className="text-pink-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-neutral-500 font-medium animate-pulse">
                    Chargement des données télémétriques...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-3xl">⚠️</span>
                      <p className="text-neutral-600 dark:text-neutral-400 font-medium">{error}</p>
                      <button
                        onClick={fetchData}
                        className="mt-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Réessayer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedLaps.length > 0 ? (
                paginatedLaps.map((lap, index) => (
                  <tr key={index} className="border-b border-neutral-200/50 dark:border-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                    <td className="p-4 font-bold text-neutral-500">{globalOffset + index + 1}</td>
                    <td className="p-4 font-bold text-neutral-900 dark:text-white">
                      {lap.players?.pseudo ?? 'Inconnu'}
                      <DiscordTag tag={lap.players?.discord_tag} />
                    </td>
                    <td className="p-4 font-mono font-bold text-pink-400 text-lg">
                      {formatTime(lap.time_ms)}
                    </td>
                    <td className="p-4 text-neutral-700 dark:text-neutral-300">
                      {lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-bold mr-2" style={CLASS_STYLES[lap.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>
                        {lap.car_class}
                      </span>
                      <span className="text-sm text-neutral-500 font-mono">PI {lap.car_pi}</span>
                    </td>
                    <td className="p-4">
                      <DrivetrainBadge drivetrain={lap.drivetrain} />
                    </td>
                    <td className="p-4">
                      <TuneCell lap={lap} setups={tuneSetups} />
                    </td>
                    <td className="p-4 text-right">
                      {user && currentPlayerId !== null && lap.player_id !== currentPlayerId && (
                        <button
                          onClick={() => setReportTarget(lap)}
                          title="Signaler ce temps comme suspect"
                          className="text-neutral-500 hover:text-red-400 transition-colors"
                        >
                          🚩
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-neutral-600 dark:text-neutral-400">
                      {lap.tracks?.name ?? 'Inconnu'}{lap.tracks?.length_km ? ` (${lap.tracks.length_km} km)` : ''}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                <td colSpan={9} className="p-12 text-center text-neutral-500 font-medium">
                    Aucun temps ne correspond à ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION --- */}
        {!isLoading && !error && totalPages > 1 && (
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
                .reduce<(number | "...")[]>((acc, page, i, arr) => {
                  if (i > 0 && page - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-2 text-neutral-500 dark:text-neutral-600 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item as number)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                        safePage === item
                          ? "bg-pink-500 text-white border border-pink-500"
                          : "border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-500"
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

      {reportTarget && (
        <ReportModal
          lap={reportTarget}
          onClose={() => setReportTarget(null)}
          onSuccess={() => {
            setReportTarget(null);
            setReportSuccessMsg('✅ Signalement envoyé. Notre équipe va examiner ce temps.');
            setTimeout(() => setReportSuccessMsg(null), 4000);
          }}
        />
      )}

      {reportSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-40 bg-green-500/20 border border-green-500/30 text-green-400 px-5 py-3 rounded-xl text-sm font-bold shadow-xl">
          {reportSuccessMsg}
        </div>
      )}
    </main>
  );
}
