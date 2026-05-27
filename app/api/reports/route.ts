import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const { data: reporter } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!reporter) {
      return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });
    }

    const { lap_time_id, raison, details } = await request.json();
    if (!lap_time_id || !raison) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }

    const { data: lapTime } = await supabaseAdmin
      .from('lap_times')
      .select('id, player_id')
      .eq('id', lap_time_id)
      .single();
    if (!lapTime) {
      return NextResponse.json({ error: 'Temps introuvable.' }, { status: 404 });
    }

    if (lapTime.player_id === reporter.id) {
      return NextResponse.json({ error: 'Tu ne peux pas signaler ton propre temps.' }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('lap_time_id', lap_time_id)
      .eq('reporter_player_id', reporter.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Tu as déjà signalé ce temps.' }, { status: 409 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('reports')
      .insert([{
        reporter_player_id: reporter.id,
        lap_time_id,
        raison,
        details: details || null,
        status: 'non_lu',
      }]);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
