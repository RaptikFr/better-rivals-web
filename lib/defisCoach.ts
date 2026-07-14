// Défis générés par le coach : « gagne 0,3 s au secteur 4 ». La cible est
// calculée depuis l'écart entre MON meilleur secteur et le meilleur secteur de
// la config (best_sectors) ; la validation est automatique côté serveur, à
// chaque tour complet posté par le relais (POST /api/sectors). Logique pure
// couverte par tests ; le calcul fait foi CÔTÉ SERVEUR (POST /api/defis), le
// client ne s'en sert que pour afficher la proposition.

/** Écart minimal au meilleur secteur pour qu'un défi ait un sens (ms). */
export const DEFI_ECART_MIN_MS = 150;
/** Gain demandé : bornes (ms) autour de 30 % de l'écart. */
export const DEFI_GAIN_MIN_MS = 100;
export const DEFI_GAIN_MAX_MS = 1000;

export interface PropositionDefi {
  /** Objectif : passer le secteur sous ce temps (ms). */
  targetMs: number;
  /** Gain demandé par rapport à mon meilleur secteur actuel (ms). */
  gainMs:   number;
}

/**
 * Cible d'un défi pour un secteur : viser ~30 % de l'écart au meilleur secteur
 * de la config, arrondi aux 10 ms, borné [0,1 s ; 1 s]. Null si le défi n'a pas
 * de sens : je détiens déjà le meilleur secteur, ou j'en suis trop proche
 * (< 150 ms — l'objectif serait plus fin que la variabilité d'un tour).
 * Comme gain = max(100, 30 % de l'écart) ≤ écart dès que l'écart ≥ 150 ms,
 * la cible reste toujours au niveau ou au-dessus du meilleur secteur connu.
 */
export function cibleDefi(mienMs: number, bestMs: number): PropositionDefi | null {
  if (!Number.isFinite(mienMs) || !Number.isFinite(bestMs) || mienMs <= 0 || bestMs <= 0) return null;
  const ecart = mienMs - bestMs;
  if (ecart < DEFI_ECART_MIN_MS) return null;
  const gainMs = Math.min(DEFI_GAIN_MAX_MS,
    Math.max(DEFI_GAIN_MIN_MS, Math.round((ecart * 0.3) / 10) * 10));
  return { targetMs: mienMs - gainMs, gainMs };
}

/** Vue d'un défi renvoyée par GET /api/defis (enrichie serveur). */
export interface DefiView {
  id:           string;
  track_id:     number;
  track_name:   string;
  car_ordinal:  number;
  car_label:    string;
  car_class:    string;
  drivetrain:   string;
  /** 1-based, comme en base. */
  sector_index: number;
  baseline_ms:  number;
  target_ms:    number;
  /** Mon meilleur secteur actuel (best_sectors), pour la progression. */
  current_ms:   number | null;
  achieved_ms:  number | null;
  achieved_at:  string | null;
  created_at:   string;
}
