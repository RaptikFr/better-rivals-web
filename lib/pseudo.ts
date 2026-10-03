// Règles du gamertag (pseudo) à l'inscription. Le pseudo sert d'identifiant au
// relais, de segment d'URL (/joueurs/[pseudo]) et est repris dans les emails :
// il ne doit donc contenir ni séparateur d'URL, ni balise HTML, ni caractère
// de contrôle. La longueur suit la limite des gamertags Xbox.

export const PSEUDO_MAX = 15;

// Identifiant Discord lié au profil : même borne que la contrainte en base.
export const DISCORD_TAG_MAX = 32;

const CARACTERES_INTERDITS = /[<>"'&/\\\u0000-\u001f\u007f]/;

/** Message d'erreur si le pseudo n'est pas valide, sinon null. */
export function erreurPseudo(pseudo: string): string | null {
  const propre = pseudo.trim();
  if (propre.length === 0) return 'Le Gamertag est obligatoire.';
  if (propre.length > PSEUDO_MAX) return `Le Gamertag fait au maximum ${PSEUDO_MAX} caractères.`;
  if (CARACTERES_INTERDITS.test(propre)) return 'Le Gamertag contient un caractère interdit (< > " \' & / \\).';
  return null;
}

/**
 * Échappe les jokers LIKE/ILIKE pour qu'une recherche d'égalité insensible à la
 * casse ne matche que le pseudo exact (un « % » tapé ne doit pas tout bloquer).
 */
export function echapperMotif(texte: string): string {
  return texte.replace(/[\\%_]/g, c => `\\${c}`);
}
