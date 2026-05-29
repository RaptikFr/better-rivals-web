import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAR_CLASSES = ['D', 'C', 'B', 'A', 'S1', 'S2', 'R', 'X'];

function getWeekBounds() {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    week_start: monday.toISOString(),
    week_end:   sunday.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.DEFI_SECRET_TOKEN;
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    // Récupère tous les circuits éligibles (approuvés, pas de sprint)
    const { data: tracks, error: tracksError } = await supabaseAdmin
      .from('tracks')
      .select('id, name')
      .eq('status', 'approved')
      .eq('is_sprint', false);

    if (tracksError || !tracks?.length) {
      return NextResponse.json({ error: 'Aucun circuit disponible.' }, { status: 500 });
    }

    // Récupère le dernier défi pour éviter la répétition
    const { data: lastDefi } = await supabaseAdmin
      .from('defis')
      .select('track_id')
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    const eligibleTracks = lastDefi
      ? tracks.filter(t => t.id !== lastDefi.track_id)
      : tracks;

    const pool = eligibleTracks.length > 0 ? eligibleTracks : tracks;
    const track = pool[Math.floor(Math.random() * pool.length)];
    const car_class = CAR_CLASSES[Math.floor(Math.random() * CAR_CLASSES.length)];

    const { week_start, week_end } = getWeekBounds();

    const { data: defi, error: insertError } = await supabaseAdmin
      .from('defis')
      .insert([{ track_id: track.id, car_class, week_start, week_end }])
      .select('*, tracks(name)')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ defi }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
