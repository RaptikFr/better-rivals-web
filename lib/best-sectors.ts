import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Alimente `best_sectors` (meilleur temps par index de secteur, par config) avec
 * les secteurs (ms) d'un tour. La RPC ne garde que le meilleur par index (upsert
 * conditionnel atomique). Best-effort : un échec n'interrompt jamais l'appelant
 * — les secteurs sont un bonus, jamais bloquants pour l'envoi d'un chrono.
 *
 * Alimenté depuis deux endroits : POST /api/traces (secteurs du PB recalculés
 * depuis la trace, tout relais ≥ v1.13) et POST /api/sectors (secteurs de chaque
 * tour, relais ≥ v1.15) → le « tour optimal » capte aussi les bons secteurs des
 * tours qui n'ont pas battu le PB.
 */
export async function enregistrerMeilleursSecteurs(opts: {
  trackId:    number;
  carOrdinal: number;
  carClass:   string;
  drivetrain: string;
  playerId:   string;
  sectorsMs:  number[];
}): Promise<void> {
  try {
    await supabaseAdmin.rpc('enregistrer_meilleurs_secteurs', {
      p_track_id:    opts.trackId,
      p_car_ordinal: opts.carOrdinal,
      p_car_class:   opts.carClass,
      p_drivetrain:  opts.drivetrain,
      p_player_id:   opts.playerId,
      p_sectors:     opts.sectorsMs,
    });
  } catch { /* best-effort */ }
}
