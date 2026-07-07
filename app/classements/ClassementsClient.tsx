"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { circuitSlug } from '@/lib/circuitSlug';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { useAuth } from '@/hooks/useAuth';
import { usePlayer } from '@/hooks/usePlayer';
import type { Drivetrain, CarClass } from '@/types/supabase';
import { usePreferences } from '@/hooks/usePreferences';
import { DRIVETRAIN_FILTER_COLORS } from '@/components/DrivetrainBadge';
import {
  type LapTime, type Track, type RankedLap, type SubGroup, type CircuitGroup, type BestSectorRow, type TheoreticalLap,
  CAR_CLASS_ORDER, CIRCUITS_PER_PAGE, STORAGE_KEY, CAR_CLASSES, DRIVETRAIN_OPTIONS,
  ReportModal, theoreticalFromBest,
} from './classementsShared';
import { RankingTableView, RankingCardView } from './RankingViews';

// Ligne best_sectors telle que lue (anon), désormais PAR JOUEUR (player_id), avec
// le pseudo embarqué. Plusieurs lignes par index (une par pilote) → on réduit au
// min pour le tour optimal global et on regroupe par pilote pour le tour perso.
type BestSectorRaw = {
  player_id:   string;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  sector_index: number;
  best_ms:     number;
  players:     { pseudo: string | null } | null;
};

