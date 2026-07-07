// Synthèse « par voiture » des diagnostics du copilote de réglage — pur.
//
// L'onglet Copilote agrège par défaut les diagnostics par config exacte
// (circuit × voiture × classe × transmission). Cette synthèse regroupe au
// contraire PAR VOITURE (voiture × classe × transmission, tous circuits
// confondus) : un souci qui revient sur PLUSIEURS circuits est un défaut du
// réglage de la voiture ; un souci vu sur un seul circuit est plutôt lié à la
// piste (ou au pilotage ce jour-là). La classe et la transmission restent dans
// la clé : un autre build de la même voiture = un autre réglage.

export interface RapportCopilote {
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  titre:       string;
  conseils:    string[];
  created_at:  string;
  track_name:  string;
  car_label:   string;
}

export interface EnonceSynthese {
  texte:      string;
  /** Nombre total d'occurrences (tous circuits). */
  count:      number;
  /** Nombre de circuits distincts où l'énoncé est apparu. */
  nbCircuits: number;
  /** Noms des circuits concernés (dédupliqués, ordre d'apparition). */
  circuits:   string[];
}

export interface SyntheseVoiture {
  key:           string;
  carLabel:      string;
  carClass:      string;
  drivetrain:    string;
  nbDiagnostics: number;
  nbCircuits:    number;
  /** Date du diagnostic le plus récent (tri des cartes). */
  dernierAt:     string;
  /** Nombre de tours « neutres » (rien à signaler). */
  nbNeutres:     number;
  /** Soucis (titres non neutres), multi-circuits d'abord. */
  soucis:        EnonceSynthese[];
  /** Conseils actionnables les plus fréquents. */
  conseils:      EnonceSynthese[];
}

/** Même règle que l'onglet : un titre contenant « neutre » = tour sans souci. */
export function estNeutre(titre: string): boolean {
  return /neutre/i.test(titre);
}

function compter(
  occurrences: { texte: string; trackId: number; trackName: string }[],
): EnonceSynthese[] {
  const parTexte = new Map<string, { count: number; circuits: Map<number, string> }>();
  for (const o of occurrences) {
    if (!parTexte.has(o.texte)) parTexte.set(o.texte, { count: 0, circuits: new Map() });
    const e = parTexte.get(o.texte)!;
    e.count++;
    if (!e.circuits.has(o.trackId)) e.circuits.set(o.trackId, o.trackName);
  }
  return [...parTexte.entries()]
    .map(([texte, e]) => ({
      texte,
      count:      e.count,
      nbCircuits: e.circuits.size,
      circuits:   [...e.circuits.values()],
    }))
    .sort((a, b) => b.nbCircuits - a.nbCircuits || b.count - a.count || a.texte.localeCompare(b.texte));
}

/**
 * Regroupe les diagnostics par voiture (voiture × classe × transmission) et
 * synthétise soucis et conseils tous circuits confondus. Cartes triées par
 * diagnostic le plus récent.
 */
export function syntheseParVoiture(reports: RapportCopilote[]): SyntheseVoiture[] {
  const groupes = new Map<string, RapportCopilote[]>();
  for (const r of reports) {
    const key = `${r.car_ordinal}|${r.car_class}|${r.drivetrain}`;
    if (!groupes.has(key)) groupes.set(key, []);
    groupes.get(key)!.push(r);
  }

  return [...groupes.entries()]
    .map(([key, rs]) => {
      const soucisOcc:   { texte: string; trackId: number; trackName: string }[] = [];
      const conseilsOcc: { texte: string; trackId: number; trackName: string }[] = [];
      let nbNeutres = 0;
      const circuits = new Set<number>();
      let dernierAt = rs[0].created_at;

      for (const r of rs) {
        circuits.add(r.track_id);
        if (r.created_at > dernierAt) dernierAt = r.created_at;
        if (estNeutre(r.titre)) {
          nbNeutres++;
        } else if (r.titre) {
          soucisOcc.push({ texte: r.titre, trackId: r.track_id, trackName: r.track_name });
        }
        for (const c of r.conseils) {
          conseilsOcc.push({ texte: c, trackId: r.track_id, trackName: r.track_name });
        }
      }

      return {
        key,
        carLabel:      rs[0].car_label || 'Voiture',
        carClass:      rs[0].car_class,
        drivetrain:    rs[0].drivetrain,
        nbDiagnostics: rs.length,
        nbCircuits:    circuits.size,
        dernierAt,
        nbNeutres,
        soucis:        compter(soucisOcc),
        conseils:      compter(conseilsOcc).slice(0, 5),
      };
    })
    .sort((a, b) => b.dernierAt.localeCompare(a.dernierAt));
}
