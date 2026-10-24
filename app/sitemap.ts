import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { siteUrl } from '@/lib/site';
import { supabase } from '@/lib/supabase';
import { getIndexableCircuits, circuitSlug } from '@/lib/circuitRankings';
import { getIndexableCars } from '@/lib/carRankings';
import { carSlug } from '@/lib/carSlug';

// Pages publiques et indexables. Les pages privées/personnelles
// (/profil, /parametres, /admin, /connexion, /inscription) sont
// volontairement exclues — elles n'apportent rien au référencement.
const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/',                     priority: 1.0, changeFrequency: 'daily' },
  { path: '/classements',          priority: 0.9, changeFrequency: 'daily' },
  { path: '/classements-communaute', priority: 0.9, changeFrequency: 'daily' },
  { path: '/comparaison',          priority: 0.7, changeFrequency: 'weekly' },
  { path: '/voitures',             priority: 0.7, changeFrequency: 'weekly' },
  { path: '/circuits',             priority: 0.8, changeFrequency: 'weekly' },
  { path: '/stats',                priority: 0.7, changeFrequency: 'weekly' },
  { path: '/epreuves-officielles', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/epreuves-communaute',  priority: 0.7, changeFrequency: 'weekly' },
  { path: '/criteres-eligibilite', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/telecharger',          priority: 0.8, changeFrequency: 'monthly' },
  { path: '/contact',              priority: 0.4, changeFrequency: 'yearly' },
];

// Pages listant des chronos : leur date réelle = dernier chrono du site.
const PAGES_DE_CHRONOS = new Set(['/', '/classements', '/classements-communaute', '/stats']);

// Seuil d'indexation des pages joueurs (même logique que circuits/voitures).
const MIN_TIMES_JOUEUR = 3;

// Dates de dernière activité réelles (RPC, cf. stats_recap_sitemap_rpc.sql).
// RPC absente ou en erreur → Map vide → `lastModified` omis : mieux vaut ne
// rien déclarer que « maintenant » à chaque passage, que Google finit par ignorer.
const getActivite = unstable_cache(async () => {
  const [tracks, cars, joueurs] = await Promise.all([
    supabase.rpc('track_last_activity'),
    supabase.rpc('car_last_activity'),
    supabase.rpc('joueurs_indexables', { p_min: MIN_TIMES_JOUEUR }),
  ]);
  return {
    tracks:  tracks.error ? [] : (tracks.data ?? []),
    cars:    cars.error ? [] : (cars.data ?? []),
    joueurs: joueurs.error ? [] : (joueurs.data ?? []),
  };
}, ['sitemap-activite'], { revalidate: 3600 });

const date = (iso: string | undefined) => (iso ? new Date(iso) : undefined);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pages circuit + voiture avec assez de temps pour être indexées
  // (cf. MIN_TIMES_INDEXABLE dans chaque lib).
  const [circuits, cars, activite] = await Promise.all([
    getIndexableCircuits().catch(() => []),
    getIndexableCars().catch(() => []),
    getActivite().catch(() => ({ tracks: [], cars: [], joueurs: [] })),
  ]);

  const trackLast = new Map(activite.tracks.map(t => [t.track_id, t.last_at]));
  const carLast   = new Map(activite.cars.map(c => [c.car_ordinal, c.last_at]));
  const dernierChrono = activite.tracks.reduce<string | undefined>(
    (max, t) => (!max || t.last_at > max ? t.last_at : max), undefined);

  const staticEntries: MetadataRoute.Sitemap = routes.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified: PAGES_DE_CHRONOS.has(path) ? date(dernierChrono) : undefined,
    changeFrequency,
    priority,
  }));
  const circuitEntries: MetadataRoute.Sitemap = circuits.map(c => ({
    url: `${siteUrl}/circuits/${circuitSlug(c.id, c.name)}`,
    lastModified: date(trackLast.get(c.id)),
    changeFrequency: 'daily',
    priority: 0.7,
  }));
  const carEntries: MetadataRoute.Sitemap = cars.map(c => ({
    url: `${siteUrl}/voitures/${carSlug(c.ordinal, c.manufacturer, c.name)}`,
    lastModified: date(carLast.get(c.ordinal)),
    changeFrequency: 'daily',
    priority: 0.6,
  }));
  const joueurEntries: MetadataRoute.Sitemap = activite.joueurs.map(j => ({
    url: `${siteUrl}/joueurs/${encodeURIComponent(j.pseudo)}`,
    lastModified: date(j.last_at),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticEntries, ...circuitEntries, ...carEntries, ...joueurEntries];
}
