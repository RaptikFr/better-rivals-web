import type { Metadata } from 'next';
import ClassementsClient from './ClassementsClient';

export const metadata: Metadata = {
  title: "Classements",
  description: "Consultez les meilleurs temps par circuit, classe et transmission. Comparez ce qui est comparable sur Better Rivals.",
};

export default function ClassementsPage({
  searchParams,
}: {
  searchParams: { track_id?: string; class?: string; drivetrain?: string; car?: string };
}) {
  return (
    <ClassementsClient
      initialTrackId={searchParams.track_id ? Number(searchParams.track_id) : null}
      initialClass={searchParams.class}
      initialDrivetrain={searchParams.drivetrain}
      initialCar={searchParams.car ? decodeURIComponent(searchParams.car) : undefined}
    />
  );
}
