import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// Pages publiques et indexables. Les pages privées/personnelles
// (/profil, /parametres, /admin, /connexion, /inscription) sont
// volontairement exclues — elles n'apportent rien au référencement.
const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/',                     priority: 1.0, changeFrequency: 'daily' },
  { path: '/classements',          priority: 0.9, changeFrequency: 'daily' },
  { path: '/classements-communaute', priority: 0.9, changeFrequency: 'daily' },
  { path: '/classement-general',   priority: 0.8, changeFrequency: 'daily' },
  { path: '/comparaison',          priority: 0.7, changeFrequency: 'weekly' },
  { path: '/voitures',             priority: 0.7, changeFrequency: 'weekly' },
  { path: '/stats',                priority: 0.7, changeFrequency: 'weekly' },
  { path: '/epreuves-officielles', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/epreuves-communaute',  priority: 0.7, changeFrequency: 'weekly' },
  { path: '/criteres-eligibilite', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/telecharger',          priority: 0.8, changeFrequency: 'monthly' },
  { path: '/contact',              priority: 0.4, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
