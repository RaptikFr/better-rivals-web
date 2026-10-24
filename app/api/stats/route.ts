import { NextResponse } from 'next/server';
import { getSiteStats } from '@/lib/siteStats';
import { getLeaderStats } from '@/lib/leaderStats';

export async function GET() {
  try {
    // Deux caches indépendants (chiffres clés + batailles de leaders) lus en
    // parallèle ; chacun se rafraîchit au plus une fois par minute.
    const [payload, leaderStats] = await Promise.all([getSiteStats(), getLeaderStats()]);
    return NextResponse.json({ ...payload, leaderStats }, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Impossible de charger les statistiques.' },
      { status: 500 }
    );
  }
}
