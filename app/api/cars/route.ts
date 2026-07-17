import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { utilisateurDepuisAuthHeader } from '@/lib/auth-token';

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

// Création depuis le relais : le bouton « Créer » de la popup voiture inconnue.
// Jusqu'au relais v3.6.1 la création ne partait qu'accrochée à un POST /api/times ;
// hors envoi de chrono (écran de sélection, monde ouvert) le formulaire était
// perdu. Cette route donne au bouton un vrai backend, quel que soit le contexte.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }

    const user = await utilisateurDepuisAuthHeader(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'Token invalide ou expiré. Reconnecte-toi.' }, { status: 401 });
    }

    const body         = await request.json();
    const carOrdinal   = Number(body?.car_ordinal);
    const manufacturer = typeof body?.manufacturer === 'string' ? body.manufacturer.trim() : '';
    const name         = typeof body?.name === 'string' ? body.name.trim() : '';
    const year         = Number(body?.year);
    if (!Number.isInteger(carOrdinal) || carOrdinal <= 0 ||
        !manufacturer || manufacturer.length > 60 ||
        !name || name.length > 100 ||
        !Number.isInteger(year) || year < 1900 || year > 2030) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('cars')
      .select('id')
      .eq('car_ordinal', carOrdinal)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Cet ordinal est déjà associé à une voiture.' }, { status: 409 });
    }

    // Même voiture déjà au catalogue sans ordinal → on associe au lieu de créer
    // un doublon (équivaut à un Rapprocher que l'utilisateur n'a pas trouvé).
    const motif = (s: string) => s.replace(/[\\%_]/g, '\\$&');
    const { data: doublon } = await supabaseAdmin
      .from('cars')
      .select('id')
      .is('car_ordinal', null)
      .ilike('manufacturer', motif(manufacturer))
      .ilike('name', motif(name))
      .eq('year', year)
      .limit(1)
      .maybeSingle();

    if (doublon) {
      const { error: linkError } = await supabaseAdmin
        .from('cars')
        .update({ car_ordinal: carOrdinal })
        .eq('id', doublon.id);
      if (linkError) {
        return NextResponse.json({ error: 'Association impossible.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, linked: true }, { status: 200 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('cars')
      .insert([{ car_ordinal: carOrdinal, manufacturer, name, year }]);

    if (insertError) {
      return NextResponse.json({ error: 'Création impossible.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, created: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
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

    const user = await utilisateurDepuisAuthHeader(authHeader);
    if (!user) {
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
