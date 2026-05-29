import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatTime(ms: number): string {
  const minutes      = Math.floor(ms / 60000);
  const seconds      = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

async function notifierRecordBattu(opts: {
  playerId:   string;
  pseudo:     string;
  newTimeMs:  number;
  trackId:    number;
  carOrdinal: number;
  carClass:   string;
  drivetrain: string;
  trackName:  string;
  carLabel:   string;
}) {
  // Nom de la voiture depuis la DB (source de vérité, car déjà insérée/mise à jour)
  const { data: carData } = await supabaseAdmin
    .from('cars')
    .select('manufacturer, name, year')
    .eq('car_ordinal', opts.carOrdinal)
    .maybeSingle();
  const carLabel = carData
    ? `${carData.year ?? ''} ${carData.manufacturer ?? ''} ${carData.name ?? ''}`.trim()
    : opts.carLabel;

  // Niveau 1 : même voiture + classe + transmission (config exacte)
  const { data: exact } = await supabaseAdmin
    .from('lap_times')
    .select('time_ms, player_id')
    .eq('track_id',    opts.trackId)
    .eq('car_ordinal', opts.carOrdinal)
    .eq('car_class',   opts.carClass)
    .eq('drivetrain',  opts.drivetrain)
    .neq('player_id',  opts.playerId)
    .order('time_ms', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (exact && opts.newTimeMs < exact.time_ms) {
    const params = new URLSearchParams({
      track_id:  String(opts.trackId),
      class:     opts.carClass,
      drivetrain: opts.drivetrain,
      car:       carLabel,
    });
    await supabaseAdmin.from('notifications').insert([{
      player_id: exact.player_id,
      message:   `🏆 Ton record sur ${opts.trackName} avec ${carLabel} en ${opts.carClass}/${opts.drivetrain} a été battu par ${opts.pseudo} (${formatTime(opts.newTimeMs)})`,
      type:      'exact',
      link:      `/classements?${params.toString()}`,
      read:      false,
    }]);
    return;
  }

  // Niveau 2 : même voiture + classe, transmission différente
  const { data: diffDrive } = await supabaseAdmin
    .from('lap_times')
    .select('time_ms, player_id, drivetrain')
    .eq('track_id',    opts.trackId)
    .eq('car_ordinal', opts.carOrdinal)
    .eq('car_class',   opts.carClass)
    .neq('drivetrain', opts.drivetrain)
    .neq('player_id',  opts.playerId)
    .order('time_ms', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (diffDrive && opts.newTimeMs < diffDrive.time_ms) {
    const params = new URLSearchParams({
      track_id: String(opts.trackId),
      class:    opts.carClass,
      car:      carLabel,
    });
    await supabaseAdmin.from('notifications').insert([{
      player_id: diffDrive.player_id,
      message:   `🔄 Ton record sur ${opts.trackName} avec ${carLabel} en ${opts.carClass}/${diffDrive.drivetrain} a été battu par ${opts.pseudo} en ${opts.drivetrain} (${formatTime(opts.newTimeMs)})`,
      type:      'drivetrain',
      link:      `/classements?${params.toString()}`,
      read:      false,
    }]);
    return;
  }

  // Niveau 3 : même classe, voiture différente
  const { data: diffCar } = await supabaseAdmin
    .from('lap_times')
    .select('time_ms, player_id')
    .eq('track_id',   opts.trackId)
    .eq('car_class',  opts.carClass)
    .neq('car_ordinal', opts.carOrdinal)
    .neq('player_id', opts.playerId)
    .order('time_ms', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (diffCar && opts.newTimeMs < diffCar.time_ms) {
    const params = new URLSearchParams({
      track_id: String(opts.trackId),
      class:    opts.carClass,
    });
    await supabaseAdmin.from('notifications').insert([{
      player_id: diffCar.player_id,
      message:   `⚡ Ton record en classe ${opts.carClass} sur ${opts.trackName} a été battu par ${opts.pseudo} avec ${carLabel} (${formatTime(opts.newTimeMs)})`,
      type:      'class',
      link:      `/classements?${params.toString()}`,
      read:      false,
    }]);
  }
}

// Vitesse max ~360 km/h = 100 m/s, vitesse min ~72 km/h = 20 m/s
// Marge de 20% pour absorber les imprécisions
function validerTemps(lapTimeMs: number, lengthKm: number | null, isSprint: boolean): boolean {
  if (isSprint) return true; // Pas de validation de borne pour les sprints
  if (!lengthKm || lengthKm <= 0) return true;
  const minMs = (lengthKm * 1000 / 100) * 1000 * 0.8;
  const maxMs = (lengthKm * 1000 / 20)  * 1000 * 1.2;
  return lapTimeMs >= minMs && lapTimeMs <= maxMs;
}

export async function POST(request: NextRequest) {
  try {
    // --- VÉRIFICATION DU TOKEN JWT ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide ou expiré. Reconnecte-toi.' }, { status: 401 });
    }

    // --- RÉCUPÉRATION DU JOUEUR ---
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, pseudo')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });
    }

    // --- VALIDATION DES DONNÉES ---
    const body = await request.json();
    const {
      car_id, track_id, lap_time, is_valid,
      drivetrain, car_class, car_pi, num_cylinders,
      car_manufacturer, car_name, car_year,
      is_sprint,
    } = body;

    if (!is_valid) {
      return NextResponse.json({ error: 'Tour invalide détecté par la télémétrie.' }, { status: 400 });
    }

    if (!car_id || !track_id || !lap_time) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }

    const newTimeMs     = Math.round(lap_time * 1000);
    const numTrackId    = parseInt(track_id);
    const numCarOrdinal = parseInt(car_id);

    // --- VALIDATION DU TEMPS PAR RAPPORT À LA LONGUEUR DU CIRCUIT ---
    const { data: trackData } = await supabaseAdmin
      .from('tracks')
      .select('length_km, name')
      .eq('id', numTrackId)
      .maybeSingle();

    if (trackData && !validerTemps(newTimeMs, trackData.length_km, is_sprint ?? false)) {
      const minS = ((trackData.length_km * 1000 / 100) * 0.8).toFixed(0);
      const maxS = ((trackData.length_km * 1000 / 20)  * 1.2).toFixed(0);
      return NextResponse.json({
        error: `Temps aberrant pour ${trackData.name} (${trackData.length_km} km). Attendu entre ${Math.floor(Number(minS)/60)}:${String(Number(minS)%60).padStart(2,'0')} et ${Math.floor(Number(maxS)/60)}:${String(Number(maxS)%60).padStart(2,'0')}.`
      }, { status: 400 });
    }

    // --- GESTION DE LA VOITURE ---
    const { data: existingCar } = await supabaseAdmin
      .from('cars')
      .select('car_ordinal')
      .eq('car_ordinal', numCarOrdinal)
      .maybeSingle();

    if (!existingCar) {
      await supabaseAdmin
        .from('cars')
        .insert([{
          car_ordinal:  numCarOrdinal,
          manufacturer: car_manufacturer ?? 'Inconnu',
          name:         car_name         ?? `Voiture #${numCarOrdinal}`,
          year:         car_year         ?? 0,
        }]);
    } else if (car_manufacturer && car_name && car_year) {
      await supabaseAdmin
        .from('cars')
        .update({ manufacturer: car_manufacturer, name: car_name, year: car_year })
        .eq('car_ordinal', numCarOrdinal)
        .eq('manufacturer', 'Inconnu');
    }

    const trackName = trackData?.name ?? `Circuit #${numTrackId}`;
    const carLabel  = `${car_year ?? ''} ${car_manufacturer ?? ''} ${car_name ?? ''}`.trim() || `Voiture #${numCarOrdinal}`;
    const notifOpts = {
      playerId:   player.id,
      pseudo:     player.pseudo,
      trackId:    numTrackId,
      carOrdinal: numCarOrdinal,
      carClass:   car_class,
      drivetrain,
      trackName,
      carLabel,
    };

    // --- GESTION DU CLASSEMENT ---
    const { data: existingTime } = await supabaseAdmin
      .from('lap_times')
      .select('id, time_ms, car_pi')
      .eq('player_id',   player.id)
      .eq('track_id',    numTrackId)
      .eq('car_ordinal', numCarOrdinal)
      .eq('car_class',   car_class)
      .eq('drivetrain',  drivetrain)
      .maybeSingle();

    if (existingTime) {
      if (newTimeMs < existingTime.time_ms) {
        await supabaseAdmin.from('lap_times_history').insert([{
          player_id:   player.id,
          car_ordinal: numCarOrdinal,
          car_class,
          drivetrain,
          track_id:    numTrackId,
          time_ms:     existingTime.time_ms,
          car_pi:      existingTime.car_pi,
        }]);

        const { data, error } = await supabaseAdmin
          .from('lap_times')
          .update({ time_ms: newTimeMs, verified: is_valid, car_pi, num_cylinders, previous_time_ms: existingTime.time_ms })
          .eq('id', existingTime.id)
          .select();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        await notifierRecordBattu({ ...notifOpts, newTimeMs });
        return NextResponse.json({ success: true, message: "Nouveau record ! 🏆", data }, { status: 200 });
      } else {
        return NextResponse.json({ success: true, message: "Ton record avec cette config est déjà meilleur." }, { status: 200 });
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from('lap_times')
        .insert([{
          player_id:    player.id,
          car_ordinal:  numCarOrdinal,
          track_id:     numTrackId,
          time_ms:      newTimeMs,
          verified:     is_valid,
          drivetrain,
          car_class,
          car_pi,
          num_cylinders,
          ...(is_sprint !== undefined && { is_sprint: !!is_sprint }),
        }])
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await notifierRecordBattu({ ...notifOpts, newTimeMs });
      return NextResponse.json({ success: true, message: "Chrono enregistré !", data }, { status: 200 });
    }

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const trackId = request.nextUrl.searchParams.get('track_id');

    if (!trackId) {
      return NextResponse.json({ error: 'Paramètre track_id manquant.' }, { status: 400 });
    }

    // Récupère le meilleur temps par joueur sur ce circuit
    // On groupe par player_id + car_class + drivetrain pour avoir
    // les meilleurs temps par configuration
    const { data, error } = await supabaseAdmin
      .from('lap_times')
      .select(`
        id, time_ms, car_class, car_pi, drivetrain, car_ordinal,
        players ( pseudo ),
        cars ( manufacturer, name, year )
      `)
      .eq('track_id', parseInt(trackId))
      .order('time_ms', { ascending: true })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Garde uniquement le meilleur temps par joueur + classe + transmission
    const seen = new Set<string>();
    const best = (data ?? []).filter(lap => {
      const key = `${(lap.players as { pseudo: string }[] | null)?.[0]?.pseudo}_${lap.car_ordinal}_${lap.car_class}_${lap.drivetrain}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ times: best }, { status: 200 });

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}