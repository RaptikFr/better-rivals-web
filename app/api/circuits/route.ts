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

    // Nombre de records de référence par circuit (sert à l'outil OCR pour ne
    // proposer que les épreuves encore incomplètes). Les temps restent masqués.
    const { data: records } = await supabaseAdmin
      .from('world_records')
      .select('track_id');

    const compteur = new Map<number, number>();
    for (const r of records ?? []) {
      if (r.track_id != null) {
        compteur.set(r.track_id, (compteur.get(r.track_id) ?? 0) + 1);
      }
    }

    const circuits = (data ?? []).map((t) => ({
      ...t,
      wr_count: compteur.get(t.id) ?? 0,
    }));

    return NextResponse.json({ circuits }, { status: 200 });

  } catch {
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
