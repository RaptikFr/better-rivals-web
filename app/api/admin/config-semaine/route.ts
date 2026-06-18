import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';
import { fetchAllRows } from '@/lib/fetchAllRows';

export const dynamic = 'force-dynamic';

interface ConfigCandidate {
  track_id:    number;
  track_name:  string;
  car_ordinal: number;
  car_label:   string;
  car_class:   string;
  drivetrain:  string;
  participants: number; // pilotes distincts ayant un temps sur cette config
}

// ── GET : config active + configs candidates (celles qui ont des temps) ──
// Réservé à l'admin : sert à choisir une config de la semaine qui a déjà de
// l'activité (sinon le défi démarre vide).
export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  try {
    const nowIso = new Date().toISOString();

    const [activeRes, lapsRes] = await Promise.all([
      supabaseAdmin
        .from('weekly_config')
        .select('id, track_id, car_ordinal, car_class, drivetrain, starts_at, ends_at')
        .lte('starts_at', nowIso)
        .gt('ends_at', nowIso)
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      fetchAllRows<{ track_id: number; car_ordinal: number; car_class: string; drivetrain: string; player_id: string }>(
        (from, to) =>
          supabaseAdmin
            .from('lap_times')
            .select('track_id, car_ordinal, car_class, drivetrain, player_id')
            .order('id')
            .range(from, to),
      ),
    ]);

    // Agrégation des configs distinctes + nb de pilotes (volume = pertinence).
    const byConfig = new Map<string, { track_id: number; car_ordinal: number; car_class: string; drivetrain: string; players: Set<string> }>();
    for (const l of lapsRes.data ?? []) {
      const key = `${l.track_id}|${l.car_ordinal}|${l.car_class}|${l.drivetrain}`;
      let c = byConfig.get(key);
      if (!c) {
        c = { track_id: l.track_id, car_ordinal: l.car_ordinal, car_class: l.car_class, drivetrain: l.drivetrain, players: new Set() };
        byConfig.set(key, c);
      }
      c.players.add(l.player_id);
    }

    const ranked = [...byConfig.values()]
      .sort((a, b) => b.players.size - a.players.size)
      .slice(0, 60);

    // Enrichissement des candidates retenues (noms de circuits + libellés voitures).
    const trackIds    = [...new Set(ranked.map(c => c.track_id))];
    const carOrdinals = [...new Set(ranked.map(c => c.car_ordinal))];
    const [tracksRes, carsRes] = await Promise.all([
      supabaseAdmin.from('tracks').select('id, name').in('id', trackIds),
      supabaseAdmin.from('cars').select('car_ordinal, manufacturer, name, year').in('car_ordinal', carOrdinals),
    ]);
    const trackById = new Map((tracksRes.data ?? []).map(t => [t.id, t.name]));
    const carByOrd  = new Map((carsRes.data ?? []).map(c => [c.car_ordinal, c]));

    const candidates: ConfigCandidate[] = ranked.map(c => {
      const car = carByOrd.get(c.car_ordinal);
      return {
        track_id:    c.track_id,
        track_name:  trackById.get(c.track_id) ?? `Circuit #${c.track_id}`,
        car_ordinal: c.car_ordinal,
        car_label:   car ? `${car.year ?? ''} ${car.manufacturer ?? ''} ${car.name ?? ''}`.trim() || `Voiture #${c.car_ordinal}` : `Voiture #${c.car_ordinal}`,
        car_class:   c.car_class,
        drivetrain:  c.drivetrain,
        participants: c.players.size,
      };
    });

    return NextResponse.json({ active: activeRes.data ?? null, candidates }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── POST : poser une nouvelle config de la semaine ──
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { track_id, car_ordinal, car_class, drivetrain, days } = body;

    if (typeof track_id    !== 'number' ||
        typeof car_ordinal !== 'number' ||
        typeof car_class   !== 'string' || !car_class ||
        typeof drivetrain  !== 'string' || !drivetrain) {
      return NextResponse.json({ error: 'Config incomplète.' }, { status: 400 });
    }
    const dureeJours = typeof days === 'number' && days >= 1 && days <= 31 ? days : 7;

    const startsAt = new Date();
    const endsAt   = new Date(startsAt.getTime() + dureeJours * 24 * 60 * 60 * 1000);

    const { data, error } = await supabaseAdmin
      .from('weekly_config')
      .insert([{
        track_id,
        car_ordinal,
        car_class,
        drivetrain,
        starts_at: startsAt.toISOString(),
        ends_at:   endsAt.toISOString(),
      }])
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
