import type { MetadataRoute } from 'next';

// Manifest PWA : permet « Ajouter à l'écran d'accueil » sur mobile avec le nom
// et l'icône du site (classements consultés entre deux sessions de jeu).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Better Rivals FH6',
    short_name: 'Better Rivals',
    description: 'Le classement alternatif, équitable et par modèle de voiture pour Forza Horizon 6.',
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#ec4899',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
