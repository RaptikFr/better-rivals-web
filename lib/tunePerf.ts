export type RefClass = 'D' | 'C' | 'B' | 'A' | 'S1' | 'S2' | 'R' | 'X';

const REF_CLASSES: RefClass[] = ['D', 'C', 'B', 'A', 'S1', 'S2', 'R', 'X'];

export interface TunePerfStats {
  perfs: {
    acceleration:   number;
    vitesse:        number;
    freinage:       number;
    tout_terrain:   number;
    depart_arrete:  number;
    tenue_de_route: number;
  };
  top_speed_kmh: number;
  accel_0_161_s: number;
  braking_161_m: number;
  lateral_g_97:  number;
  balance: {
    mecanique:       number;
    aero:            number;
    efficacite_aero: number;
  };
  engine: {
    puissance_ch: number;
    couple_nm:    number;
    poids_kg:     number;
  };
  ref_class: RefClass;
  ref_pi:    number;
}

export function isTunePerfStats(x: unknown): x is TunePerfStats {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (!o.perfs   || typeof o.perfs   !== 'object') return false;
  if (!o.balance || typeof o.balance !== 'object') return false;
  if (!o.engine  || typeof o.engine  !== 'object') return false;
  if (!REF_CLASSES.includes(o.ref_class as RefClass)) return false;
  if (typeof o.ref_pi !== 'number' || !Number.isInteger(o.ref_pi) || o.ref_pi < 100 || o.ref_pi > 999) return false;
  const p = o.perfs   as Record<string, unknown>;
  const b = o.balance as Record<string, unknown>;
  const e = o.engine  as Record<string, unknown>;
  if (['acceleration', 'vitesse', 'freinage', 'tout_terrain', 'depart_arrete', 'tenue_de_route'].some(k => typeof p[k] !== 'number')) return false;
  if (['mecanique', 'aero', 'efficacite_aero'].some(k => typeof b[k] !== 'number')) return false;
  if (['puissance_ch', 'couple_nm', 'poids_kg'].some(k => typeof e[k] !== 'number')) return false;
  return (
    typeof o.top_speed_kmh === 'number' &&
    typeof o.accel_0_161_s === 'number' &&
    typeof o.braking_161_m === 'number' &&
    typeof o.lateral_g_97  === 'number'
  );
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v.trim().replace(',', '.'));
  return NaN;
}

function clampPerf(n: number): number | null {
  if (isNaN(n) || n < 0) return null;
  return Math.round(Math.min(10, n) * 10) / 10;
}

/**
 * Valide et convertit les données de performance brutes (formulaire flat ou JSON imbriqué).
 * Convertit les virgules FR en points. Retourne TunePerfStats si valide, sinon { error }.
 */
export function parsePerfInput(raw: unknown): TunePerfStats | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Données de performance manquantes.' };
  const r = raw as Record<string, unknown>;

  // Accepte à la fois la forme plate (formulaire) et imbriquée (JSON API).
  const perfSrc = (r.perfs  && typeof r.perfs   === 'object') ? (r.perfs   as Record<string, unknown>) : r;
  const balSrc  = (r.balance && typeof r.balance === 'object') ? (r.balance as Record<string, unknown>) : r;
  const engSrc  = (r.engine  && typeof r.engine  === 'object') ? (r.engine  as Record<string, unknown>) : r;

  const perfKeys = ['acceleration', 'vitesse', 'freinage', 'tout_terrain', 'depart_arrete', 'tenue_de_route'] as const;
  const perfs: Partial<TunePerfStats['perfs']> = {};
  for (const k of perfKeys) {
    const n = clampPerf(toNum(perfSrc[k]));
    if (n === null) return { error: `Valeur invalide pour "${k.replace(/_/g, ' ')}".` };
    perfs[k] = n;
  }

  const top_speed_kmh = toNum(r.top_speed_kmh);
  const accel_0_161_s = toNum(r.accel_0_161_s);
  const braking_161_m = toNum(r.braking_161_m);
  const lateral_g_97  = toNum(r.lateral_g_97);
  if ([top_speed_kmh, accel_0_161_s, braking_161_m, lateral_g_97].some(n => isNaN(n) || n < 0)) {
    return { error: 'Valeur numérique invalide (vitesse, accélération, freinage ou G latéraux).' };
  }

  const mecanique       = toNum(balSrc.mecanique);
  const aero            = toNum(balSrc.aero);
  const efficacite_aero = toNum(balSrc.efficacite_aero);
  if ([mecanique, aero, efficacite_aero].some(n => isNaN(n) || n < 0)) {
    return { error: 'Valeur de balance invalide.' };
  }

  const puissance_ch = toNum(engSrc.puissance_ch);
  const couple_nm    = toNum(engSrc.couple_nm);
  const poids_kg     = toNum(engSrc.poids_kg);
  if ([puissance_ch, couple_nm, poids_kg].some(n => isNaN(n) || n < 0)) {
    return { error: 'Valeur moteur invalide.' };
  }

  const ref_class = (r.ref_class ?? '') as RefClass;
  if (!REF_CLASSES.includes(ref_class)) return { error: 'Classe de référence invalide.' };

  const ref_pi = Math.round(toNum(r.ref_pi));
  if (isNaN(ref_pi) || ref_pi < 100 || ref_pi > 999) {
    return { error: 'Le PI de référence doit être un entier entre 100 et 999.' };
  }

  return {
    perfs: perfs as TunePerfStats['perfs'],
    top_speed_kmh,
    accel_0_161_s,
    braking_161_m,
    lateral_g_97,
    balance: { mecanique, aero, efficacite_aero },
    engine:  { puissance_ch, couple_nm, poids_kg },
    ref_class,
    ref_pi,
  };
}
