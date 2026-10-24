import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';

// Chiffres clés du site (page /stats et bandeau de l'accueil).
// Voie rapide : RPC stats_globales (agrégats côté Postgres, une requête).
// Repli : ancien calcul JS sur toute la table lap_times, tant que la migration
// stats_recap_sitemap_rpc.sql n'est pas appliquée.

export interface Compte { count: number }
export interface SiteStats {
  stats: {
    totalChronos:  number;
    totalPilotes:  number;
    totalCircuits: number;
    totalVoitures: number;
  };
  topPilotes:  ({ pseudo: string } & Compte)[];
  topCircuits: ({ name: string } & Compte)[];
  topVoitures: ({ name: string } & Compte)[];
  lastChronos: unknown[];
}

interface StatsRpc {
  total_chronos:  number;
  total_pilotes:  number;
  total_circuits: number;
  total_voitures: number;
  top_pilotes:  { pseudo: string; count: number }[];
  top_circuits: { name: string; count: number }[];
  top_voitures: { name: string; count: number }[];
}

interface LapRow {
  car_ordinal: number;
  players: { pseudo: string } | null;
  tracks:  { name: string } | null;
  cars:    { manufacturer: string | null; name: string; year: number | null } | null;
}

/** Top `n` d'un compteur, trié par nombre décroissant. */
function top<K extends string>(compteur: Record<string, number>, n: number, cle: K) {
  return Object.entries(compteur)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([v, count]) => ({ [cle]: v, count }) as { [P in K]: string } & Compte);
}

async function statsDepuisRpc(): Promise<Omit<SiteStats, 'lastChronos'> | null> {
  const { data, error } = await supabase.rpc('stats_globales');
  if (error || !data) return null;
  const s = data as unknown as StatsRpc;
  return {
    stats: {
      totalChronos:  Number(s.total_chronos),
      totalPilotes:  Number(s.total_pilotes),
      totalCircuits: Number(s.total_circuits),
      totalVoitures: Number(s.total_voitures),
    },
    topPilotes:  s.top_pilotes.map(x => ({ pseudo: x.pseudo, count: Number(x.count) })),
    topCircuits: s.top_circuits.map(x => ({ name: x.name, count: Number(x.count) })),
    topVoitures: s.top_voitures.map(x => ({ name: x.name, count: Number(x.count) })),
  };
}

async function statsDepuisLapTimes(): Promise<Omit<SiteStats, 'lastChronos'>> {
  const [
    { count: totalChronos, error: e1 },
    { count: totalPilotes, error: e2 },
    { count: totalCircuits, error: e3 },
    { data: lapRows, error: e4 },
  ] = await Promise.all([
    supabase.from('lap_times').select('*', { count: 'exact', head: true }),
    // select('id') et non '*' : les colonnes sensibles de players (user_id)
    // ne sont pas lisibles par tous, un SELECT * serait rejeté
    supabase.from('players').select('id', { count: 'exact', head: true }),
    // select('id') et non '*' : depuis audit_suite_juin_2026.sql, tracks a un
    // grant par colonne (submitted_by masqué) → un SELECT * serait rejeté
    supabase.from('tracks').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    fetchAllRows<LapRow>((from, to) =>
      supabase.from('lap_times')
        .select('car_ordinal, players ( pseudo ), tracks ( name ), cars ( manufacturer, name, year )')
        .order('id')
        .range(from, to)
    ),
  ]);

  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  const firstError = e1 ?? e2 ?? e3 ?? e4;
  if (firstError) throw new Error(firstError.message);

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
      totalVoitures: new Set(lapRows.map(r => r.car_ordinal)).size,
    },
    topPilotes:  top(piloteCount, 3, 'pseudo'),
    topCircuits: top(circuitCount, 5, 'name'),
    topVoitures: top(voitureCount, 5, 'name'),
  };
}

async function calculerStats(): Promise<SiteStats> {
  const [agregats, { data: lastChronos, error }] = await Promise.all([
    statsDepuisRpc().then(r => r ?? statsDepuisLapTimes()),
    supabase.from('lap_times')
      .select('id, time_ms, created_at, players ( pseudo ), cars ( manufacturer, name, year ), tracks ( name )')
      .order('created_at', { ascending: false }).limit(5),
  ]);
  if (error) throw new Error(error.message);
  return { ...agregats, lastChronos: lastChronos ?? [] };
}

// Cache serveur partagé entre tous les visiteurs (une requête Supabase
// par minute au plus).
export const getSiteStats = unstable_cache(calculerStats, ['stats'], {
  revalidate: 60,
});
