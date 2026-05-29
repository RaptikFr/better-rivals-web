import type { Metadata } from 'next';
import JoueurClient from './JoueurClient';

type Props = { params: Promise<{ pseudo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pseudo } = await params;
  const name = decodeURIComponent(pseudo);
  return {
    title: name,
    description: `Profil public de ${name} sur Better Rivals — chronos, circuits et statistiques.`,
  };
}

export default async function JoueurPage({ params }: Props) {
  const { pseudo } = await params;
  return <JoueurClient pseudo={decodeURIComponent(pseudo)} />;
}
