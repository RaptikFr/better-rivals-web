"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Drivetrain, CarClass } from '@/types/supabase';
import { formatTime } from '@/components/formatTime';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DiscordTag } from '@/components/DiscordTag';

interface ProfileLap {
  id: string;
  time_ms: number;
  car_class: CarClass;
  car_pi: number;
  drivetrain: Drivetrain;
  car_ordinal: number;
  track_id: number;
  created_at: string;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
  tracks: { name: string; length_km: number | null } | null;
}

interface Stats {
  totalLaps: number;
  totalCircuits: number;
  totalVoitures: number;
  classFavorite: string;
  drivetrainFavorite: string;
  bestRank: number | null;
}

interface Podiums {
  gold:   number;
  silver: number;
  bronze: number;
}

interface TuneSetup {
  id: string;
  player_id: string;
  car_ordinal: number;
  track_id: number | null;
  track_type: string | null;
  share_code: string;
  label: string | null;
  is_original: boolean | null;
  updated_at: string;
}

const TRACK_TYPE_LABELS: Record<string, string> = {
  'Course sur route':   'circuit route',
  'Course tous chemins':'circuit tous chemins',
  'Cross-country':      'circuit cross-country',
};

interface TrackOption { id: number; name: string; }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

type Tab = 'recents' | 'tous' | 'classements' | 'stats' | 'reglages' | 'suivi';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'recents',     label: 'Récents',        icon: '🕐' },
  { id: 'tous',        label: 'Tous mes temps',  icon: '📋' },
  { id: 'suivi',       label: 'Suivi',           icon: '📈' },
  { id: 'classements', label: 'Mes classements', icon: '🏆' },
  { id: 'stats',       label: 'Statistiques',    icon: '📊' },
  { id: 'reglages',    label: 'Mes réglages',    icon: '⚙️' },
];

