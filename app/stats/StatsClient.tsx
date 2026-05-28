"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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

  useEffect(() => {
    async function fetchAll() {
      const [
        { count: totalChronos },
        { count: totalPilotes },
        { count: totalCircuits },
        { data: carOrdinalsData },
        { data: pilotesData },
        { data: circuitsData },
        { data: voituresData },
        { data: lastData },
      ] = await Promise.all([
        supabase.from('lap_times').select('*', { count: 'exact', head: true }),
        supabase.from('players').select('*', { count: 'exact', head: true }),
        supabase.from('tracks').select('*', { count: 'exact', head: true }).eq('status', 'approved').eq('is_sprint', false),
        supabase.from('lap_times').select('car_ordinal'),
        supabase.from('lap_times').select('players ( pseudo )'),
        supabase.from('lap_times').select('tracks ( name )'),
        supabase.from('lap_times').select('cars ( manufacturer, name, year )'),
        supabase.from('lap_times')
          .select('id, time_ms, created_at, players ( pseudo ), cars ( manufacturer, name, year ), tracks ( name )')
          .order('created_at', { ascending: false }).limit(5),
      ]);

      const distinctCars = new Set(
        (carOrdinalsData ?? [] as { car_ordinal: number }[]).map(r => r.car_ordinal)
      );

      const piloteCount: Record<string, number> = {};
      for (const row of (pilotesData ?? []) as { players: { pseudo: string } | null }[]) {
        const pseudo = row.players?.pseudo ?? 'Inconnu';
        piloteCount[pseudo] = (piloteCount[pseudo] ?? 0) + 1;
      }
      const top3Pilotes = Object.entries(piloteCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([pseudo, count]) => ({ pseudo, count }));

      const circuitCount: Record<string, number> = {};
      for (const row of (circuitsData ?? []) as { tracks: { name: string } | null }[]) {
        const name = row.tracks?.name ?? 'Inconnu';
        circuitCount[name] = (circuitCount[name] ?? 0) + 1;
      }
      const top5Circuits = Object.entries(circuitCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

      const voitureCount: Record<string, number> = {};
      for (const row of (voituresData ?? []) as { cars: { manufacturer: string; name: string; year: number } | null }[]) {
        const c = row.cars;
        const name = c ? `${c.year} ${c.manufacturer} ${c.name}` : 'Inconnue';
        voitureCount[name] = (voitureCount[name] ?? 0) + 1;
      }
      const top5Voitures = Object.entries(voitureCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

      setStats({ totalChronos: totalChronos ?? 0, totalPilotes: totalPilotes ?? 0, totalCircuits: totalCircuits ?? 0, totalVoitures: distinctCars.size });
      setTopPilotes(top3Pilotes);
      setTopCircuits(top5Circuits);
      setTopVoitures(top5Voitures);
      setLastChronos((lastData ?? []) as LastChrono[]);
      setLoading(false);
    }
    fetchAll();
  }, []);

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
          <div className="overflow-x-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                  <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">PILOTE</th>
                  <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">VOITURE</th>
                  <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">CIRCUIT</th>
                  <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">TEMPS</th>
                  <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">DATE</th>
                </tr>
              </thead>
              <tbody>
                {lastChronos.map((lap) => (
                  <tr key={lap.id} className="border-b border-neutral-200/50 dark:border-neutral-800/50 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                    <td className="p-4 font-bold">{lap.players?.pseudo ?? '—'}</td>
                    <td className="p-4 text-neutral-700 dark:text-neutral-300">{lap.cars ? `${lap.cars.year} ${lap.cars.manufacturer} ${lap.cars.name}` : '—'}</td>
                    <td className="p-4 text-neutral-700 dark:text-neutral-300">{lap.tracks?.name ?? '—'}</td>
                    <td className="p-4 font-mono font-bold text-pink-400">{formatTime(lap.time_ms)}</td>
                    <td className="p-4 text-neutral-500 text-sm">{new Date(lap.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}
