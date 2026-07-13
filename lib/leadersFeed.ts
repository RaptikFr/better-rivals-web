import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

const MAX_ITEMS = 8;

interface PlayerInfo { pseudo: string; discord_tag: string | null; }

export interface LeaderFeedItem {
  id:          string;
  newLeader:   PlayerInfo;
  oldLeader:   PlayerInfo;
  newTimeMs:   number;
  oldTimeMs:   number;
  car:         string;
  track:       string;
  track_id:    number;
  car_class:   string;
  drivetrain:  string;
  lapId:       string | null; // tour actuel du nouveau leader (pour highlight)
  recorded_at: string;
}

async function computeFeed(): Promise<LeaderFeedItem[]> {
  // Toute l'agrégation (rejeu chronologique des records par config, jointures
  // joueurs/voiture/circuit) vit côté Postgres : la RPC renvoie directement
  // les MAX_ITEMS derniers détrônages, quel que soit le volume d'historique.
  // (Avant : téléchargement complet de lap_times + lap_times_history — cf.
  // computeLeaderChanges dans lib/leaders.ts, encore utilisé par le récap
  // hebdo et la page stats, moins sollicités.)
  const { data, error } = await supabase.rpc('nouveaux_leaders_feed', { p_limit: MAX_ITEMS });

  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id:          `${r.track_id}-${r.car_ordinal}-${r.car_class}-${r.drivetrain}-${r.recorded_at}-${r.new_leader_id}`,
    newLeader:   { pseudo: r.new_pseudo, discord_tag: r.new_discord },
    oldLeader:   { pseudo: r.old_pseudo, discord_tag: r.old_discord },
    newTimeMs:   r.new_time_ms,
    oldTimeMs:   r.old_time_ms,
    car:         r.car,
    track:       r.track,
    track_id:    r.track_id,
    car_class:   r.car_class,
    drivetrain:  r.drivetrain,
    lapId:       r.lap_id,
    recorded_at: r.recorded_at,
  }));
}

// Cache serveur partagé (au plus un recalcul complet par minute), réutilisé par
// l'API /api/nouveaux-leaders et par le rendu serveur de la page d'accueil.
export const getNouveauxLeaders = unstable_cache(computeFeed, ['nouveaux-leaders'], {
  revalidate: 60,
});
