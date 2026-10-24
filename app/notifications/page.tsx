import type { Metadata } from 'next';
import NotificationsClient from './NotificationsClient';

export const metadata: Metadata = {
  title: 'Mes notifications',
  description: 'Historique complet de tes notifications Better Rivals : records battus, rivaux, duels et objectifs.',
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
