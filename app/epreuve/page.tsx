import type { Metadata } from 'next';
import EpreuvesClient from './EpreuvesClient';

export const metadata: Metadata = {
  title: "Épreuves",
  description: "Découvrez les épreuves officielles de Forza Horizon 6 et les créations de la communauté Better Rivals.",
};

export default function EpreuvesPage() {
  return <EpreuvesClient />;
}
