import type { Metadata } from 'next';
import StatsClient from './StatsClient';

export const metadata: Metadata = {
  title: "Statistiques",
  description: "Les statistiques globales de la communauté Better Rivals.",
};

export default function StatsPage() {
  return <StatsClient />;
}
