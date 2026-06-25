import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';
import { parsePerfInput } from '@/lib/tunePerf';
import type { Json } from '@/types/database.types';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'tune-setups', 10, 10 * 60_000);
    if (limited) return limited;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });
    }

    const body = await request.json();
    const { car_ordinal, share_code, label, track_id, track_type, is_original, perf_stats: rawPerf } = body;

    if (!car_ordinal || !share_code) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }

    let perf_stats: Json | null = null;
    if (rawPerf !== undefined && rawPerf !== null) {
      const parsed = parsePerfInput(rawPerf);
      if ('error' in parsed) {
        return NextResponse.json({ error: `Profil de performances invalide : ${parsed.error}` }, { status: 400 });
      }
      perf_stats = parsed as unknown as Json;
    }

    // Vérification de conflit : ce share_code est-il déjà revendiqué comme original par quelqu'un d'autre ?
    if (is_original) {
      const { data: conflict } = await supabaseAdmin
        .from('tune_setups')
        .select('id')
        .eq('share_code', share_code.trim())
        .eq('is_original', true)
        .neq('player_id', player.id)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json({
          error: "Ce code de réglage est déjà revendiqué comme original par un autre joueur. Si tu penses qu'il y a une erreur, contacte-nous via le formulaire de contact ou sur notre Discord."
        }, { status: 409 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('tune_setups')
      .insert([{
        player_id:   player.id,
        car_ordinal,
        share_code:  share_code.trim(),
        label:       label?.trim() || null,
        track_id:    track_id || null,
        track_type:  track_type || null,
        is_original: is_original ?? false,
        perf_stats:  perf_stats ?? null,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
