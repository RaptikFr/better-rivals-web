import { NextRequest, NextResponse } from 'next/server';

// Limitation de débit en mémoire, par instance serverless : chaque instance
// a sa propre fenêtre, la limite effective peut donc être un multiple du
// plafond configuré. Suffisant contre le spam basique ; passer à un store
// partagé (Upstash Redis, etc.) si le besoin devient sérieux.
const historique = new Map<string, number[]>();

function clientIp(request: NextRequest): string {
  // Vercel renseigne x-forwarded-for ; la première valeur est l'IP du client.
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue';
}

/**
 * Retourne une réponse 429 si l'IP a dépassé `max` requêtes sur la fenêtre
 * `windowMs` pour ce `scope`, sinon null (la requête est comptabilisée).
 */
export function rateLimit(
  request: NextRequest,
  scope: string,
  max: number,
  windowMs: number,
): NextResponse | null {
  const now = Date.now();
  const key = `${scope}:${clientIp(request)}`;
  const recents = (historique.get(key) ?? []).filter(t => now - t < windowMs);

  if (recents.length >= max) {
    historique.set(key, recents);
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessaie dans quelques minutes.' },
      { status: 429 },
    );
  }

  recents.push(now);
  historique.set(key, recents);

  // Purge des entrées inactives pour borner la mémoire
  if (historique.size > 1000) {
    for (const [k, ts] of historique) {
      if (now - ts[ts.length - 1] > 3_600_000) historique.delete(k);
    }
  }

  return null;
}
