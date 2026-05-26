import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
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

    if (track_id === undefined || vote === undefined) {
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