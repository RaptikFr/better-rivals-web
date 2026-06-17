import type { Metadata } from 'next';
import { Suspense } from 'react';
import ComparaisonClient from './ComparaisonClient';

export const metadata: Metadata = {
  title: "Comparaison",
  description: "Comparez les temps de deux joueurs sur les configurations en commun.",
};

export default function ComparaisonPage() {
  // Suspense requis : ComparaisonClient lit l'URL (useSearchParams).
  return (
    <Suspense>
      <ComparaisonClient />
    </Suspense>
  );
}
