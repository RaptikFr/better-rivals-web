import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tracks')
      .select('id, name, length_km, type, is_official')
      .order('is_official', { ascending: false }) // Officiels en premier
      .order('type',        { ascending: true  }) // Puis par type (alphabétique)
      .order('name',        { ascending: true  }); // Puis par nom

    if (error) {
      return NextResponse.json(
        { error: 'Impossible de récupérer les circuits.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ circuits: data }, { status: 200 });

  } catch (err) {
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
