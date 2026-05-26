import type { Metadata } from 'next';
import EpreuvesCommunauteClient from './EpreuvesCommunauteClient';

export const metadata: Metadata = {
  title: "Épreuves communauté",
  description: "Découvrez et proposez des circuits créés par la communauté Better Rivals.",
};

export default function EpreuvesCommunautePage() {
  return <EpreuvesCommunauteClient />;
}
