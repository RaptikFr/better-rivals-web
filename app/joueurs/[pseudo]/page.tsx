import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import JoueurClient from './JoueurClient';

type Props = { params: Promise<{ pseudo: string }> };

// Dédupliqué entre generateMetadata et le composant page (même requête, une
// seule exécution par rendu grâce à React cache()).
const getPlayerBasic = cache(async (pseudo: string) => {
  const { data } = await supabaseAdmin
    .from('players').select('id, pseudo').eq('pseudo', pseudo).maybeSingle();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pseudo } = await params;
  const name = decodeURIComponent(pseudo);
  const player = await getPlayerBasic(name);
  if (!player) return { title: 'Joueur introuvable', robots: { index: false, follow: false } };

  return {
    title: name,
    description: `Profil public de ${name} sur Better Rivals — chronos, circuits et statistiques.`,
  };
}

export default async function JoueurPage({ params }: Props) {
  const { pseudo } = await params;
  const name = decodeURIComponent(pseudo);
  const player = await getPlayerBasic(name);
  if (!player) notFound();

  return <JoueurClient pseudo={name} />;
}
