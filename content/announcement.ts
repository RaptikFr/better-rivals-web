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
  id: "2026-07-defis-coach-et-secteurs-disputes",

  /** Afficher la bannière ? */
  active: true,

  /** Texte principal affiché dans la bannière. */
  message: "Double nouveauté ! 🎯 Défis coach : depuis l'onglet Coach de ton profil, transforme un conseil en défi chiffré (« passe le secteur 4 sous 25,5 s ») — validé automatiquement dès qu'un de tes tours y arrive, notification à la clé. Et 🔥 secteurs disputés : sur la carte de chaque circuit, une heatmap montre où les pilotes de la config se départagent le plus — c'est là que ça se joue.",

  /** Lien optionnel (bouton « En savoir plus » ou « Télécharger »). */
  link: "/circuits",
  linkLabel: "Voir les circuits",

  /**
   * Style de la bannière.
   * "info"    → accent du skin (pink/couleur d'accentuation)
   * "success" → vert
   * "warning" → orange / ambre
   */
  type: "info" as "info" | "success" | "warning",
};

export default announcement;
