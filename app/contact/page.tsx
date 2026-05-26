import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact',
  description: "Contactez l'équipe Better Rivals pour signaler un conflit de réglage, un temps suspect ou tout autre problème.",
};

export default function ContactPage() {
  return <ContactClient />;
}
