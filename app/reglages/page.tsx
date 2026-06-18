import type { Metadata } from 'next';
import { getReglages } from '@/lib/reglages';
import ReglagesClient from './ReglagesClient';

export const metadata: Metadata = {
  title: 'Bibliothèque de réglages',
  description:
    'Tous les réglages (tunes) partagés par la communauté Better Rivals pour Forza Horizon 6, par modèle de voiture : code de partage, meilleur temps obtenu et auteur.',
};

export default async function ReglagesPage() {
  // Données serveur mises en cache (5 min). Un échec ne casse pas la page.
  const reglages = await getReglages().catch(() => []);
  return <ReglagesClient reglages={reglages} />;
}
