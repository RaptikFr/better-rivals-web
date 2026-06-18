import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const ordinal = request.nextUrl.searchParams.get('ordinal');

  if (!ordinal) {
    return NextResponse.json({ error: 'Paramètre ordinal manquant.' }, { status: 400 });
  }

  const ordinalNum = parseInt(ordinal, 10);
  if (Number.isNaN(ordinalNum)) {
    return NextResponse.json({ error: 'ordinal doit être un nombre.' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('cars')
    .select('manufacturer, name, year')
    .eq('car_ordinal', ordinalNum)
    .maybeSingle();

  // detail=true : le relais affiche le nom complet de la voiture courante
  if (request.nextUrl.searchParams.get('detail') === 'true') {
    return NextResponse.json({ found: !!data, car: data ?? null }, { status: 200 });
  }

  return NextResponse.json({ found: !!data }, { status: 200 });
}

// Rapprochement depuis le relais : associe un car_ordinal détecté en jeu à une
// voiture du catalogue qui n'en a pas encore. Les écritures directes sur cars
// sont fermées par RLS depuis l'audit du 11 juin 2026 — tout passe par ici.
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide ou expiré. Reconnecte-toi.' }, { status: 401 });
    }

    const body       = await request.json();
    const carId      = Number(body?.car_id);
    const carOrdinal = Number(body?.car_ordinal);
    if (!Number.isInteger(carId) || !Number.isInteger(carOrdinal) || carOrdinal <= 0) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }

    // Seules les voitures sans ordinal sont rapprochables : un compte connecté
    // ne peut pas réécrire une association existante (anti-vandalisme)
    const { data: car } = await supabaseAdmin
      .from('cars')
      .select('id, car_ordinal')
      .eq('id', carId)
      .maybeSingle();

    if (!car) {
      return NextResponse.json({ error: 'Voiture introuvable.' }, { status: 404 });
    }
    if (car.car_ordinal !== null) {
      return NextResponse.json({ error: 'Cette voiture est déjà associée à un ordinal.' }, { status: 409 });
    }

    const { data: existing } = await supabaseAdmin
      .from('cars')
      .select('id')
      .eq('car_ordinal', carOrdinal)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Cet ordinal est déjà associé à une autre voiture.' }, { status: 409 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('cars')
      .update({ car_ordinal: carOrdinal })
      .eq('id', carId);

    if (updateError) {
      return NextResponse.json({ error: 'Mise à jour impossible.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
}
