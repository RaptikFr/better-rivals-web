import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const now = new Date().toISOString();

    const { data: defi, error } = await supabaseAdmin
      .from('defis')
      .select('id, track_id, car_id, car_class, week_start, week_end, tracks(id, name, type, length_km, is_sprint), cars(id, car_ordinal, manufacturer, name, year)')
      .lte('week_start', now)
      .gte('week_end', now)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ defi }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
