import type { Metadata } from 'next';
import ClassementsClient from './ClassementsClient';

export const metadata: Metadata = {
  title: "Classements",
  description: "Consultez les meilleurs temps par circuit, classe et transmission. Comparez ce qui est comparable sur Better Rivals.",
};

export default async function ClassementsPage({
  searchParams,
}: {
  searchParams: Promise<{ track_id?: string; class?: string; drivetrain?: string; car?: string }>;
}) {
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
