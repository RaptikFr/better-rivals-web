"use client";

import { useState, useEffect } from 'react';
import { formatTime } from '@/components/formatTime';

interface Stats {
  totalChronos:  number;
  totalPilotes:  number;
  totalCircuits: number;
  totalVoitures: number;
}

interface TopPilote { pseudo: string; count: number; }
interface TopItem   { name: string;  count: number; }

interface LastChrono {
  id:         string;
  time_ms:    number;
  created_at: string;
  players:    { pseudo: string } | null;
  cars:       { manufacturer: string | null; name: string; year: number | null } | null;
  tracks:     { name: string } | null;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function StatsClient() {
  const [stats,       setStats]       = useState<Stats | null>(null);
  const [topPilotes,  setTopPilotes]  = useState<TopPilote[]>([]);
  const [topCircuits, setTopCircuits] = useState<TopItem[]>([]);
  const [topVoitures, setTopVoitures] = useState<TopItem[]>([]);
  const [lastChronos, setLastChronos] = useState<LastChrono[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        // Stats calculées et mises en cache côté serveur (60 s, partagées entre visiteurs)
        const res = await fetch('/api/stats');
        if (!res.ok) throw new Error();
        const data = await res.json();

        setStats(data.stats);
        setTopPilotes(data.topPilotes);
        setTopCircuits(data.topCircuits);
        setTopVoitures(data.topVoitures);
        setLastChronos(data.lastChronos);
      } catch {
        setError('Impossible de charger les statistiques.');
      }
      setLoading(false);
    }
    fetchAll();
  }, []);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
            Statistiques
          </h1>
          <p className="text-neutral-500 animate-pulse">Chargement des statistiques...</p>
        </div>
      </main>
    );
  }

  const maxCircuit = topCircuits[0]?.count ?? 1;
  const maxVoiture = topVoitures[0]?.count ?? 1;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto space-y-12">

        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
            Statistiques
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">Les chiffres de la communauté Better Rivals.</p>
        </div>

        {/* SECTION 1 — Chiffres clés */}
        <section>
          <h2 className="text-xl font-bold mb-4">Chiffres clés</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Chronos enregistrés', value: stats!.totalChronos,  icon: '⏱️' },
              { label: 'Pilotes inscrits',     value: stats!.totalPilotes,  icon: '🧑‍🏎️' },
              { label: 'Circuits disponibles', value: stats!.totalCircuits, icon: '🏁' },
              { label: 'Voitures différentes', value: stats!.totalVoitures, icon: '🚗' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col gap-2">
                <span className="text-2xl">{icon}</span>
                <p className="text-3xl font-extrabold">{value.toLocaleString('fr-FR')}</p>
                <p className="text-sm text-neutral-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2 — Podium pilotes */}
        <section>
          <h2 className="text-xl font-bold mb-4">Pilotes les plus actifs</h2>
          {topPilotes.length === 0 ? (
            <p className="text-neutral-500">Aucune donnée.</p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              {topPilotes.map((p, i) => (
                <div
                  key={p.pseudo}
                  className={`flex-1 bg-neutral-100 dark:bg-neutral-900 border rounded-xl p-6 flex flex-col items-center gap-2 text-center ${
                    i === 0 ? 'border-yellow-500/40' : 'border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <span className="text-4xl">{MEDALS[i]}</span>
                  <p className="text-lg font-extrabold">{p.pseudo}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{p.count} chrono{p.count > 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 3 — Circuits les plus courus */}
        <section>
          <h2 className="text-xl font-bold mb-4">Circuits les plus courus</h2>
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
            {topCircuits.map(({ name, count }) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{name}</span>
                  <span className="text-neutral-600 dark:text-neutral-400">{count} chrono{count > 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-violet-600 rounded-full transition-all" style={{ width: `${(count / maxCircuit) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4 — Voitures les plus utilisées */}
        <section>
          <h2 className="text-xl font-bold mb-4">Voitures les plus utilisées</h2>
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
            {topVoitures.map(({ name, count }) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{name}</span>
                  <span className="text-neutral-600 dark:text-neutral-400">{count} chrono{count > 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-violet-600 rounded-full transition-all" style={{ width: `${(count / maxVoiture) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5 — Derniers chronos */}
        <section>
          <h2 className="text-xl font-bold mb-4">Derniers chronos enregistrés</h2>
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl overflow-hidden text-sm">
            {/* En-tête de colonnes (≥ sm) */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
              <span className="w-40">PILOTE</span>
              <span className="flex-1">VOITURE</span>
              <span className="flex-1">CIRCUIT</span>
              <span className="w-28">TEMPS</span>
              <span className="w-24 text-right">DATE</span>
            </div>
            {lastChronos.map((lap) => (
              <div
                key={lap.id}
                className="flex flex-col gap-1 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors
                           sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="flex items-center justify-between gap-3 sm:contents">
                  <span className="font-bold sm:w-40 sm:truncate">{lap.players?.pseudo ?? '—'}</span>
                  <span className="font-mono font-bold text-pink-400 sm:hidden">{formatTime(lap.time_ms)}</span>
                </div>
                <span className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{lap.cars ? `${lap.cars.year} ${lap.cars.manufacturer} ${lap.cars.name}` : '—'}</span>
                <span className="text-neutral-700 dark:text-neutral-300 sm:flex-1 sm:truncate">{lap.tracks?.name ?? '—'}</span>
                <span className="hidden sm:block font-mono font-bold text-pink-400 sm:w-28">{formatTime(lap.time_ms)}</span>
                <span className="text-neutral-500 text-xs sm:text-sm sm:w-24 sm:text-right">{new Date(lap.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
