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
  id: "2026-07-trace-vs-trace-et-relais-360-voix",

  /** Afficher la bannière ? */
  active: true,

  /** Texte principal affiché dans la bannière. */
  message: "Double nouveauté ! 🆚 Mode « Trace vs trace » sur la carte des circuits : le tracé se colore mètre par mètre selon le temps que TON tour perd ou gagne réellement face au rival de ton choix (vitesses comparées au survol). Et 🔊 relais v3.6.0 : les annonces vocales — ton delta annoncé à la voix à chaque secteur, « moins deux dixièmes », sans quitter la route des yeux (inclut la v3.5.0 : plus jamais un chrono perdu si le site est injoignable).",

  /** Lien optionnel (bouton « En savoir plus » ou « Télécharger »). */
  link: "/telecharger",
  linkLabel: "Télécharger la v3.6.0",

  /**
   * Style de la bannière.
   * "info"    → accent du skin (pink/couleur d'accentuation)
   * "success" → vert
   * "warning" → orange / ambre
   */
  type: "info" as "info" | "success" | "warning",
};

export default announcement;
