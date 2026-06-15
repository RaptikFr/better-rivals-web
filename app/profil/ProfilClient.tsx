"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Drivetrain, CarClass } from '@/types/supabase';
import { usePreferences } from '@/hooks/usePreferences';
import { DrivetrainBadge, DRIVETRAIN_FILTER_COLORS } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import type { Podiums } from '@/lib/podiums';
import type { ConfigRivals } from '@/lib/rivals';
import { loadPlayerRankings, rivalsFor, type PlayerRankings } from '@/lib/playerRankings';
import { computeBadges } from '@/lib/badges';
import { BadgesBar } from '@/components/BadgesBar';
import { RivalsCell } from '@/components/RivalsCell';

// recharts (~100 KB gz) n'est chargé que lorsqu'un graphique est affiché
const LapTimeChart = dynamic(() => import('./LapTimeChart'), {
  ssr: false,
  loading: () => <p className="text-neutral-500 animate-pulse text-sm py-8">Chargement du graphique…</p>,
});

interface ProfileLap {
  id: string;
  time_ms: number;
  car_class: CarClass;
  car_pi: number;
  drivetrain: Drivetrain;
  car_ordinal: number;
  track_id: number;
  created_at: string;
  share_code: string | null;
  cars: { manufacturer: string | null; name: string; year: number | null } | null;
  tracks: { name: string; length_km: number | null } | null;
}

