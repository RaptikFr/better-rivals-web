// Couleur de la pastille — mappée vers des classes Tailwind dans BadgesBar.
export type BadgeTone = 'gold' | 'violet' | 'pink' | 'neutral';

export interface Badge {
  id:     string;
  emoji:  string;
  /** Texte complet affiché dans la pastille (déplié). */
  label:  string;
  tone:   BadgeTone;
}

// Champs minimaux d'un temps nécessaires au calcul des badges (polyvalence,
// volume). Compatible avec les `Lap` du profil et de la page joueur.
export interface BadgeLap {
  track_id:    number;
  car_ordinal: number;
  car_class:   string;
}

// Rang du joueur sur une config (calculé côté serveur), pour les badges podium.
export interface BadgeRank {
  track_id: number;
  rank:     number;
}

export interface BadgeContext {
  /** Temps du joueur. */
  laps:    BadgeLap[];
  /** Rang du joueur par config (podiums dérivés du rang). */
  ranked:  BadgeRank[];
}

const plural = (n: number) => (n > 1 ? 's' : '');

/**
 * Dérive des badges d'accomplissement à partir des données existantes
 * (podiums, polyvalence, volume). Purement descriptif —
 * aucune comparaison aux records du monde.
 */
export function computeBadges(ctx: BadgeContext): Badge[] {
  const { laps, ranked } = ctx;
  const badges: Badge[] = [];
  if (laps.length === 0) return badges;

  // ── Rangs / podiums : dérivés du rang par config (calculé côté serveur) ──
  let gold = 0;
  const podiumTracks = new Set<number>();
  for (const r of ranked) {
    if (r.rank === 1) gold++;
    if (r.rank <= 3)  podiumTracks.add(r.track_id);
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

  return badges;
}
