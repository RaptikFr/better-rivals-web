import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const ordinal = request.nextUrl.searchParams.get('ordinal');

  if (!ordinal) {
    return NextResponse.json({ error: 'Paramètre ordinal manquant.' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('cars')
    .select('car_ordinal')
    .eq('car_ordinal', parseInt(ordinal))
    .maybeSingle();

  return NextResponse.json({ found: !!data }, { status: 200 });
}