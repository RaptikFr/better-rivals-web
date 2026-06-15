import type { Metadata } from 'next';
import ParametresClient from './ParametresClient';

export const metadata: Metadata = {
  title: 'Paramètres',
  description: "Personnalisez l'affichage de Better Rivals : thème, format des temps et des dates, densité des tableaux, animations.",
};

export default function ParametresPage() {
  return <ParametresClient />;
}
