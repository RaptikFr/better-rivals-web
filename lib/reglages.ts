import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchAllRows } from '@/lib/fetchAllRows';

// Bibliothèque de réglages — source HYBRIDE (décidée le 16/06) :
//   - tune_setups : réglages explicitement partagés (label, ⭐ original, circuit).
//   - lap_times.share_code : réglages dérivés des temps enregistrés (volume).
// Dédupliqués par (car_ordinal, code normalisé), avec le meilleur temps obtenu
// et le nombre de pilotes l'ayant utilisé. Regroupement par modèle de voiture
// (un réglage est lié à la voiture, pas à une classe/transmission).

export interface ReglageEntry {
  shareCode:          string;
  carOrdinal:         number;
  carLabel:           string;
  carSlug:            string;        // pour lier vers /voitures/[slug]
  label:              string | null; // libellé donné par l'auteur (tune_setups)
  isOriginal:         boolean;        // réglage revendiqué comme original
  author:             string | null;  // auteur revendiqué, sinon pilote le plus rapide
  authorClaimed:      boolean;        // l'auteur vient d'une revendication is_original
  optimizedFor:       string | null;  // « optimisé pour » : circuit précis ou type
  bestTimeMs:         number | null;
  bestTimeTrackName:  string | null;
  bestTimeClass:      string | null;
  bestTimeDrivetrain: string | null;
  usageCount:         number;         // pilotes distincts ayant utilisé ce code
  classes:            string[];       // classes vues avec ce code (pour filtrer)
  drivetrains:        string[];
}

import { carSlug as buildCarSlug } from '@/lib/carSlug';

type CarRel    = { manufacturer: string | null; name: string; year: number | null } | null;
type PlayerRel = { pseudo: string } | null;
type TrackRel  = { name: string } | null;

interface LapRow {
  share_code:  string | null;
  car_ordinal: number;
  time_ms:     number;
  car_class:   string;
  drivetrain:  string;
  player_id:   string;
  players:     PlayerRel;
  cars:        CarRel;
  tracks:      TrackRel;
}

interface TuneRow {
  share_code:  string;
  car_ordinal: number;
  label:       string | null;
  is_original: boolean;
  track_type:  string | null;
  player_id:   string;
  players:     PlayerRel;
  cars:        CarRel;
  tracks:      TrackRel;
}

// Code normalisé pour la déduplication (les codes restent affichés tels quels).
function normCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, ' ');
}

function carLabelOf(c: CarRel, ordinal: number): string {
  if (!c) return `Voiture #${ordinal}`;
  return `${c.year ?? ''} ${c.manufacturer ?? ''} ${c.name ?? ''}`.trim() || `Voiture #${ordinal}`;
}

// Accumulateur interne le temps de fusionner les deux sources.
interface Acc {
  shareCode:    string;
  carOrdinal:   number;
  carLabel:     string;
  carSlug:      string;
  players:      Set<string>;
  classes:      Set<string>;
  drivetrains:  Set<string>;
  best:         { timeMs: number; track: string | null; carClass: string; drivetrain: string } | null;
  fastestPilot: { pseudo: string; timeMs: number } | null;
  // renseignés par tune_setups
  label:        string | null;
  isOriginal:   boolean;
  claimedAuthor: string | null;
  optimizedFor: string | null;
}

