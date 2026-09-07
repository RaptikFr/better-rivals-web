import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { utilisateurDepuisAuthHeader } from '@/lib/auth-token';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Garde-fou : au-delà, les plus vieilles courbes du joueur sont élaguées.
const MAX_PAR_JOUEUR = 60;
// Une capture fait ~15-120 points (tranches de 100 tr/min sur la plage utile).
const MAX_POINTS = 300;

// Code de partage Forza normalisé — même règle que lib/reglages.ts (normCode)
// pour que la courbe se rattache au même « build » que les réglages.
function normCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, ' ');
}

async function joueurDuToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Token manquant.' }, { status: 401 }) };
  }
  const user = await utilisateurDepuisAuthHeader(authHeader);
  if (!user) {
    return { error: NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 401 }) };
  }
  const { data: player } = await supabaseAdmin
    .from('players').select('id').eq('user_id', user.id).single();
  if (!player) {
    return { error: NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 }) };
  }
  return { playerId: player.id };
}

interface CurvePoint { rpm: number; nm: number; kw: number }

// Valide et assainit les points reçus. Retourne la liste triée par régime, ou
// null si la forme est invalide.
function parsePoints(raw: unknown): CurvePoint[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_POINTS) return null;
  const out: CurvePoint[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') return null;
    const o = p as Record<string, unknown>;
    const rpm = Number(o.rpm);
    const nm  = Number(o.nm);
    const kw  = Number(o.kw);
    if (!Number.isFinite(rpm) || rpm < 0 || rpm > 40_000) return null;
    if (!Number.isFinite(nm)  || Math.abs(nm) > 20_000)   return null;
    if (!Number.isFinite(kw)  || Math.abs(kw) > 10_000)   return null;
    out.push({ rpm: Math.round(rpm), nm: Math.round(nm * 10) / 10, kw: Math.round(kw * 10) / 10 });
  }
  out.sort((a, b) => a.rpm - b.rpm);
  return out;
}

// POST /api/torque-curves — CAPTURE DE COURBE MOTEUR (relais ≥ v3.8.0). Le relais
// envoie les points échantillonnés d'une bosse pleine charge + les pics extraits,
// rattachés au code de partage Forza du build. Upsert : une recapture du même
// build (player + car_ordinal + share_code) remplace la précédente.
// Best-effort côté relais (un échec n'interrompt pas la session). Bearer session.
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'torque-curves-post', 30, 60_000);
    if (limited) return limited;

    const auth = await joueurDuToken(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
    }

    const carOrdinal = Number(body.car_ordinal);
    const shareCode  = typeof body.share_code === 'string' ? normCode(body.share_code) : '';
    const gear       = Number(body.gear);
    if (!Number.isInteger(carOrdinal) || carOrdinal <= 0
        || !shareCode || shareCode.length > 30
        || !Number.isInteger(gear) || gear < 1 || gear > 12) {
      return NextResponse.json({ error: 'Données de courbe incomplètes.' }, { status: 400 });
    }

    const points = parsePoints(body.points);
    if (!points) {
      return NextResponse.json({ error: 'Points de courbe invalides.' }, { status: 400 });
    }

    const carClass   = typeof body.car_class  === 'string' ? body.car_class.slice(0, 8)  : null;
    const drivetrain = typeof body.drivetrain === 'string' ? body.drivetrain.slice(0, 8) : null;
    const carPi      = Number.isFinite(Number(body.car_pi)) ? Math.round(Number(body.car_pi)) : null;
    const engineMaxRpm = Number.isFinite(Number(body.engine_max_rpm))
      ? Math.round(Number(body.engine_max_rpm)) : null;

    // Pics : on fait confiance au relais mais on les recalcule pour garantir la
    // cohérence avec les points stockés (et se prémunir d'un client bogué).
    const peakT = points.reduce((m, p) => (p.nm > m.nm ? p : m), points[0]);
    const peakP = points.reduce((m, p) => (p.kw > m.kw ? p : m), points[0]);

    const { error } = await supabaseAdmin
      .from('torque_curves')
      .upsert({
        player_id:       auth.playerId,
        car_ordinal:     carOrdinal,
        share_code:      shareCode,
        car_class:       carClass,
        drivetrain,
        car_pi:          carPi,
        gear,
        engine_max_rpm:  engineMaxRpm,
        points:          points as unknown as never,
        peak_torque_rpm: peakT.rpm,
        peak_torque_nm:  peakT.nm,
        peak_power_rpm:  peakP.rpm,
        peak_power_kw:   peakP.kw,
        captured_at:     new Date().toISOString(),
      }, { onConflict: 'player_id,car_ordinal,share_code' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Élagage best-effort : on ne garde que les MAX_PAR_JOUEUR plus récentes.
    try {
      const { data: anciens } = await supabaseAdmin
        .from('torque_curves')
        .select('id')
        .eq('player_id', auth.playerId)
        .order('captured_at', { ascending: false })
        .range(MAX_PAR_JOUEUR, MAX_PAR_JOUEUR + 200);
      const aSupprimer = (anciens ?? []).map(r => r.id);
      if (aSupprimer.length) {
        await supabaseAdmin.from('torque_curves').delete().in('id', aSupprimer);
      }
    } catch { /* l'élagage est un bonus, jamais bloquant */ }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// GET /api/torque-curves — les courbes du joueur (les plus récentes d'abord),
// enrichies du libellé voiture pour l'affichage. Bearer session du joueur.
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'torque-curves-get', 60, 60_000);
    if (limited) return limited;

    const auth = await joueurDuToken(request);
    if (auth.error) return auth.error;

    const { data: curves, error } = await supabaseAdmin
      .from('torque_curves')
      .select('id, car_ordinal, share_code, car_class, drivetrain, car_pi, gear, engine_max_rpm, points, peak_torque_rpm, peak_torque_nm, peak_power_rpm, peak_power_kw, captured_at')
      .eq('player_id', auth.playerId)
      .order('captured_at', { ascending: false })
      .limit(MAX_PAR_JOUEUR);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = curves ?? [];
    if (rows.length === 0) return NextResponse.json({ curves: [] }, { status: 200 });

    const ordinals = [...new Set(rows.map(r => r.car_ordinal))];
    const { data: cars } = await supabaseAdmin
      .from('cars').select('car_ordinal, manufacturer, name, year').in('car_ordinal', ordinals);
    const carLabel = new Map((cars ?? []).map(c =>
      [c.car_ordinal, `${c.year ?? ''} ${c.manufacturer ?? ''} ${c.name ?? ''}`.trim()]));

    const enriched = rows.map(r => ({
      ...r,
      car_label: carLabel.get(r.car_ordinal) ?? `Voiture #${r.car_ordinal}`,
    }));

    return NextResponse.json({ curves: enriched }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
