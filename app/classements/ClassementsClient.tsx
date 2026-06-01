"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Drivetrain, CarClass } from '@/types/supabase';
import { formatTime } from '@/components/formatTime';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DiscordTag } from '@/components/DiscordTag';
import { getTypeIcon, getSprintIcon } from '@/app/lib/trackIcons';

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
  previous_time_ms: number | null;
  players: { pseudo: string; discord_tag: string | null } | null;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
  tracks: { name: string; length_km: number | null; type: string | null; is_sprint: boolean | null } | null;
}

interface Track {
  id: number;
  name: string;
  is_official?: boolean;
}

interface RankedLap extends LapTime {
  rank: number;
}

interface SubGroup {
  key: string;
  carClass: CarClass;
  drivetrain: Drivetrain;
  carLabel: string;
  laps: RankedLap[];
}

interface CircuitGroup {
  trackId: number;
  trackName: string;
  trackLengthKm: number | null;
  trackType: string | null;
  trackIsSprint: boolean | null;
  subGroups: SubGroup[];
}

const CAR_CLASS_ORDER = ['D', 'C', 'B', 'A', 'S1', 'S2', 'X'];
const CIRCUITS_PER_PAGE = 5;
const STORAGE_KEY = 'br_classements_filters';
const CAR_CLASSES: Array<"Toutes" | CarClass> = ["Toutes", "D", "C", "B", "A", "S1", "S2", "X"];
const DRIVETRAIN_OPTIONS: Array<"Tous" | Drivetrain> = ["Tous", "AWD", "RWD", "FWD"];
const RAISONS = ['Temps impossible', 'Mauvais circuit sélectionné', 'Autre'] as const;
type Raison = typeof RAISONS[number];

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

  const { user } = useAuth();

  const [lapTimes,   setLapTimes]   = useState<LapTime[]>([]);
  const [tuneSetups, setTuneSetups] = useState<TuneSetup[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const [currentPlayerId,    setCurrentPlayerId]    = useState<string | null>(null);
  const [currentPlayerPseudo, setCurrentPlayerPseudo] = useState<string | null>(null);
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

  useEffect(() => {
    if (!user) { setCurrentPlayerId(null); setCurrentPlayerPseudo(null); return; }
    supabase
      .from('players')
      .select('id, pseudo')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setCurrentPlayerId(data?.id ?? null);
        setCurrentPlayerPseudo(data?.pseudo ?? null);
      });
  }, [user]);

  const fetchData = useCallback(async () => {
    if (selectedTrackId === null) {
      setLapTimes([]);
      setTuneSetups([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedCar('Toutes');
    setCarSearch('');
    setCurrentPage(1);

    let query = supabase
      .from('lap_times')
      .select(`
        id, time_ms, previous_time_ms, car_class, car_pi, drivetrain, car_ordinal, player_id, track_id,
        players ( pseudo, discord_tag ),
        cars ( manufacturer, name, year ),
        tracks ( name, length_km, type, is_sprint )
      `)
      .order('time_ms', { ascending: true });

    if (selectedTrackId !== null)      query = query.eq('track_id', selectedTrackId);
    if (selectedClass !== 'Toutes')    query = query.eq('car_class', selectedClass);
    if (selectedDrivetrain !== 'Tous') query = query.eq('drivetrain', selectedDrivetrain);

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

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setCurrentPage(1); }, [selectedCar, pseudoSearch, myTimesOnly]);
  useEffect(() => { setOpenGroups(new Set()); }, [selectedTrackId]);

  // Lit le paramètre ?highlight= à l'arrivée sur la page
  useEffect(() => {
    const h = new URLSearchParams(window.location.search).get('highlight');
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
          return { key, carClass, drivetrain, carLabel, laps: rankedLaps };
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
  }, [filteredLaps]);

  // Navigue vers la page contenant la ligne mise en évidence
  useEffect(() => {
    if (!highlightId || circuitGroups.length === 0) return;
    const groupIndex = circuitGroups.findIndex(g =>
      g.subGroups.some(sg => sg.laps.some(l => l.id === highlightId))
    );
    if (groupIndex === -1) return;
    const targetPage = Math.floor(groupIndex / CIRCUITS_PER_PAGE) + 1;
    setCurrentPage(targetPage);
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
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
              {communityOnly ? 'Classements Communauté' : 'Leaderboards'}
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
                const activeColors: Record<typeof dt, string> = {
                  Tous: "bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white",
                  AWD:  "bg-blue-500 text-white border-blue-500",
                  RWD:  "bg-orange-500 text-white border-orange-500",
                  FWD:  "bg-green-500 text-white border-green-500",
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
          <p className="text-sm text-neutral-500 mb-4">
            {circuitGroups.length} circuit{circuitGroups.length !== 1 ? 's' : ''}
            {' · '}{totalSubGroups} configuration{totalSubGroups !== 1 ? 's' : ''}
            {hasFilters ? ' avec les filtres actuels' : ''}
            {totalPages > 1 && ` — page ${safePage} / ${totalPages}`}
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
        ) : (
          <div className="space-y-6">
            {paginatedGroups.map(circuit => (
              <div
                key={circuit.trackId}
                className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden"
              >
                {/* En-tête de circuit */}
                <div className="px-5 py-4 bg-neutral-200/60 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-extrabold text-lg text-neutral-900 dark:text-white">
                      {getTypeIcon(circuit.trackType ?? '')} {getSprintIcon(circuit.trackIsSprint ?? false)} {circuit.trackName}
                    </h2>
                    {circuit.trackLengthKm && (
                      <span className="text-sm text-neutral-500">· {circuit.trackLengthKm} km</span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500 font-mono flex-shrink-0">
                    {circuit.subGroups.length} config{circuit.subGroups.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Sous-groupes */}
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {circuit.subGroups.map(group => (
                    <div key={group.key}>

                      {/* En-tête cliquable */}
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left"
                      >
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                          style={CLASS_STYLES[group.carClass] ?? { backgroundColor: '#555', color: '#fff' }}
                        >
                          {group.carClass}
                        </span>
                        <DrivetrainBadge drivetrain={group.drivetrain} />
                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 truncate">{group.carLabel}</span>
                        <span className="text-xs text-neutral-500 ml-auto flex-shrink-0 mr-1">
                          {group.laps.length} pilote{group.laps.length > 1 ? 's' : ''}
                        </span>
                        <svg
                          className={`w-4 h-4 flex-shrink-0 text-neutral-400 transition-transform ${openGroups.has(group.key) ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Tableau des temps — visible si ouvert */}
                      {openGroups.has(group.key) && (
                      <div className="overflow-x-auto px-4 pb-4">
                        <table className="w-full text-sm border-collapse table-fixed">
                          <colgroup>
                            <col className="w-10" />
                            <col className="w-[220px]" />
                            <col className="w-[200px]" />
                            <col className="w-[90px]" />
                            <col />
                            <col className="w-16" />
                          </colgroup>
                          <tbody>
                            {group.laps.map(lap => (
                              <tr
                                key={lap.id}
                                data-lap-id={lap.id}
                                className={`hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors ${
                                  lap.id === highlightId ? 'bg-pink-500/20 dark:bg-pink-500/20' : ''
                                }`}
                              >
                                <td className="py-3 px-2 font-bold text-neutral-500 text-right tabular-nums align-top">
                                  {lap.rank}
                                </td>
                                <td className="py-3 px-3 font-bold text-neutral-900 dark:text-white align-top">
                                  <Link
                                    href={`/joueurs/${encodeURIComponent(lap.players?.pseudo ?? '')}`}
                                    className="hover:text-pink-400 transition-colors"
                                  >
                                    {lap.players?.pseudo ?? 'Inconnu'}
                                  </Link>
                                  <DiscordTag tag={lap.players?.discord_tag} />
                                </td>
                                <td className="py-3 px-3 align-top">
                                  <span className="font-mono font-bold text-pink-400">{formatTime(lap.time_ms)}</span>
                                  {lap.previous_time_ms && (
                                    <div className="text-xs font-mono mt-0.5 text-neutral-500 whitespace-nowrap">
                                      ↑ {formatTime(lap.previous_time_ms)}{' '}
                                      <span className="text-orange-400">
                                        +{((lap.previous_time_ms - lap.time_ms) / 1000).toFixed(3).replace('.', ',')}s
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-neutral-500 font-mono text-xs whitespace-nowrap align-top">
                                  PI {lap.car_pi}
                                </td>
                                <td className="py-3 px-3 align-top">
                                  <TuneCell lap={lap} setups={tuneSetups} />
                                </td>
                                <td className="py-3 px-2 text-right align-top">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleShareRow(lap.id)}
                                      title="Copier le lien vers ce temps"
                                      className="text-neutral-400 hover:text-pink-400 transition-colors text-xs"
                                    >
                                      {copiedRowId === lap.id ? <span className="text-pink-400 font-bold">Copié!</span> : '🔗'}
                                    </button>
                                    {user && currentPlayerId !== null && lap.player_id !== currentPlayerId && (
                                      <button
                                        onClick={() => setReportTarget(lap)}
                                        title="Signaler ce temps comme suspect"
                                        className="text-neutral-500 hover:text-red-400 transition-colors"
                                      >
                                        🚩
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
