import { iconeBetterRivals } from '@/lib/appIcon';

// Icônes du manifest PWA (app/manifest.ts) : /icons/192 et /icons/512.
const TAILLES = ['192', '512'];

export function generateStaticParams() {
  return TAILLES.map(taille => ({ taille }));
}

export const dynamicParams = false;

export async function GET(_req: Request, { params }: { params: Promise<{ taille: string }> }) {
  const { taille } = await params;
  // Fond plein (pas d'arrondi) : Android applique son propre masque « maskable ».
  return iconeBetterRivals(Number(taille), false);
}
