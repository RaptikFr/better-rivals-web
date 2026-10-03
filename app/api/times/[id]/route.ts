import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';
import { erreurServeur } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const CHAMP_MAX = 80;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const limited = await rateLimit(req, 'times-patch', 30, 60_000);
  if (limited) return limited;

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  // Chaque champ n'est mis à jour que s'il est présent dans le body : un PATCH
  // qui ne parle que de setup_author ne doit pas effacer le share_code (et
  // inversement). Une valeur vide ou non textuelle efface le champ.
  const champs = body as { share_code?: unknown; setup_author?: unknown };
  const nettoyer = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, CHAMP_MAX) || null : null;
  const updates: { share_code?: string | null; setup_author?: string | null } = {};
  if ('share_code' in champs)   updates.share_code   = nettoyer(champs.share_code);
  if ('setup_author' in champs) updates.setup_author = nettoyer(champs.setup_author);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('lap_times')
    .update(updates)
    .eq('id', id)
    .eq('player_id', player.id)
    .select()
    .maybeSingle();

  if (error) return erreurServeur(error, 'times/[id]');
  if (!data) return NextResponse.json({ error: 'Chrono introuvable' }, { status: 404 });

  return NextResponse.json({ success: true, data });
}
