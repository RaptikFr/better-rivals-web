// Écarts communautaires par secteur : à partir des lignes best_sectors d'UNE
// config (une ligne par pilote et par index de secteur), mesure où les pilotes
// se départagent le plus. Logique pure, partagée entre la carte circuit
// (mode 🔥 heatmap, client) et le bloc serveur « secteurs disputés » des pages
// circuit (SEO). Couverte par tests.

export interface LigneBestSector {
  player_id:    string;
  /** 1-BASED, comme en base (RPC enregistrer_meilleurs_secteurs). */
  sector_index: number;
  best_ms:      number;
}

export interface EcartSecteur {
  /** Index 0-based du secteur (aligné sur le découpage de la carte). */
  index:      number;
  /** Pilotes ayant un meilleur temps enregistré sur ce secteur. */
  nbPilotes:  number;
  bestMs:     number | null;
  worstMs:    number | null;
  /** worst − best (ms) ; 0 tant qu'il n'y a pas au moins 2 pilotes. */
  ecartMs:    number;
}

/**
 * Un EcartSecteur par index (longueur = max des sector_index rencontrés).
 * L'écart d'un secteur n'a de sens qu'à partir de 2 pilotes : en dessous il
 * vaut 0 (la carte le laisse neutre, le résumé l'ignore).
 */
export function ecartsParSecteur(lignes: LigneBestSector[]): EcartSecteur[] {
  if (lignes.length === 0) return [];
  const n = Math.max(...lignes.map(l => l.sector_index));
  if (!Number.isFinite(n) || n < 1) return [];
  const ecarts: EcartSecteur[] = Array.from({ length: n }, (_, i) => ({
    index: i, nbPilotes: 0, bestMs: null, worstMs: null, ecartMs: 0,
  }));
  for (const l of lignes) {
    const e = ecarts[l.sector_index - 1];
    if (!e || !Number.isFinite(l.best_ms) || l.best_ms <= 0) continue;
    e.nbPilotes += 1;
    if (e.bestMs === null  || l.best_ms < e.bestMs)  e.bestMs  = l.best_ms;
    if (e.worstMs === null || l.best_ms > e.worstMs) e.worstMs = l.best_ms;
  }
  for (const e of ecarts) {
    if (e.nbPilotes >= 2) e.ecartMs = e.worstMs! - e.bestMs!;
  }
  return ecarts;
}

/** Secteurs disputés (≥ 2 pilotes, écart > 0), du plus grand écart au plus petit. */
export function secteursDisputes(ecarts: EcartSecteur[]): EcartSecteur[] {
  return ecarts
    .filter(e => e.nbPilotes >= 2 && e.ecartMs > 0)
    .sort((a, b) => b.ecartMs - a.ecartMs);
}
