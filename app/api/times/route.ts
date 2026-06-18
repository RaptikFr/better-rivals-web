import { NextRequest, NextResponse, after } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimit } from '@/lib/rate-limit';
import { siteUrl } from '@/lib/site';
import { annoncerNouveauLeaderDiscord } from '@/lib/discord';
import {
  formatTime,
  bornesTempsMs,
  identifiantsValides,
  tempsDansBornes,
  plusRapideQueRecord,
} from '@/lib/lap-validation';

export const dynamic = 'force-dynamic';

// Instanciation paresseuse : le constructeur Resend lève si la clé est absente.
// La créer au niveau module ferait planter `next build` (collecte des routes)
// dès que RESEND_API_KEY n'est pas définie. On la crée donc à l'usage, et on
// saute proprement l'envoi d'email si la clé manque (ex. build/dev local).
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

// Notifie les suiveurs de l'auteur du chrono qu'il vient de les dépasser sur
// la config exacte. `estDepassement` garantit qu'on ne notifie qu'un vrai
// dépassement (le suiveur était devant l'ancien temps de l'auteur).
async function notifierRivauxDepasses(opts: {
  playerId:   string;
  pseudo:     string;
  newTimeMs:  number;
  trackId:    number;
  carOrdinal: number;
  carClass:   string;
  drivetrain: string;
  trackName:  string;
  carLabel:   string;
  estDepassement: (targetTimeMs: number) => boolean;
}) {
  const { data: followerRows } = await supabaseAdmin
    .from('follows')
    .select('follower_player_id')
    .eq('followed_player_id', opts.playerId);

  const followerIds = (followerRows ?? []).map(r => r.follower_player_id);
  if (followerIds.length === 0) return;

  const { data: rivalLaps } = await supabaseAdmin
    .from('lap_times')
    .select('player_id, time_ms')
    .eq('track_id',    opts.trackId)
    .eq('car_ordinal', opts.carOrdinal)
    .eq('car_class',   opts.carClass)
    .eq('drivetrain',  opts.drivetrain)
    .in('player_id',   followerIds);

  const params = new URLSearchParams({
    track_id:   String(opts.trackId),
    class:      opts.carClass,
    drivetrain: opts.drivetrain,
    car:        opts.carLabel,
  });
  const link = `/classements?${params.toString()}`;

  const beaten = (rivalLaps ?? [])
    .filter(rl => opts.newTimeMs < rl.time_ms && opts.estDepassement(rl.time_ms));
  if (beaten.length === 0) return;

  // Respecte la préférence « notify_rival » de chaque suiveur dépassé.
  const { data: prefs } = await supabaseAdmin
    .from('players')
    .select('id, notify_rival')
    .in('id', beaten.map(rl => rl.player_id));
  const allowed = new Set((prefs ?? []).filter(p => p.notify_rival !== false).map(p => p.id));

  const notifs = beaten
    .filter(rl => allowed.has(rl.player_id))
    .map(rl => ({
      player_id: rl.player_id,
      message:   `🎯 ${opts.pseudo}, que tu suis, vient de te dépasser sur ${opts.trackName} avec ${opts.carLabel} en ${opts.carClass}/${opts.drivetrain} (${formatTime(opts.newTimeMs)})`,
      type:      'rival',
      link,
      read:      false,
    }));

  if (notifs.length > 0) {
    await supabaseAdmin.from('notifications').insert(notifs);
  }
}

// Le joueur dépassé reçoit-il ce type de notification in-app ? (défaut : oui)
async function notifTypeActive(
  playerId: string,
  column: 'notify_exact' | 'notify_drivetrain' | 'notify_class',
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('players')
    .select(column)
    .eq('id', playerId)
    .maybeSingle();
  return data ? (data as Record<string, boolean>)[column] !== false : true;
}

