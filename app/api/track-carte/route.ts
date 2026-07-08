import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { construireCarte } from '@/lib/circuitGeometry';

// ============================================================
// /api/track-carte — carte du circuit (tracé simplifié), publique
// ============================================================
// track_geometries est fermée à anon (RLS) : cette route lit en service role et
// ne renvoie que la carte déjà simplifiée (~10x moins de points que la capture
// brute), pour l'outil /classements (client component, ne peut pas utiliser
// supabaseAdmin ni unstable_cache comme la page /circuits/[slug]).

export async function GET(request: NextRequest) {
  try {
    const trackId = parseInt(request.nextUrl.searchParams.get('track_id') ?? '', 10);
    if (!Number.isInteger(trackId) || trackId <= 0) {
      return NextResponse.json({ error: 'track_id invalide.' }, { status: 400 });
    }

    const { data } = await supabaseAdmin
      .from('track_geometries')
      .select('points')
      .eq('track_id', trackId)
      .maybeSingle();

    const points = data?.points as { x?: unknown; z?: unknown } | null;
    if (!points || !Array.isArray(points.x) || !Array.isArray(points.z)) {
      return NextResponse.json(
        { carte: null },
        { status: 200, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } }
      );
    }

    // Axe Z de Forza vers le nord vs SVG vers le bas — même inversion que lib/trackGeometry.ts.
    const carte = construireCarte({
      x: points.x as number[],
      z: (points.z as number[]).map(v => -v),
    });

    return NextResponse.json(
      { carte },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800' } }
    );
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
