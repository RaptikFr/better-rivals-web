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
  id: "2026-07-score-regularite",

  /** Afficher la bannière ? */
  active: true,

  /** Texte principal affiché dans la bannière. */
  message: "Nouveau : le score de régularité 🎯 ! Enchaînez au moins 3 tours propres sur une même config (relais lancé) et retrouvez votre niveau — Métronome, Régulier, Variable… — par circuit et voiture dans l'onglet Statistiques de votre profil. Et si vous avez raté la v3.4.0 du relais : les sprints ont désormais tous les outils des circuits (tracé, secteurs, delta live, coach, copilote).",

  /** Lien optionnel (bouton « En savoir plus » ou « Télécharger »). */
  link: "/profil",
  linkLabel: "Voir mon profil",

  /**
   * Style de la bannière.
   * "info"    → accent du skin (pink/couleur d'accentuation)
   * "success" → vert
   * "warning" → orange / ambre
   */
  type: "info" as "info" | "success" | "warning",
};

export default announcement;
