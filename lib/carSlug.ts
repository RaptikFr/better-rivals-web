// Helpers de slug voiture — module PUR (aucun import serveur) pour être
// importable aussi bien côté serveur (carRankings, sitemap) que client
// (catalogue /voitures qui crée les liens).

/** Slug stable d'une voiture : « {ordinal}-{marque-modèle} ». L'ordinal en tête
 *  (l'identifiant en jeu, référencé par lap_times) sert de source de vérité. */
export function carSlug(ordinal: number, manufacturer: string, name: string): string {
  const kebab = `${manufacturer} ${name}`
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return kebab ? `${ordinal}-${kebab}` : String(ordinal);
}

/** Extrait l'ordinal numérique en tête d'un slug (« 1234-toyota-ae86 » → 1234). */
export function parseCarOrdinal(slug: string): number | null {
  const m = slug.match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}
