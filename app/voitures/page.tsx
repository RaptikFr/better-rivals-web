import type { Metadata } from 'next';
import VoituresClient from './VoituresClient';

export const metadata: Metadata = {
  title: "Voitures",
  description: "Liste des voitures de Forza Horizon 6 disponibles sur Better Rivals.",
};

export default async function VoituresPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  return <VoituresClient initialSearch={params.search} />;
}
