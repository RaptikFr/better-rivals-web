import type { Metadata } from 'next';
import DuelsClient from './DuelsClient';

export const metadata: Metadata = {
  title: 'Mes duels',
  description:
    'Défie un pilote sur une configuration précise (circuit, voiture, classe, transmission). Le vainqueur est déterminé automatiquement à la date limite.',
};

export default function DuelsPage() {
  return <DuelsClient />;
}
