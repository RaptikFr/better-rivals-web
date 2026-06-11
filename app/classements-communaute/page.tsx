import type { Metadata } from 'next';
import { classementMetadata, type ClassementSearchParams } from '@/lib/classementMetadata';
import ClassementsClient from '@/app/classements/ClassementsClient';

type Props = { searchParams: Promise<ClassementSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return classementMetadata(await searchParams, {
    title: "Classements — Épreuves communauté",
    description: "Classements des temps réalisés sur les épreuves de la communauté Better Rivals.",
  });
}

export default async function ClassementsCommunautePage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <ClassementsClient
      communityOnly
      initialTrackId={params.track_id ? Number(params.track_id) : null}
      initialClass={params.class}
      initialDrivetrain={params.drivetrain}
      initialCar={params.car ? decodeURIComponent(params.car) : undefined}
    />
  );
}