async function notifierRecordBattu(opts: {
  playerId:   string;
  pseudo:     string;
  newTimeMs:  number;
  // Ancien record du joueur sur cette config (null = premier chrono).
  // Sert à ne notifier qu'un dépassement réel : si le joueur était déjà
  // devant sa cible, une simple amélioration ne renotifie pas.
  previousTimeMs: number | null;
  trackId:    number;
  carOrdinal: number;
  carClass:   string;
  drivetrain: string;
  trackName:  string;
  carLabel:   string;
}) {
  // La cible n'est « dépassée » que si elle était devant l'ancien temps
  const estDepassement = (targetTimeMs: number) =>
    opts.previousTimeMs === null || targetTimeMs < opts.previousTimeMs;
  // Nom de la voiture depuis la DB (source de vérité, car déjà insérée/mise à jour)
  const { data: carData } = await supabaseAdmin
    .from('cars')
    .select('manufacturer, name, year')
    .eq('car_ordinal', opts.carOrdinal)
    .maybeSingle();
  const carLabel = carData
    ? `${carData.year ?? ''} ${carData.manufacturer ?? ''} ${carData.name ?? ''}`.trim()
    : opts.carLabel;

  // ── Rivaux : prévenir les joueurs qui SUIVENT l'auteur du chrono et qu'il
  // vient de dépasser sur la config exacte (toute position, pas seulement la
  // 1ère). Bloc indépendant des niveaux ci-dessous (qui sortent par return).
  await notifierRivauxDepasses({
    playerId:   opts.playerId,
    pseudo:     opts.pseudo,
    newTimeMs:  opts.newTimeMs,
    trackId:    opts.trackId,
    carOrdinal: opts.carOrdinal,
    carClass:   opts.carClass,
    drivetrain: opts.drivetrain,
    trackName:  opts.trackName,
    carLabel,
    estDepassement,
  });

  // Niveau 1 : même voiture + classe + transmission (config exacte)
  const { data: exact } = await supabaseAdmin
    .from('lap_times')
    .select('time_ms, player_id')
    .eq('track_id',    opts.trackId)
    .eq('car_ordinal', opts.carOrdinal)
    .eq('car_class',   opts.carClass)
    .eq('drivetrain',  opts.drivetrain)
    .neq('player_id',  opts.playerId)
    .order('time_ms', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (exact && opts.newTimeMs < exact.time_ms && estDepassement(exact.time_ms)) {
    const params = new URLSearchParams({
      track_id:  String(opts.trackId),
      class:     opts.carClass,
      drivetrain: opts.drivetrain,
      car:       carLabel,
    });
    const link = `/classements?${params.toString()}`;
    if (await notifTypeActive(exact.player_id, 'notify_exact')) {
      await supabaseAdmin.from('notifications').insert([{
        player_id: exact.player_id,
        message:   `🏆 Ton record sur ${opts.trackName} avec ${carLabel} en ${opts.carClass}/${opts.drivetrain} a été battu par ${opts.pseudo} (${formatTime(opts.newTimeMs)})`,
        type:      'exact',
        link,
        read:      false,
      }]);
    }
    // L'email reste indépendant (piloté par email_notifications_enabled).
    // En serverless, un envoi non attendu peut être gelé avant d'aboutir
    await sendBeatenEmail({
      beatenPlayerId:  exact.player_id,
      newPlayerPseudo: opts.pseudo,
      trackName:       opts.trackName,
      carLabel,
      carClass:        opts.carClass,
      drivetrain:      opts.drivetrain,
      newTimeMs:       opts.newTimeMs,
      link,
    });
    // Annonce Discord : ce chrono passe devant le meilleur autre joueur sur la
    // config exacte → c'est un nouveau nº1. No-op si DISCORD_WEBHOOK_URL absent.
    await annoncerNouveauLeaderDiscord({
      pseudo:     opts.pseudo,
      trackName:  opts.trackName,
      carLabel,
      carClass:   opts.carClass,
      drivetrain: opts.drivetrain,
      timeMs:     opts.newTimeMs,
      link,
    });
    return;
  }

  // Niveau 2 : même voiture + classe, transmission différente
  const { data: diffDrive } = await supabaseAdmin
    .from('lap_times')
    .select('time_ms, player_id, drivetrain')
    .eq('track_id',    opts.trackId)
    .eq('car_ordinal', opts.carOrdinal)
    .eq('car_class',   opts.carClass)
    .neq('drivetrain', opts.drivetrain)
    .neq('player_id',  opts.playerId)
    .order('time_ms', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (diffDrive && opts.newTimeMs < diffDrive.time_ms && estDepassement(diffDrive.time_ms)) {
    if (await notifTypeActive(diffDrive.player_id, 'notify_drivetrain')) {
      const params = new URLSearchParams({
        track_id: String(opts.trackId),
        class:    opts.carClass,
        car:      carLabel,
      });
      await supabaseAdmin.from('notifications').insert([{
        player_id: diffDrive.player_id,
        message:   `🔄 Ton record sur ${opts.trackName} avec ${carLabel} en ${opts.carClass}/${diffDrive.drivetrain} a été battu par ${opts.pseudo} en ${opts.drivetrain} (${formatTime(opts.newTimeMs)})`,
        type:      'drivetrain',
        link:      `/classements?${params.toString()}`,
        read:      false,
      }]);
    }
    return;
  }

  // Niveau 3 : même classe, voiture différente
  const { data: diffCar } = await supabaseAdmin
    .from('lap_times')
    .select('time_ms, player_id')
    .eq('track_id',   opts.trackId)
    .eq('car_class',  opts.carClass)
    .neq('car_ordinal', opts.carOrdinal)
    .neq('player_id', opts.playerId)
    .order('time_ms', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (diffCar && opts.newTimeMs < diffCar.time_ms && estDepassement(diffCar.time_ms)) {
    if (await notifTypeActive(diffCar.player_id, 'notify_class')) {
      const params = new URLSearchParams({
        track_id: String(opts.trackId),
        class:    opts.carClass,
      });
      await supabaseAdmin.from('notifications').insert([{
        player_id: diffCar.player_id,
        message:   `⚡ Ton record en classe ${opts.carClass} sur ${opts.trackName} a été battu par ${opts.pseudo} avec ${carLabel} (${formatTime(opts.newTimeMs)})`,
        type:      'class',
        link:      `/classements?${params.toString()}`,
        read:      false,
      }]);
    }
  }
}

// Un nouveau record peut atteindre un ou plusieurs « objectifs à battre » que
// le joueur s'est fixés sur cette config (battre tel pilote). On marque ces
// objectifs atteints et on notifie le joueur. Différé après la réponse (after).
async function verifierObjectifsAtteints(opts: {
  playerId:   string;
  newTimeMs:  number;
  trackId:    number;
  carOrdinal: number;
  carClass:   string;
  drivetrain: string;
  trackName:  string;
  carLabel:   string;
  link:       string;
}) {
  const { data: objs } = await supabaseAdmin
    .from('objectifs')
    .select('id, target_player_id')
    .eq('player_id',   opts.playerId)
    .eq('track_id',    opts.trackId)
    .eq('car_ordinal', opts.carOrdinal)
    .eq('car_class',   opts.carClass)
    .eq('drivetrain',  opts.drivetrain)
    .is('achieved_at', null);
  if (!objs || objs.length === 0) return;

  const targetIds = objs.map(o => o.target_player_id);
  const { data: targetLaps } = await supabaseAdmin
    .from('lap_times')
    .select('player_id, time_ms')
    .eq('track_id',    opts.trackId)
    .eq('car_ordinal', opts.carOrdinal)
    .eq('car_class',   opts.carClass)
    .eq('drivetrain',  opts.drivetrain)
    .in('player_id',   targetIds);
  const timeByTarget = new Map((targetLaps ?? []).map(l => [l.player_id, l.time_ms]));

  // Objectif atteint = mon nouveau temps ≤ temps actuel de la cible.
  const atteints = objs.filter(o => {
    const t = timeByTarget.get(o.target_player_id);
    return t !== undefined && opts.newTimeMs <= t;
  });
  if (atteints.length === 0) return;

  await supabaseAdmin
    .from('objectifs')
    .update({ achieved_at: new Date().toISOString() })
    .in('id', atteints.map(o => o.id));

  const { data: targets } = await supabaseAdmin
    .from('players').select('id, pseudo').in('id', atteints.map(o => o.target_player_id));
  const pseudoById = new Map((targets ?? []).map(p => [p.id, p.pseudo]));

  const notifs = atteints.map(o => ({
    player_id: opts.playerId,
    message:   `🎯 Objectif atteint ! Tu as battu ${pseudoById.get(o.target_player_id) ?? 'ta cible'} sur ${opts.trackName} avec ${opts.carLabel} en ${opts.carClass}/${opts.drivetrain} (${formatTime(opts.newTimeMs)})`,
    type:      'objectif',
    link:      opts.link,
    read:      false,
  }));
  await supabaseAdmin.from('notifications').insert(notifs);
}

function buildBeatenEmailHtml(opts: {
  newPlayerPseudo: string;
  trackName:       string;
  carLabel:        string;
  carClass:        string;
  drivetrain:      string;
  newTimeMs:       number;
  ctaUrl:          string;
  profileUrl:      string;
}): string {
  function row(label: string, value: string, valueColor = '#171717', mono = false) {
    return `
      <tr>
        <td style="padding:7px 0;color:#737373;font-size:13px;border-bottom:1px solid #f0f0f0;">${label}</td>
        <td style="padding:7px 0;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #f0f0f0;color:${valueColor};${mono ? 'font-family:monospace;font-size:15px;' : ''}">${value}</td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:20px;font-weight:900;color:#ec4899;">Better</span><span style="font-size:20px;font-weight:900;color:#7c3aed;">Rivals</span>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e5e5;">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0a0a0a;">Tu viens de te faire dépasser 🏆</h1>
      <p style="margin:0 0 24px;color:#737373;font-size:14px;"><strong style="color:#171717;">${opts.newPlayerPseudo}</strong> a battu ton record.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        ${row('Circuit',        opts.trackName)}
        ${row('Voiture',        opts.carLabel)}
        ${row('Classe / Trans.', `${opts.carClass} / ${opts.drivetrain}`)}
        ${row('Nouveau leader', opts.newPlayerPseudo, '#ec4899')}
        ${row('Son temps',      formatTime(opts.newTimeMs), '#ec4899', true)}
      </table>
      <a href="${opts.ctaUrl}" style="display:inline-block;background:#ec4899;color:#ffffff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Voir le classement →</a>
    </div>
    <p style="text-align:center;color:#a3a3a3;font-size:12px;margin:20px 0 0;">
      Tu reçois cet email car les notifications sont activées sur ton profil.<br>
      <a href="${opts.profileUrl}" style="color:#a3a3a3;text-decoration:underline;">Gérer mes préférences</a>
    </p>
  </div>
</body>
</html>`;
}

async function sendBeatenEmail(opts: {
  beatenPlayerId:  string;
  newPlayerPseudo: string;
  trackName:       string;
  carLabel:        string;
  carClass:        string;
  drivetrain:      string;
  newTimeMs:       number;
  link:            string;
}) {
  try {
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('user_id, email_notifications_enabled')
      .eq('id', opts.beatenPlayerId)
      .maybeSingle();

    if (!player?.email_notifications_enabled || !player.user_id) return;

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(player.user_id);
    const email = authData?.user?.email;
    if (!email) return;

    const resend = getResend();
    if (!resend) return; // pas de clé Resend configurée → on n'envoie pas d'email

    await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL ?? 'Better Rivals <noreply@better-rivals-fh6.org>',
      to:      email,
      subject: `Tu viens de te faire dépasser sur ${opts.trackName}`,
      html:    buildBeatenEmailHtml({
        newPlayerPseudo: opts.newPlayerPseudo,
        trackName:       opts.trackName,
        carLabel:        opts.carLabel,
        carClass:        opts.carClass,
        drivetrain:      opts.drivetrain,
        newTimeMs:       opts.newTimeMs,
        ctaUrl:          `${siteUrl}${opts.link}`,
        profileUrl:      `${siteUrl}/profil`,
      }),
    });
  } catch {
    // L'échec d'envoi d'email ne doit pas faire rater la requête principale
  }
}

// Dernier réglage utilisé par le joueur avec cette voiture (même classe et
// transmission), tous circuits confondus. Le relais s'en sert pour pré-remplir
// la popup réglage : le joueur confirme au lieu de retaper le code.
async function chercherReglagePrecedent(opts: {
  playerId:   string;
  carOrdinal: number;
  carClass:   string;
  drivetrain: string;
}): Promise<{ share_code: string; setup_author: string | null; car_pi: number | null } | null> {
  const { data } = await supabaseAdmin
    .from('lap_times')
    .select('share_code, setup_author, car_pi')
    .eq('player_id',   opts.playerId)
    .eq('car_ordinal', opts.carOrdinal)
    .eq('car_class',   opts.carClass)
    .eq('drivetrain',  opts.drivetrain)
    .not('share_code', 'is', null)
    .order('recorded_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!data?.share_code) return null;
  return { share_code: data.share_code, setup_author: data.setup_author, car_pi: data.car_pi };
}

export async function POST(request: NextRequest) {
  try {
    // --- LIMITATION DE DÉBIT ---
    // Le relais ne POSTe qu'à la fin d'un tour : 60 req/min par IP laisse une
    // marge confortable au jeu légitime tout en bornant le spam (écritures +
    // notifications + emails déclenchés par cette route).
    const limited = await rateLimit(request, 'times', 60, 60_000);
    if (limited) return limited;

    // --- VÉRIFICATION DU TOKEN JWT ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide ou expiré. Reconnecte-toi.' }, { status: 401 });
    }

    // --- VALIDATION DES DONNÉES ---
    const body = await request.json();
    const {
      car_id, track_id, lap_time, is_valid,
      drivetrain, car_class, car_pi, num_cylinders,
      car_manufacturer, car_name, car_year,
      is_sprint,
    } = body;

    if (!is_valid) {
      return NextResponse.json({ error: 'Tour invalide détecté par la télémétrie.' }, { status: 400 });
    }

    if (!car_id || !track_id || !lap_time) {
      return NextResponse.json({ error: 'Données incomplètes.' }, { status: 400 });
    }

    const newTimeMs     = Math.round(Number(lap_time) * 1000);
    const numTrackId    = parseInt(track_id);
    const numCarOrdinal = parseInt(car_id);

    if (!identifiantsValides({ trackId: numTrackId, carOrdinal: numCarOrdinal, timeMs: newTimeMs })) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    // --- LECTURES INDÉPENDANTES EN PARALLÈLE ---
    // Joueur (par user), circuit, world record et existence de la voiture ne
    // dépendent que du token déjà vérifié et du body : on les groupe au lieu de
    // les enchaîner en série pour répondre plus vite au relais.
    const [playerRes, trackRes, worldRecordRes, existingCarRes] = await Promise.all([
      supabaseAdmin.from('players').select('id, pseudo').eq('user_id', user.id).single(),
      supabaseAdmin.from('tracks').select('length_km, name, is_sprint').eq('id', numTrackId).maybeSingle(),
      // ⚠ World records : couverture partielle (circuits 7-28 et 63-72, classes
      // D→R) ; les autres seront couverts au fur et à mesure (script OCR).
      supabaseAdmin.from('world_records').select('time_ms').eq('track_id', numTrackId).eq('car_class', car_class).maybeSingle(),
      supabaseAdmin.from('cars').select('car_ordinal').eq('car_ordinal', numCarOrdinal).maybeSingle(),
    ]);

    const { data: player, error: playerError } = playerRes;
    if (playerError || !player) {
      return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });
    }
    const trackData   = trackRes.data;
    const worldRecord = worldRecordRes.data;
    const existingCar = existingCarRes.data;

    // --- VALIDATION DU TEMPS PAR RAPPORT À LA LONGUEUR DU CIRCUIT ---
    // is_sprint vient de la base : la valeur du client ne doit pas pouvoir
    // élargir les bornes de validation
    const sprint = trackData?.is_sprint ?? is_sprint ?? false;

    if (trackData?.length_km && trackData.length_km > 0 &&
        !tempsDansBornes(newTimeMs, trackData.length_km, sprint)) {
      const { minMs, maxMs } = bornesTempsMs(trackData.length_km, sprint);
      const minS = Math.round(minMs / 1000);
      const maxS = Math.round(maxMs / 1000);
      return NextResponse.json({
        error: `Temps aberrant pour ${trackData.name} (${trackData.length_km} km). Attendu entre ${Math.floor(minS/60)}:${String(minS%60).padStart(2,'0')} et ${Math.floor(maxS/60)}:${String(maxS%60).padStart(2,'0')}.`
      }, { status: 400 });
    }

    // --- VALIDATION CONTRE LE WORLD RECORD ---
    if (plusRapideQueRecord(newTimeMs, worldRecord?.time_ms)) {
      return NextResponse.json(
        { error: 'Temps impossible — trop rapide par rapport au record de référence.' },
        { status: 400 }
      );
    }

    // --- GESTION DE LA VOITURE ---
    // L'existence de la voiture a déjà été lue plus haut (lecture parallèle).
    // Une voiture inconnue doit exister avant d'enregistrer le chrono → insert
    // dans le chemin critique. L'enrichissement du nom (catalogue « Inconnu »)
    // n'est pas nécessaire à la réponse : il part en tâche après-réponse.
    if (!existingCar) {
      await supabaseAdmin
        .from('cars')
        .insert([{
          car_ordinal:  numCarOrdinal,
          manufacturer: car_manufacturer ?? 'Inconnu',
          name:         car_name         ?? `Voiture #${numCarOrdinal}`,
          year:         car_year         ?? 0,
        }]);
    } else if (car_manufacturer && car_name && car_year) {
      after(async () => {
        await supabaseAdmin
          .from('cars')
          .update({ manufacturer: car_manufacturer, name: car_name, year: car_year })
          .eq('car_ordinal', numCarOrdinal)
          .eq('manufacturer', 'Inconnu');
      });
    }

    const trackName = trackData?.name ?? `Circuit #${numTrackId}`;
    const carLabel  = `${car_year ?? ''} ${car_manufacturer ?? ''} ${car_name ?? ''}`.trim() || `Voiture #${numCarOrdinal}`;
    const notifOpts = {
      playerId:   player.id,
      pseudo:     player.pseudo,
      trackId:    numTrackId,
      carOrdinal: numCarOrdinal,
      carClass:   car_class,
      drivetrain,
      trackName,
      carLabel,
    };
    // Lien vers le classement de la config (réutilisé pour les notifs d'objectif).
    const objectifLink = `/classements?${new URLSearchParams({
      track_id:   String(numTrackId),
      class:      car_class,
      drivetrain,
      car:        carLabel,
    }).toString()}`;
    const objectifOpts = {
      playerId:   player.id,
      trackId:    numTrackId,
      carOrdinal: numCarOrdinal,
      carClass:   car_class,
      drivetrain,
      trackName,
      carLabel,
      link:       objectifLink,
    };

    // --- GESTION DU CLASSEMENT ---
    const { data: existingTime } = await supabaseAdmin
      .from('lap_times')
      .select('id, time_ms, car_pi, share_code, setup_author')
      .eq('player_id',   player.id)
      .eq('track_id',    numTrackId)
      .eq('car_ordinal', numCarOrdinal)
      .eq('car_class',   car_class)
      .eq('drivetrain',  drivetrain)
      .maybeSingle();

    if (existingTime) {
      if (newTimeMs < existingTime.time_ms) {
        // Historique de l'ancien temps et mise à jour du record sont
        // indépendants → écrits en parallèle.
        // recorded_at = date du temps courant : l'amélioration remonte ainsi
        // dans le flux « Derniers chronos » de l'accueil.
        const [, updateRes] = await Promise.all([
          supabaseAdmin.from('lap_times_history').insert([{
            player_id:   player.id,
            car_ordinal: numCarOrdinal,
            car_class,
            drivetrain,
            track_id:    numTrackId,
            time_ms:     existingTime.time_ms,
            car_pi:      existingTime.car_pi,
          }]),
          supabaseAdmin
            .from('lap_times')
            .update({ time_ms: newTimeMs, verified: is_valid, car_pi, num_cylinders, previous_time_ms: existingTime.time_ms, recorded_at: new Date().toISOString() })
            .eq('id', existingTime.id)
            .select(),
        ]);

        const { data, error } = updateRes;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        // Notifications + emails : différés après la réponse au relais (after).
        after(() => notifierRecordBattu({ ...notifOpts, newTimeMs, previousTimeMs: existingTime.time_ms }));
        after(() => verifierObjectifsAtteints({ ...objectifOpts, newTimeMs }));

        // Réglage précédent pour pré-remplir la popup du relais : en priorité
        // celui du chrono amélioré (même circuit), sinon celui d'un autre circuit
        const previousSetup = existingTime.share_code
          ? { share_code: existingTime.share_code, setup_author: existingTime.setup_author, car_pi: existingTime.car_pi }
          : await chercherReglagePrecedent({ playerId: player.id, carOrdinal: numCarOrdinal, carClass: car_class, drivetrain });

        return NextResponse.json({ success: true, is_new_record: true, message: "Nouveau record ! 🏆", data, id: data?.[0]?.id ?? null, previous_setup: previousSetup }, { status: 200 });
      } else {
        return NextResponse.json({ success: true, is_new_record: false, message: "Ton record avec cette config est déjà meilleur.", id: existingTime.id }, { status: 200 });
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from('lap_times')
        .insert([{
          player_id:    player.id,
          car_ordinal:  numCarOrdinal,
          track_id:     numTrackId,
          time_ms:      newTimeMs,
          verified:     is_valid,
          drivetrain,
          car_class,
          car_pi,
          num_cylinders,
        }])
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      after(() => notifierRecordBattu({ ...notifOpts, newTimeMs, previousTimeMs: null }));
      after(() => verifierObjectifsAtteints({ ...objectifOpts, newTimeMs }));

      // Premier chrono sur ce circuit avec cette config : le réglage a pu être
      // renseigné sur un autre circuit avec la même voiture
      const previousSetup = await chercherReglagePrecedent({ playerId: player.id, carOrdinal: numCarOrdinal, carClass: car_class, drivetrain });

      return NextResponse.json({ success: true, is_new_record: true, message: "Chrono enregistré !", data, id: data?.[0]?.id ?? null, previous_setup: previousSetup }, { status: 201 });
    }

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const trackIdParam = request.nextUrl.searchParams.get('track_id');

    if (!trackIdParam) {
      return NextResponse.json({ error: 'Paramètre track_id manquant.' }, { status: 400 });
    }

    const trackId = parseInt(trackIdParam, 10);
    if (Number.isNaN(trackId)) {
      return NextResponse.json({ error: 'track_id doit être un nombre.' }, { status: 400 });
    }

    // Récupère le meilleur temps par joueur sur ce circuit
    // On groupe par player_id + car_class + drivetrain pour avoir
    // les meilleurs temps par configuration
    const { data, error } = await supabaseAdmin
      .from('lap_times')
      .select(`
        id, time_ms, car_class, car_pi, drivetrain, car_ordinal,
        players ( pseudo ),
        cars ( manufacturer, name, year )
      `)
      .eq('track_id', trackId)
      .order('time_ms', { ascending: true })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Garde uniquement le meilleur temps par joueur + voiture + classe + transmission
    const seen = new Set<string>();
    const best = (data ?? []).filter(lap => {
      const key = `${lap.players?.pseudo}_${lap.car_ordinal}_${lap.car_class}_${lap.drivetrain}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ times: best }, { status: 200 });

  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}