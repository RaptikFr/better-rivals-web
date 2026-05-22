import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 1. On donne les clés du camion au serveur (Il utilise la clé secrète Administrateur)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 2. On définit un mot de passe secret. 
// Le script Python devra donner ce mot de passe pour avoir le droit d'entrer.
const SECRET_API_TOKEN = "MotDePasseForza2026";

export async function POST(request: NextRequest) {
  try {
    // ÉTAPE A : Le contrôle d'identité
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SECRET_API_TOKEN}`) {
      // Si le mot de passe est faux, le douanier bloque la porte.
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    // ÉTAPE B : L'ouverture du colis envoyé par le script Python
    const body = await request.json();
    const { player_id, car_id, track_id, lap_time, is_valid } = body;

    // ÉTAPE C : La vérification anti-triche
    if (!is_valid) {
      return NextResponse.json({ error: 'Tour invalide (Triche ou rembobinage détecté)' }, { status: 400 });
    }

    if (!player_id || !car_id || !track_id || !lap_time) {
      return NextResponse.json({ error: 'Données incomplètes' }, { status: 400 });
    }

    // ÉTAPE D : Le rangement sécurisé dans la base de données
    const { data, error } = await supabaseAdmin
      .from('lap_times')
      .insert([
        { 
          player_id, 
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

    // ÉTAPE E : On renvoie un signal de victoire au script Python
    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}