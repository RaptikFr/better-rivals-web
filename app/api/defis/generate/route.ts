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

  // Extraire les composantes Paris sans parsing de chaîne
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone:     'Europe/Paris',
    year:         'numeric',
    month:        '2-digit',
    day:          '2-digit',
    weekday:      'short',
    timeZoneName: 'shortOffset',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));

  const year  = parseInt(parts.year);
  const month = parseInt(parts.month) - 1; // 0-indexed pour Date.UTC
  const day   = parseInt(parts.day);

  // Jour de la semaine Paris (0=dim, 1=lun, ..., 6=sam)
  const DOW: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const dayOfWeek = DOW[parts.weekday] ?? 0;

  // Décalage Paris en heures (+2 CEST, +1 CET) depuis "GMT+2" ou "GMT+1"
  const tzMatch    = (parts.timeZoneName ?? '').match(/GMT([+-])(\d+)/);
  const parisOffset = tzMatch ? (tzMatch[1] === '+' ? 1 : -1) * parseInt(tzMatch[2]) : 1;

  const daysFromMonday  = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  // Date.UTC gère les overflow/underflow de jours et d'heures automatiquement
  // Dimanche 23:59:59 Paris = dimanche (23 - parisOffset):59:59 UTC
  const weekEnd = new Date(Date.UTC(year, month, day + daysUntilSunday, 23 - parisOffset, 59, 59, 999));
  // Lundi 00:00:00 Paris = (lundi) (0 - parisOffset):00:00 UTC = dimanche 22:00 ou 23:00 UTC
  const weekStart = new Date(Date.UTC(year, month, day - daysFromMonday, -parisOffset, 0, 0, 0));

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
    const TYPES_EXCLUS = ['Course tous chemins', 'Cross-country', 'Course de drag'];

    const { data: tracks, error: tracksError } = await supabaseAdmin
      .from('tracks')
      .select('id, name')
      .eq('status', 'approved')
      .not('type', 'in', `(${TYPES_EXCLUS.map(t => `"${t}"`).join(',')})`);

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
