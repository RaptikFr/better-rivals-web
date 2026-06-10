import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdmin } from '@/lib/admins';

/**
 * Vérifie le JWT de la requête et que l'email appartient à un administrateur.
 * Renvoie { error } avec la réponse HTTP à retourner si le contrôle échoue.
 */
export async function requireAdmin(request: NextRequest): Promise<{ error: NextResponse | null }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user || !isAdmin(user.email)) {
    return { error: NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 }) };
  }

  return { error: null };
}
