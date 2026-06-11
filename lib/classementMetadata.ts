import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type ClassementSearchParams = {
  track_id?: string;
  class?: string;
  drivetrain?: string;
  car?: string;
};

// Métadonnées dynamiques des pages classements : titre/description par
// circuit et image OG générée (/api/og/classement) quand un circuit est
// sélectionné ; sinon les métadonnées de base fournies.
export async function classementMetadata(
  params: ClassementSearchParams,
  base: Metadata
): Promise<Metadata> {
  const trackId = params.track_id ? Number(params.track_id) : null;
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
