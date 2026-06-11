import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TRACK_CATEGORIES, type TrackCategory } from '@/types/supabase';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, 'epreuves', 5, 10 * 60_000);
    if (limited) return limited;

    // Vérification du JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide. Reconnecte-toi.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, event_lab_code, type, length_km, description, is_sprint } = body;

    if (!name || !event_lab_code || !type) {
      return NextResponse.json({ error: 'Nom, code EventLab et type sont obligatoires.' }, { status: 400 });
    }

    if (!TRACK_CATEGORIES.includes(type as TrackCategory)) {
      return NextResponse.json({ error: 'Type d\'épreuve invalide.' }, { status: 400 });
    }

    // Vérifie si le code EventLab est déjà utilisé
    const { data: existing } = await supabaseAdmin
      .from('tracks')
      .select('id')
      .eq('event_lab_code', event_lab_code)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Ce code EventLab est déjà enregistré.' }, { status: 409 });
    }

    // Insertion avec status "pending" et is_official false
    const { data, error } = await supabaseAdmin
      .from('tracks')
      .insert([{
        name,
        event_lab_code,
        type,
        length_km:    length_km ? parseFloat(length_km) : null,
        description:  description || null,
        is_official:  false,
        is_sprint:    is_sprint ?? false,
        status:       'pending',
        submitted_by: user.id,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Épreuve soumise ! Elle sera visible après validation par un administrateur.',
      data,
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
