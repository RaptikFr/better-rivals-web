import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { utilisateurDepuisAuthHeader } from '@/lib/auth-token';
import { rateLimit } from '@/lib/rate-limit';
import { cibleDefi, type DefiView } from '@/lib/defisCoach';

export const dynamic = 'force-dynamic';

// Défis générés par le coach : « passe le secteur 4 sous 25,5 s » sur une
// config. Créés depuis l'onglet Coach (la cible est recalculée ICI, jamais
// reprise du client), validés automatiquement par POST /api/sectors à chaque
// tour complet du relais. Table coach_defis fermée par RLS (service role).

// Résout le joueur courant à partir du JWT (même contrat que /api/objectifs).
async function resoudreJoueur(
  request: NextRequest,
): Promise<{ playerId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) };
  }
  const user = await utilisateurDepuisAuthHeader(authHeader);
  if (!user) {
    return { error: NextResponse.json({ error: 'Session invalide.' }, { status: 401 }) };
  }
  const { data: player } = await supabaseAdmin
    .from('players').select('id').eq('user_id', user.id).single();
  if (!player) {
    return { error: NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 }) };
  }
  return { playerId: player.id };
}

// ── GET : mes défis (actifs puis réussis), enrichis pour l'affichage ──
export async function GET(request: NextRequest) {
  try {
    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId } = resolu;

    const { data: defis, error } = await supabaseAdmin
      .from('coach_defis')
      .select('id, track_id, car_ordinal, car_class, drivetrain, sector_index, baseline_ms, target_ms, achieved_ms, achieved_at, created_at')
      .eq('player_id', playerId)
      .order('achieved_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!defis || defis.length === 0) {
      return NextResponse.json({ defis: [] }, { status: 200 });
    }

    const trackIds    = [...new Set(defis.map(d => d.track_id))];
    const carOrdinals = [...new Set(defis.map(d => d.car_ordinal))];

    // Enrichissement : noms de circuits, libellés voitures, et MON meilleur
    // secteur actuel par config/index (progression du défi).
    const [tracksRes, carsRes, bestRes] = await Promise.all([
      supabaseAdmin.from('tracks').select('id, name').in('id', trackIds),
      supabaseAdmin.from('cars').select('car_ordinal, manufacturer, name, year').in('car_ordinal', carOrdinals),
      supabaseAdmin.from('best_sectors')
        .select('track_id, car_ordinal, car_class, drivetrain, sector_index, best_ms')
        .eq('player_id', playerId)
        .in('track_id', trackIds)
        .in('car_ordinal', carOrdinals),
    ]);

    const trackById = new Map((tracksRes.data ?? []).map(t => [t.id, t.name]));
    const carByOrd  = new Map((carsRes.data ?? []).map(c => [c.car_ordinal, c]));
    const bestByKey = new Map<string, number>();
    for (const b of bestRes.data ?? []) {
      bestByKey.set(`${b.track_id}|${b.car_ordinal}|${b.car_class}|${b.drivetrain}|${b.sector_index}`, b.best_ms);
    }

    const result: DefiView[] = defis.map(d => {
      const car = carByOrd.get(d.car_ordinal);
      const carLabel = car
        ? `${car.year ?? ''} ${car.manufacturer ?? ''} ${car.name ?? ''}`.trim() || `Voiture #${d.car_ordinal}`
        : `Voiture #${d.car_ordinal}`;
      return {
        id:           d.id,
        track_id:     d.track_id,
        track_name:   trackById.get(d.track_id) ?? `Circuit #${d.track_id}`,
        car_ordinal:  d.car_ordinal,
        car_label:    carLabel,
        car_class:    d.car_class,
        drivetrain:   d.drivetrain,
        sector_index: d.sector_index,
        baseline_ms:  d.baseline_ms,
        target_ms:    d.target_ms,
        current_ms:   bestByKey.get(`${d.track_id}|${d.car_ordinal}|${d.car_class}|${d.drivetrain}|${d.sector_index}`) ?? null,
        achieved_ms:  d.achieved_ms,
        achieved_at:  d.achieved_at,
        created_at:   d.created_at,
      };
    });

    return NextResponse.json({ defis: result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── POST : créer un défi sur un secteur d'une config ──
// Body : { track_id, car_ordinal, car_class, drivetrain, sector_index }.
// La cible est recalculée serveur depuis best_sectors — le client ne propose
// que le secteur, jamais le temps à battre.
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'defis', 30, 10 * 60_000);
    if (limited) return limited;

    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId } = resolu;

    const body = await request.json();
    const { track_id, car_ordinal, car_class, drivetrain, sector_index } = body;
    if (typeof track_id     !== 'number' ||
        typeof car_ordinal  !== 'number' ||
        typeof car_class    !== 'string' || !car_class ||
        typeof drivetrain   !== 'string' || !drivetrain ||
        typeof sector_index !== 'number' || !Number.isInteger(sector_index) || sector_index < 1) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }

    // Mon meilleur secteur (baseline) + le meilleur de la config sur cet index.
    const { data: rows } = await supabaseAdmin
      .from('best_sectors')
      .select('player_id, best_ms')
      .eq('track_id',     track_id)
      .eq('car_ordinal',  car_ordinal)
      .eq('car_class',    car_class)
      .eq('drivetrain',   drivetrain)
      .eq('sector_index', sector_index);

    const mien = rows?.find(r => r.player_id === playerId)?.best_ms ?? null;
    const best = (rows ?? []).reduce<number | null>(
      (m, r) => (m === null || r.best_ms < m ? r.best_ms : m), null);
    if (mien === null || best === null) {
      return NextResponse.json({ error: "Pas de temps enregistré sur ce secteur — roule d'abord avec le relais." }, { status: 404 });
    }

    const proposition = cibleDefi(mien, best);
    if (!proposition) {
      return NextResponse.json({ error: 'Tu es déjà au niveau du meilleur secteur : rien à viser ici.' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('coach_defis')
      .insert([{
        player_id:    playerId,
        track_id,
        car_ordinal,
        car_class,
        drivetrain,
        sector_index,
        baseline_ms:  mien,
        target_ms:    proposition.targetMs,
      }])
      .select('id, target_ms')
      .single();

    // Défi actif déjà présent sur ce secteur (index unique partiel) → idempotent.
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, already: true }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, id: data.id, target_ms: data.target_ms, gain_ms: proposition.gainMs },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── DELETE : abandonner/retirer un défi (par id) ──
export async function DELETE(request: NextRequest) {
  try {
    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId } = resolu;

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('coach_defis').delete().eq('player_id', playerId).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
