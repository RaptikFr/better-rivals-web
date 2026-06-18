// Config de la semaine (pack social, #9) — lecture serveur.
// La config active = la ligne weekly_config dont now() ∈ [starts_at, ends_at),
// la plus récente. Le classement de la semaine = les temps posés PENDANT la
// fenêtre sur cette config exacte (lap_times.recorded_at dans la fenêtre).
// Tout se lit via le service role : weekly_config est fermée à anon/auth.

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface ConfigSemaineInfo {
  id:          string;
  track_id:    number;
  track_name:  string;
  car_ordinal: number;
  car_label:   string;
  car_class:   string;
  drivetrain:  string;
  starts_at:   string;
  ends_at:     string;
}

export interface ClassementSemaineRow {
  player_id:   string;
  pseudo:      string;
  time_ms:     number;
  recorded_at: string;
}

export interface ConfigSemaine {
  config:     ConfigSemaineInfo;
  classement: ClassementSemaineRow[];
  /** Lien profond vers le classement complet de la config. */
  link:       string;
}

function carLabelOf(c: { manufacturer: string | null; name: string; year: number | null } | null, ordinal: number): string {
  if (!c) return `Voiture #${ordinal}`;
  return `${c.year ?? ''} ${c.manufacturer ?? ''} ${c.name ?? ''}`.trim() || `Voiture #${ordinal}`;
}

/** Lien profond vers le classement de la config (mêmes params que /api/times). */
export function lienClassementConfig(o: {
  track_id: number; car_class: string; drivetrain: string; car_label: string;
}): string {
  return `/classements?${new URLSearchParams({
    track_id:   String(o.track_id),
    class:      o.car_class,
    drivetrain: o.drivetrain,
    car:        o.car_label,
  }).toString()}`;
}

/**
 * Renvoie la config de la semaine active et son classement, ou null si aucune
 * config n'est active (aucune posée, ou fenêtre expirée). Best-effort : toute
 * erreur de lecture remonte un null côté page.
 */
export async function getConfigSemaine(): Promise<ConfigSemaine | null> {
  const nowIso = new Date().toISOString();

  const { data: cfg } = await supabaseAdmin
    .from('weekly_config')
    .select('id, track_id, car_ordinal, car_class, drivetrain, starts_at, ends_at')
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cfg) return null;

  // Enrichissement (nom du circuit, libellé voiture) + classement de la fenêtre.
  const [trackRes, carRes, lapsRes] = await Promise.all([
    supabaseAdmin.from('tracks').select('name').eq('id', cfg.track_id).maybeSingle(),
    supabaseAdmin.from('cars').select('manufacturer, name, year').eq('car_ordinal', cfg.car_ordinal).maybeSingle(),
    supabaseAdmin
      .from('lap_times')
      .select('player_id, time_ms, recorded_at, players ( pseudo )')
      .eq('track_id',    cfg.track_id)
      .eq('car_ordinal', cfg.car_ordinal)
      .eq('car_class',   cfg.car_class)
      .eq('drivetrain',  cfg.drivetrain)
      .gte('recorded_at', cfg.starts_at)
      .lte('recorded_at', cfg.ends_at)
      .order('time_ms', { ascending: true }),
  ]);

  const carLabel = carLabelOf(carRes.data, cfg.car_ordinal);
  const config: ConfigSemaineInfo = {
    id:          cfg.id,
    track_id:    cfg.track_id,
    track_name:  trackRes.data?.name ?? `Circuit #${cfg.track_id}`,
    car_ordinal: cfg.car_ordinal,
    car_label:   carLabel,
    car_class:   cfg.car_class,
    drivetrain:  cfg.drivetrain,
    starts_at:   cfg.starts_at,
    ends_at:     cfg.ends_at,
  };

  const classement: ClassementSemaineRow[] = (lapsRes.data ?? []).map(l => ({
    player_id:   l.player_id,
    pseudo:      (l.players as { pseudo: string } | null)?.pseudo ?? 'Inconnu',
    time_ms:     l.time_ms,
    recorded_at: l.recorded_at,
  }));

  return {
    config,
    classement,
    link: lienClassementConfig({ track_id: config.track_id, car_class: config.car_class, drivetrain: config.drivetrain, car_label: config.car_label }),
  };
}
