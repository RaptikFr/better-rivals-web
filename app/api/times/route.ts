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
    const { player_id, pin_code, car_id, track_id, lap_time, is_valid } = body;

    if (!is_valid) {
      return NextResponse.json({ error: 'Tour invalide détecté par la télémétrie' }, { status: 400 });
    }

    if (!player_id || !pin_code || !car_id || !track_id || !lap_time) {
      return NextResponse.json({ error: 'Données incomplètes (PIN manquant ?)' }, { status: 400 });
    }

    // --- NOUVELLE ÉTAPE DE SÉCURITÉ : VÉRIFICATION DU JOUEUR ---
    
    // 1. On cherche si le joueur existe déjà
    let { data: player } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('pseudo', player_id)
      .single();

    let finalPlayerId = player?.id; // L'identifiant unique UUID dans la base

    if (player) {
      // 2. Le joueur existe : on vérifie son code PIN
      if (player.pin_code !== pin_code) {
        return NextResponse.json({ error: 'Code PIN incorrect pour ce Gamertag.' }, { status: 401 });
      }
    } else {
      // 3. Le joueur n'existe pas : on le crée en lui attribuant ce PIN
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

    // --- FIN DE LA SÉCURITÉ ---

    // On enregistre le chrono en utilisant le véritable ID (UUID) du joueur
    const { data, error } = await supabaseAdmin
      .from('lap_times')
      .insert([
        { 
          player_id: finalPlayerId, // On utilise l'ID unique au lieu du texte
          car_id, 
          track_id, 
          lap_time,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}