export default function ProfilClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('recents');
  const [pseudo,      setPseudo]      = useState<string>('');
  const [discordTag,  setDiscordTag]  = useState<string>('');
  const [editDiscord, setEditDiscord] = useState(false);
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [playerId,    setPlayerId]    = useState<string | null>(null);
  const [laps,      setLaps]      = useState<ProfileLap[]>([]);
  const [podiums,   setPodiums]   = useState<Podiums>({ gold: 0, silver: 0, bronze: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [filterClass,      setFilterClass]      = useState('Toutes');
  const [filterTrack,      setFilterTrack]      = useState('Tous');
  const [filterDrivetrain, setFilterDrivetrain] = useState<'Tous' | Drivetrain>('Tous');
  const [filterCar,        setFilterCar]        = useState('Toutes');
  const [filterCarSearch,  setFilterCarSearch]  = useState('');
  const [showCarFilter,    setShowCarFilter]     = useState(false);
  const [filterTrackSearch,  setFilterTrackSearch]  = useState('');
  const [showTrackFilter,    setShowTrackFilter]    = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/connexion');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    setIsLoading(true);
    setError(null);

    const { data: playerData } = await supabase
      .from('players').select('id, pseudo, discord_tag').eq('user_id', user!.id).single();

    if (!playerData) { setIsLoading(false); return; }
    setPseudo(playerData.pseudo);
    setDiscordTag(playerData.discord_tag ?? '');
    setPlayerId(playerData.id);

    const { data: lapsData, error: lapsError } = await supabase
      .from('lap_times')
      .select('id, time_ms, car_class, car_pi, drivetrain, car_ordinal, track_id, created_at, cars ( manufacturer, name, year ), tracks ( name, length_km )')
      .eq('player_id', playerData.id)
      .order('created_at', { ascending: false });

    if (lapsError) {
      setError("Impossible de charger tes données.");
      setIsLoading(false);
      return;
    }

    const playerLaps = (lapsData ?? []) as ProfileLap[];
    setLaps(playerLaps);

    // Fetch all laps on the player's tracks in one query, then rank client-side
    const trackIds = [...new Set(playerLaps.map(l => l.track_id))].filter(Boolean);
    if (trackIds.length > 0) {
      const { data: allLapsRaw } = await supabase
        .from('lap_times')
        .select('time_ms, car_ordinal, car_class, drivetrain, track_id')
        .in('track_id', trackIds);

      const allLaps = (allLapsRaw ?? []) as Array<{
        time_ms: number; car_ordinal: number; car_class: string;
        drivetrain: string; track_id: number;
      }>;

      let gold = 0, silver = 0, bronze = 0;
      for (const lap of playerLaps) {
        const betterCount = allLaps.filter(
          l => l.track_id   === lap.track_id   &&
               l.car_ordinal === lap.car_ordinal &&
               l.car_class   === lap.car_class   &&
               l.drivetrain  === lap.drivetrain   &&
               l.time_ms < lap.time_ms
        ).length;
        if (betterCount === 0) gold++;
        else if (betterCount === 1) silver++;
        else if (betterCount === 2) bronze++;
      }
      setPodiums({ gold, silver, bronze });
    }

    setIsLoading(false);
  }

  async function saveDiscordTag() {
    if (!playerId) return;
    setSavingDiscord(true);
    await supabase.from('players').update({ discord_tag: discordTag.trim() || null }).eq('id', playerId);
    setSavingDiscord(false);
    setEditDiscord(false);
  }

  const recentLaps = useMemo(() => laps.slice(0, 20), [laps]);

  const filteredLaps = useMemo(() =>
    laps.filter(lap => {
      const matchClass      = filterClass      === 'Toutes' || lap.car_class    === filterClass;
      const matchTrack      = filterTrack      === 'Tous'   || lap.tracks?.name === filterTrack;
      const matchDrivetrain = filterDrivetrain === 'Tous'   || lap.drivetrain   === filterDrivetrain;
      const carLabel        = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
      const matchCar        = filterCar        === 'Toutes' || carLabel === filterCar;
      return matchClass && matchTrack && matchDrivetrain && matchCar;
    }),
    [laps, filterClass, filterTrack, filterDrivetrain, filterCar]
  );

  const uniqueClasses = useMemo(() =>
    ['Toutes', ...Array.from(new Set(laps.map(l => l.car_class))).filter(Boolean)],
    [laps]
  );
  const uniqueTracks = useMemo(() =>
    Array.from(new Set(laps.map(l => l.tracks?.name ?? ''))).filter(Boolean).sort(),
    [laps]
  );
  const uniqueProfileCars = useMemo(() =>
    Array.from(new Set(
      laps.map(l => `${l.cars?.year ?? ''} ${l.cars?.manufacturer ?? ''} ${l.cars?.name ?? ''}`.trim())
    )).filter(Boolean).sort(),
    [laps]
  );
  const filteredTrackOptions = useMemo(() =>
    uniqueTracks.filter(t => t.toLowerCase().includes(filterTrackSearch.toLowerCase())),
    [uniqueTracks, filterTrackSearch]
  );
  const filteredCarOptions = useMemo(() =>
    uniqueProfileCars.filter(c => c.toLowerCase().includes(filterCarSearch.toLowerCase())),
    [uniqueProfileCars, filterCarSearch]
  );

  const stats = useMemo((): Stats => ({
    totalLaps:     laps.length,
    totalCircuits: new Set(laps.map(l => l.tracks?.name)).size,
    totalVoitures: new Set(laps.map(l => l.car_ordinal)).size,
    classFavorite: (() => {
      const counts: Record<string, number> = {};
      laps.forEach(l => { counts[l.car_class] = (counts[l.car_class] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    })(),
    drivetrainFavorite: (() => {
      const counts: Record<string, number> = {};
      laps.forEach(l => { counts[l.drivetrain] = (counts[l.drivetrain] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    })(),
    bestRank: null,
  }), [laps]);

  if (authLoading || isLoading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-500 animate-pulse">Chargement du profil...</p>
    </main>
  );

  if (error) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-red-400">{error}</p>
    </main>
  );

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto">

        {/* ── EN-TÊTE PROFIL ── */}
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-2xl font-extrabold text-white">
                {pseudo.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">{pseudo}</h1>
                <p className="text-sm text-neutral-500">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {editDiscord ? (
                    <>
                      <input
                        type="text"
                        value={discordTag}
                        onChange={e => setDiscordTag(e.target.value)}
                        placeholder="Ton pseudo Discord"
                        className="text-sm bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-0.5 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-indigo-400 w-44"
                      />
                      <button onClick={saveDiscordTag} disabled={savingDiscord} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-50">
                        {savingDiscord ? '…' : 'Sauvegarder'}
                      </button>
                      <button onClick={() => setEditDiscord(false)} className="text-xs text-neutral-500 hover:text-neutral-400">
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditDiscord(true)} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-indigo-400 transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      {discordTag ? <span className="text-indigo-400">{discordTag}</span> : 'Ajouter Discord'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 md:ml-auto">
              {[
                { label: 'Circuits',  value: stats.totalCircuits },
                { label: 'Chronos',   value: stats.totalLaps     },
                { label: 'Voitures',  value: stats.totalVoitures },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-5 py-3 text-center">
                  <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">{value}</p>
                  <p className="text-xs text-neutral-500 font-medium">{label}</p>
                </div>
              ))}
              {[
                { label: '🥇', value: podiums.gold   },
                { label: '🥈', value: podiums.silver },
                { label: '🥉', value: podiums.bronze },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-5 py-3 text-center">
                  <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">{value}</p>
                  <p className="text-xs text-neutral-500 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ONGLETS ── */}
        <div className="flex gap-1 mb-6 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}>
              <span className="mr-1.5">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'recents' && (
          <div>
            <p className="text-neutral-500 text-sm mb-4">Tes 20 derniers chronos enregistrés.</p>
            {recentLaps.length === 0
              ? <EmptyState message="Aucun chrono enregistré pour l'instant. Lance le relais et roule !" />
              : <LapTable laps={recentLaps} showDate />
            }
          </div>
        )}

        {activeTab === 'tous' && (
          <div>
            <div className="flex flex-col gap-4 mb-5 p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Circuit avec recherche */}
                <div className="flex flex-col relative">
                  <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Circuit :</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filterTrack !== 'Tous' ? filterTrack : filterTrackSearch}
                      onChange={e => { setFilterTrackSearch(e.target.value); setFilterTrack('Tous'); setShowTrackFilter(true); }}
                      onFocus={() => setShowTrackFilter(true)}
                      onBlur={() => setTimeout(() => setShowTrackFilter(false), 150)}
                      placeholder="Tous les circuits"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
                    />
                    {filterTrack !== 'Tous' && (
                      <button onClick={() => { setFilterTrack('Tous'); setFilterTrackSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
                    )}
                  </div>
                  {showTrackFilter && filteredTrackOptions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {filteredTrackOptions.map(t => (
                        <button key={t} onMouseDown={() => { setFilterTrack(t); setFilterTrackSearch(''); setShowTrackFilter(false); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${filterTrack === t ? 'bg-pink-500/20 text-pink-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Classe :</label>
                  <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                    className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 p-2 rounded-lg focus:outline-none focus:border-pink-500">
                    {uniqueClasses.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {/* Voiture avec recherche */}
              <div className="flex flex-col relative">
                <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Voiture :</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filterCar !== 'Toutes' ? filterCar : filterCarSearch}
                    onChange={e => { setFilterCarSearch(e.target.value); setFilterCar('Toutes'); setShowCarFilter(true); }}
                    onFocus={() => setShowCarFilter(true)}
                    onBlur={() => setTimeout(() => setShowCarFilter(false), 150)}
                    placeholder="Toutes les voitures"
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
                  />
                  {filterCar !== 'Toutes' && (
                    <button onClick={() => { setFilterCar('Toutes'); setFilterCarSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
                  )}
                </div>
                {showCarFilter && filteredCarOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredCarOptions.map(c => (
                      <button key={c} onMouseDown={() => { setFilterCar(c); setFilterCarSearch(''); setShowCarFilter(false); }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${filterCar === c ? 'bg-pink-500/20 text-pink-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-2">Transmission :</label>
                <div className="flex flex-wrap gap-2">
                  {(['Tous', 'AWD', 'RWD', 'FWD'] as const).map(dt => {
                    const isActive = filterDrivetrain === dt;
                    const activeColors = {
                      Tous: 'bg-neutral-900 dark:bg-white text-white dark:text-black border-neutral-900 dark:border-white',
                      AWD:  'bg-blue-500 text-white border-blue-500',
                      RWD:  'bg-orange-500 text-white border-orange-500',
                      FWD:  'bg-green-500 text-white border-green-500',
                    };
                    return (
                      <button key={dt} onClick={() => setFilterDrivetrain(dt)}
                        className={`px-4 py-1.5 rounded-full border text-sm font-bold transition-all ${
                          isActive ? activeColors[dt] : 'bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500'
                        }`}>
                        {dt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-sm text-neutral-500 mb-3">{filteredLaps.length} résultat{filteredLaps.length !== 1 ? 's' : ''}</p>
            {filteredLaps.length === 0
              ? <EmptyState message="Aucun temps ne correspond à ces filtres." />
              : <LapTable laps={filteredLaps} showDate />
            }
          </div>
        )}

        {activeTab === 'classements' && <ClassementsTab laps={laps} />}
        {activeTab === 'suivi'       && playerId !== null && <SuiviTab playerId={playerId} />}
        {activeTab === 'stats'       && <StatsTab stats={stats} laps={laps} />}
        {activeTab === 'reglages'    && playerId !== null && <ReglagesTab laps={laps} playerId={playerId} />}

      </div>
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
      <p className="text-neutral-500">{message}</p>
    </div>
  );
}

function LapTable({ laps, showDate }: { laps: ProfileLap[]; showDate?: boolean }) {
  return (
    <div className="overflow-x-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
            {showDate && <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">DATE</th>}
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">TEMPS</th>
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">VOITURE</th>
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">CLASSE / PI</th>
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">TRANSMISSION</th>
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">CIRCUIT</th>
          </tr>
        </thead>
        <tbody>
          {laps.map((lap, i) => (
            <tr key={lap.id ?? i} className="border-b border-neutral-200/50 dark:border-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
              {showDate && <td className="p-4 text-xs text-neutral-500">{formatDate(lap.created_at)}</td>}
              <td className="p-4 font-mono font-bold text-pink-400 text-lg">{formatTime(lap.time_ms)}</td>
              <td className="p-4 text-neutral-700 dark:text-neutral-300">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</td>
              <td className="p-4">
                <span className="px-2 py-1 rounded text-xs font-bold mr-2" style={CLASS_STYLES[lap.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>
                  {lap.car_class}
                </span>
                <span className="text-sm text-neutral-500 font-mono">PI {lap.car_pi}</span>
              </td>
              <td className="p-4"><DrivetrainBadge drivetrain={lap.drivetrain} /></td>
              <td className="p-4 text-neutral-600 dark:text-neutral-400">
                {lap.tracks?.name ?? '—'}{lap.tracks?.length_km ? ` (${lap.tracks.length_km} km)` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface HistoryEntry {
  id: string;
  time_ms: number;
  car_class: string;
  car_ordinal: number;
  drivetrain: string;
  car_pi: number | null;
  track_id: number;
  recorded_at: string;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
  tracks: { name: string } | null;
}

function SuiviTab({ playerId }: { playerId: string }) {
  const [history,     setHistory]     = useState<HistoryEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('Tous');
  const [showTrackDrop, setShowTrackDrop] = useState(false);
  const [carSearch,   setCarSearch]   = useState('');
  const [selectedCar, setSelectedCar] = useState('Toutes');
  const [showCarDrop, setShowCarDrop] = useState(false);

  useEffect(() => {
    supabase
      .from('lap_times_history')
      .select('id, time_ms, car_class, car_ordinal, drivetrain, car_pi, track_id, recorded_at, cars(manufacturer, name, year), tracks(name)')
      .eq('player_id', playerId)
      .order('recorded_at', { ascending: false })
      .then(({ data }) => {
        setHistory((data ?? []) as HistoryEntry[]);
        setLoading(false);
      });
  }, [playerId]);

  const uniqueTracks = useMemo(() =>
    Array.from(new Set(history.map(h => h.tracks?.name ?? ''))).filter(Boolean).sort(),
    [history]
  );
  const uniqueCars = useMemo(() =>
    Array.from(new Set(history.map(h => `${h.cars?.year ?? ''} ${h.cars?.manufacturer ?? ''} ${h.cars?.name ?? ''}`.trim()))).filter(Boolean).sort(),
    [history]
  );
  const filteredTracks = useMemo(() =>
    uniqueTracks.filter(t => t.toLowerCase().includes(trackSearch.toLowerCase())),
    [uniqueTracks, trackSearch]
  );
  const filteredCars = useMemo(() =>
    uniqueCars.filter(c => c.toLowerCase().includes(carSearch.toLowerCase())),
    [uniqueCars, carSearch]
  );
  const filtered = useMemo(() =>
    history.filter(h => {
      const matchTrack = selectedTrack === 'Tous' || h.tracks?.name === selectedTrack;
      const carLabel   = `${h.cars?.year ?? ''} ${h.cars?.manufacturer ?? ''} ${h.cars?.name ?? ''}`.trim();
      const matchCar   = selectedCar === 'Toutes' || carLabel === selectedCar;
      return matchTrack && matchCar;
    }),
    [history, selectedTrack, selectedCar]
  );

  const filteredWithDiffs = useMemo(() => {
    // Regroupe par config, trie chaque groupe par time_ms desc (pire en premier)
    const groups = new Map<string, HistoryEntry[]>();
    for (const h of filtered) {
      const key = `${h.track_id}-${h.car_ordinal}-${h.car_class}-${h.drivetrain}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h);
    }
    for (const entries of groups.values()) {
      entries.sort((a, b) => b.time_ms - a.time_ms);
    }
    return filtered.map(h => {
      const key   = `${h.track_id}-${h.car_ordinal}-${h.car_class}-${h.drivetrain}`;
      const group = groups.get(key)!;
      const idx   = group.findIndex(e => e.id === h.id);
      const next  = idx < group.length - 1 ? group[idx + 1] : null;
      return { ...h, diffMs: next ? h.time_ms - next.time_ms : null };
    });
  }, [filtered]);

  if (loading) return <p className="text-neutral-500 animate-pulse p-4">Chargement de l&apos;historique...</p>;
  if (history.length === 0) return <EmptyState message="Aucun historique disponible — il se remplit à chaque fois que tu bats ton propre record." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <div className="flex flex-col relative flex-1">
          <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Circuit :</label>
          <div className="relative">
            <input type="text"
              value={selectedTrack !== 'Tous' ? selectedTrack : trackSearch}
              onChange={e => { setTrackSearch(e.target.value); setSelectedTrack('Tous'); setShowTrackDrop(true); }}
              onFocus={() => setShowTrackDrop(true)}
              onBlur={() => setTimeout(() => setShowTrackDrop(false), 150)}
              placeholder="Tous les circuits"
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
            />
            {selectedTrack !== 'Tous' && (
              <button onClick={() => { setSelectedTrack('Tous'); setTrackSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
            )}
          </div>
          {showTrackDrop && filteredTracks.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {filteredTracks.map(t => (
                <button key={t} onMouseDown={() => { setSelectedTrack(t); setTrackSearch(''); setShowTrackDrop(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedTrack === t ? 'bg-pink-500/20 text-pink-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col relative flex-1">
          <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">Voiture :</label>
          <div className="relative">
            <input type="text"
              value={selectedCar !== 'Toutes' ? selectedCar : carSearch}
              onChange={e => { setCarSearch(e.target.value); setSelectedCar('Toutes'); setShowCarDrop(true); }}
              onFocus={() => setShowCarDrop(true)}
              onBlur={() => setTimeout(() => setShowCarDrop(false), 150)}
              placeholder="Toutes les voitures"
              className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
            />
            {selectedCar !== 'Toutes' && (
              <button onClick={() => { setSelectedCar('Toutes'); setCarSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
            )}
          </div>
          {showCarDrop && filteredCars.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {filteredCars.map(c => (
                <button key={c} onMouseDown={() => { setSelectedCar(c); setCarSearch(''); setShowCarDrop(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedCar === c ? 'bg-pink-500/20 text-pink-400' : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-neutral-500">{filtered.length} entrée{filtered.length !== 1 ? 's' : ''} dans l&apos;historique</p>

      <div className="overflow-x-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
              <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">DATE</th>
              <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">TEMPS</th>
              <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">VOITURE</th>
              <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">CLASSE / PI</th>
              <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">TRANSMISSION</th>
              <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">CIRCUIT</th>
            </tr>
          </thead>
          <tbody>
            {filteredWithDiffs.map(h => (
              <tr key={h.id} className="border-b border-neutral-200/50 dark:border-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <td className="p-4 text-xs text-neutral-500">{formatDate(h.recorded_at)}</td>
                <td className="p-4 font-mono">
                  <span className="font-bold text-neutral-400 dark:text-neutral-500">{formatTime(h.time_ms)}</span>
                  {h.diffMs !== null && (
                    <span className="ml-2 text-xs text-orange-400">
                      +{(h.diffMs / 1000).toFixed(3).replace('.', ',')}s
                    </span>
                  )}
                </td>
                <td className="p-4 text-neutral-700 dark:text-neutral-300">{h.cars?.year} {h.cars?.manufacturer} {h.cars?.name}</td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded text-xs font-bold mr-2" style={CLASS_STYLES[h.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>{h.car_class}</span>
                  <span className="text-sm text-neutral-500 font-mono">PI {h.car_pi ?? '—'}</span>
                </td>
                <td className="p-4"><DrivetrainBadge drivetrain={h.drivetrain as import('@/types/supabase').Drivetrain} /></td>
                <td className="p-4 text-neutral-600 dark:text-neutral-400">{h.tracks?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClassementsTab({ laps }: { laps: ProfileLap[] }) {
  const [rankings, setRankings] = useState<{ lap: ProfileLap; rank: number; total: number }[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function fetchRankings() {
      const results = await Promise.all(
        laps.map(async (lap) => {
          const trackName = lap.tracks?.name;
          if (!trackName) return null;
          const { count }       = await supabase.from('lap_times').select('*', { count: 'exact', head: true }).eq('track_id', lap.track_id).eq('car_ordinal', lap.car_ordinal).eq('drivetrain', lap.drivetrain).eq('car_class', lap.car_class).lt('time_ms', lap.time_ms);
          const { count: total } = await supabase.from('lap_times').select('*', { count: 'exact', head: true }).eq('track_id', lap.track_id).eq('car_ordinal', lap.car_ordinal).eq('drivetrain', lap.drivetrain).eq('car_class', lap.car_class);
          return { lap, rank: (count ?? 0) + 1, total: total ?? 1 };
        })
      );
      setRankings(results.filter(Boolean) as { lap: ProfileLap; rank: number; total: number }[]);
      setLoading(false);
    }
    if (laps.length > 0) fetchRankings();
    else setLoading(false);
  }, [laps]);

  if (loading) return <p className="text-neutral-500 animate-pulse p-4">Calcul des classements...</p>;
  if (rankings.length === 0) return <EmptyState message="Aucun classement disponible pour l'instant." />;

  return (
    <div className="overflow-x-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">POSITION</th>
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">CIRCUIT</th>
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">VOITURE</th>
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">TRANSMISSION</th>
            <th className="p-4 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">TEMPS</th>
          </tr>
        </thead>
        <tbody>
          {rankings.sort((a, b) => a.rank - b.rank).map(({ lap, rank, total }, i) => (
            <tr key={i} className="border-b border-neutral-200/50 dark:border-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
              <td className="p-4">
                <span className={`text-lg font-extrabold ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-neutral-400 dark:text-neutral-300' : rank === 3 ? 'text-amber-600' : 'text-neutral-500'}`}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-600 ml-2">/ {total}</span>
              </td>
              <td className="p-4 text-neutral-700 dark:text-neutral-300 font-semibold">{lap.tracks?.name ?? '—'}</td>
              <td className="p-4 text-neutral-600 dark:text-neutral-400">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</td>
              <td className="p-4"><DrivetrainBadge drivetrain={lap.drivetrain} /></td>
              <td className="p-4 font-mono font-bold text-pink-400">{formatTime(lap.time_ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsTab({ stats, laps }: { stats: Stats; laps: ProfileLap[] }) {
  const circuitCounts: Record<string, number> = {};
  laps.forEach(l => { const name = l.tracks?.name ?? 'Inconnu'; circuitCounts[name] = (circuitCounts[name] || 0) + 1; });
  const topCircuits = Object.entries(circuitCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const carCounts: Record<string, number> = {};
  laps.forEach(l => { const name = `${l.cars?.year} ${l.cars?.manufacturer} ${l.cars?.name}`; carCounts[name] = (carCounts[name] || 0) + 1; });
  const topCars = Object.entries(carCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Chronos enregistrés', value: stats.totalLaps,          icon: '⏱' },
          { label: 'Circuits essayés',    value: stats.totalCircuits,      icon: '🏁' },
          { label: 'Voitures utilisées',  value: stats.totalVoitures,      icon: '🚗' },
          { label: 'Classe favorite',     value: stats.classFavorite,      icon: '🎯' },
          { label: 'Transmission fav.',   value: stats.drivetrainFavorite, icon: '⚙️' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">{value}</p>
            <p className="text-xs text-neutral-500 font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          <h3 className="font-bold mb-4">🏁 Circuits favoris</h3>
          {topCircuits.length === 0
            ? <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            : <ul className="space-y-3">
                {topCircuits.map(([name, count], i) => (
                  <li key={name} className="flex items-center justify-between">
                    <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                      <span className="text-neutral-400 mr-2">#{i + 1}</span>{name}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{count} tour{count > 1 ? 's' : ''}</span>
                  </li>
                ))}
              </ul>
          }
        </div>

        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
          <h3 className="font-bold mb-4">🚗 Voitures favorites</h3>
          {topCars.length === 0
            ? <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            : <ul className="space-y-3">
                {topCars.map(([name, count], i) => (
                  <li key={name} className="flex items-center justify-between">
                    <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                      <span className="text-neutral-400 mr-2">#{i + 1}</span>{name}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">{count} tour{count > 1 ? 's' : ''}</span>
                  </li>
                ))}
              </ul>
          }
        </div>
      </div>
    </div>
  );
}

function ReglagesTab({ laps, playerId }: { laps: ProfileLap[]; playerId: string }) {
  const [setups,        setSetups]        = useState<TuneSetup[]>([]);
  const [tracks,        setTracks]        = useState<TrackOption[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [forms,         setForms]         = useState<Record<number, { share_code: string; label: string; track_id: string; is_original: boolean }>>({});
  const [saving,        setSaving]        = useState<Record<number, boolean>>({});

  const cars = Array.from(
    new Map(laps.map(l => [l.car_ordinal, {
      car_ordinal: l.car_ordinal,
      carName: `${l.cars?.year ?? ''} ${l.cars?.manufacturer ?? ''} ${l.cars?.name ?? ''}`.trim(),
    }])).values()
  ).sort((a, b) => a.carName.localeCompare(b.carName));

  useEffect(() => {
    async function load() {
      const [setupsRes, tracksRes] = await Promise.all([
        supabase.from('tune_setups').select('*').eq('player_id', playerId).order('updated_at', { ascending: false }),
        supabase.from('tracks').select('id, name').eq('status', 'approved').order('name', { ascending: true }),
      ]);
      if (setupsRes.data) setSetups(setupsRes.data as TuneSetup[]);
      if (tracksRes.data) setTracks(tracksRes.data as TrackOption[]);
      setLoading(false);
    }
    load();
  }, [playerId]);

  function getForm(car_ordinal: number) {
    return forms[car_ordinal] ?? { share_code: '', label: '', track_id: 'type:Course sur route', is_original: false };
  }

  function patchForm(car_ordinal: number, patch: Partial<{ share_code: string; label: string; track_id: string; is_original: boolean }>) {
    setForms(f => ({ ...f, [car_ordinal]: { ...getForm(car_ordinal), ...patch } }));
  }

  async function handleAdd(car_ordinal: number) {
    const form = getForm(car_ordinal);
    if (!form.share_code.trim()) return;
    setSaving(s => ({ ...s, [car_ordinal]: true }));
    setError(null); setConflictError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/tune-setups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        car_ordinal, share_code: form.share_code.trim(), label: form.label.trim() || null,
        track_id:   form.track_id.startsWith('type:') ? null : (form.track_id ? Number(form.track_id) : null),
        track_type: form.track_id.startsWith('type:') ? form.track_id.slice(5) : null,
        is_original: form.is_original,
      }),
    });
    const json = await res.json();
    if (res.status === 409) setConflictError(json.error);
    else if (!res.ok) setError(json.error ?? "Erreur lors de l'ajout du réglage.");
    else {
      setSetups(s => [json.data as TuneSetup, ...s]);
      setForms(f => ({ ...f, [car_ordinal]: { share_code: '', label: '', track_id: '', is_original: false } }));
    }
    setSaving(s => ({ ...s, [car_ordinal]: false }));
  }

  async function handleDelete(id: string) {
    setError(null);
    const { error: deleteError } = await supabase.from('tune_setups').delete().eq('id', id).eq('player_id', playerId);
    if (deleteError) setError("Erreur lors de la suppression.");
    else setSetups(s => s.filter(setup => setup.id !== id));
  }

  if (loading) return <p className="text-neutral-500 animate-pulse p-4">Chargement des réglages...</p>;
  if (cars.length === 0) return <EmptyState message="Aucune voiture trouvée — tes voitures apparaîtront ici une fois tes premiers chronos enregistrés." />;

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}
      {conflictError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4 text-amber-400 text-sm space-y-2">
          <p className="font-bold">⚠️ Conflit de réglage détecté</p>
          <p>{conflictError}</p>
          <p className="flex flex-wrap gap-x-4">
            <Link href="/contact" className="underline hover:text-amber-300 transition-colors">Formulaire de contact</Link>
            <a href="https://discord.gg/d75NxScNCa" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300 transition-colors">Discord</a>
          </p>
        </div>
      )}
      {cars.map(({ car_ordinal, carName }) => {
        const carSetups = setups.filter(s => s.car_ordinal === car_ordinal);
        const form      = getForm(car_ordinal);
        const isSaving  = saving[car_ordinal] ?? false;

        return (
          <div key={car_ordinal} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">

            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
              <span className="text-lg">🚗</span>
              <h3 className="font-bold">{carName}</h3>
              {carSetups.length > 0 && (
                <span className="ml-auto text-xs text-neutral-500 font-mono">
                  {carSetups.length} réglage{carSetups.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {carSetups.length > 0 && (
                <div className="space-y-2">
                  {carSetups.map(setup => (
                    <div key={setup.id} className="flex items-center gap-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm">
                          <span className="mr-1.5">{setup.is_original ? '🔧' : '📋'}</span>{setup.share_code}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {setup.label && <span className="text-xs text-neutral-600 dark:text-neutral-400">{setup.label}</span>}
                          {setup.track_id ? (
                            <span className="text-xs text-violet-400">📍 {tracks.find(t => t.id === setup.track_id)?.name ?? 'Circuit inconnu'}</span>
                          ) : setup.track_type ? (
                            <span className="text-xs text-neutral-500">🌐 Réglage général ({TRACK_TYPE_LABELS[setup.track_type] ?? setup.track_type})</span>
                          ) : (
                            <span className="text-xs text-neutral-400">Réglage général</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(setup.id)} title="Supprimer"
                        className="text-neutral-400 hover:text-red-400 transition-colors flex-shrink-0 text-base">
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-3 bg-white/50 dark:bg-neutral-950/50">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Ajouter un réglage</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Code de partage *" value={form.share_code}
                    onChange={e => patchForm(car_ordinal, { share_code: e.target.value })}
                    className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm placeholder-neutral-400 font-mono focus:outline-none focus:border-pink-500 transition-colors"
                  />
                  <input type="text" placeholder="Label (optionnel)" value={form.label}
                    onChange={e => patchForm(car_ordinal, { label: e.target.value })}
                    className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm placeholder-neutral-400 focus:outline-none focus:border-pink-500 transition-colors"
                  />
                </div>
                <select value={form.track_id} onChange={e => patchForm(car_ordinal, { track_id: e.target.value })}
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 transition-colors">
                  <option value="type:Course sur route">Réglage général (circuit route)</option>
                  <option value="type:Course tous chemins">Réglage général (circuit tous chemins)</option>
                  <option value="type:Cross-country">Réglage général (circuit cross-country)</option>
                  {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.is_original}
                      onChange={e => patchForm(car_ordinal, { is_original: e.target.checked })}
                      className="w-4 h-4 accent-pink-500"
                    />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">J&apos;ai créé ce réglage moi-même 🔧</span>
                  </label>
                  <button onClick={() => handleAdd(car_ordinal)} disabled={!form.share_code.trim() || isSaving}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-violet-600 text-white text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0">
                    {isSaving ? '...' : 'Ajouter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
