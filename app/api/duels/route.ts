import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';
import { duelConfigKey, type DuelView, type DuelSide, type DuelStatus } from '@/lib/duels';

export const dynamic = 'force-dynamic';

// Résout le joueur courant à partir du JWT (id + pseudo).
async function resoudreJoueur(
  request: NextRequest,
): Promise<{ playerId: string; pseudo: string } | { error: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) };
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Session invalide.' }, { status: 401 }) };
  }
  const { data: player } = await supabaseAdmin
    .from('players').select('id, pseudo').eq('user_id', user.id).single();
  if (!player) {
    return { error: NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 }) };
  }
  return { playerId: player.id, pseudo: player.pseudo };
}

// Vainqueur ABSOLU d'un duel : id du gagnant, ou null si égalité (ou si aucun
// des deux n'a couru). Un temps absent = défaite si l'autre a un temps.
function gagnantAbsolu(
  challengerId: string, challengerTime: number | null,
  opponentId: string,   opponentTime:   number | null,
): string | null {
  if (challengerTime === null && opponentTime === null) return null;
  if (challengerTime === null) return opponentId;
  if (opponentTime   === null) return challengerId;
  if (challengerTime < opponentTime) return challengerId;
  if (challengerTime > opponentTime) return opponentId;
  return null; // égalité parfaite
}

// Position relative à « moi » à partir d'un id de gagnant absolu.
function sideOf(winnerId: string | null, meId: string): DuelSide {
  if (winnerId === null) return 'tie';
  return winnerId === meId ? 'me' : 'them';
}