interface Stats {
  totalLaps: number;
  totalCircuits: number;
  totalVoitures: number;
  classFavorite: string;
  drivetrainFavorite: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const CHART_COLORS = ['#e91e8c', '#7c3aed', '#22c55e', '#f59e0b', '#3b82f6'];

function ProgressionChart({ laps, trackName }: { laps: ProfileLap[]; trackName: string }) {
  const trackLaps = laps.filter(l => l.tracks?.name === trackName);

  const byConfig = new Map<string, ProfileLap[]>();
  for (const lap of trackLaps) {
    const car = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
    const key = `${car} — ${lap.car_class} / ${lap.drivetrain}`;
    if (!byConfig.has(key)) byConfig.set(key, []);
    byConfig.get(key)!.push(lap);
  }
  for (const arr of byConfig.values()) {
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // Timestamps uniques triés (axe X numérique)
  const allTs = [...new Set(trackLaps.map(l => new Date(l.created_at).getTime()))].sort((a, b) => a - b);

  const data = allTs.map(ts => {
    const d = new Date(ts);
    const row: Record<string, number | string> = {
      ts,
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      full:  d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    for (const [key, arr] of byConfig) {
      const lap = arr.find(l => new Date(l.created_at).getTime() === ts);
      if (lap) row[key] = lap.time_ms;
    }
    return row;
  });

  const totalPoints = data.reduce(
    (sum, row) => sum + [...byConfig.keys()].filter(k => row[k] !== undefined).length,
    0
  );
  if (totalPoints < 2) return null;

  const configKeys = [...byConfig.keys()];

  return (
    <div className="mb-5 p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
        Progression — {trackName}
      </p>
      <LapTimeChart
        data={data}
        series={configKeys.map(key => ({ key, name: key }))}
        colors={CHART_COLORS}
        yTickFormatter={ms => {
          const m = Math.floor(ms / 60000);
          const s = Math.floor((ms % 60000) / 1000);
          return `${m}:${String(s).padStart(2, '0')}`;
        }}
      />
    </div>
  );
}

type Tab = 'recents' | 'tous' | 'classements' | 'stats' | 'suivi' | 'rivaux';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'recents',     label: 'Récents',        icon: '🕐' },
  { id: 'tous',        label: 'Tous mes temps',  icon: '📋' },
  { id: 'suivi',       label: 'Suivi',           icon: '📈' },
  { id: 'classements', label: 'Mes classements', icon: '🏆' },
  { id: 'rivaux',      label: 'Mes rivaux',      icon: '👥' },
  { id: 'stats',       label: 'Statistiques',    icon: '📊' },
];

export default function ProfilClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('recents');
  const [pseudo,      setPseudo]      = useState<string>('');
  const [discordTag,  setDiscordTag]  = useState<string>('');
  const [editDiscord, setEditDiscord] = useState(false);
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [playerId,    setPlayerId]    = useState<string | null>(null);
  const [laps,      setLaps]      = useState<ProfileLap[]>([]);
  const [rankings,  setRankings]  = useState<PlayerRankings | null>(null);
  const [podiums,   setPodiums]   = useState<Podiums>({ gold: 0, silver: 0, bronze: 0 });
  const [generalRank,  setGeneralRank]  = useState<number | null>(null);
  const [generalTotal, setGeneralTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const [openTrackGroups,  setOpenTrackGroups]  = useState<Set<string>>(new Set());
  const [filterClass,      setFilterClass]      = useState('Toutes');
  const [filterTrack,      setFilterTrack]      = useState('Tous');
  const [filterDrivetrain, setFilterDrivetrain] = useState<'Tous' | Drivetrain>('Tous');
  const [filterCar,        setFilterCar]        = useState('Toutes');
  const [filterCarSearch,  setFilterCarSearch]  = useState('');
  const [showCarFilter,    setShowCarFilter]     = useState(false);
  const [filterTrackSearch,  setFilterTrackSearch]  = useState('');
  const [showTrackFilter,    setShowTrackFilter]    = useState(false);

  async function fetchData() {
    setIsLoading(true);
    setError(null);

    const { data: playerData } = await supabase
      .from('players')
      .select('id, pseudo, discord_tag, email_notifications_enabled')
      .eq('user_id', user!.id)
      .single();

    if (!playerData) { setIsLoading(false); return; }
    setPseudo(playerData.pseudo);
    setDiscordTag(playerData.discord_tag ?? '');
    setEmailNotifs(playerData.email_notifications_enabled ?? false);
    setPlayerId(playerData.id);

    const { data: lapsData, error: lapsError } = await supabase
      .from('lap_times')
      .select('id, time_ms, car_class, car_pi, drivetrain, car_ordinal, track_id, created_at, share_code, cars ( manufacturer, name, year ), tracks ( name, length_km )')
      .eq('player_id', playerData.id)
      .order('created_at', { ascending: false });

    if (lapsError) {
      setError("Impossible de charger tes données.");
      setIsLoading(false);
      return;
    }

    const playerLaps = (lapsData ?? []) as ProfileLap[];
    setLaps(playerLaps);

    // Rang, total et rivaux par config — calculés côté serveur (RPC)
    const ranks = await loadPlayerRankings(playerData.id, playerLaps);
    setRankings(ranks);
    setPodiums(ranks.podiums);

    // Rang au classement général (endpoint mis en cache côté serveur)
    try {
      const res = await fetch('/api/classement-general');
      if (res.ok) {
        const { ranking } = await res.json() as { ranking: { player_id: string }[] };
        const idx = ranking.findIndex(r => r.player_id === playerData.id);
        if (idx !== -1) { setGeneralRank(idx + 1); setGeneralTotal(ranking.length); }
      }
    } catch { /* le classement général reste optionnel */ }

    setIsLoading(false);
  }

  useEffect(() => {
    if (!authLoading && !user) router.push('/connexion');
  }, [user, authLoading, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données du profil
    if (user) fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function saveDiscordTag() {
    if (!playerId) return;
    setSavingDiscord(true);
    await supabase.from('players').update({ discord_tag: discordTag.trim() || null }).eq('id', playerId);
    setSavingDiscord(false);
    setEditDiscord(false);
  }

  async function toggleEmailNotifs() {
    if (!playerId) return;
    const next = !emailNotifs;
    setEmailNotifs(next);
    await supabase.from('players').update({ email_notifications_enabled: next }).eq('id', playerId);
  }

  const recentLaps = useMemo(() => laps.slice(0, 20), [laps]);

  const badges = useMemo(
    () => computeBadges({ laps, ranked: rankings?.ranked ?? [], generalRank, generalTotal }),
    [laps, rankings, generalRank, generalTotal]
  );

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
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={discordTag}
                          onChange={e => setDiscordTag(e.target.value)}
                          placeholder="Ton ID Discord (ex: 123456789)"
                          className="text-sm bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-0.5 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-indigo-400 w-56"
                        />
                        <span className="text-xs text-neutral-500">Discord → Paramètres → Mode développeur → clic droit sur ton profil → Copier l&apos;identifiant</span>
                      </div>
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
                      {discordTag ? <span className="text-indigo-400">Discord lié</span> : 'Lier Discord'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={toggleEmailNotifs}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      emailNotifs
                        ? 'text-pink-400 hover:text-pink-300'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                    title={emailNotifs ? 'Désactiver les notifications email' : 'Activer les notifications email quand tu te fais dépasser à la 1ère place'}
                  >
                    <span>{emailNotifs ? '🔔' : '🔕'}</span>
                    <span>Notifications email {emailNotifs ? 'activées' : 'désactivées'}</span>
                  </button>
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
          <BadgesBar badges={badges} />
        </div>

        {/* ── ONGLETS ── */}
        <div className="flex gap-1 mb-6 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              aria-pressed={activeTab === tab.id}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}>
              <span className="mr-1.5" aria-hidden="true">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'recents' && (
          <div>
            <p className="text-neutral-500 text-sm mb-4">Tes 20 derniers chronos enregistrés.</p>
            {recentLaps.length === 0
              ? <EmptyState message="Aucun chrono enregistré pour l'instant. Lance le relais et roule !" />
              : <LapTable laps={recentLaps} showDate isEditable />
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
                      <button onClick={() => { setFilterTrack('Tous'); setFilterTrackSearch(''); }} aria-label="Effacer le filtre circuit" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
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
                    <button onClick={() => { setFilterCar('Toutes'); setFilterCarSearch(''); }} aria-label="Effacer le filtre voiture" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
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
                    return (
                      <button key={dt} onClick={() => setFilterDrivetrain(dt)}
                        className={`px-4 py-1.5 rounded-full border text-sm font-bold transition-all ${
                          isActive ? DRIVETRAIN_FILTER_COLORS[dt] : 'bg-white dark:bg-neutral-950 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-500'
                        }`}>
                        {dt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {filterTrack !== 'Tous' && (
              <ProgressionChart laps={laps} trackName={filterTrack} />
            )}
            <p className="text-sm text-neutral-500 mb-3">{filteredLaps.length} résultat{filteredLaps.length !== 1 ? 's' : ''}</p>
            {filteredLaps.length === 0 ? (
              <EmptyState message="Aucun temps ne correspond à ces filtres." />
            ) : filterTrack !== 'Tous' ? (
              <LapTable laps={filteredLaps} showDate hideCircuit isEditable />
            ) : (
              // Groupé par circuit avec accordéon
              (() => {
                const byTrack = new Map<string, ProfileLap[]>();
                for (const lap of filteredLaps) {
                  const key = lap.tracks?.name ?? 'Circuit inconnu';
                  if (!byTrack.has(key)) byTrack.set(key, []);
                  byTrack.get(key)!.push(lap);
                }
                const circuits = [...byTrack.entries()].sort(([a], [b]) => a.localeCompare(b));
                return (
                  <div className="space-y-2">
                    {circuits.map(([trackName, trackLaps]) => {
                      const isOpen = openTrackGroups.has(trackName);
                      const lengthKm = trackLaps[0]?.tracks?.length_km;
                      return (
                        <div key={trackName} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setOpenTrackGroups(prev => {
                              const next = new Set(prev);
                              if (isOpen) next.delete(trackName);
                              else next.add(trackName);
                              return next;
                            })}
                            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left"
                          >
                            <span className="font-bold text-neutral-900 dark:text-white">{trackName}</span>
                            {lengthKm && <span className="text-sm text-neutral-500">· {lengthKm} km</span>}
                            <span className="ml-auto text-xs text-neutral-500 font-mono mr-1">
                              {trackLaps.length} chrono{trackLaps.length > 1 ? 's' : ''}
                            </span>
                            <svg className={`w-4 h-4 flex-shrink-0 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isOpen && (
                            <div className="border-t border-neutral-200 dark:border-neutral-800">
                              <LapTable laps={trackLaps} showDate hideCircuit isEditable />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {activeTab === 'classements' && <ClassementsTab laps={laps} rivalsByConfig={rankings?.rivalsByConfig ?? new Map()} />}
        {activeTab === 'suivi'       && playerId !== null && <SuiviTab playerId={playerId} laps={laps} />}
        {activeTab === 'rivaux'      && playerId !== null && <RivauxTab playerId={playerId} />}
        {activeTab === 'stats'       && <StatsTab stats={stats} laps={laps} />}

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

function ShareCodeCell({ lapId, initialCode }: { lapId: string; initialCode: string | null }) {
  const [code, setCode] = useState(initialCode ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(value: string) {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    await fetch(`/api/times/${lapId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ share_code: value.trim() }),
    });
    setCode(value.trim());
    setSaving(false);
    setEditing(false);
  }

  if (saving) return <span className="text-neutral-400 text-xs animate-pulse font-mono">...</span>;

  if (editing) {
    return (
      <input
        autoFocus
        value={code}
        onChange={e => setCode(e.target.value)}
        onBlur={() => save(code)}
        onKeyDown={e => {
          if (e.key === 'Enter') save(code);
          if (e.key === 'Escape') setEditing(false);
        }}
        placeholder="Code de réglage"
        className="w-28 bg-white dark:bg-neutral-950 border border-pink-500 rounded px-2 py-0.5 text-xs font-mono focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title={code ? 'Modifier le code de réglage' : 'Ajouter un code de réglage'}
      className={`font-mono text-sm transition-colors ${code ? 'text-violet-400 hover:text-violet-300' : 'text-neutral-400 hover:text-neutral-300 text-xs'}`}
    >
      {code || '+ code'}
    </button>
  );
}

function LapTable({ laps, showDate, hideCircuit, isEditable }: { laps: ProfileLap[]; showDate?: boolean; hideCircuit?: boolean; isEditable?: boolean }) {
  const { formatTime } = usePreferences();
  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-sm">
      {/* En-tête de colonnes (≥ sm) */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
        {showDate && <span className="w-36">DATE</span>}
        <span className="w-24">TEMPS</span>
        {isEditable && <span className="w-24">RÉGLAGE</span>}
        <span className="flex-1">VOITURE</span>
        <span className="w-32">CLASSE / PI</span>
        <span className="w-28">TRANSMISSION</span>
        {!hideCircuit && <span className="flex-1">CIRCUIT</span>}
      </div>
      {laps.map((lap, i) => (
        <div
          key={lap.id ?? i}
          className="flex flex-col gap-2 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors
                     sm:flex-row sm:items-center sm:gap-3"
        >
          <div className="flex items-center justify-between gap-3 sm:contents">
            {showDate && <span className="text-xs text-neutral-500 order-2 sm:order-none sm:w-36">{formatDate(lap.created_at)}</span>}
            <span className="font-mono font-bold text-pink-400 text-lg order-1 sm:order-none sm:text-base sm:w-24">{formatTime(lap.time_ms)}</span>
          </div>
          {isEditable && (
            <span className="sm:w-24">
              <span className="sm:hidden text-xs text-neutral-500 mr-2">Réglage :</span>
              <ShareCodeCell lapId={lap.id} initialCode={lap.share_code ?? null} />
            </span>
          )}
          <span className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</span>
          <span className="sm:w-32 flex items-center gap-2">
            <span className="px-2 py-1 rounded text-xs font-bold" style={CLASS_STYLES[lap.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>
              {lap.car_class}
            </span>
            <span className="text-sm text-neutral-500 font-mono">PI {lap.car_pi}</span>
          </span>
          <span className="sm:w-28"><DrivetrainBadge drivetrain={lap.drivetrain} /></span>
          {!hideCircuit && (
            <span className="text-neutral-600 dark:text-neutral-400 sm:flex-1 sm:truncate">
              {lap.tracks?.name ?? '—'}{lap.tracks?.length_km ? ` (${lap.tracks.length_km} km)` : ''}
            </span>
          )}
        </div>
      ))}
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

const SUIVI_COLORS = ['#e91e8c', '#7c3aed', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#06b6d4'];

function SuiviTab({ playerId, laps }: { playerId: string; laps: ProfileLap[] }) {
  const { formatTime } = usePreferences();
  const [history,      setHistory]      = useState<HistoryEntry[]>([]);
  const [currentBests, setCurrentBests] = useState<Map<string, number>>(new Map());
  const [loadedAt,     setLoadedAt]     = useState<number | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [chartTrack,   setChartTrack]   = useState('');
  const [trackSearch, setTrackSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('Tous');
  const [showTrackDrop, setShowTrackDrop] = useState(false);
  const [carSearch,   setCarSearch]   = useState('');
  const [selectedCar, setSelectedCar] = useState('Toutes');
  const [showCarDrop, setShowCarDrop] = useState(false);

  const chartTracks = useMemo(() =>
    Array.from(new Set(history.map(h => h.tracks?.name ?? ''))).filter(Boolean).sort(),
    [history]
  );

  const chartData = useMemo(() => {
    if (!chartTrack || loadedAt === null) return null;

    const now = loadedAt;
    const trackHistory = history
      .filter(h => h.tracks?.name === chartTrack)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    if (trackHistory.length === 0) return null;

    const byConfig = new Map<string, { label: string; trackId: number; carOrdinal: number; carClass: string; drivetrain: string; points: { ts: number; ms: number }[] }>();
    for (const h of trackHistory) {
      const key = `${h.car_ordinal}_${h.car_class}_${h.drivetrain}`;
      if (!byConfig.has(key)) {
        const label = `${h.cars?.year ?? ''} ${h.cars?.manufacturer ?? ''} ${h.cars?.name ?? ''} — ${h.car_class}/${h.drivetrain}`.trim();
        byConfig.set(key, { label, trackId: h.track_id, carOrdinal: h.car_ordinal, carClass: h.car_class, drivetrain: h.drivetrain, points: [] });
      }
      byConfig.get(key)!.points.push({ ts: new Date(h.recorded_at).getTime(), ms: h.time_ms });
    }

    for (const [, config] of byConfig) {
      const bestKey = `${config.trackId}-${config.carOrdinal}-${config.carClass}-${config.drivetrain}`;
      const currentBest = currentBests.get(bestKey);
      if (currentBest !== undefined) {
        config.points.push({ ts: now, ms: currentBest });
      }
    }

    const allTs = new Set<number>();
    for (const { points } of byConfig.values()) {
      for (const { ts } of points) allTs.add(ts);
    }
    const sortedTs = [...allTs].sort((a, b) => a - b);

    const data = sortedTs.map(ts => {
      const isNow = ts === now;
      const d = new Date(ts);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mn = String(d.getMinutes()).padStart(2, '0');
      const row: Record<string, unknown> = {
        ts,
        label: isNow ? 'Actuel' : `${dd}/${mm} ${hh}:${mn}`,
        full: isNow ? 'Record actuel' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      };
      for (const [key, { points }] of byConfig) {
        const point = points.find(p => p.ts === ts);
        if (point) row[key] = point.ms;
      }
      return row;
    });

    const configKeys = [...byConfig.keys()];
    const totalPoints = data.reduce((sum, row) => sum + configKeys.filter(k => row[k] !== undefined).length, 0);

    return { data, byConfig, configKeys, totalPoints };
  }, [history, currentBests, chartTrack, loadedAt]);

  useEffect(() => {
    Promise.all([
      supabase
        .from('lap_times_history')
        .select('id, time_ms, car_class, car_ordinal, drivetrain, car_pi, track_id, recorded_at, cars(manufacturer, name, year), tracks(name)')
        .eq('player_id', playerId)
        .order('recorded_at', { ascending: false }),
      supabase
        .from('lap_times')
        .select('track_id, car_ordinal, car_class, drivetrain, time_ms')
        .eq('player_id', playerId),
    ]).then(([histRes, bestRes]) => {
      setHistory((histRes.data ?? []) as unknown as HistoryEntry[]);
      const bestMap = new Map<string, number>();
      for (const b of (bestRes.data ?? [])) {
        bestMap.set(`${b.track_id}-${b.car_ordinal}-${b.car_class}-${b.drivetrain}`, b.time_ms);
      }
      setCurrentBests(bestMap);
      setLoadedAt(Date.now());
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

  const filteredCurrentBests = useMemo(() =>
    laps.filter(lap => {
      const matchTrack = selectedTrack === 'Tous' || lap.tracks?.name === selectedTrack;
      const carLabel   = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
      const matchCar   = selectedCar === 'Toutes' || carLabel === selectedCar;
      if (!matchTrack || !matchCar) return false;
      const key = `${lap.track_id}-${lap.car_ordinal}-${lap.car_class}-${lap.drivetrain}`;
      return history.some(h => `${h.track_id}-${h.car_ordinal}-${h.car_class}-${h.drivetrain}` === key);
    }),
    [laps, selectedTrack, selectedCar, history]
  );

  const filteredWithDiffs = useMemo(() => {
    const groups = new Map<string, HistoryEntry[]>();
    for (const h of filtered) {
      const key = `${h.track_id}-${h.car_ordinal}-${h.car_class}-${h.drivetrain}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h);
    }
    for (const entries of groups.values()) {
      entries.sort((a, b) => b.time_ms - a.time_ms); // pire en premier
    }
    return filtered.map(h => {
      const key      = `${h.track_id}-${h.car_ordinal}-${h.car_class}-${h.drivetrain}`;
      const group    = groups.get(key)!;
      const idx      = group.findIndex(e => e.id === h.id);
      const next     = idx < group.length - 1 ? group[idx + 1] : null;
      const best     = currentBests.get(key) ?? null;
      return {
        ...h,
        diffVsBest: best !== null ? h.time_ms - best : null,
        diffVsNext: next ? h.time_ms - next.time_ms : null,
      };
    });
  }, [filtered, currentBests]);

  if (loading) return <p className="text-neutral-500 animate-pulse p-4">Chargement de l&apos;historique...</p>;
  if (history.length === 0) return <EmptyState message="Aucun historique disponible — il se remplit à chaque fois que tu bats ton propre record." />;

  return (
    <div className="space-y-4">

      {/* ── GRAPHIQUE DE PROGRESSION ── */}
      <div className="p-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-4">
        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Progression sur circuit</p>
        <select
          value={chartTrack}
          onChange={e => setChartTrack(e.target.value)}
          className="w-full md:w-72 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
        >
          <option value="">Sélectionne un circuit</option>
          {chartTracks.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {chartTrack && (
          chartData && chartData.totalPoints >= 2 ? (
            <LapTimeChart
              data={chartData.data}
              series={chartData.configKeys.map(key => ({ key, name: chartData.byConfig.get(key)!.label }))}
              colors={SUIVI_COLORS}
              yTickFormatter={ms => {
                const min = Math.floor(ms / 60000);
                const sec = Math.floor((ms % 60000) / 1000);
                const msRem = Math.floor(ms % 1000);
                return `${min}:${String(sec).padStart(2, '0')}.${String(msRem).padStart(3, '0').slice(0, 2)}`;
              }}
            />
          ) : (
            <p className="text-sm text-neutral-500 py-4">
              Bats ton record au moins une fois sur ce circuit pour voir ta progression.
            </p>
          )
        )}
      </div>

      {/* ── HISTORIQUE ── */}
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
              <button onClick={() => { setSelectedTrack('Tous'); setTrackSearch(''); }} aria-label="Effacer le filtre circuit" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
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
              <button onClick={() => { setSelectedCar('Toutes'); setCarSearch(''); }} aria-label="Effacer le filtre voiture" className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white">✕</button>
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

      <p className="text-sm text-neutral-500">{filtered.length + filteredCurrentBests.length} entrée{(filtered.length + filteredCurrentBests.length) !== 1 ? 's' : ''} dans l&apos;historique</p>

      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-sm">
        {/* En-tête de colonnes (≥ sm) */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
          <span className="w-36">DATE</span>
          <span className="w-56">TEMPS</span>
          <span className="flex-1">VOITURE</span>
          <span className="w-32">CLASSE / PI</span>
          <span className="w-28">TRANSMISSION</span>
          <span className="flex-1">CIRCUIT</span>
        </div>
        {filteredCurrentBests.map(lap => (
          <div key={`best-${lap.id}`} className="flex flex-col gap-2 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors bg-green-950/10 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs text-neutral-500 sm:w-36">{formatDate(lap.created_at)}</span>
            <span className="font-mono sm:w-56">
              <span className="font-bold text-green-400">{formatTime(lap.time_ms)}</span>
              <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">Record actuel</span>
            </span>
            <span className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</span>
            <span className="sm:w-32 flex items-center gap-2">
              <span className="px-2 py-1 rounded text-xs font-bold" style={CLASS_STYLES[lap.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>{lap.car_class}</span>
              <span className="text-sm text-neutral-500 font-mono">PI {lap.car_pi ?? '—'}</span>
            </span>
            <span className="sm:w-28"><DrivetrainBadge drivetrain={lap.drivetrain} /></span>
            <span className="text-neutral-600 dark:text-neutral-400 sm:flex-1 sm:truncate">{lap.tracks?.name ?? '—'}</span>
          </div>
        ))}
        {filteredWithDiffs.map(h => (
          <div key={h.id} className="flex flex-col gap-2 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs text-neutral-500 sm:w-36">{formatDate(h.recorded_at)}</span>
            <span className="font-mono sm:w-56">
              <span className="font-bold text-neutral-400 dark:text-neutral-500">{formatTime(h.time_ms)}</span>
              {h.diffVsBest !== null && (
                <span className="ml-2 text-xs text-orange-400" title="Écart avec ton record actuel">
                  +{(h.diffVsBest / 1000).toFixed(3).replace('.', ',')}s
                  {h.diffVsNext !== null && (
                    <span className="text-neutral-500 ml-1" title="Gain par rapport à l'ancien record précédent">(+{(h.diffVsNext / 1000).toFixed(3).replace('.', ',')}s)</span>
                  )}
                </span>
              )}
            </span>
            <span className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{h.cars?.year} {h.cars?.manufacturer} {h.cars?.name}</span>
            <span className="sm:w-32 flex items-center gap-2">
              <span className="px-2 py-1 rounded text-xs font-bold" style={CLASS_STYLES[h.car_class] ?? { backgroundColor: '#555', color: '#fff' }}>{h.car_class}</span>
              <span className="text-sm text-neutral-500 font-mono">PI {h.car_pi ?? '—'}</span>
            </span>
            <span className="sm:w-28"><DrivetrainBadge drivetrain={h.drivetrain as Drivetrain} /></span>
            <span className="text-neutral-600 dark:text-neutral-400 sm:flex-1 sm:truncate">{h.tracks?.name ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassementsTab({ laps, rivalsByConfig }: { laps: ProfileLap[]; rivalsByConfig: Map<string, ConfigRivals> }) {
  const { formatTime } = usePreferences();
  // Rang, total et rivaux directs issus du calcul serveur (RPC) — aucune
  // requête supplémentaire.
  const rankings = useMemo(() =>
    laps
      .filter(lap => lap.tracks?.name)
      .map(lap => ({ lap, rivals: rivalsFor(rivalsByConfig, lap) }))
      .sort((a, b) => a.rivals.rank - b.rivals.rank),
    [laps, rivalsByConfig]
  );

  if (rankings.length === 0) return <EmptyState message="Aucun classement disponible pour l'instant." />;

  return (
    <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-sm">
      {/* En-tête de colonnes (≥ sm) */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
        <span className="w-24">POSITION</span>
        <span className="flex-1">CIRCUIT</span>
        <span className="flex-1">VOITURE</span>
        <span className="w-28">TRANSMISSION</span>
        <span className="w-28">TEMPS</span>
        <span className="w-56">RIVAUX</span>
      </div>
      {rankings.map(({ lap, rivals }, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors
                     sm:flex-row sm:items-center sm:gap-3"
        >
          <div className="flex items-center justify-between gap-3 sm:contents">
            <span className="sm:w-24 flex-shrink-0">
              <span className={`text-lg font-extrabold ${rivals.rank === 1 ? 'text-yellow-400' : rivals.rank === 2 ? 'text-neutral-400 dark:text-neutral-300' : rivals.rank === 3 ? 'text-amber-600' : 'text-neutral-500'}`}>
                {rivals.rank === 1 ? '🥇' : rivals.rank === 2 ? '🥈' : rivals.rank === 3 ? '🥉' : `#${rivals.rank}`}
              </span>
              <span className="text-xs text-neutral-400 dark:text-neutral-600 ml-2">/ {rivals.total}</span>
            </span>
            <span className="font-mono font-bold text-pink-400 sm:hidden">{formatTime(lap.time_ms)}</span>
          </div>
          <span className="text-neutral-700 dark:text-neutral-300 font-semibold sm:flex-1 sm:truncate">{lap.tracks?.name ?? '—'}</span>
          <span className="text-neutral-600 dark:text-neutral-400 sm:flex-1 sm:truncate">{lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}</span>
          <span className="sm:w-28"><DrivetrainBadge drivetrain={lap.drivetrain} /></span>
          <span className="hidden sm:block font-mono font-bold text-pink-400 sm:w-28">{formatTime(lap.time_ms)}</span>
          <span className="sm:w-56"><RivalsCell rivals={rivals} /></span>
        </div>
      ))}
    </div>
  );
}

interface FollowedPlayer {
  id: string;
  pseudo: string;
  discord_tag: string | null;
}

function RivauxTab({ playerId }: { playerId: string }) {
  const [followed, setFollowed] = useState<FollowedPlayer[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('follows')
        .select('followed_player_id, created_at')
        .eq('follower_player_id', playerId)
        .order('created_at', { ascending: false });
      const ids = (rows ?? []).map(r => r.followed_player_id);
      if (ids.length === 0) {
        if (!cancelled) { setFollowed([]); setLoading(false); }
        return;
      }
      const { data: players } = await supabase
        .from('players')
        .select('id, pseudo, discord_tag')
        .in('id', ids);
      // On conserve l'ordre des suivis (du plus récent au plus ancien).
      const byId = new Map((players ?? []).map(p => [p.id, p as FollowedPlayer]));
      const ordered = ids.map(id => byId.get(id)).filter((p): p is FollowedPlayer => !!p);
      if (!cancelled) { setFollowed(ordered); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  async function unfollow(id: string) {
    setBusyId(id);
    await supabase.from('follows').delete()
      .eq('follower_player_id', playerId)
      .eq('followed_player_id', id);
    setFollowed(prev => prev.filter(p => p.id !== id));
    setBusyId(null);
  }

  if (loading) return <p className="text-neutral-500 animate-pulse p-4">Chargement de tes rivaux…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
        <span aria-hidden="true">🔔</span>
        <p>
          Tu reçois une notification dès qu&apos;un pilote suivi te dépasse sur une de tes
          configurations, quelle que soit sa position. Suis un pilote depuis sa page de profil.
        </p>
      </div>

      {followed.length === 0 ? (
        <EmptyState message="Tu ne suis aucun pilote pour l'instant. Va sur le profil d'un joueur et clique sur « + Suivre »." />
      ) : (
        <>
          <p className="text-sm text-neutral-500">{followed.length} pilote{followed.length !== 1 ? 's' : ''} suivi{followed.length !== 1 ? 's' : ''}</p>
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            {followed.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-sm font-extrabold text-white">
                  {p.pseudo.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/joueurs/${encodeURIComponent(p.pseudo)}`} className="font-bold text-neutral-900 dark:text-white hover:text-pink-400 transition-colors truncate block">
                    {p.pseudo}
                  </Link>
                  {p.discord_tag && <span className="text-xs text-indigo-400">Discord lié</span>}
                </div>
                <Link
                  href={`/joueurs/${encodeURIComponent(p.pseudo)}`}
                  className="hidden sm:inline-block px-3 py-1.5 rounded-full text-sm font-semibold text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:border-pink-400 hover:text-pink-400 transition-colors"
                >
                  Voir le profil
                </Link>
                <button
                  onClick={() => unfollow(p.id)}
                  disabled={busyId === p.id}
                  className="px-3 py-1.5 rounded-full text-sm font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {busyId === p.id ? '…' : 'Ne plus suivre'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
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

