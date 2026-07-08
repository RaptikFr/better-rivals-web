import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { utilisateurDepuisAuthHeader } from '@/lib/auth-token';
import { rateLimit } from '@/lib/rate-limit';
import type { TraceSamples } from '@/lib/lap-validation';

export const dynamic = 'force-dynamic';

// GET /api/replay — données du replay 2D d'une config (carte du circuit) :
// MA trace + celle du meilleur AUTRE pilote tracé (le « rival », en général le
// leader de la config). lap_traces est fermée par RLS : on ne relaie ici que le
// strict nécessaire au replay (d/t/v) — jamais thr/brk/str, qui révéleraient le
// pilotage fin d'un autre joueur. Réservé aux connectés (même politique que
// /api/coach) ; un joueur sans trace peut regarder le fantôme du leader seul.

type ReplayLap = {
  time_ms: number;
  pseudo:  string | null;
  d: number[];
  t: number[];
  v: number[];
};

type LapAvecTrace = {
  id:      string;
  time_ms: number;
  players: { pseudo: string | null } | null;
  lap_traces: { samples: unknown } | { samples: unknown }[] | null;
};

/** Réduit une ligne lap_times+trace au strict nécessaire du replay, ou null. */
function versReplayLap(lap: LapAvecTrace | null): ReplayLap | null {
  if (!lap) return null;
  const trace = Array.isArray(lap.lap_traces) ? lap.lap_traces[0] : lap.lap_traces;
  const s = trace?.samples as TraceSamples | undefined;
  if (!s || !Array.isArray(s.d) || !Array.isArray(s.t) || s.d.length < 2) return null;
  return {
    time_ms: lap.time_ms,
    pseudo:  lap.players?.pseudo ?? null,
    d: s.d,
    t: s.t,
    v: Array.isArray(s.v) ? s.v : [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'replay', 30, 60_000);
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

    // Mon meilleur tour tracé + le meilleur tour tracé d'un autre joueur, sur la
    // config exacte. La jointure interne écarte les tours sans trace (même
    // pattern que GET /api/traces).
    const selectAvecTrace = () => supabaseAdmin
      .from('lap_times')
      .select('id, time_ms, players ( pseudo ), lap_traces!inner(samples)');
    const configEq = (q: ReturnType<typeof selectAvecTrace>) => q
      .eq('track_id',    trackId)
      .eq('car_ordinal', carOrdinal)
      .eq('car_class',   carClass)
      .eq('drivetrain',  drivetrain)
      .order('time_ms', { ascending: true })
      .limit(1)
      .maybeSingle();

    const [moiRes, rivalRes] = await Promise.all([
      configEq(selectAvecTrace().eq('player_id', player.id)),
      configEq(selectAvecTrace().neq('player_id', player.id)),
    ]);

    const moi   = versReplayLap(moiRes.data as LapAvecTrace | null);
    const rival = versReplayLap(rivalRes.data as LapAvecTrace | null);
    if (!moi && !rival) return new NextResponse(null, { status: 204 });

    return NextResponse.json({ moi, rival }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
