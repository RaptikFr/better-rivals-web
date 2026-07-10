import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { utilisateurDepuisAuthHeader } from '@/lib/auth-token';
import { rateLimit } from '@/lib/rate-limit';
import { regulariteConfig, type TourSession, type RegulariteConfig } from '@/lib/regularite';

export const dynamic = 'force-dynamic';

export interface RegulariteRow extends RegulariteConfig {
  track_id: number;
  car_ordinal: number;
  car_class: string;
  drivetrain: string;
  track_name: string;
  car_label: string;
  /** Tours enregistrés sur la config (fenêtre 90 j), sessions courtes incluses. */
  nb_tours_total: number;
}

// GET /api/regularite — score de régularité du joueur, par config (calculé
// depuis session_laps : chaque tour complet posté par le relais ≥ v1.15 via
// /api/sectors). Affiché dans l'onglet 📊 Statistiques de /profil.
// Bearer session du joueur, comme /api/coach-reports.
export async function GET(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'regularite-get', 60, 60_000);
    if (limited) return limited;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant.' }, { status: 401 });
    }
    const user = await utilisateurDepuisAuthHeader(authHeader);
    if (!user) {
      return NextResponse.json({ error: 'Token invalide ou expiré.' }, { status: 401 });
    }
    const { data: player } = await supabaseAdmin
      .from('players').select('id').eq('user_id', user.id).single();
    if (!player) return NextResponse.json({ error: 'Profil joueur introuvable.' }, { status: 404 });

    const { data: laps, error } = await supabaseAdmin
      .from('session_laps')
      .select('track_id, car_ordinal, car_class, drivetrain, lap_ms, created_at')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = laps ?? [];
    if (rows.length === 0) return NextResponse.json({ regularites: [] }, { status: 200 });

    // Groupement par config exacte (mêmes 4 clés que lap_times).
    const parConfig = new Map<string, { meta: typeof rows[number]; tours: TourSession[] }>();
    for (const r of rows) {
      const key = `${r.track_id}|${r.car_ordinal}|${r.car_class}|${r.drivetrain}`;
      if (!parConfig.has(key)) parConfig.set(key, { meta: r, tours: [] });
      parConfig.get(key)!.tours.push({ lapMs: r.lap_ms, at: Date.parse(r.created_at) });
    }

    const scores = [...parConfig.values()]
      .map(({ meta, tours }) => ({ meta, nbTours: tours.length, reg: regulariteConfig(tours) }))
      .filter((x): x is typeof x & { reg: RegulariteConfig } => x.reg !== null)
      .sort((a, b) => b.reg.derniere.finSession - a.reg.derniere.finSession);

    if (scores.length === 0) return NextResponse.json({ regularites: [] }, { status: 200 });

    // Libellés circuit + voiture (une requête chacune sur les ids distincts).
    const trackIds = [...new Set(scores.map(s => s.meta.track_id))];
    const ordinals = [...new Set(scores.map(s => s.meta.car_ordinal))];
    const [tracksRes, carsRes] = await Promise.all([
      supabaseAdmin.from('tracks').select('id, name').in('id', trackIds),
      supabaseAdmin.from('cars').select('car_ordinal, manufacturer, name, year').in('car_ordinal', ordinals),
    ]);
    const trackName = new Map((tracksRes.data ?? []).map(t => [t.id, t.name]));
    const carLabel = new Map((carsRes.data ?? []).map(c =>
      [c.car_ordinal, `${c.year ?? ''} ${c.manufacturer ?? ''} ${c.name ?? ''}`.trim()]));

    const regularites: RegulariteRow[] = scores.map(({ meta, nbTours, reg }) => ({
      ...reg,
      track_id: meta.track_id,
      car_ordinal: meta.car_ordinal,
      car_class: meta.car_class,
      drivetrain: meta.drivetrain,
      track_name: trackName.get(meta.track_id) ?? 'Circuit',
      car_label: carLabel.get(meta.car_ordinal) ?? 'Voiture',
      nb_tours_total: nbTours,
    }));

    return NextResponse.json({ regularites }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
