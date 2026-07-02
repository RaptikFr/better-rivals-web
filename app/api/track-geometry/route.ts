import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';
import type { Json } from '@/types/database.types';

export const dynamic = 'force-dynamic';

// ============================================================
// /api/track-geometry — tracé (géométrie x/z) d'un circuit  [relais ≥ v3.1.0]
// ============================================================
// Forza n'expose aucun checkpoint : pour découper/visualiser les secteurs sur une
// carte, le relais échantillonne la position monde (PositionX/Z) le long d'un tour
// et l'envoie ICI. UN seul tracé par circuit (track_id = clé primaire) → dédup :
// le premier tour propre gagne, les envois suivants sont ignorés. Best-effort.

const MIN_POINTS = 20;
const MAX_POINTS = 5000;

// Vérifie l'authentification Bearer et renvoie l'utilisateur, ou une réponse d'erreur.
async function authUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Token manquant.' }, { status: 401 }) };
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 401 }) };
  }
  return { user };
}

// GET /api/track-geometry?track_id=X — le relais demande si le tracé existe déjà
// (déduplication). Renvoie { exists: boolean }.
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'track-geometry-get', 60, 60_000);
    if (limited) return limited;

    const auth = await authUser(request);
    if (auth.error) return auth.error;

    const trackId = parseInt(request.nextUrl.searchParams.get('track_id') ?? '', 10);
    if (!Number.isInteger(trackId) || trackId <= 0) {
      return NextResponse.json({ error: 'track_id invalide.' }, { status: 400 });
    }

    const { data } = await supabaseAdmin
      .from('track_geometries')
      .select('track_id')
      .eq('track_id', trackId)
      .maybeSingle();

    return NextResponse.json({ exists: !!data }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// POST /api/track-geometry — le relais envoie le tracé d'un tour complet. Stocké
// une seule fois par circuit (dédup par track_id ; les envois suivants → skipped).
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'track-geometry', 20, 60_000);
    if (limited) return limited;

    const auth = await authUser(request);
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const { track_id, sample_dist_m, lap_time, points, car_ordinal, car_class } = body;

    const trackId = parseInt(track_id, 10);
    if (!Number.isInteger(trackId) || trackId <= 0) {
      return NextResponse.json({ error: 'track_id invalide.' }, { status: 400 });
    }

    // Validation du tracé : trois tableaux (x, z, d) de MÊME longueur, faits de
    // nombres finis, en quantité plausible.
    const xs = points?.x, zs = points?.z, ds = points?.d;
    if (!Array.isArray(xs) || !Array.isArray(zs) || !Array.isArray(ds)) {
      return NextResponse.json({ error: 'points.x/z/d manquants.' }, { status: 400 });
    }
    const n = xs.length;
    if (n < MIN_POINTS || n > MAX_POINTS || zs.length !== n || ds.length !== n) {
      return NextResponse.json({ error: 'Tracé incohérent (longueurs).' }, { status: 400 });
    }
    const finite = (a: unknown[]) => a.every((v) => typeof v === 'number' && Number.isFinite(v));
    if (!finite(xs) || !finite(zs) || !finite(ds)) {
      return NextResponse.json({ error: 'Tracé incohérent (valeurs).' }, { status: 400 });
    }

    // Déduplication : si le circuit a déjà un tracé, on ne le remplace pas.
    const { data: existing } = await supabaseAdmin
      .from('track_geometries')
      .select('track_id')
      .eq('track_id', trackId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, skipped: true }, { status: 200 });
    }

    // Bornes pré-calculées (min/max) pour normaliser le tracé dans un viewBox SVG.
    const bounds = {
      minX: (xs as number[]).reduce((m, v) => Math.min(m, v), Infinity),
      maxX: (xs as number[]).reduce((m, v) => Math.max(m, v), -Infinity),
      minZ: (zs as number[]).reduce((m, v) => Math.min(m, v), Infinity),
      maxZ: (zs as number[]).reduce((m, v) => Math.max(m, v), -Infinity),
    };

    const { data: player } = await supabaseAdmin
      .from('players').select('id').eq('user_id', user.id).single();

    const lapTimeMs  = Number.isFinite(Number(lap_time)) ? Math.round(Number(lap_time) * 1000) : null;
    const sampleDist = Number.isInteger(sample_dist_m) && sample_dist_m > 0 ? sample_dist_m : 5;
    const carOrdinal = Number.isInteger(parseInt(car_ordinal, 10)) ? parseInt(car_ordinal, 10) : null;

    const { error } = await supabaseAdmin.from('track_geometries').insert({
      track_id:         trackId,
      points:           { x: xs, z: zs, d: ds } as unknown as Json,
      point_count:      n,
      sample_dist_m:    sampleDist,
      lap_time_ms:      lapTimeMs,
      bounds:           bounds as unknown as Json,
      car_ordinal:      carOrdinal,
      car_class:        typeof car_class === 'string' ? car_class : null,
      source_player_id: player?.id ?? null,
    });

    // Conflit de clé (deux relais en même temps sur un circuit neuf) → déjà là = ok.
    if (error) {
      return NextResponse.json({ success: true, skipped: true }, { status: 200 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
