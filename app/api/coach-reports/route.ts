import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// On borne le nombre de diagnostics conservés par joueur : c'est une boîte de
// réception, pas un journal. Au-delà, les plus vieux sont élagués à l'écriture.
const MAX_PAR_JOUEUR = 50;

async function joueurDuToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Token manquant.' }, { status: 401 }) };
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 401 }) };
  }
  const { data: player } = await supabaseAdmin
    .from('players').select('id').eq('user_id', user.id).single();
  if (!player) {
    return { error: NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 }) };
  }
  return { playerId: player.id };
}

// POST /api/coach-reports — COPILOTE DE RÉGLAGE (compte rendu site). Le relais
// (≥ v3, module coach_reglage) envoie le VERDICT COMPACT d'un tour à la fin de
// son analyse dense 60 Hz : titre + 1-2 conseils actionnables + config. Best-
// effort côté relais (un échec n'interrompt pas la session). On stocke pour que
// le joueur le retrouve dans l'onglet 🔧 Copilote (modèle boîte de réception).
// Authentifié par le token de session du joueur (Bearer, comme /api/traces).
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'coach-reports-post', 60, 60_000);
    if (limited) return limited;

    const auth = await joueurDuToken(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
    }

    const trackId    = Number(body.track_id);
    const carOrdinal = Number(body.car_ordinal);
    const carClass   = typeof body.car_class  === 'string' ? body.car_class  : '';
    const drivetrain = typeof body.drivetrain === 'string' ? body.drivetrain : '';
    const titre      = typeof body.titre === 'string' ? body.titre.trim().slice(0, 120) : '';
    if (!Number.isFinite(trackId) || !Number.isFinite(carOrdinal) || !carClass || !drivetrain || !titre) {
      return NextResponse.json({ error: 'Diagnostic incomplet.' }, { status: 400 });
    }

    // Conseils : 0 à 2 chaînes courtes (le verdict compact n'en a jamais plus).
    const conseils = Array.isArray(body.conseils)
      ? body.conseils.filter((c: unknown): c is string => typeof c === 'string')
          .map((c: string) => c.trim().slice(0, 200)).filter(Boolean).slice(0, 4)
      : [];
    const transmission = typeof body.transmission === 'string' ? body.transmission.slice(0, 20) : null;
    const nVirages = Number.isFinite(Number(body.n_virages)) ? Math.round(Number(body.n_virages)) : null;

    const { error } = await supabaseAdmin.from('coach_reglage_reports').insert({
      player_id:    auth.playerId,
      track_id:     Math.round(trackId),
      car_ordinal:  Math.round(carOrdinal),
      car_class:    carClass,
      drivetrain,
      titre,
      conseils,
      transmission,
      n_virages:    nVirages,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Élagage best-effort : on ne garde que les MAX_PAR_JOUEUR plus récents.
    try {
      const { data: anciens } = await supabaseAdmin
        .from('coach_reglage_reports')
        .select('id')
        .eq('player_id', auth.playerId)
        .order('created_at', { ascending: false })
        .range(MAX_PAR_JOUEUR, MAX_PAR_JOUEUR + 200);
      const aSupprimer = (anciens ?? []).map(r => r.id);
      if (aSupprimer.length) {
        await supabaseAdmin.from('coach_reglage_reports').delete().in('id', aSupprimer);
      }
    } catch { /* l'élagage est un bonus, jamais bloquant */ }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// GET /api/coach-reports — les diagnostics du joueur (les plus récents d'abord),
// enrichis du libellé circuit/voiture pour l'affichage. Le client agrège par
// config côté navigateur (tendances récurrentes). Bearer session du joueur.
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'coach-reports-get', 60, 60_000);
    if (limited) return limited;

    const auth = await joueurDuToken(request);
    if (auth.error) return auth.error;

    const { data: reports, error } = await supabaseAdmin
      .from('coach_reglage_reports')
      .select('id, track_id, car_ordinal, car_class, drivetrain, titre, conseils, transmission, n_virages, created_at')
      .eq('player_id', auth.playerId)
      .order('created_at', { ascending: false })
      .limit(MAX_PAR_JOUEUR);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = reports ?? [];
    if (rows.length === 0) return NextResponse.json({ reports: [] }, { status: 200 });

    // Libellés circuit + voiture (une requête chacune sur les ids distincts).
    const trackIds = [...new Set(rows.map(r => r.track_id))];
    const ordinals = [...new Set(rows.map(r => r.car_ordinal))];
    const [tracksRes, carsRes] = await Promise.all([
      supabaseAdmin.from('tracks').select('id, name').in('id', trackIds),
      supabaseAdmin.from('cars').select('car_ordinal, manufacturer, name, year').in('car_ordinal', ordinals),
    ]);
    const trackName = new Map((tracksRes.data ?? []).map(t => [t.id, t.name]));
    const carLabel = new Map((carsRes.data ?? []).map(c =>
      [c.car_ordinal, `${c.year ?? ''} ${c.manufacturer ?? ''} ${c.name ?? ''}`.trim()]));

    const enriched = rows.map(r => ({
      ...r,
      track_name: trackName.get(r.track_id) ?? 'Circuit',
      car_label:  carLabel.get(r.car_ordinal) ?? 'Voiture',
    }));

    return NextResponse.json({ reports: enriched }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