async function buildReglages(): Promise<ReglageEntry[]> {
  const carSel = 'manufacturer, name, year';
  const [{ data: laps }, { data: tunes }] = await Promise.all([
    fetchAllRows<LapRow>((from, to) =>
      supabaseAdmin
        .from('lap_times')
        .select(`share_code, car_ordinal, time_ms, car_class, drivetrain, player_id, players(pseudo), cars(${carSel}), tracks(name)`)
        .not('share_code', 'is', null)
        .order('id')
        .range(from, to),
    ),
    supabaseAdmin
      .from('tune_setups')
      .select(`share_code, car_ordinal, label, is_original, track_type, player_id, players(pseudo), cars(${carSel}), tracks(name)`)
      .then(r => ({ data: (r.data ?? []) as unknown as TuneRow[] })),
  ]);

  const acc = new Map<string, Acc>();
  const keyOf = (ordinal: number, code: string) => `${ordinal}|${normCode(code)}`;

  function ensure(ordinal: number, code: string, car: CarRel): Acc {
    const k = keyOf(ordinal, code);
    let a = acc.get(k);
    if (!a) {
      const c = car;
      a = {
        shareCode:   code.trim(),
        carOrdinal:  ordinal,
        carLabel:    carLabelOf(c, ordinal),
        carSlug:     buildCarSlug(ordinal, c?.manufacturer ?? '', c?.name ?? ''),
        players:     new Set(),
        classes:     new Set(),
        drivetrains: new Set(),
        best:        null,
        fastestPilot: null,
        label:       null,
        isOriginal:  false,
        claimedAuthor: null,
        optimizedFor: null,
      };
      acc.set(k, a);
    }
    return a;
  }

  // 1. Temps enregistrés (dérivés) : usage, meilleur temps, pilote le plus rapide.
  for (const l of laps) {
    if (!l.share_code) continue;
    const a = ensure(l.car_ordinal, l.share_code, l.cars);
    a.players.add(l.player_id);
    a.classes.add(l.car_class);
    a.drivetrains.add(l.drivetrain);
    if (!a.best || l.time_ms < a.best.timeMs) {
      a.best = { timeMs: l.time_ms, track: l.tracks?.name ?? null, carClass: l.car_class, drivetrain: l.drivetrain };
    }
    if (!a.fastestPilot || l.time_ms < a.fastestPilot.timeMs) {
      a.fastestPilot = { pseudo: l.players?.pseudo ?? 'Inconnu', timeMs: l.time_ms };
    }
  }

  // 2. Réglages partagés (tune_setups) : label, ⭐ original, « optimisé pour ».
  for (const t of tunes) {
    const a = ensure(t.car_ordinal, t.share_code, t.cars);
    a.label = t.label ?? a.label;
    a.optimizedFor = t.tracks?.name ?? t.track_type ?? a.optimizedFor;
    if (t.is_original) {
      a.isOriginal = true;
      a.claimedAuthor = t.players?.pseudo ?? a.claimedAuthor;
    }
  }

  const entries: ReglageEntry[] = [...acc.values()].map(a => ({
    shareCode:          a.shareCode,
    carOrdinal:         a.carOrdinal,
    carLabel:           a.carLabel,
    carSlug:            a.carSlug,
    label:              a.label,
    isOriginal:         a.isOriginal,
    author:             a.claimedAuthor ?? a.fastestPilot?.pseudo ?? null,
    authorClaimed:      a.claimedAuthor !== null,
    optimizedFor:       a.optimizedFor,
    bestTimeMs:         a.best?.timeMs ?? null,
    bestTimeTrackName:  a.best?.track ?? null,
    bestTimeClass:      a.best?.carClass ?? null,
    bestTimeDrivetrain: a.best?.drivetrain ?? null,
    usageCount:         a.players.size,
    classes:            [...a.classes],
    drivetrains:        [...a.drivetrains],
  }));

  // Tri par défaut : originaux d'abord, puis les plus utilisés, puis le meilleur temps.
  entries.sort((x, y) => {
    if (x.isOriginal !== y.isOriginal) return x.isOriginal ? -1 : 1;
    if (y.usageCount !== x.usageCount) return y.usageCount - x.usageCount;
    return (x.bestTimeMs ?? Infinity) - (y.bestTimeMs ?? Infinity);
  });

  return entries;
}

// Cache serveur partagé (rafraîchi au plus toutes les 5 min).
export const getReglages = unstable_cache(buildReglages, ['reglages'], { revalidate: 300 });
