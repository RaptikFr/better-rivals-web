import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries: MetadataRoute.Sitemap = routes.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  // Pages circuit + voiture avec assez de temps pour être indexées
  // (cf. MIN_TIMES_INDEXABLE dans chaque lib).
  const [circuits, cars] = await Promise.all([
    getIndexableCircuits().catch(() => []),
    getIndexableCars().catch(() => []),
  ]);
  const circuitEntries: MetadataRoute.Sitemap = circuits.map(c => ({
    url: `${siteUrl}/circuits/${circuitSlug(c.id, c.name)}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.7,
  }));
  const carEntries: MetadataRoute.Sitemap = cars.map(c => ({
    url: `${siteUrl}/voitures/${carSlug(c.ordinal, c.manufacturer, c.name)}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [...staticEntries, ...circuitEntries, ...carEntries];
}
