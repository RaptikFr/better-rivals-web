import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // --- VÉRIFICATION DU TOKEN JWT ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Vérifie le JWT Supabase et récupère l'utilisateur
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
      drivetrain, car_class, car_pi, num_cylinders
    } = body;

    if (!is_valid) {
      return NextResponse.json({ error: 'Tour invalide détecté par la télémétrie.' }, { status: 400 });
    }

    if (!car_id || !track_id || !lap_time) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }

    // --- GESTION DU CLASSEMENT ---
    const newTimeMs    = Math.round(lap_time * 1000);
    const numTrackId   = parseInt(track_id);
    const numCarOrdinal = parseInt(car_id);

    // Cherche un temps existant pour cette config exacte
    const { data: existingTime } = await supabaseAdmin
      .from('lap_times')
      .select('id, time_ms')
      .eq('player_id',  player.id)
      .eq('track_id',   numTrackId)
      .eq('car_ordinal', numCarOrdinal)
      .eq('car_class',  car_class)
      .eq('drivetrain', drivetrain)
      .single();

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
