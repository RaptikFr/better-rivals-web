import type { Metadata } from 'next';
import ComparaisonClient from './ComparaisonClient';

export const metadata: Metadata = {
  title: "Comparaison",
  description: "Comparez les temps de deux joueurs sur les configurations en commun.",
};

export default function ComparaisonPage() {
  return <ComparaisonClient />;
}
