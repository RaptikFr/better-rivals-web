import type { Metadata } from 'next';
import ClassementGeneralClient from './ClassementGeneralClient';

export const metadata: Metadata = {
  title: 'Classement général',
  description: 'Le classement général des pilotes Better Rivals basé sur un système de points.',
};

export default function ClassementGeneralPage() {
  return <ClassementGeneralClient />;
}
