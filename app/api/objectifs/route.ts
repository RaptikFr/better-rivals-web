import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { utilisateurDepuisAuthHeader } from '@/lib/auth-token';
import { rateLimit } from '@/lib/rate-limit';
import { objectifConfigKey, type ObjectifView } from '@/lib/objectifs';

export const dynamic = 'force-dynamic';

// Résout le joueur courant à partir du JWT. Retourne soit l'id du joueur,
// soit une réponse d'erreur prête à renvoyer.
async function resoudreJoueur(
  request: NextRequest,
): Promise<{ playerId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) };
  }
  const user = await utilisateurDepuisAuthHeader(authHeader);
  if (!user) {
    return { error: NextResponse.json({ error: 'Session invalide.' }, { status: 401 }) };
  }
  const { data: player } = await supabaseAdmin
    .from('players').select('id').eq('user_id', user.id).single();
  if (!player) {
    return { error: NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 }) };
  }
  return { playerId: player.id };
}

// ── GET : mes objectifs, enrichis des temps en direct (cible + le mien) ──
export async function GET(request: NextRequest) {
  try {
    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId } = resolu;

    const { data: objectifs, error } = await supabaseAdmin
      .from('objectifs')
      .select('id, target_player_id, track_id, car_ordinal, car_class, drivetrain, achieved_at, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!objectifs || objectifs.length === 0) {
      return NextResponse.json({ objectifs: [] }, { status: 200 });
    }

    const targetIds    = [...new Set(objectifs.map(o => o.target_player_id))];
    const trackIds     = [...new Set(objectifs.map(o => o.track_id))];
    const carOrdinals  = [...new Set(objectifs.map(o => o.car_ordinal))];
    const playerIdsForLaps = [...new Set([playerId, ...targetIds])];

    // Lectures d'enrichissement en parallèle : temps (moi + cibles), pseudos,
    // noms de circuits, libellés voitures. On filtre au plus serré possible.
    const [lapsRes, pseudosRes, tracksRes, carsRes] = await Promise.all([
      supabaseAdmin
        .from('lap_times')
        .select('player_id, track_id, car_ordinal, car_class, drivetrain, time_ms')
        .in('player_id', playerIdsForLaps)
        .in('track_id', trackIds)
        .in('car_ordinal', carOrdinals),
      supabaseAdmin.from('players').select('id, pseudo').in('id', targetIds),
      supabaseAdmin.from('tracks').select('id, name').in('id', trackIds),
      supabaseAdmin.from('cars').select('car_ordinal, manufacturer, name, year').in('car_ordinal', carOrdinals),
    ]);

    // Index des temps par (player_id + config) pour un lookup direct.
    const timeByKey = new Map<string, number>();
    for (const l of lapsRes.data ?? []) {
      timeByKey.set(`${l.player_id}|${objectifConfigKey(l)}`, l.time_ms);
    }
    const pseudoById = new Map((pseudosRes.data ?? []).map(p => [p.id, p.pseudo]));
    const trackById  = new Map((tracksRes.data ?? []).map(t => [t.id, t.name]));
    const carByOrd   = new Map((carsRes.data ?? []).map(c => [c.car_ordinal, c]));

    const result: ObjectifView[] = objectifs.map(o => {
      const cfg        = objectifConfigKey(o);
      const targetTime = timeByKey.get(`${o.target_player_id}|${cfg}`) ?? null;
      const myTime     = timeByKey.get(`${playerId}|${cfg}`) ?? null;
      const car        = carByOrd.get(o.car_ordinal);
      const carLabel   = car
        ? `${car.year ?? ''} ${car.manufacturer ?? ''} ${car.name ?? ''}`.trim() || `Voiture #${o.car_ordinal}`
        : `Voiture #${o.car_ordinal}`;
      const gap      = myTime !== null && targetTime !== null ? myTime - targetTime : null;
      const achieved = o.achieved_at !== null || (gap !== null && gap <= 0);
      return {
        id:             o.id,
        target_pseudo:  pseudoById.get(o.target_player_id) ?? 'Inconnu',
        track_id:       o.track_id,
        track_name:     trackById.get(o.track_id) ?? `Circuit #${o.track_id}`,
        car_ordinal:    o.car_ordinal,
        car_label:      carLabel,
        car_class:      o.car_class,
        drivetrain:     o.drivetrain,
        // Si le pilote visé n'a plus de temps sur la config, on retombe sur 0
        // (objectif orphelin) ; l'UI l'affiche comme « cible disparue ».
        target_time_ms: targetTime ?? 0,
        my_time_ms:     myTime,
        gap_ms:         gap,
        achieved,
        achieved_at:    o.achieved_at,
        created_at:     o.created_at,
      };
    });

    return NextResponse.json({ objectifs: result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── POST : créer un objectif (battre tel pilote sur telle config) ──
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'objectifs', 30, 10 * 60_000);
    if (limited) return limited;

    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId } = resolu;

    const body = await request.json();
    const { target_player_id, track_id, car_ordinal, car_class, drivetrain } = body;

    if (typeof target_player_id !== 'string' ||
        typeof track_id        !== 'number' ||
        typeof car_ordinal     !== 'number' ||
        typeof car_class       !== 'string' || !car_class ||
        typeof drivetrain      !== 'string' || !drivetrain) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }
    if (target_player_id === playerId) {
      return NextResponse.json({ error: 'Tu ne peux pas te fixer comme objectif de te battre toi-même.' }, { status: 400 });
    }

    // Le pilote visé doit réellement avoir un temps sur cette config.
    const { data: targetLap } = await supabaseAdmin
      .from('lap_times')
      .select('time_ms')
      .eq('player_id', target_player_id)
      .eq('track_id', track_id)
      .eq('car_ordinal', car_ordinal)
      .eq('car_class', car_class)
      .eq('drivetrain', drivetrain)
      .maybeSingle();
    if (!targetLap) {
      return NextResponse.json({ error: "Ce pilote n'a pas de temps sur cette configuration." }, { status: 404 });
    }

    // Déjà atteint à la création ? (mon temps actuel bat déjà la cible)
    const { data: myLap } = await supabaseAdmin
      .from('lap_times')
      .select('time_ms')
      .eq('player_id', playerId)
      .eq('track_id', track_id)
      .eq('car_ordinal', car_ordinal)
      .eq('car_class', car_class)
      .eq('drivetrain', drivetrain)
      .maybeSingle();
    const dejaAtteint = !!myLap && myLap.time_ms <= targetLap.time_ms;

    const { data, error } = await supabaseAdmin
      .from('objectifs')
      .insert([{
        player_id:        playerId,
        target_player_id,
        track_id,
        car_ordinal,
        car_class,
        drivetrain,
        achieved_at:      dejaAtteint ? new Date().toISOString() : null,
      }])
      .select('id')
      .single();

    // Doublon (contrainte d'unicité) → idempotent, ce n'est pas une erreur.
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, already: true }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id, already_achieved: dejaAtteint }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── DELETE : retirer un objectif, par id OU par config ──
export async function DELETE(request: NextRequest) {
  try {
    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId } = resolu;

    const sp = request.nextUrl.searchParams;
    const id = sp.get('id');

    let query = supabaseAdmin.from('objectifs').delete().eq('player_id', playerId);

    if (id) {
      query = query.eq('id', id);
    } else {
      // Suppression par config (le bouton n'a pas besoin de connaître l'id).
      const trackId    = parseInt(sp.get('track_id') ?? '', 10);
      const carOrdinal = parseInt(sp.get('car_ordinal') ?? '', 10);
      const targetId   = sp.get('target_player_id');
      const carClass   = sp.get('car_class');
      const drivetrain = sp.get('drivetrain');
      if (Number.isNaN(trackId) || Number.isNaN(carOrdinal) || !targetId || !carClass || !drivetrain) {
        return NextResponse.json({ error: 'Identifiant ou config manquant.' }, { status: 400 });
      }
      query = query
        .eq('target_player_id', targetId)
        .eq('track_id', trackId)
        .eq('car_ordinal', carOrdinal)
        .eq('car_class', carClass)
        .eq('drivetrain', drivetrain);
    }

    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
