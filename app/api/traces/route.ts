import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';
import { traceValide, nbSecteurs, secteursDepuisTrace, secteursValides } from '@/lib/lap-validation';
import type { Json } from '@/types/database.types';

export const dynamic = 'force-dynamic';

// POST /api/traces — le relais envoie la trace échantillonnée d'un tour (par
// distance) au moment d'un nouveau meilleur temps. Une trace par lap_time
// (upsert sur lap_time_id). Sert de fondation au delta live (#1), au coach (#3)
// et au copilote de réglage (#5). Voir lap_traces.sql.
export async function POST(request: NextRequest) {
  try {
    // Une trace n'accompagne qu'un nouveau record : débit faible attendu.
    const limited = await rateLimit(request, 'traces', 30, 60_000);
    if (limited) return limited;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 401 });
    }

    const body = await request.json();
    const { lap_time_id, sample_dist_m, samples } = body;

    if (!lap_time_id || typeof lap_time_id !== 'string') {
      return NextResponse.json({ error: 'lap_time_id manquant.' }, { status: 400 });
    }
    const dist = Number(sample_dist_m);
    if (!Number.isFinite(dist) || dist <= 0) {
      return NextResponse.json({ error: 'sample_dist_m invalide.' }, { status: 400 });
    }
    const trace = traceValide(samples);
    if (!trace) {
      return NextResponse.json({ error: 'Trace invalide.' }, { status: 400 });
    }

    // Le joueur ne peut attacher une trace qu'à SON propre tour.
    const [playerRes, lapRes] = await Promise.all([
      supabaseAdmin.from('players').select('id').eq('user_id', user.id).single(),
      supabaseAdmin.from('lap_times').select('id, player_id, track_id, time_ms').eq('id', lap_time_id).maybeSingle(),
    ]);
    const player = playerRes.data;
    const lap    = lapRes.data;
    if (!player) return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });
    if (!lap)    return NextResponse.json({ error: 'Tour introuvable.' }, { status: 404 });
    if (lap.player_id !== player.id) {
      return NextResponse.json({ error: 'Ce tour ne t’appartient pas.' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('lap_traces')
      .upsert(
        {
          lap_time_id,
          sample_dist_m: Math.round(dist),
          point_count:   trace.d.length,
          samples:       trace as unknown as Json,
        },
        { onConflict: 'lap_time_id' },
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Secteurs ÉGAUX EN DISTANCE recalculés depuis la trace (source faisant
    // autorité). On le fait ici plutôt qu'au POST /api/times : la distance de la
    // télémétrie Forza ne correspond pas aux mètres réels (elle plafonne ~5950 m
    // quel que soit le tracé), donc les secteurs envoyés par le relais sont
    // faussés. La trace, elle, donne la distance réelle du tour → découpe juste.
    // Best-effort : un échec ici ne remet pas en cause la trace déjà stockée.
    try {
      const { data: track } = await supabaseAdmin
        .from('tracks').select('length_km').eq('id', lap.track_id).maybeSingle();
      const n = nbSecteurs(track?.length_km);
      const secteurs = secteursDepuisTrace(trace, n, lap.time_ms);
      // Garde-fou : la somme doit retomber sur le temps du tour (sinon on n'écrit
      // pas plutôt que d'afficher un tour théorique incohérent).
      if (secteurs && secteursValides(secteurs.map(ms => ms / 1000), lap.time_ms)) {
        await supabaseAdmin.from('lap_times').update({ sectors_ms: secteurs }).eq('id', lap.id);
      }
    } catch { /* secteurs = bonus, jamais bloquant */ }

    return NextResponse.json({ success: true, point_count: trace.d.length }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// GET /api/traces — trace de référence pour le DELTA LIVE (#1). Le relais la
// charge à la sélection de la config : c'est la trace du PROPRE meilleur temps
// (PB) du joueur sur cette config exacte (track_id + car_ordinal + car_class +
// drivetrain). Le relais interpole ensuite le temps de référence à distance
// égale pour afficher « +0,3s vs PB ». Renvoie 204 si le joueur n'a pas encore
// de trace sur la config (PB sans trace, ou aucun PB) → pas de fantôme à
// afficher, le relais désactive simplement l'overlay.
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'traces-get', 60, 60_000);
    if (limited) return limited;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 401 });
    }

    const params     = request.nextUrl.searchParams;
    const trackId    = parseInt(params.get('track_id')    ?? '', 10);
    const carOrdinal = parseInt(params.get('car_ordinal') ?? '', 10);
    const carClass   = params.get('car_class')  ?? '';
    const drivetrain = params.get('drivetrain') ?? '';
    if (!Number.isFinite(trackId) || !Number.isFinite(carOrdinal) || !carClass || !drivetrain) {
      return NextResponse.json({ error: 'Paramètres de config incomplets.' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players').select('id').eq('user_id', user.id).single();
    if (!player) return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });

    // PB du joueur sur la config exacte (au plus une ligne : unicité par config).
    const { data: lap } = await supabaseAdmin
      .from('lap_times')
      .select('id, time_ms')
      .eq('player_id',   player.id)
      .eq('track_id',    trackId)
      .eq('car_ordinal', carOrdinal)
      .eq('car_class',   carClass)
      .eq('drivetrain',  drivetrain)
      .maybeSingle();
    if (!lap) return new NextResponse(null, { status: 204 }); // pas de PB sur cette config

    const { data: trace } = await supabaseAdmin
      .from('lap_traces')
      .select('sample_dist_m, point_count, samples')
      .eq('lap_time_id', lap.id)
      .maybeSingle();
    if (!trace) return new NextResponse(null, { status: 204 }); // PB sans trace enregistrée

    return NextResponse.json({
      lap_time_id:   lap.id,
      time_ms:       lap.time_ms,
      sample_dist_m: trace.sample_dist_m,
      point_count:   trace.point_count,
      samples:       trace.samples,
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
