import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';

interface LapRow {
  car_ordinal: number;
  players: { pseudo: string } | null;
  tracks:  { name: string } | null;
  cars:    { manufacturer: string | null; name: string; year: number | null } | null;
}

async function calculerStats() {
  const [
    { count: totalChronos, error: e1 },
    { count: totalPilotes, error: e2 },
    { count: totalCircuits, error: e3 },
    { data: lapRows, error: e4 },
    { data: lastChronos, error: e5 },
  ] = await Promise.all([
    supabase.from('lap_times').select('*', { count: 'exact', head: true }),
    // select('id') et non '*' : les colonnes sensibles de players (user_id)
    // ne sont pas lisibles par tous, un SELECT * serait rejeté
    supabase.from('players').select('id', { count: 'exact', head: true }),
    supabase.from('tracks').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    // Une seule lecture (paginée) de lap_times pour tous les agrégats (voitures distinctes + tops)
    fetchAllRows<LapRow>((from, to) =>
      supabase.from('lap_times')
        .select('car_ordinal, players ( pseudo ), tracks ( name ), cars ( manufacturer, name, year )')
        .order('id')
        .range(from, to)
    ),
    supabase.from('lap_times')
      .select('id, time_ms, created_at, players ( pseudo ), cars ( manufacturer, name, year ), tracks ( name )')
      .order('created_at', { ascending: false }).limit(5),
  ]);

  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  const firstError = e1 ?? e2 ?? e3 ?? e4 ?? e5;
  if (firstError) throw new Error(firstError.message);

  const distinctCars = new Set(lapRows.map(r => r.car_ordinal));

  const piloteCount: Record<string, number> = {};
  const circuitCount: Record<string, number> = {};
  const voitureCount: Record<string, number> = {};
  for (const row of lapRows) {
    const pseudo = row.players?.pseudo ?? 'Inconnu';
    piloteCount[pseudo] = (piloteCount[pseudo] ?? 0) + 1;

    const trackName = row.tracks?.name ?? 'Inconnu';
    circuitCount[trackName] = (circuitCount[trackName] ?? 0) + 1;

    const carName = row.cars ? `${row.cars.year} ${row.cars.manufacturer} ${row.cars.name}` : 'Inconnue';
    voitureCount[carName] = (voitureCount[carName] ?? 0) + 1;
  }

  return {
    stats: {
      totalChronos:  totalChronos ?? 0,
      totalPilotes:  totalPilotes ?? 0,
      totalCircuits: totalCircuits ?? 0,
      totalVoitures: distinctCars.size,
    },
    topPilotes:  Object.entries(piloteCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([pseudo, count]) => ({ pseudo, count })),
    topCircuits: Object.entries(circuitCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    topVoitures: Object.entries(voitureCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
    lastChronos: lastChronos ?? [],
  };
}

// Cache serveur partagé entre tous les visiteurs (une requête Supabase
// par minute au plus, au lieu d'un fetch complet de lap_times par visite)
const statsEnCache = unstable_cache(calculerStats, ['stats'], {
  revalidate: 60,
});

export async function GET() {
  try {
    const payload = await statsEnCache();
    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Impossible de charger les statistiques.' },
      { status: 500 }
    );
  }
}
