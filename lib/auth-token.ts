import { createRemoteJWKSet, jwtVerify } from 'jose';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Vérification LOCALE du JWT Supabase (clés asymétriques ES256, JWKS public).
// Évite l'aller-retour réseau vers l'API Auth (~100-300 ms) que faisait
// `supabaseAdmin.auth.getUser(token)` sur chaque requête du relais.
// jose met les clés en cache au niveau module : le JWKS n'est téléchargé
// qu'une fois par instance (et re-téléchargé automatiquement si un kid
// inconnu apparaît, c.-à-d. à la rotation des clés).
//
// Repli réseau : si la vérification locale échoue (projet repassé en HS256,
// JWKS injoignable au cold start, horloge décalée…), on retombe sur
// `auth.getUser` — comportement identique à avant, en plus lent. Un token
// réellement invalide échoue donc comme avant (les deux chemins le rejettent).
//
// Limite assumée : un token local valide est accepté sans interroger Auth,
// donc une session révoquée/bannie reste utilisable jusqu'à expiration de
// l'access token (1 h par défaut). Acceptable ici : aucune route relais ne
// fait d'action destructrice inter-comptes, et le bannissement n'est pas un
// mécanisme utilisé sur ce site.

const jwks = createRemoteJWKSet(
  new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

export interface UtilisateurToken {
  id: string;
}

/**
 * Extrait et vérifie le Bearer token d'un header Authorization.
 * Retourne l'utilisateur ({ id } = claim `sub`) ou null si absent/invalide.
 */
export async function utilisateurDepuisAuthHeader(
  authHeader: string | null,
): Promise<UtilisateurToken | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);

  try {
    const { payload } = await jwtVerify(token, jwks, { audience: 'authenticated' });
    if (typeof payload.sub === 'string' && payload.sub) return { id: payload.sub };
  } catch {
    // Vérification locale impossible → repli réseau ci-dessous.
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id };
}