export default function ClassementsClient({
  initialTrackId,
  initialClass,
  initialDrivetrain,
  initialCar,
  communityOnly = false,
}: {
  initialTrackId?:    number | null;
  initialClass?:      string;
  initialDrivetrain?: string;
  initialCar?:        string;
  communityOnly?:     boolean;
} = {}) {

  const { formatTime, prefs } = usePreferences();
  const cols = prefs.tableColumns;
  const decSep = prefs.decimalSep === 'comma' ? ',' : '.';
  /** Écart formaté (ms → « +1,234s »), respecte le séparateur décimal choisi. */
  const gapStr = (ms: number) => `+${(ms / 1000).toFixed(3).replace('.', decSep)}s`;
  const { user } = useAuth();
  const { player } = usePlayer();
  const currentPlayerId     = player?.id     ?? null;
  const currentPlayerPseudo = player?.pseudo ?? null;

  const [lapTimes,   setLapTimes]   = useState<LapTime[]>([]);
  // Meilleurs secteurs par config (best_sectors) du circuit affiché → tour optimal.
  const [bestSectors, setBestSectors] = useState<BestSectorRaw[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [myTimesOnly,        setMyTimesOnly]        = useState(false);
  const [reportTarget,       setReportTarget]       = useState<LapTime | null>(null);
  const [reportSuccessMsg,   setReportSuccessMsg]   = useState<string | null>(null);

  // Filtres serveur
  const [allTracks,          setAllTracks]          = useState<Track[]>([]);
  const [selectedTrackId,    setSelectedTrackId]    = useState<number | null>(initialTrackId ?? null);
  const [selectedClass,      setSelectedClass]      = useState(initialClass ?? "Toutes");
  const [selectedDrivetrain, setSelectedDrivetrain] = useState<"Tous" | Drivetrain>(
    (initialDrivetrain as Drivetrain | undefined) ?? "Tous"
  );
  const [storageLoaded, setStorageLoaded] = useState(false);

  // Filtre circuit avec recherche
  const [trackSearch,       setTrackSearch]       = useState('');
  const [showTrackDropdown, setShowTrackDropdown] = useState(false);

  // Filtre voiture (client-side)
  const [selectedCar,    setSelectedCar]    = useState(initialCar ?? 'Toutes');
  const [carSearch,      setCarSearch]      = useState('');
  const [showCarDropdown, setShowCarDropdown] = useState(false);

  // Filtre pseudo (client-side)
  const [pseudoSearch, setPseudoSearch] = useState('');

  // Partage global
  const [linkCopied,  setLinkCopied]  = useState(false);
  // Partage / highlight par ligne
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  // Accordéon sous-groupes
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Restaure les filtres depuis localStorage (les props URL ont priorité)
  /* eslint-disable react-hooks/set-state-in-effect -- restauration des filtres au montage (localStorage indisponible en SSR) */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (typeof initialTrackId !== 'number') {
          if (typeof stored.trackId === 'number') setSelectedTrackId(stored.trackId);
        }
        if (typeof initialClass !== 'string') {
          if (typeof stored.class === 'string') setSelectedClass(stored.class);
        }
        if (typeof initialDrivetrain !== 'string') {
          if (typeof stored.drivetrain === 'string') setSelectedDrivetrain(stored.drivetrain as "Tous" | Drivetrain);
        }
      }
    } catch {}
    setStorageLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sauvegarde les filtres persistants à chaque changement (après la restauration initiale)
  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        trackId: selectedTrackId,
        class: selectedClass,
        drivetrain: selectedDrivetrain,
      }));
    } catch {}
  }, [selectedTrackId, selectedClass, selectedDrivetrain, storageLoaded]);

  useEffect(() => {
    async function fetchTracks() {
      const res = await fetch('/api/circuits');
      if (res.ok) {
        const { circuits } = await res.json();
        const list: Track[] = circuits ?? [];
        setAllTracks(communityOnly ? list.filter(t => t.is_official === false) : list);
      }
    }
    fetchTracks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    if (selectedTrackId === null) {
      setLapTimes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedCar('Toutes');
    setCarSearch('');
    setCurrentPage(1);

    const { data, error } = await fetchAllRows<LapTime>((from, to) => {
      let query = supabase
        .from('lap_times')
        .select(`
          id, time_ms, previous_time_ms, sectors_ms, car_class, car_pi, drivetrain, car_ordinal, player_id, track_id, share_code, setup_author,
          players ( pseudo, discord_tag:discord_tag_public ),
          cars ( manufacturer, name, year ),
          tracks ( name, length_km, type, is_sprint )
        `)
        .eq('track_id', selectedTrackId);
      if (selectedClass !== 'Toutes')    query = query.eq('car_class', selectedClass);
      if (selectedDrivetrain !== 'Tous') query = query.eq('drivetrain', selectedDrivetrain);
      return query
        .order('time_ms', { ascending: true })
        .order('id')
        .range(from, to);
    });

    // Meilleurs secteurs (tour optimal) du circuit — best-effort. Per-joueur :
    // potentiellement > 1000 lignes (pilotes × secteurs) → fetchAllRows pour ne
    // rien tronquer. Si ça échoue, la bannière retombe sur le tour théorique.
    const { data: bsData } = await fetchAllRows<BestSectorRaw>((from, to) => {
      let q = supabase
        .from('best_sectors')
        .select('player_id, car_ordinal, car_class, drivetrain, sector_index, best_ms, players ( pseudo )')
        .eq('track_id', selectedTrackId);
      if (selectedClass !== 'Toutes')    q = q.eq('car_class', selectedClass);
      if (selectedDrivetrain !== 'Tous') q = q.eq('drivetrain', selectedDrivetrain);
      return q.order('player_id').order('sector_index').range(from, to);
    });
    setBestSectors(bsData);

    if (error) {
      setError("Impossible de charger les classements. Vérifie ta connexion ou réessaie dans quelques instants.");
    } else {
      setLapTimes(data);
    }
    setIsLoading(false);
  }, [selectedTrackId, selectedClass, selectedDrivetrain]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- (re)chargement des temps quand les filtres changent
  useEffect(() => { fetchData(); }, [fetchData]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- retour à la page 1 quand les filtres secondaires changent
  useEffect(() => { setCurrentPage(1); }, [selectedCar, pseudoSearch, myTimesOnly]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- replie les groupes quand on change de circuit
  useEffect(() => { setOpenGroups(new Set()); }, [selectedTrackId]);

  // Lit le paramètre ?highlight= à l'arrivée sur la page
  useEffect(() => {
    const h = new URLSearchParams(window.location.search).get('highlight');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture de l'URL au montage (window indisponible en SSR)
    if (h) setHighlightId(h);
  }, []);


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
    lapTimes.filter(lap => {
      if (selectedCar !== 'Toutes') {
        const carLabel = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
        if (carLabel !== selectedCar) return false;
      }
      if (pseudoSearch) {
        const pseudo = lap.players?.pseudo?.toLowerCase() ?? '';
        if (!pseudo.includes(pseudoSearch.toLowerCase())) return false;
      }
      if (myTimesOnly && currentPlayerPseudo) {
        if (lap.players?.pseudo !== currentPlayerPseudo) return false;
      }
      return true;
    }),
    [lapTimes, selectedCar, pseudoSearch, myTimesOnly, currentPlayerPseudo]
  );

  // Groupement hiérarchique : circuit → (classe × transmission × voiture)
  const circuitGroups = useMemo((): CircuitGroup[] => {
    const byTrack = new Map<number, LapTime[]>();
    for (const lap of filteredLaps) {
      if (!byTrack.has(lap.track_id)) byTrack.set(lap.track_id, []);
      byTrack.get(lap.track_id)!.push(lap);
    }

    // best_sectors bruts (per-joueur) regroupés par config (même clé que les
    // sous-groupes). On en tire ensuite le tour optimal GLOBAL (min par index)
    // et le tour optimal de chaque PILOTE (ses propres lignes).
    const bsRawByConfig = new Map<string, BestSectorRaw[]>();
    for (const r of bestSectors) {
      const key = `${r.car_class}|${r.drivetrain}|${r.car_ordinal}`;
      if (!bsRawByConfig.has(key)) bsRawByConfig.set(key, []);
      bsRawByConfig.get(key)!.push(r);
    }
    // Tour optimal global = meilleur (min) temps par index, tous pilotes confondus.
    const globalRows = (rows: BestSectorRaw[]): BestSectorRow[] => {
      const byIdx = new Map<number, { best_ms: number; pseudo: string | null }>();
      for (const r of rows) {
        const cur = byIdx.get(r.sector_index);
        if (!cur || r.best_ms < cur.best_ms) byIdx.set(r.sector_index, { best_ms: r.best_ms, pseudo: r.players?.pseudo ?? null });
      }
      return [...byIdx.entries()].map(([sector_index, v]) => ({ sector_index, best_ms: v.best_ms, pseudo: v.pseudo }));
    };

    const groups: CircuitGroup[] = [];

    for (const [trackId, laps] of byTrack) {
      const sample = laps[0];
      const bySubGroup = new Map<string, LapTime[]>();

      for (const lap of laps) {
        const key = `${lap.car_class}|${lap.drivetrain}|${lap.car_ordinal}`;
        if (!bySubGroup.has(key)) bySubGroup.set(key, []);
        bySubGroup.get(key)!.push(lap);
      }

      const subGroups: SubGroup[] = [...bySubGroup.entries()]
        .sort(([keyA], [keyB]) => {
          const [classA, driveA] = keyA.split('|');
          const [classB, driveB] = keyB.split('|');
          const ordA = CAR_CLASS_ORDER.indexOf(classA);
          const ordB = CAR_CLASS_ORDER.indexOf(classB);
          if (ordA !== ordB) return ordA - ordB;
          return driveA.localeCompare(driveB);
        })
        .map(([key, subLaps]) => {
          const [carClass, drivetrain] = key.split('|') as [CarClass, Drivetrain];
          const s = subLaps[0];
          const carLabel = `${s.cars?.year ?? ''} ${s.cars?.manufacturer ?? ''} ${s.cars?.name ?? ''}`.trim() || 'Voiture inconnue';
          const sorted = [...subLaps].sort((a, b) => a.time_ms - b.time_ms);
          const rankedLaps = sorted.map((lap, i) => ({ ...lap, rank: i + 1 })) as RankedLap[];
          const rawRows = bsRawByConfig.get(key) ?? [];
          const optimal = theoreticalFromBest(globalRows(rawRows), rankedLaps[0].time_ms);
          // Tour optimal de CHAQUE pilote : ses propres lignes best_sectors, avec
          // son PB comme référence de gain. Calculé une fois par config ici.
          const byPlayer = new Map<string, BestSectorRow[]>();
          for (const r of rawRows) {
            if (!byPlayer.has(r.player_id)) byPlayer.set(r.player_id, []);
            byPlayer.get(r.player_id)!.push({ sector_index: r.sector_index, best_ms: r.best_ms, pseudo: r.players?.pseudo ?? null });
          }
          const pbByPlayer = new Map(rankedLaps.map(l => [l.player_id, l.time_ms]));
          const optimalByPlayer = new Map<string, TheoreticalLap | null>();
          for (const [pid, rows] of byPlayer) {
            optimalByPlayer.set(pid, theoreticalFromBest(rows, pbByPlayer.get(pid) ?? 0));
          }
          return { key, carClass, drivetrain, carLabel, laps: rankedLaps, optimal, optimalByPlayer };
        });

      groups.push({
        trackId,
        trackName: sample.tracks?.name ?? 'Circuit inconnu',
        trackLengthKm: sample.tracks?.length_km ?? null,
        trackType: sample.tracks?.type ?? null,
        trackIsSprint: sample.tracks?.is_sprint ?? null,
        subGroups,
      });
    }

    return groups.sort((a, b) => a.trackName.localeCompare(b.trackName));
  }, [filteredLaps, bestSectors]);

  // Navigue vers la page contenant la ligne mise en évidence et déplie sa config
  useEffect(() => {
    if (!highlightId || circuitGroups.length === 0) return;
    const groupIndex = circuitGroups.findIndex(g =>
      g.subGroups.some(sg => sg.laps.some(l => l.id === highlightId))
    );
    if (groupIndex === -1) return;
    const subGroupKey = circuitGroups[groupIndex].subGroups
      .find(sg => sg.laps.some(l => l.id === highlightId))?.key;
    const targetPage = Math.floor(groupIndex / CIRCUITS_PER_PAGE) + 1;
    /* eslint-disable react-hooks/set-state-in-effect -- saute à la page et déplie la config contenant la ligne mise en évidence */
    setCurrentPage(targetPage);
    if (subGroupKey) setOpenGroups(prev => (prev.has(subGroupKey) ? prev : new Set(prev).add(subGroupKey)));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [highlightId, circuitGroups]);

  // Scrolle jusqu'à la ligne mise en évidence — attend la fin du chargement
  useEffect(() => {
    if (!highlightId || isLoading) return;
    const timer = setTimeout(() => {
      document.querySelector(`[data-lap-id="${highlightId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [highlightId, currentPage, isLoading]);

  const totalSubGroups = circuitGroups.reduce((sum, g) => sum + g.subGroups.length, 0);
  const totalPages = Math.max(1, Math.ceil(circuitGroups.length / CIRCUITS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedGroups = circuitGroups.slice(
    (safePage - 1) * CIRCUITS_PER_PAGE,
    safePage * CIRCUITS_PER_PAGE
  );

  const hasFilters = selectedTrackId !== null || selectedClass !== 'Toutes' || selectedDrivetrain !== 'Tous' || selectedCar !== 'Toutes' || pseudoSearch !== '' || myTimesOnly;

  async function handleShareRow(lapId: string) {
    const params = new URLSearchParams();
    if (selectedTrackId !== null)      params.set('track_id',  String(selectedTrackId));
    if (selectedClass !== 'Toutes')    params.set('class',      selectedClass);
    if (selectedDrivetrain !== 'Tous') params.set('drivetrain', selectedDrivetrain);
    if (selectedCar !== 'Toutes')      params.set('car',        encodeURIComponent(selectedCar));
    params.set('highlight', lapId);
    const url = `${window.location.origin}/classements?${params.toString()}`;
    await navigator.clipboard.writeText(url);
    setCopiedRowId(lapId);
    setTimeout(() => setCopiedRowId(null), 2000);
  }

  async function handleShare() {
    const params = new URLSearchParams();
    if (selectedTrackId !== null)    params.set('track_id',   String(selectedTrackId));
    if (selectedClass !== 'Toutes')  params.set('class',       selectedClass);
    if (selectedDrivetrain !== 'Tous') params.set('drivetrain', selectedDrivetrain);
    if (selectedCar !== 'Toutes')    params.set('car',         encodeURIComponent(selectedCar));
    const qs = params.toString();
    const url = `${window.location.origin}/classements${qs ? '?' + qs : ''}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
              {communityOnly ? 'Classements Communauté' : 'Classements'}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg">
              {communityOnly
                ? 'Classements sur les épreuves créées par la communauté.'
                : 'Filtrez les résultats pour comparer ce qui est comparable.'}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-shrink-0">
            {user && (
              <button
                onClick={() => setMyTimesOnly(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  myTimesOnly
                    ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                👤 Mes temps
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              {linkCopied ? '✅ Lien copié !' : '🔗 Partager'}
            </button>
          </div>
        </div>

        {/* --- ZONE DES FILTRES --- */}
        <div className="flex flex-col gap-4 mb-6 p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">

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
                    aria-label="Effacer le filtre circuit"
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
                onChange={e => setSelectedClass(e.target.value)}
              >
                {CAR_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

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
                  aria-label="Effacer le filtre voiture"
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

          <div className="flex flex-col">
            <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Pilote :</label>
            <input
              type="text"
              value={pseudoSearch}
              onChange={e => setPseudoSearch(e.target.value)}
              placeholder="Rechercher un pseudo..."
              className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-2">Transmission :</label>
            <div className="flex flex-wrap gap-2">
              {DRIVETRAIN_OPTIONS.map(dt => {
                const isActive = selectedDrivetrain === dt;
                return (
                  <button
                    key={dt}
                    onClick={() => setSelectedDrivetrain(dt)}
                    className={`px-4 py-1.5 rounded-full border text-sm font-bold transition-all ${
                      isActive
                        ? DRIVETRAIN_FILTER_COLORS[dt]
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
          <p className="text-sm text-neutral-500 mb-4">
            {circuitGroups.length} circuit{circuitGroups.length !== 1 ? 's' : ''}
            {' · '}{totalSubGroups} configuration{totalSubGroups !== 1 ? 's' : ''}
            {hasFilters ? ' avec les filtres actuels' : ''}
            {totalPages > 1 && ` — page ${safePage} / ${totalPages}`}
          </p>
        )}

        {/* Lien vers la page dédiée du circuit (contenu indexable) */}
        {selectedTrackId !== null && selectedTrackName && (
          <p className="text-sm mb-4 -mt-2">
            <Link
              href={`/circuits/${circuitSlug(selectedTrackId, selectedTrackName)}`}
              className="text-pink-400 hover:text-pink-300 font-semibold"
            >
              📄 Voir la page dédiée de {selectedTrackName} →
            </Link>
          </p>
        )}

        {/* --- CONTENU --- */}
        {selectedTrackId === null ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-center">
            <span className="text-5xl">🏁</span>
            <div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white mb-1">Sélectionne une épreuve</p>
              <p className="text-sm text-neutral-500 max-w-sm">
                {communityOnly
                  ? 'Choisis une épreuve communautaire dans le filtre ci-dessus pour afficher les classements.'
                  : 'Choisis un circuit dans le filtre ci-dessus pour afficher les classements.'}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-neutral-500 font-medium animate-pulse">Chargement des données télémétriques...</p>
          </div>
        ) : error ? (
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
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
          </div>
        ) : paginatedGroups.length === 0 ? (
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-neutral-500 font-medium">Aucun temps ne correspond à ces filtres.</p>
          </div>
        ) : prefs.rankingLayout === 'table' ? (
          <RankingTableView
            groups={paginatedGroups}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            highlightId={highlightId}
            formatTime={formatTime}
            gapStr={gapStr}
            isAuthed={!!user}
            currentPlayerId={currentPlayerId}
            copiedRowId={copiedRowId}
            onShareRow={handleShareRow}
            onReport={setReportTarget}
            cols={cols}
            showPlayerOptimal={prefs.showPlayerOptimal}
          />
        ) : (
          <RankingCardView
            groups={paginatedGroups}
            openGroups={openGroups}
            toggleGroup={toggleGroup}
            highlightId={highlightId}
            formatTime={formatTime}
            gapStr={gapStr}
            isAuthed={!!user}
            currentPlayerId={currentPlayerId}
            copiedRowId={copiedRowId}
            onShareRow={handleShareRow}
            onReport={setReportTarget}
            showPlayerOptimal={prefs.showPlayerOptimal}
          />
        )}

        {/* --- PAGINATION --- */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
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
