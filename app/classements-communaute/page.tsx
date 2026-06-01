import type { Metadata } from 'next';
import ClassementsClient from '@/app/classements/ClassementsClient';

export const metadata: Metadata = {
  title: "Classements — Épreuves communauté",
  description: "Classements des temps réalisés sur les épreuves de la communauté Better Rivals.",
};

export default function ClassementsCommunautePage() {
  return <ClassementsClient communityOnly />;
}
