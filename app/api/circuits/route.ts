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
      .eq('status', 'approved')
      .order('is_official', { ascending: false })
      .order('type', { ascending: true })
      .order('name', { ascending: true  });

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
