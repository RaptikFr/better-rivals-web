import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';
import { traceValide } from '@/lib/lap-validation';
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
      supabaseAdmin.from('lap_times').select('id, player_id').eq('id', lap_time_id).maybeSingle(),
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
    return NextResponse.json({ success: true, point_count: trace.d.length }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
