import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';


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