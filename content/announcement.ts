/**
 * Bannière d'annonce globale du site.
 *
 * Pour afficher une nouvelle annonce :
 *   1. Modifiez `message` (peut contenir du HTML simple via dangerouslySetInnerHTML,
 *      ou utilisez `link` + `linkLabel` pour un lien externe)
 *   2. Incrémentez `id` — les utilisateurs qui avaient fermé la précédente
 *      verront la nouvelle s'afficher à nouveau.
 *
 * Pour désactiver la bannière : passez `active` à `false`.
 */
const announcement = {
  /** Identifiant unique. Changer cet id rouvre la bannière pour tout le monde. */
  id: "2026-07-relais-v321",

  /** Afficher la bannière ? */
  active: true,

  /** Texte principal affiché dans la bannière. */
  message: "Nouvelle version du relais (v3.2.3) : fix du copilote de réglage — le conseil de balance de frein pouvait recommander le mauvais sens (il ne comparait pas toujours l'essieu qui bloque vraiment le plus). Inclut aussi toutes les nouveautés v3.2.0/v3.1.x (🧭 auto-détection du circuit, fix capture des tracés).",

  /** Lien optionnel (bouton « En savoir plus » ou « Télécharger »). */
  link: "/telecharger",
  linkLabel: "Télécharger",

  /**
   * Style de la bannière.
   * "info"    → accent du skin (pink/couleur d'accentuation)
   * "success" → vert
   * "warning" → orange / ambre
   */
  type: "info" as "info" | "success" | "warning",
};

export default announcement;
