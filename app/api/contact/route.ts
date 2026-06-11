import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const SUJETS = ['Conflit de réglage', 'Signaler un temps suspect', 'Autre'];

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, 'contact', 3, 10 * 60_000);
    if (limited) return limited;

    const body = await request.json();
    const gamertag = typeof body.gamertag === 'string' ? body.gamertag.trim() : '';
    const email    = typeof body.email    === 'string' ? body.email.trim()    : '';
    const sujet    = typeof body.sujet    === 'string' ? body.sujet           : '';
    const message  = typeof body.message  === 'string' ? body.message.trim()  : '';

    if (!gamertag || !email || !message) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }
    if (gamertag.length > 100 || email.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: 'Message trop long.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 });
    }
    if (!SUJETS.includes(sujet)) {
      return NextResponse.json({ error: 'Sujet invalide.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('contact_messages')
      .insert([{ gamertag, email, sujet, message }]);

    if (error) {
      return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
