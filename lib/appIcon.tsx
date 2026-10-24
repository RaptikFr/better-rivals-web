import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Icônes du manifest PWA (app/icons/[taille]/route.tsx) à partir du logo
// app/apple-icon.png (seule source, 180 px) : posé à 80 % sur fond sombre, ce
// qui respecte la zone de sécurité des icônes « maskable » Android.
export async function iconeManifest(taille: number) {
  const logo = await readFile(join(process.cwd(), 'app', 'apple-icon.png'));
  const src = `data:image/png;base64,${logo.toString('base64')}`;
  const cote = Math.round(taille * 0.8);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendu Satori (ImageResponse), next/image n'y existe pas */}
        <img src={src} width={cote} height={cote} alt="" />
      </div>
    ),
    { width: taille, height: taille },
  );
}
