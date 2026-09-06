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
  id: "2026-09-relais-v373",

  /** Afficher la bannière ? */
  active: true,

  /** Texte principal affiché dans la bannière. */
  message: "Relais v3.7.3 : correctif important pour les défis à tours fixes — avant, cliquer « Recommencer » effaçait le tour final en attente et le bouton « Envoyer » ne faisait plus rien. Le tour final n'arrivait pas sur le site. Mets ton relais à jour.",

  /** Lien optionnel (bouton « En savoir plus » ou « Télécharger »). */
  link: "/telecharger",
  linkLabel: "Télécharger",

  /**
   * Style de la bannière.
   * "info"    → accent du skin (pink/couleur d'accentuation)
   * "success" → vert
   * "warning" → orange / ambre
   */
  type: "warning" as "info" | "success" | "warning",
};

export default announcement;
