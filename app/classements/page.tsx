import type { Metadata } from 'next';
import { classementMetadata, type ClassementSearchParams } from '@/lib/classementMetadata';
import ClassementsClient from './ClassementsClient';

type Props = { searchParams: Promise<ClassementSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return classementMetadata(await searchParams, {
    title: "Classements",
    description: "Consultez les meilleurs temps par circuit, classe et transmission. Comparez ce qui est comparable sur Better Rivals.",
  });
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
