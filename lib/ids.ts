// Validation d'identifiants venant du client, AVANT de les employer dans un
// filtre PostgREST construit à la main (`.or("col.eq.<val>,…")`). Contrairement
// à `.eq(col, val)`, le contenu passé à `.or()` est une chaîne brute non
// paramétrée : un `val` contenant `)`, `,` ou `or(...)` peut réécrire la
// logique du filtre. On rejette donc tout ce qui n'est pas un UUID canonique.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `true` si `v` est un UUID canonique (8-4-4-4-12 hex, casse indifférente). */
export function estUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}
