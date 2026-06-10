import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin
    .from('contact_messages')
    .select('id, gamertag, email, sujet, message, created_at, status')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function PATCH(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { id, status } = await request.json();
  if (typeof id !== 'string' || !['lu', 'traité'].includes(status)) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('contact_messages').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Paramètre id manquant.' }, { status: 400 });

  const { error } = await supabaseAdmin.from('contact_messages').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
