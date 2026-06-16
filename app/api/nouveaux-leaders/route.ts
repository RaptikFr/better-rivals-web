import { NextResponse } from 'next/server';
import { getNouveauxLeaders } from '@/lib/leadersFeed';

export type { LeaderFeedItem } from '@/lib/leadersFeed';

export async function GET() {
  try {
    const feed = await getNouveauxLeaders();
    return NextResponse.json({ feed }, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Impossible de charger les nouveaux leaders.' },
      { status: 500 }
    );
  }
}
