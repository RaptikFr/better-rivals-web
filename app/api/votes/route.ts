import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Renvoie les épreuves votées par l'utilisateur courant, sans exposer
// votes.user_id aux autres (la lecture publique de la table est fermée).
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('votes')
      .select('track_id')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ voted_track_ids: (data ?? []).map(v => v.track_id) }, { status: 200 });

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'votes', 20, 60_000);
    if (limited) return limited;

    // Vérification du JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const { track_id, vote } = await request.json();

    if (typeof track_id !== 'number' || typeof vote !== 'boolean') {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }

    // Vérifie si le joueur a déjà voté
    const { data: existing } = await supabaseAdmin
      .from('votes')
      .select('id')
      .eq('track_id', track_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Tu as déjà voté pour cette épreuve.' }, { status: 409 });
    }

    // Enregistre le vote
    const { error } = await supabaseAdmin
      .from('votes')
      .insert([{ track_id, user_id: user.id, vote }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Vote enregistré !' }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}