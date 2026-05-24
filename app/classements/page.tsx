"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// 1. L'outil de formatage du temps
function formatTime(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

export default function ClassementsPage() {
  
  // 2. Les "Mémoires" de notre page (les États)
  const [lapTimes, setLapTimes] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Les mémoires de nos filtres
  const [selectedClass, setSelectedClass] = useState("Toutes");
  const [selectedTrack, setSelectedTrack] = useState("Tous");

  // 3. Le chargement des données au démarrage de la page
  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('lap_times')
        .select(`
          time_ms, car_class, car_pi,
          players ( pseudo ),
          cars ( manufacturer, name, year ),
          tracks ( name, length_km )
        `)
        .order('time_ms', { ascending: true })
        .limit(200);

      if (error) {
        console.error("Erreur de récupération Supabase :", error);
      } else if (data) {
        setLapTimes(data);
      }
      setIsLoading(false);
    }
    
    fetchData();
  }, []);

  // 4. L'intelligence du filtre
  const uniqueClasses = ["Toutes", ...Array.from(new Set(lapTimes.map(lap => lap.car_class)))].filter(Boolean);
  const uniqueTracks = ["Tous", ...Array.from(new Set(lapTimes.map(lap => lap.tracks?.name || "Inconnu")))].sort();

  // 5. L'application des filtres
  const filteredLaps = lapTimes.filter((lap) => {
    const matchClass = selectedClass === "Toutes" || lap.car_class === selectedClass;
    const matchTrack = selectedTrack === "Tous" || lap.tracks?.name === selectedTrack;
    return matchClass && matchTrack;
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6">
      
      {/* Navigation */}
      <nav className="max-w-6xl mx-auto py-4 mb-8 border-b border-neutral-800">
        <Link href="/" className="text-neutral-400 hover:text-white transition-colors">
          ← Retour à l'accueil
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
          Leaderboards
        </h1>
        <p className="text-neutral-400 mb-8 text-lg">
          Filtrez les résultats pour comparer ce qui est comparable.
        </p>

        {/* --- LA ZONE DES FILTRES --- */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
          
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
            <label className="text-sm text-neutral-400 font-bold mb-1">Classe de la voiture :</label>
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

        {/* Le Tableau des temps */}
        <div className="overflow-x-auto bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950">
                <th className="p-4 font-bold text-neutral-400 tracking-wider">#</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">PILOTE</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">TEMPS</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">VOITURE</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">CLASSE</th>
                <th className="p-4 font-bold text-neutral-400 tracking-wider">CIRCUIT</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-500 font-medium animate-pulse">
                    Chargement des données télémétriques...
                  </td>
                </tr>
              ) : filteredLaps.length > 0 ? (
                filteredLaps.map((lap, index) => (
                  <tr key={index} className="border-b border-neutral-800/50 hover:bg-neutral-800 transition-colors">
                    <td className="p-4 font-bold text-neutral-600">{index + 1}</td>
                    <td className="p-4 font-bold text-white">{lap.players?.pseudo || 'Inconnu'}</td>
                    <td className="p-4 font-mono font-bold text-pink-400 text-lg">
                      {formatTime(lap.time_ms)}
                    </td>
                    <td className="p-4 text-neutral-300">
                      {lap.cars?.year} {lap.cars?.manufacturer} {lap.cars?.name}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs font-bold mr-2 text-white">
                        {lap.car_class}
                      </span>
                      <span className="text-sm text-neutral-500 font-mono">PI {lap.car_pi}</span>
                    </td>
                    <td className="p-4 text-neutral-400">
                      {lap.tracks?.name || 'Inconnu'} {lap.tracks?.length_km ? `(${lap.tracks.length_km} km)` : ''}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-500 font-medium">
                    Aucun temps ne correspond à ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}