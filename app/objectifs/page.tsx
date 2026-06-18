import type { Metadata } from 'next';
import ObjectifsClient from './ObjectifsClient';

export const metadata: Metadata = {
  title: 'Mes objectifs',
  description: 'Fixe-toi comme objectif de battre le temps d’un pilote précis sur une configuration et suis ta progression.',
};

export default function ObjectifsPage() {
  return <ObjectifsClient />;
}
