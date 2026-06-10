import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';


export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tracks')
      .select('id, name, length_km, type, is_official, is_sprint')
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

  } catch {
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
