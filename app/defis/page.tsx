import type { Metadata } from 'next';
import DefisClient from './DefisClient';

export const metadata: Metadata = {
  title: 'Défis de la semaine',
  description: 'Relevez le défi hebdomadaire Better Rivals : un circuit et une classe imposés, le meilleur temps gagne.',
};

export default function DefisPage() {
  return <DefisClient />;
}
