import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { computeLeaderChanges, type LeaderLap } from '@/lib/leaders';

const MAX_ITEMS = 8;

interface CurrentRow extends LeaderLap {
  id:      string;
  players: { pseudo: string; discord_tag: string | null } | null;
  cars:    { manufacturer: string | null; name: string; year: number | null } | null;
  tracks:  { name: string } | null;
}

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
  // Temps actuels (avec les jointures pour l'affichage) + historique complet.
  // On télécharge tout puis on agrège côté serveur — à déplacer côté
  // Postgres/RPC quand la base grossira (cf. roadmap point 5).
  const [currentRes, historyRes] = await Promise.all([
    fetchAllRows<CurrentRow>((from, to) =>
      supabase
        .from('lap_times')
        .select('id, player_id, track_id, car_ordinal, car_class, drivetrain, time_ms, recorded_at, players ( pseudo, discord_tag:discord_tag_public ), cars ( manufacturer, name, year ), tracks ( name )')
        .order('id')
        .range(from, to)
    ),
    fetchAllRows<LeaderLap>((from, to) =>
      supabase
        .from('lap_times_history')
        .select('player_id, track_id, car_ordinal, car_class, drivetrain, time_ms, recorded_at')
        .order('id')
        .range(from, to)
    ),
  ]);

  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  if (currentRes.error) throw new Error(currentRes.error.message);
  if (historyRes.error) throw new Error(historyRes.error.message);

  const current = currentRes.data;

  // Référentiels construits depuis les temps actuels : chaque joueur et chaque
  // config y a forcément une ligne (le PB courant).
  const playerInfo = new Map<string, PlayerInfo>();
  const configInfo = new Map<string, { car: string; track: string }>();
  // Tour actuel d'un joueur sur une config donnée (pour mettre la ligne en
  // évidence dans le classement) : clé = `${configKey}-${player_id}`.
  const lapIdByPlayerConfig = new Map<string, string>();
  for (const r of current) {
    if (r.players) playerInfo.set(r.player_id, r.players);
    const key = `${r.track_id}-${r.car_ordinal}-${r.car_class}-${r.drivetrain}`;
    lapIdByPlayerConfig.set(`${key}-${r.player_id}`, r.id);
    if (!configInfo.has(key)) {
      configInfo.set(key, {
        car:   r.cars ? `${r.cars.year ?? ''} ${r.cars.manufacturer ?? ''} ${r.cars.name ?? ''}`.trim() || '—' : '—',
        track: r.tracks?.name ?? '—',
      });
    }
  }

  const changes = computeLeaderChanges([...current, ...historyRes.data]);

  const feed: LeaderFeedItem[] = [];
  for (const c of changes) {
    const newLeader = playerInfo.get(c.newLeaderId);
    const oldLeader = playerInfo.get(c.oldLeaderId);
    if (!newLeader || !oldLeader) continue; // joueur supprimé → on saute l'événement
    const info = configInfo.get(c.configKey) ?? { car: '—', track: '—' };
    feed.push({
      id:          `${c.configKey}-${c.recorded_at}-${c.newLeaderId}`,
      newLeader,
      oldLeader,
      newTimeMs:   c.newTimeMs,
      oldTimeMs:   c.oldTimeMs,
      car:         info.car,
      track:       info.track,
      track_id:    c.track_id,
      car_class:   c.car_class,
      drivetrain:  c.drivetrain,
      lapId:       lapIdByPlayerConfig.get(`${c.configKey}-${c.newLeaderId}`) ?? null,
      recorded_at: c.recorded_at,
    });
    if (feed.length >= MAX_ITEMS) break;
  }
  return feed;
}

// Cache serveur partagé (au plus un recalcul complet par minute), réutilisé par
// l'API /api/nouveaux-leaders et par le rendu serveur de la page d'accueil.
export const getNouveauxLeaders = unstable_cache(computeFeed, ['nouveaux-leaders'], {
  revalidate: 60,
});
