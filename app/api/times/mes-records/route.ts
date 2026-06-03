import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide ou expiré. Reconnecte-toi.' }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });
    }

    const carOrdinalParam = request.nextUrl.searchParams.get('car_ordinal');
    const carClass        = request.nextUrl.searchParams.get('car_class');

    if (!carOrdinalParam || !carClass) {
      return NextResponse.json({ error: 'Paramètres car_ordinal et car_class requis.' }, { status: 400 });
    }

    const carOrdinal = parseInt(carOrdinalParam, 10);
    if (isNaN(carOrdinal)) {
      return NextResponse.json({ error: 'car_ordinal doit être un nombre.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('lap_times')
      .select('track_id, time_ms')
      .eq('player_id',   player.id)
      .eq('car_ordinal', carOrdinal)
      .eq('car_class',   carClass)
      .order('time_ms',  { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Garde le meilleur temps par circuit (plusieurs transmissions possibles)
    const bestByTrack = new Map<number, number>();
    for (const row of data ?? []) {
      const current = bestByTrack.get(row.track_id);
      if (current === undefined || row.time_ms < current) {
        bestByTrack.set(row.track_id, row.time_ms);
      }
    }

    const records = Array.from(bestByTrack.entries()).map(([track_id, time_ms]) => ({ track_id, time_ms }));

    return NextResponse.json({ records }, { status: 200 });

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
