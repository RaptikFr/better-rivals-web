import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Vitesse max ~360 km/h = 100 m/s, vitesse min ~72 km/h = 20 m/s
// Marge de 20% pour absorber les imprécisions
function validerTemps(lapTimeMs: number, lengthKm: number | null): boolean {
  if (!lengthKm || lengthKm <= 0) return true; // Pas de longueur connue → on accepte
  const minMs = (lengthKm * 1000 / 100) * 1000 * 0.8;  // Temps min avec marge 20%
  const maxMs = (lengthKm * 1000 / 20)  * 1000 * 1.2;  // Temps max avec marge 20%
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
      car_manufacturer, car_name, car_year
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

    if (trackData && !validerTemps(newTimeMs, trackData.length_km)) {
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

    // --- GESTION DU CLASSEMENT ---
    const { data: existingTime } = await supabaseAdmin
      .from('lap_times')
      .select('id, time_ms')
      .eq('player_id',   player.id)
      .eq('track_id',    numTrackId)
      .eq('car_ordinal', numCarOrdinal)
      .eq('car_class',   car_class)
      .eq('drivetrain',  drivetrain)
      .maybeSingle();

    if (existingTime) {
      if (newTimeMs < existingTime.time_ms) {
        const { data, error } = await supabaseAdmin
          .from('lap_times')
          .update({ time_ms: newTimeMs, verified: is_valid, car_pi, num_cylinders })
          .eq('id', existingTime.id)
          .select();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
        }])
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, message: "Chrono enregistré !", data }, { status: 200 });
    }

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}