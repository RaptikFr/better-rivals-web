import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SECRET_API_TOKEN = "MotDePasseForza2026";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SECRET_API_TOKEN}`) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      player_id, pin_code, car_id, track_id, lap_time, is_valid,
      drivetrain, car_class, car_pi, num_cylinders 
    } = body;

    if (!is_valid) {
      return NextResponse.json({ error: 'Tour invalide détecté par la télémétrie' }, { status: 400 });
    }

    if (!player_id || !pin_code || !car_id || !track_id || !lap_time) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 });
    }

    // --- VÉRIFICATION DU JOUEUR ---
    let { data: player } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('pseudo', player_id)
      .single();

    let finalPlayerId = player?.id;

    if (player) {
      if (player.pin_code !== pin_code) {
        return NextResponse.json({ error: 'Code PIN incorrect pour ce Gamertag.' }, { status: 401 });
      }
    } else {
      const { data: newPlayer, error: createError } = await supabaseAdmin
        .from('players')
        .insert([{ pseudo: player_id, pin_code: pin_code }])
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: 'Impossible de créer le profil joueur.' }, { status: 500 });
      }
      finalPlayerId = newPlayer.id;
    }

    // --- GESTION DU CLASSEMENT PAR CONFIGURATION DE VOITURE ---
    const newTimeMs = Math.round(lap_time * 1000);
    const numTrackId = parseInt(track_id);
    const numCarOrdinal = parseInt(car_id);

    // On cherche un enregistrement existant qui correspond STRICTEMENT à cette configuration
    const { data: existingTime } = await supabaseAdmin
      .from('lap_times')
      .select('id, time_ms')
      .eq('player_id', finalPlayerId)
      .eq('track_id', numTrackId)
      .eq('car_ordinal', numCarOrdinal)
      .eq('car_class', car_class)
      .eq('drivetrain', drivetrain)
      .single();

    if (existingTime) {
      // Si cette configuration exacte existe déjà, on compare les temps pour l'écraser
      if (newTimeMs < existingTime.time_ms) {
        
        const { data, error } = await supabaseAdmin
          .from('lap_times')
          .update({
            time_ms: newTimeMs,
            verified: is_valid,
            car_pi: car_pi,
            num_cylinders: num_cylinders
          })
          .eq('id', existingTime.id)
          .select();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: "Record écrasé pour cette configuration !", data }, { status: 200 });

      } else {
        return NextResponse.json({ success: true, message: "Chrono ignoré : ton record avec cette config est meilleur." }, { status: 200 });
      }

    } else {
      // Si c'est une nouvelle voiture, une nouvelle classe ou une autre transmission, on crée une nouvelle ligne
      const { data, error } = await supabaseAdmin
        .from('lap_times')
        .insert([
          { 
            player_id: finalPlayerId,
            car_ordinal: numCarOrdinal,
            track_id: numTrackId,
            time_ms: newTimeMs,
            verified: is_valid,
            drivetrain: drivetrain,
            car_class: car_class,
            car_pi: car_pi,
            num_cylinders: num_cylinders
          }
        ])
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Nouveau chrono enregistré pour cette configuration !", data }, { status: 200 });
    }

  } catch (err) {
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}