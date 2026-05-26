import type { Metadata } from 'next';
import CriteresEligibiliteClient from './CriteresEligibiliteClient';

export const metadata: Metadata = {
  title: "Critères d'éligibilité",
  description: "Découvrez les critères qu'une épreuve EventLab doit respecter pour être soumise et acceptée sur Better Rivals.",
};

export default function CriteresEligibilitePage() {
  return <CriteresEligibiliteClient />;
}
