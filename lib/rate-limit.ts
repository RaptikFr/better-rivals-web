import { NextRequest, NextResponse } from 'next/server';

// Limitation de débit. Deux back-ends :
//   1. Upstash Redis (partagé entre toutes les instances serverless) si
//      UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN sont configurés.
//   2. Repli en mémoire (par instance) sinon — suffisant contre le spam
//      basique, mais la limite effective peut être un multiple du plafond.
// Aucune dépendance : on parle à Upstash via son API REST (fenêtre fixe
// INCR + EXPIRE), avec repli automatique en cas d'absence de config ou d'erreur.

const historique = new Map<string, number[]>();

function clientIp(request: NextRequest): string {
  // Vercel renseigne x-forwarded-for ; la première valeur est l'IP du client.
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'inconnue';
}

/** Repli en mémoire. Retourne true si la requête est autorisée. */
function memoryAllow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recents = (historique.get(key) ?? []).filter(t => now - t < windowMs);

  if (recents.length >= max) {
    historique.set(key, recents);
    return false;
  }

  recents.push(now);
  historique.set(key, recents);

  // Purge des entrées inactives pour borner la mémoire
  if (historique.size > 1000) {
    for (const [k, ts] of historique) {
      if (now - ts[ts.length - 1] > 3_600_000) historique.delete(k);
    }
  }
  return true;
}

/**
 * Compteur fenêtre fixe partagé via Upstash REST. Retourne true/false selon
 * l'autorisation, ou null si Upstash n'est pas configuré / a échoué (→ repli).
 */
async function upstashAllow(key: string, max: number, windowMs: number): Promise<boolean | null> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const windowSec = Math.ceil(windowMs / 1000);
  // Clé par fenêtre : on segmente le temps en tranches de windowSec, ce qui
  // donne une expiration naturelle et un compteur propre par tranche.
  const bucket = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${bucket}`;

  try {
    // Pipeline : INCR puis EXPIRE (idempotent, borne la durée de vie de la clé).
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSec],
      ]),
      // Ne pas mettre en cache la réponse côté Next
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ result?: number; error?: string }>;
    const count = results?.[0]?.result;
    if (typeof count !== 'number') return null;
    return count <= max;
  } catch {
    return null; // erreur réseau → repli en mémoire
  }
}

/**
 * Retourne une réponse 429 si l'IP a dépassé `max` requêtes sur la fenêtre
 * `windowMs` pour ce `scope`, sinon null (la requête est comptabilisée).
 */
export async function rateLimit(
  request: NextRequest,
  scope: string,
  max: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const key = `${scope}:${clientIp(request)}`;

  const viaUpstash = await upstashAllow(key, max, windowMs);
  const allowed = viaUpstash ?? memoryAllow(key, max, windowMs);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessaie dans quelques minutes.' },
      { status: 429 },
    );
  }
  return null;
}