// ── GET : mes duels (reçus + envoyés), enrichis des temps en direct ──
// Résout au passage les duels acceptés dont la date limite est dépassée.
export async function GET(request: NextRequest) {
  try {
    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId } = resolu;

    const { data: duels, error } = await supabaseAdmin
      .from('duels')
      .select('id, challenger_id, opponent_id, track_id, car_ordinal, car_class, drivetrain, status, deadline, winner_id, created_at, responded_at, resolved_at')
      .or(`challenger_id.eq.${playerId},opponent_id.eq.${playerId}`)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!duels || duels.length === 0) {
      return NextResponse.json({ duels: [] }, { status: 200 });
    }

    const everyPlayerId = [...new Set(duels.flatMap(d => [d.challenger_id, d.opponent_id]))];
    const trackIds      = [...new Set(duels.map(d => d.track_id))];
    const carOrdinals   = [...new Set(duels.map(d => d.car_ordinal))];

    const [lapsRes, pseudosRes, tracksRes, carsRes] = await Promise.all([
      supabaseAdmin
        .from('lap_times')
        .select('player_id, track_id, car_ordinal, car_class, drivetrain, time_ms')
        .in('player_id', everyPlayerId)
        .in('track_id', trackIds)
        .in('car_ordinal', carOrdinals),
      supabaseAdmin.from('players').select('id, pseudo').in('id', everyPlayerId),
      supabaseAdmin.from('tracks').select('id, name').in('id', trackIds),
      supabaseAdmin.from('cars').select('car_ordinal, manufacturer, name, year').in('car_ordinal', carOrdinals),
    ]);

    const timeByKey = new Map<string, number>();
    for (const l of lapsRes.data ?? []) {
      timeByKey.set(`${l.player_id}|${duelConfigKey(l)}`, l.time_ms);
    }
    const pseudoById = new Map((pseudosRes.data ?? []).map(p => [p.id, p.pseudo]));
    const trackById  = new Map((tracksRes.data ?? []).map(t => [t.id, t.name]));
    const carByOrd   = new Map((carsRes.data ?? []).map(c => [c.car_ordinal, c]));

    // ── Résolution paresseuse des duels expirés (status='accepted', échus) ──
    const nowMs = Date.now();
    const aResoudre = duels.filter(d => d.status === 'accepted' && new Date(d.deadline).getTime() <= nowMs);
    for (const d of aResoudre) {
      const cfg = duelConfigKey(d);
      const cTime = timeByKey.get(`${d.challenger_id}|${cfg}`) ?? null;
      const oTime = timeByKey.get(`${d.opponent_id}|${cfg}`) ?? null;
      const winnerId = gagnantAbsolu(d.challenger_id, cTime, d.opponent_id, oTime);
      const resolvedAt = new Date().toISOString();

      const { error: updErr } = await supabaseAdmin
        .from('duels')
        .update({ status: 'completed', winner_id: winnerId, resolved_at: resolvedAt })
        // garde anti-concurrence : ne résout que si encore 'accepted'
        .eq('id', d.id)
        .eq('status', 'accepted');
      if (updErr) continue;

      // Reflète la résolution dans l'objet en mémoire pour la réponse.
      d.status = 'completed';
      d.winner_id = winnerId;
      d.resolved_at = resolvedAt;

      // Notifie les deux joueurs du résultat.
      const trackName = trackById.get(d.track_id) ?? `Circuit #${d.track_id}`;
      const car = carByOrd.get(d.car_ordinal);
      const carLabel = car ? `${car.year ?? ''} ${car.manufacturer ?? ''} ${car.name ?? ''}`.trim() || `Voiture #${d.car_ordinal}` : `Voiture #${d.car_ordinal}`;
      const cPseudo = pseudoById.get(d.challenger_id) ?? 'Inconnu';
      const oPseudo = pseudoById.get(d.opponent_id) ?? 'Inconnu';
      const contexte = `${trackName} avec ${carLabel} (${d.car_class}/${d.drivetrain})`;

      const msgFor = (meId: string, adversaire: string): string => {
        if (winnerId === null) return `⚔️ Duel terminé contre ${adversaire} : égalité sur ${contexte}.`;
        if (winnerId === meId) return `🏆 Tu remportes ton duel contre ${adversaire} sur ${contexte} !`;
        return `😔 Tu perds ton duel contre ${adversaire} sur ${contexte}.`;
      };

      await supabaseAdmin.from('notifications').insert([
        { player_id: d.challenger_id, message: msgFor(d.challenger_id, oPseudo), type: 'duel', link: '/duels', read: false },
        { player_id: d.opponent_id,   message: msgFor(d.opponent_id,   cPseudo), type: 'duel', link: '/duels', read: false },
      ]);
    }

    const result: DuelView[] = duels.map(d => {
      const role: 'challenger' | 'opponent' = d.challenger_id === playerId ? 'challenger' : 'opponent';
      const themId = role === 'challenger' ? d.opponent_id : d.challenger_id;
      const cfg = duelConfigKey(d);
      const myTime    = timeByKey.get(`${playerId}|${cfg}`) ?? null;
      const theirTime = timeByKey.get(`${themId}|${cfg}`) ?? null;
      const car = carByOrd.get(d.car_ordinal);
      const carLabel = car ? `${car.year ?? ''} ${car.manufacturer ?? ''} ${car.name ?? ''}`.trim() || `Voiture #${d.car_ordinal}` : `Voiture #${d.car_ordinal}`;
      const gap = myTime !== null && theirTime !== null ? myTime - theirTime : null;
      const leaderAbs = gagnantAbsolu(d.challenger_id, timeByKey.get(`${d.challenger_id}|${cfg}`) ?? null, d.opponent_id, timeByKey.get(`${d.opponent_id}|${cfg}`) ?? null);

      return {
        id:            d.id,
        role,
        opponent_pseudo: pseudoById.get(themId) ?? 'Inconnu',
        track_id:      d.track_id,
        track_name:    trackById.get(d.track_id) ?? `Circuit #${d.track_id}`,
        car_ordinal:   d.car_ordinal,
        car_label:     carLabel,
        car_class:     d.car_class,
        drivetrain:    d.drivetrain,
        status:        d.status as DuelStatus,
        deadline:      d.deadline,
        my_time_ms:    myTime,
        their_time_ms: theirTime,
        gap_ms:        gap,
        leader:        (myTime === null && theirTime === null) ? null : sideOf(leaderAbs, playerId),
        winner:        d.status === 'completed' ? sideOf(d.winner_id, playerId) : null,
        created_at:    d.created_at,
        responded_at:  d.responded_at,
        resolved_at:   d.resolved_at,
      };
    });

    return NextResponse.json({ duels: result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── POST : envoyer un défi (challenger = moi) ──
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'duels', 20, 10 * 60_000);
    if (limited) return limited;

    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId, pseudo } = resolu;

    const body = await request.json();
    const { opponent_id, track_id, car_ordinal, car_class, drivetrain, days } = body;

    if (typeof opponent_id !== 'string' ||
        typeof track_id    !== 'number' ||
        typeof car_ordinal !== 'number' ||
        typeof car_class   !== 'string' || !car_class ||
        typeof drivetrain  !== 'string' || !drivetrain) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }
    if (opponent_id === playerId) {
      return NextResponse.json({ error: 'Tu ne peux pas te défier toi-même.' }, { status: 400 });
    }
    const dureeJours = typeof days === 'number' && days >= 1 && days <= 31 ? days : 7;

    // On défie sur SA propre config : il faut avoir un temps dessus.
    const { data: myLap } = await supabaseAdmin
      .from('lap_times')
      .select('time_ms')
      .eq('player_id', playerId)
      .eq('track_id', track_id)
      .eq('car_ordinal', car_ordinal)
      .eq('car_class', car_class)
      .eq('drivetrain', drivetrain)
      .maybeSingle();
    if (!myLap) {
      return NextResponse.json({ error: "Tu dois avoir un temps sur cette config pour lancer un défi dessus." }, { status: 400 });
    }

    // Pas de duel actif déjà ouvert entre nous sur cette config (dans un sens ou
    // l'autre) : évite les doublons miroirs.
    const { data: existant } = await supabaseAdmin
      .from('duels')
      .select('id')
      .in('status', ['pending', 'accepted'])
      .eq('track_id', track_id)
      .eq('car_ordinal', car_ordinal)
      .eq('car_class', car_class)
      .eq('drivetrain', drivetrain)
      .or(`and(challenger_id.eq.${playerId},opponent_id.eq.${opponent_id}),and(challenger_id.eq.${opponent_id},opponent_id.eq.${playerId})`)
      .limit(1)
      .maybeSingle();
    if (existant) {
      return NextResponse.json({ error: 'Un duel est déjà en cours avec ce joueur sur cette config.' }, { status: 409 });
    }

    const deadline = new Date(Date.now() + dureeJours * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('duels')
      .insert([{
        challenger_id: playerId,
        opponent_id,
        track_id,
        car_ordinal,
        car_class,
        drivetrain,
        deadline,
      }])
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notifie le défié.
    const [trackRes, carRes] = await Promise.all([
      supabaseAdmin.from('tracks').select('name').eq('id', track_id).maybeSingle(),
      supabaseAdmin.from('cars').select('manufacturer, name, year').eq('car_ordinal', car_ordinal).maybeSingle(),
    ]);
    const trackName = trackRes.data?.name ?? `Circuit #${track_id}`;
    const car = carRes.data;
    const carLabel = car ? `${car.year ?? ''} ${car.manufacturer ?? ''} ${car.name ?? ''}`.trim() || `Voiture #${car_ordinal}` : `Voiture #${car_ordinal}`;
    await supabaseAdmin.from('notifications').insert([{
      player_id: opponent_id,
      message:   `⚔️ ${pseudo} te défie sur ${trackName} avec ${carLabel} (${car_class}/${drivetrain}). Bats son temps avant la date limite !`,
      type:      'duel',
      link:      '/duels',
      read:      false,
    }]);

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

// ── PATCH : répondre à un défi (accepter/refuser) ou l'annuler ──
export async function PATCH(request: NextRequest) {
  try {
    const resolu = await resoudreJoueur(request);
    if ('error' in resolu) return resolu.error;
    const { playerId, pseudo } = resolu;

    const body = await request.json();
    const { id, action } = body as { id?: string; action?: string };
    if (typeof id !== 'string' || !['accept', 'decline', 'cancel'].includes(action ?? '')) {
      return NextResponse.json({ error: 'Action invalide.' }, { status: 400 });
    }

    const { data: duel } = await supabaseAdmin
      .from('duels')
      .select('id, challenger_id, opponent_id, status')
      .eq('id', id)
      .maybeSingle();
    if (!duel) return NextResponse.json({ error: 'Duel introuvable.' }, { status: 404 });
    if (duel.status !== 'pending') {
      return NextResponse.json({ error: "Ce duel n'est plus en attente." }, { status: 409 });
    }

    if (action === 'cancel') {
      if (duel.challenger_id !== playerId) {
        return NextResponse.json({ error: 'Seul l’auteur du défi peut l’annuler.' }, { status: 403 });
      }
      const { error } = await supabaseAdmin.from('duels').update({ status: 'cancelled' }).eq('id', id).eq('status', 'pending');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // accept / decline : réservé au défié
    if (duel.opponent_id !== playerId) {
      return NextResponse.json({ error: 'Seul le joueur défié peut répondre.' }, { status: 403 });
    }
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const { error } = await supabaseAdmin
      .from('duels')
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notifie le challenger de la réponse.
    await supabaseAdmin.from('notifications').insert([{
      player_id: duel.challenger_id,
      message:   action === 'accept'
        ? `✅ ${pseudo} a accepté ton défi ! Que le meilleur gagne ⚔️`
        : `❌ ${pseudo} a décliné ton défi.`,
      type:      'duel',
      link:      '/duels',
      read:      false,
    }]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
