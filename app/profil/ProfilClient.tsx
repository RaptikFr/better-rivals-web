"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Drivetrain } from '@/types/supabase';
import { DRIVETRAIN_FILTER_COLORS } from '@/components/DrivetrainBadge';
import type { Podiums } from '@/lib/podiums';
import { loadPlayerRankings, type PlayerRankings } from '@/lib/playerRankings';
import { computeBadges } from '@/lib/badges';
import { BadgesBar } from '@/components/BadgesBar';
import { EmptyState, LapTable, ProgressionChart, type ProfileLap, type Stats } from './profilShared';
import { SuiviTab } from './SuiviTab';
import { CoachTab } from './CoachTab';
import { ClassementsTab, RivauxTab, StatsTab } from './ProfilTabs';
import { usePreferences } from '@/hooks/usePreferences';

type Tab = 'recents' | 'tous' | 'classements' | 'stats' | 'suivi' | 'rivaux' | 'coach';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'recents',     label: 'Récents',        icon: '🕐' },
  { id: 'tous',        label: 'Tous mes temps',  icon: '📋' },
  { id: 'suivi',       label: 'Suivi',           icon: '📈' },
  { id: 'classements', label: 'Mes classements', icon: '🏆' },
  { id: 'rivaux',      label: 'Mes rivaux',      icon: '👥' },
  { id: 'stats',       label: 'Statistiques',    icon: '📊' },
];

// L'onglet Coach n'apparaît que si le joueur a activé le rapport post-tour
// (opt-in dans /paramètres, désactivé par défaut).
const COACH_TAB: { id: Tab; label: string; icon: string } = { id: 'coach', label: 'Coach', icon: '🧠' };

export default function ProfilClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { prefs } = usePreferences();
  const visibleTabs = useMemo(() => (prefs.coachReport ? [...TABS, COACH_TAB] : TABS), [prefs.coachReport]);

  const [activeTab, setActiveTab] = useState<Tab>('recents');
  const [pseudo,      setPseudo]      = useState<string>('');
  const [discordTag,  setDiscordTag]  = useState<string>('');
  const [editDiscord, setEditDiscord] = useState(false);
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [hideDiscord, setHideDiscord] = useState(false);
  const [playerId,    setPlayerId]    = useState<string | null>(null);
  const [laps,      setLaps]      = useState<ProfileLap[]>([]);
  const [rankings,  setRankings]  = useState<PlayerRankings | null>(null);
  const [podiums,   setPodiums]   = useState<Podiums>({ gold: 0, silver: 0, bronze: 0 });
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
      .select('id, pseudo, hide_discord_tag')
      .eq('user_id', user!.id)
      .single();

    if (!playerData) { setIsLoading(false); return; }
    setPseudo(playerData.pseudo);
    // Le tag brut n'est plus lisible par select (révoqué) : on lit le sien via RPC.
    const { data: ownTag } = await supabase.rpc('my_discord_tag');
    setDiscordTag(ownTag ?? '');
    setHideDiscord(playerData.hide_discord_tag ?? false);
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

  async function toggleHideDiscord() {
    if (!playerId) return;
    const next = !hideDiscord;
    setHideDiscord(next);
    await supabase.from('players').update({ hide_discord_tag: next }).eq('id', playerId);
  }

  const recentLaps = useMemo(() => laps.slice(0, 20), [laps]);

  const badges = useMemo(
    () => computeBadges({ laps, ranked: rankings?.ranked ?? [] }),
    [laps, rankings]
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
                {discordTag && !editDiscord && (
                  <div className="mt-1.5">
                    <button
                      onClick={toggleHideDiscord}
                      aria-pressed={hideDiscord}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${
                        hideDiscord ? 'text-pink-400 hover:text-pink-300' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                      title={hideDiscord ? 'Ton tag Discord est masqué du public' : 'Masquer ton tag Discord des pages publiques'}
                    >
                      <span aria-hidden="true">{hideDiscord ? '🙈' : '👁️'}</span>
                      <span>Tag Discord {hideDiscord ? 'masqué du public' : 'visible publiquement'}</span>
                    </button>
                  </div>
                )}
                <div className="mt-1.5">
                  <Link href="/parametres" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-pink-400 transition-colors">
                    <span aria-hidden="true">🔔</span>
                    <span>Gérer mes notifications dans les Paramètres →</span>
                  </Link>
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
          {visibleTabs.map(tab => (
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
        {activeTab === 'coach'       && prefs.coachReport && <CoachTab laps={laps} />}

      </div>
    </main>
  );
}
