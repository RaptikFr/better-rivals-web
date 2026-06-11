import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import ClassementsClient from './ClassementsClient';

type Props = {
  searchParams: Promise<{ track_id?: string; class?: string; drivetrain?: string; car?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const trackId = params.track_id ? Number(params.track_id) : null;

  const base: Metadata = {
    title: "Classements",
    description: "Consultez les meilleurs temps par circuit, classe et transmission. Comparez ce qui est comparable sur Better Rivals.",
  };

  // Sans circuit sélectionné, on garde l'image OG générique du layout
  if (!trackId || !Number.isFinite(trackId)) return base;

  const { data: track } = await supabaseAdmin
    .from('tracks')
    .select('name')
    .eq('id', trackId)
    .maybeSingle();
  if (!track) return base;

  const filtres = [params.class && `classe ${params.class}`, params.drivetrain, params.car]
    .filter(Boolean)
    .join(' · ');
  const title       = `${track.name} — Classement`;
  const description = `Les meilleurs temps sur ${track.name}${filtres ? ` (${filtres})` : ''}, à armes égales sur Better Rivals.`;

  const og = new URLSearchParams({ track_id: String(trackId) });
  if (params.class)      og.set('class', params.class);
  if (params.drivetrain) og.set('drivetrain', params.drivetrain);
  if (params.car)        og.set('car', params.car);
  const ogUrl = `/api/og/classement?${og.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function ClassementsPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <ClassementsClient
      initialTrackId={params.track_id ? Number(params.track_id) : null}
      initialClass={params.class}
      initialDrivetrain={params.drivetrain}
      initialCar={params.car ? decodeURIComponent(params.car) : undefined}
    />
  );
}
