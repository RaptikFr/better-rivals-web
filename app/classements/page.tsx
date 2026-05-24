import type { Metadata } from 'next';
import ClassementsClient from './ClassementsClient';

export const metadata: Metadata = {
  title: "Classements",
  description: "Consultez les meilleurs temps par circuit, classe et transmission. Comparez ce qui est comparable sur Better Rivals.",
};

export default function ClassementsPage() {
  return <ClassementsClient />;
}
