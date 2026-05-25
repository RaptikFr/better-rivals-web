import type { Metadata } from 'next';
import ProfilClient from './ProfilClient';

export const metadata: Metadata = {
  title: "Mon Profil",
  description: "Retrouve tous tes chronos, tes classements et tes statistiques sur Better Rivals.",
};

export default function ProfilPage() {
  return <ProfilClient />;
}
