import { ImageResponse } from 'next/og';

// Icône carrée « BR » aux couleurs du site (dégradé rose → violet), générée à
// la volée : icône Apple (app/apple-icon.tsx) et icônes du manifest PWA
// (app/icons/[taille]/route.tsx). Pas de fichier binaire à maintenir.
export function iconeBetterRivals(taille: number, arrondi = true) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
          borderRadius: arrondi ? taille * 0.2 : 0,
          color: 'white',
          fontSize: taille * 0.46,
          fontWeight: 900,
          letterSpacing: -taille * 0.02,
        }}
      >
        BR
      </div>
    ),
    { width: taille, height: taille },
  );
}
