import { groupByConfig, configKey } from '@/lib/podiums';

// Couleur de la pastille — mappée vers des classes Tailwind dans BadgesBar.
export type BadgeTone = 'gold' | 'violet' | 'pink' | 'neutral';

export interface Badge {
  id:     string;
  emoji:  string;
  /** Texte complet affiché dans la pastille (déplié). */
  label:  string;
  tone:   BadgeTone;
}

// Champs minimaux d'un temps nécessaires au calcul des badges. Compatible avec
// les `Lap` du profil et de la page joueur (sur-ensemble de ConfigLap).
export interface BadgeLap {
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
  drivetrain:  string;
  time_ms:     number;
}

export interface BadgeContext {
  /** Temps du joueur. */
  laps:    BadgeLap[];
  /** Tous les temps sur les circuits du joueur (sert à classer chaque config). */
  allLaps: BadgeLap[];
  /** Rang du joueur au classement général (1 = premier), si connu. */
  generalRank?:  number | null;
  /** Nombre total de pilotes classés, si connu. */
  generalTotal?: number | null;
}

const plural = (n: number) => (n > 1 ? 's' : '');

/**
 * Dérive des badges d'accomplissement à partir des données existantes
 * (podiums, polyvalence, volume, classement général). Purement descriptif —
 * aucune comparaison aux records du monde.
 */
export function computeBadges(ctx: BadgeContext): Badge[] {
  const { laps, allLaps, generalRank, generalTotal } = ctx;
  const badges: Badge[] = [];
  if (laps.length === 0) return badges;

  // ── Rangs / podiums : position de chaque temps dans sa config ──
  const byConfig = groupByConfig(allLaps);
  let gold = 0;
  const podiumTracks = new Set<number>();
  for (const lap of laps) {
    const times  = byConfig.get(configKey(lap)) ?? [];
    const better = times.filter(t => t < lap.time_ms).length;
    if (better === 0) gold++;
    if (better <= 2)  podiumTracks.add(lap.track_id);
  }

  if (gold > 0) {
    badges.push({
      id: 'first', emoji: '🏆', tone: 'gold',
      label: `1ʳᵉ place sur ${gold} config${plural(gold)}`,
    });
  }
  if (gold >= 10) {
    badges.push({
      id: 'dominator', emoji: '👑', tone: 'gold',
      label: `Plus de 10 premières places`,
    });
  }
  if (podiumTracks.size >= 1) {
    badges.push({
      id: 'podium', emoji: '🎯', tone: 'violet',
      label: `Podium sur ${podiumTracks.size} circuit${plural(podiumTracks.size)}`,
    });
  }

  // ── Polyvalence ──
  const tracks  = new Set(laps.map(l => l.track_id)).size;
  const cars    = new Set(laps.map(l => l.car_ordinal)).size;
  const classes = new Set(laps.map(l => l.car_class)).size;

  if (tracks >= 3) {
    badges.push({
      id: 'tracks', emoji: '🗺️', tone: 'pink',
      label: `${tracks} circuits explorés`,
    });
  }
  if (cars >= 3) {
    badges.push({
      id: 'cars', emoji: '🚗', tone: 'pink',
      label: `${cars} voitures pilotées`,
    });
  }
  if (classes >= 4) {
    badges.push({
      id: 'classes', emoji: '🏎️', tone: 'pink',
      label: `${classes} classes essayées`,
    });
  }

  // ── Volume / régularité (paliers) ──
  const total = laps.length;
  const volume =
    total >= 100 ? { emoji: '💯', label: '100+ chronos enregistrés' } :
    total >= 50  ? { emoji: '⏱️', label: '50+ chronos enregistrés'  } :
    total >= 25  ? { emoji: '⏱️', label: '25+ chronos enregistrés'  } :
    total >= 10  ? { emoji: '⏱️', label: '10+ chronos enregistrés'  } :
    null;
  if (volume) {
    badges.push({ id: 'volume', emoji: volume.emoji, tone: 'neutral', label: volume.label });
  }

  // ── Classement général (achievement uniquement dans le top 10) ──
  if (generalRank != null && generalRank <= 10) {
    const onTotal = generalTotal ? ` sur ${generalTotal} pilotes` : '';
    badges.push({
      id: 'general', emoji: '📈',
      tone: generalRank <= 3 ? 'gold' : 'violet',
      label: generalRank <= 3
        ? `${generalRank}ᵉ au classement général${onTotal}`
        : `Top 10 du classement général (#${generalRank})`,
    });
  }

  return badges;
}
