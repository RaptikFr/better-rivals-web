import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { utilisateurDepuisAuthHeader } from '@/lib/auth-token';
import { rateLimit } from '@/lib/rate-limit';
import { nbSecteurs, secteursValides, secteursPlausibles } from '@/lib/lap-validation';
import { enregistrerMeilleursSecteurs } from '@/lib/best-sectors';

export const dynamic = 'force-dynamic';

// POST /api/sectors — le relais (≥ v1.15) envoie les secteurs de CHAQUE tour
// complet (pas seulement les PB), pour que le « tour optimal » capte aussi le
// meilleur secteur d'un tour qui n'a pas battu le PB (raté à 0,1 s mais bon sur
// un secteur). On ne stocke pas le tour lui-même : on alimente juste l'agrégat
// best_sectors (meilleur temps par index, par config). 100 % bonus, best-effort.
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'sectors', 60, 60_000);
    if (limited) return limited;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }
    const user = await utilisateurDepuisAuthHeader(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 401 });
    }

    const body = await request.json();
    const { track_id, car_ordinal, car_class, drivetrain, sectors, lap_time } = body;

    const trackId    = parseInt(track_id, 10);
    const carOrdinal = parseInt(car_ordinal, 10);
    const lapTimeMs  = Math.round(Number(lap_time) * 1000);
    if (!Number.isInteger(trackId) || trackId <= 0 ||
        !Number.isInteger(carOrdinal) || carOrdinal <= 0 ||
        typeof car_class !== 'string' || !car_class ||
        typeof drivetrain !== 'string' || !drivetrain ||
        !Number.isFinite(lapTimeMs) || lapTimeMs <= 0) {
      return NextResponse.json({ error: 'Données de config incomplètes.' }, { status: 400 });
    }

    // Le nombre de secteurs doit correspondre à celui déduit de la longueur du
    // circuit (indices alignés entre tours d'une même config).
    const { data: track } = await supabaseAdmin
      .from('tracks').select('length_km').eq('id', trackId).maybeSingle();
    const n = nbSecteurs(track?.length_km);
    if (!Array.isArray(sectors) || sectors.length !== n) {
      return NextResponse.json({ error: 'Nombre de secteurs inattendu.' }, { status: 400 });
    }

    // secteursValides : durées positives + somme ≈ temps du tour → tableau en ms.
    // secteursPlausibles : aucun secteur plus rapide que la physique (rejette les
    // tours fantômes d'anciens relais — tour interrompu finalisé avec le temps du
    // tour précédent, dont la somme est valide mais les tranches impossibles).
    const secteursMs = secteursValides(sectors, lapTimeMs);
    if (!secteursMs || !secteursPlausibles(secteursMs, track?.length_km)) {
      return NextResponse.json({ error: 'Secteurs incohérents.' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players').select('id').eq('user_id', user.id).single();
    if (!player) return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });

    await enregistrerMeilleursSecteurs({
      trackId, carOrdinal, carClass: car_class, drivetrain,
      playerId: player.id, sectorsMs: secteursMs,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
