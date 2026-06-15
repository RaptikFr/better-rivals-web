import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const SUJETS = ['Conflit de réglage', 'Signaler un temps suspect', 'Autre'];

// Captcha Cloudflare Turnstile — actif uniquement si la clé secrète est
// configurée (NEXT_PUBLIC_TURNSTILE_SITE_KEY côté client doit l'être aussi).
async function verifierTurnstile(request: NextRequest, token: unknown): Promise<string | null> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return null;

  if (typeof token !== 'string' || !token || token.length > 2048) {
    return 'Vérification anti-robot manquante. Recharge la page et réessaie.';
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
  });
  const outcome = await res.json().catch(() => null);
  if (!outcome?.success) {
    return 'Échec de la vérification anti-robot. Réessaie.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'contact', 3, 10 * 60_000);
    if (limited) return limited;

    const body = await request.json();

    const captchaError = await verifierTurnstile(request, body.turnstileToken);
    if (captchaError) {
      return NextResponse.json({ error: captchaError }, { status: 400 });
    }
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
