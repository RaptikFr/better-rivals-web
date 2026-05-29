import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAR_CLASSES = ['D', 'C', 'B', 'A', 'S1', 'S2', 'R'];

function getWeekBounds() {
  const now = new Date();

  // sv-SE donne "YYYY-MM-DD HH:mm:ss" — format ISO fiable sur tous les environnements Node
  const parisStr  = now.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' });
  const parisAsUtc = new Date(parisStr.replace(' ', 'T') + 'Z');
  const offsetMs   = parisAsUtc.getTime() - now.getTime(); // ex : +7 200 000 ms (CEST)

  // Date actuelle vue depuis Paris (manipulée comme si c'était UTC)
  const nowParis   = new Date(now.getTime() + offsetMs);
  const dayOfWeek  = nowParis.getUTCDay(); // 0=dim, 1=lun, ..., 6=sam en heure Paris

  const daysFromMonday  = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  // Dimanche 23:59:59 heure Paris → convertit en UTC réel
  const weekEndParis = new Date(nowParis);
  weekEndParis.setUTCDate(nowParis.getUTCDate() + daysUntilSunday);
  weekEndParis.setUTCHours(23, 59, 59, 999);
  const weekEnd = new Date(weekEndParis.getTime() - offsetMs);

  // Lundi 00:00:00 heure Paris → convertit en UTC réel
  const weekStartParis = new Date(nowParis);
  weekStartParis.setUTCDate(nowParis.getUTCDate() - daysFromMonday);
  weekStartParis.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(weekStartParis.getTime() - offsetMs);

  return {
    week_start: weekStart.toISOString(),
    week_end:   weekEnd.toISOString(),
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

    // Pioche une voiture aléatoire dans la classe choisie
    const { data: cars, error: carsError } = await supabaseAdmin
      .from('cars')
      .select('id, manufacturer, name, year')
      .eq('initial_class', car_class)
      .not('car_ordinal', 'is', null);

    if (carsError || !cars?.length) {
      return NextResponse.json({ error: 'Aucune voiture disponible pour cette classe.' }, { status: 500 });
    }

    const car = cars[Math.floor(Math.random() * cars.length)];

    const { week_start, week_end } = getWeekBounds();

    const { data: defi, error: insertError } = await supabaseAdmin
      .from('defis')
      .insert([{ track_id: track.id, car_class, car_id: car.id, week_start, week_end }])
      .select('*, tracks(name), cars(manufacturer, name, year)')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ defi }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
