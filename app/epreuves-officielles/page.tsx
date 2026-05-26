import type { Metadata } from 'next';
import EpreuvesOfficiellesClient from './EpreuvesOfficiellesClient';

export const metadata: Metadata = {
  title: "Épreuves officielles",
  description: "Découvrez tous les circuits officiels de Forza Horizon 6 supportés par Better Rivals.",
};

export default function EpreuvesOfficiellesPage() {
  return <EpreuvesOfficiellesClient />;
}
