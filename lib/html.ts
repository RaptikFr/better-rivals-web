// Échappement HTML des valeurs venues des joueurs (pseudo, nom de voiture
// transmis par le relais, nom de circuit communauté…) avant de les insérer
// dans le HTML d'un email : sans ça, un nom forgé injecterait du markup (liens,
// faux contenu) dans un mail envoyé depuis le domaine du site.
export function echapperHtml(texte: string): string {
  return texte.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
