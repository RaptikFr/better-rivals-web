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
  id: "2026-07-relais-v307",

  /** Afficher la bannière ? */
  active: true,

  /** Texte principal affiché dans la bannière. */
  message: "Nouvelle version du relais (v3.0.7) : les boutons « Changer de circuit » et « Se déconnecter » de l'overlay restent toujours visibles, et le relais apparaît désormais dans la barre des tâches. Pensez à télécharger la mise à jour.",

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
