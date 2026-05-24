"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { LapTime, Drivetrain } from '@/types/supabase';

const ITEMS_PER_PAGE = 20;

// Formatage du temps en mm:ss.ms
function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Badge coloré pour la transmission
function DrivetrainBadge({ drivetrain }: { drivetrain: Drivetrain | null }) {
  const colors: Record<Drivetrain, string> = {
    AWD: "bg-blue-500/20 border-blue-500/50 text-blue-400",
    RWD: "bg-orange-500/20 border-orange-500/50 text-orange-400",
    FWD: "bg-green-500/20 border-green-500/50 text-green-400",
  };
  const style = drivetrain ? colors[drivetrain] : "bg-neutral-800 border-neutral-700 text-neutral-400";
  return (
    <span className={`px-2 py-0.5 border rounded text-xs font-bold ${style}`}>
      {drivetrain ?? "—"}
    </span>
  );
}

const DRIVETRAIN_OPTIONS: Array<"Tous" | Drivetrain> = ["Tous", "AWD", "RWD", "FWD"];

export default function ClassementsClient() {

  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [selectedClass, setSelectedClass] = useState("Toutes");
  const [selectedTrack, setSelectedTrack] = useState("Tous");
  const [selectedDrivetrain, setSelectedDrivetrain] = useState<"Tous" | Drivetrain>("Tous");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  // Remettre à la page 1 quand un filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedTrack, selectedDrivetrain]);

  async function fetchData() {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('lap_times')
      .select(`
        time_ms, car_class, car_pi, drivetrain,
        players ( pseudo ),
        cars ( manufacturer, name, year ),
        tracks ( name, length_km )
      `)
      .order('time_ms', { ascending: true })
      .limit(200);

    if (error) {
      console.error("Erreur de récupération Supabase :", error);
      setError("Impossible de charger les classements. Vérifie ta connexion ou réessaie dans quelques instants.");
    } else if (data) {
      setLapTimes(data as unknown as LapTime[]);
    }
    setIsLoading(false);
  }

  // Options de filtres dynamiques
  const uniqueClasses = ["Toutes", ...Array.from(new Set(lapTimes.map(lap => lap.car_class)))].filter(Boolean);
  const uniqueTracks = ["Tous", ...Array.from(new Set(lapTimes.map(lap => lap.tracks?.[0]?.name ?? "Inconnu")))].sort();

  // Application des filtres
  const filteredLaps = lapTimes.filter((lap) => {
    const matchClass = selectedClass === "Toutes" || lap.car_class === selectedClass;
    const matchTrack = selectedTrack === "Tous" || lap.tracks?.[0]?.name === selectedTrack;
    const matchDrivetrain = selectedDrivetrain === "Tous" || lap.drivetrain === selectedDrivetrain;
    return matchClass && matchTrack && matchDrivetrain;
  });

  // Calculs de pagination
  const totalPages = Math.max(1, Math.ceil(filteredLaps.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLaps = filteredLaps.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );
  // L'index réel dans le classement global (pas remis à 1 à chaque page)
  const globalOffset = (safePage - 1) * ITEMS_PER_PAGE;

  return (
    <main className="min-h-screen p-6">

      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
          Leaderboards
        </h1>
        <p className="text-neutral-400 mb-8 text-lg">
          Filtrez les résultats pour comparer ce qui est comparable.
        </p>

        {/* --- ZONE DES FILTRES --- */}
        <div className="flex flex-col gap-4 mb-6 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">

          {/* Ligne 1 : Circuit + Classe */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex flex-col">
              <label className="text-sm text-neutral-400 font-bold mb-1">Circuit :</label>
              <select
                className="bg-neutral-950 border border-neutral-700 text-white p-2 rounded-lg focus:outline-none focus:border-pink-500"
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
              >
                {uniqueTracks.map((track, idx) => (
                  <option key={idx} value={track}>{track}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-neutral-400 font-bold mb-1">Classe :</label>
              <select
                className="bg-neutral-950 border border-neutral-700 text-white p-2 rounded-lg focus:outline-none focus:border-pink-500"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {uniqueClasses.map((carClass, idx) => (
                  <option key={idx} value={carClass}>{carClass}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ligne 2 : Transmission (boutons visuels) */}
          <div className="flex flex-col">
            <label className="text-sm text-neutral-400 font-bold mb-2">Transmission :</label>
            <div className="flex flex-wrap gap-2">
              {DRIVETRAIN_OPTIONS.map((dt) => {
                const isActive = selectedDrivetrain === dt;
                const activeColors: Record<typeof dt, string> = {
                  Tous: "bg-white text-black border-white",
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
                        : "bg-neutral-950 border-neutral-700 text-neutral-400 hover:border-neutral-500"
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
            {selectedDrivetrain !== "Tous" || selectedClass !== "Toutes" || selectedTrack !== "Tous"
              ? " avec les filtres actuels"
              : " au total"}
            {totalPages > 1 && ` — page ${safePage} / ${totalPages}`}
          </p>
        )}

        {/* Tableau des temps */}
        <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950">
                <th className="p-4 font-bold text-neutral-400 tracking-wider">#</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">PILOTE</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">TEMPS</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">VOITURE</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">CLASSE / PI</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">TRANSMISSION</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">CIRCUIT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500 font-medium animate-pulse">
                    Chargement des données télémétriques...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-3xl">⚠️</span>
                      <p className="text-neutral-400 font-medium">{error}</p>
                      <button
                        onClick={fetchData}
                        className="mt-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white hover:bg-neutral-700 transition-colors"
                      >
                        Réessayer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedLaps.length > 0 ? (
                paginatedLaps.map((lap, index) => (
                  <tr key={index} className="border-b border-neutral-800/50 hover:bg-neutral-800 transition-colors">
                    <td className="p-4 font-bold text-neutral-600">{globalOffset + index + 1}</td>
                    <td className="p-4 font-bold text-white">{lap.players?.[0]?.pseudo ?? 'Inconnu'}</td>
                    <td className="p-4 font-mono font-bold text-pink-400 text-lg">
                      {formatTime(lap.time_ms)}
                    </td>
                    <td className="p-4 text-neutral-300">
                      {lap.cars?.[0]?.year} {lap.cars?.[0]?.manufacturer} {lap.cars?.[0]?.name}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs font-bold mr-2 text-white">
                        {lap.car_class}
                      </span>
                      <span className="text-sm text-neutral-500 font-mono">PI {lap.car_pi}</span>
                    </td>
                    <td className="p-4">
                      <DrivetrainBadge drivetrain={lap.drivetrain} />
                    </td>
                    <td className="p-4 text-neutral-400">
                      {lap.tracks?.[0]?.name ?? 'Inconnu'}{lap.tracks?.[0]?.length_km ? ` (${lap.tracks[0].length_km} km)` : ''}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500 font-medium">
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

            {/* Bouton Précédent */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-4 py-2 rounded-lg border border-neutral-700 text-sm font-bold text-neutral-400 hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Précédent
            </button>

            {/* Numéros de pages */}
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
                    <span key={`ellipsis-${i}`} className="px-2 py-2 text-neutral-600 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item as number)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                        safePage === item
                          ? "bg-pink-500 text-white border border-pink-500"
                          : "border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )
              }
            </div>

            {/* Bouton Suivant */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-4 py-2 rounded-lg border border-neutral-700 text-sm font-bold text-neutral-400 hover:text-white hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Suivant →
            </button>

          </div>
        )}

      </div>
    </main>
  );
}
