import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const supabaseUser = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!player) return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 });

  const body = await req.json();
  const share_code = typeof body.share_code === 'string' ? body.share_code.trim() || null : null;

  const { data, error } = await supabaseAdmin
    .from('lap_times')
    .update({ share_code })
    .eq('id', id)
    .eq('player_id', player.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Chrono introuvable' }, { status: 404 });

  return NextResponse.json({ success: true, data });
}
