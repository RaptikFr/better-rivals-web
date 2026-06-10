import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from('tracks')
    .select('id, name, type, length_km, event_lab_code, description, submitted_by')
    .eq('status', 'pending')
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tracks: data });
}

export async function PATCH(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { id, status } = await request.json();
  if (typeof id !== 'number' || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('tracks').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
