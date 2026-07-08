import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { utilisateurDepuisAuthHeader } from '@/lib/auth-token';
import { rateLimit } from '@/lib/rate-limit';
import { traceValide, nbSecteurs, secteursDepuisTrace } from '@/lib/lap-validation';
import { analyserPilotage, analyseThermique } from '@/lib/coachPilotage';

export const dynamic = 'force-dynamic';

// GET /api/coach — COACH DE PILOTAGE (rapport post-tour). Authentifié par le token
// de session du joueur (Bearer = access_token, comme /api/traces côté relais). À
// partir de SON meilleur tour tracé sur la config exacte + des meilleurs secteurs
// de la config (best_sectors), renvoie un rapport par secteur : où il perd du
// temps, freinage, roue libre, réaccélération… Aucune donnée de réglage ici (ça,
// c'est la Phase 2, copilote de réglage) ; on ne parle que de CONDUITE. Tout passe
// par le service role car lap_traces est fermé à anon/authenticated. 204 si le
// joueur n'a pas encore de tour tracé sur cette config.
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'coach', 60, 60_000);
    if (limited) return limited;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }
    const user = await utilisateurDepuisAuthHeader(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 401 });
    }

    const params     = request.nextUrl.searchParams;
    const trackId    = parseInt(params.get('track_id')    ?? '', 10);
    const carOrdinal = parseInt(params.get('car_ordinal') ?? '', 10);
    const carClass   = params.get('car_class')  ?? '';
    const drivetrain = params.get('drivetrain') ?? '';
    if (!Number.isFinite(trackId) || !Number.isFinite(carOrdinal) || !carClass || !drivetrain) {
      return NextResponse.json({ error: 'Paramètres de config incomplets.' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players').select('id').eq('user_id', user.id).single();
    if (!player) return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });

    // Le meilleur tour DU JOUEUR sur la config exacte qui possède une trace
    // (jointure interne sur lap_traces — même logique que GET /api/traces).
    const { data: lap } = await supabaseAdmin
      .from('lap_times')
      .select('id, time_ms, track_id, sectors_ms, lap_traces!inner(samples)')
      .eq('player_id',   player.id)
      .eq('track_id',    trackId)
      .eq('car_ordinal', carOrdinal)
      .eq('car_class',   carClass)
      .eq('drivetrain',  drivetrain)
      .order('time_ms', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!lap) return new NextResponse(null, { status: 204 }); // pas de tour tracé sur cette config

    const traceRow = Array.isArray(lap.lap_traces) ? lap.lap_traces[0] : lap.lap_traces;
    const trace = traceValide(traceRow?.samples);
    if (!trace) return new NextResponse(null, { status: 204 });

    // Tes temps de secteur : ceux déjà calculés depuis la trace (POST /api/traces),
    // sinon on les reconstruit à la volée (longueur du circuit → N secteurs égaux).
    let sectorsMs = lap.sectors_ms ?? null;
    if (!sectorsMs || sectorsMs.length < 2) {
      const { data: track } = await supabaseAdmin
        .from('tracks').select('length_km').eq('id', lap.track_id).maybeSingle();
      sectorsMs = secteursDepuisTrace(trace, nbSecteurs(track?.length_km), lap.time_ms);
    }
    if (!sectorsMs || sectorsMs.length < 2) return new NextResponse(null, { status: 204 });
    const N = sectorsMs.length;

    // Meilleurs secteurs de la config (tour optimal) → référence par index.
    const { data: best } = await supabaseAdmin
      .from('best_sectors')
      .select('sector_index, best_ms, player_id')
      .eq('track_id',    trackId)
      .eq('car_ordinal', carOrdinal)
      .eq('car_class',   carClass)
      .eq('drivetrain',  drivetrain);

    // `sector_index` commence à 1 (cf. la RPC enregistrer_meilleurs_secteurs) et
    // la table est PAR JOUEUR : on prend le MIN entre joueurs pour chaque index.
    const bestMs: (number | null)[] = Array.from({ length: N }, () => null);
    const heldByYou: boolean[] = Array.from({ length: N }, () => false);
    for (const row of best ?? []) {
      const i = row.sector_index - 1;
      if (i >= 0 && i < N && (bestMs[i] === null || row.best_ms < bestMs[i]!)) {
        bestMs[i] = row.best_ms;
        heldByYou[i] = row.player_id === player.id;
      }
    }

    const report = analyserPilotage(trace, sectorsMs, bestMs);
    const thermal = analyseThermique(trace);  // équilibre thermique (relais ≥ 2.1)
    return NextResponse.json({ time_ms: lap.time_ms, sectorsMs, heldByYou, report, thermal }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
