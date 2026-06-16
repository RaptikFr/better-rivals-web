// Helpers de slug circuit — module PUR (aucun import serveur) pour être
// importable aussi bien côté serveur (circuitRankings, sitemap) que client
// (l'outil /classements qui pointe vers la page dédiée du circuit).

/** Slug stable d'un circuit : « {id}-{nom-en-kebab} ». L'id en tête sert de
 *  source de vérité (pas de colonne slug en base) et permet de rediriger les
 *  anciennes URL après un renommage. */
export function circuitSlug(id: number, name: string): string {
  const kebab = name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return kebab ? `${id}-${kebab}` : String(id);
}

/** Extrait l'id numérique en tête d'un slug (« 42-route » → 42). */
export function parseCircuitId(slug: string): number | null {
  const m = slug.match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}
