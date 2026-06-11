import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { CLASS_STYLES } from '@/components/ClassStyles';

export const dynamic = 'force-dynamic';

const MEDALS = ['#FFD700', '#C0C0C0', '#CD7F32'];

function formatTime(ms: number): string {
  const minutes      = Math.floor(ms / 60000);
  const seconds      = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

interface OgLap {
  time_ms:     number;
  car_class:   string;
  drivetrain:  string;
  car_ordinal: number;
  players:     { pseudo: string } | null;
  cars:        { manufacturer: string | null; name: string; year: number | null } | null;
}

function carLabelOf(lap: OgLap): string {
  return `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
}

export async function GET(request: NextRequest) {
  try {
    const sp         = request.nextUrl.searchParams;
    const trackId    = parseInt(sp.get('track_id') ?? '');
    const carClass   = sp.get('class');
    const drivetrain = sp.get('drivetrain');
    const carFilter  = sp.get('car');

    if (!Number.isFinite(trackId)) {
      return new Response('track_id manquant', { status: 400 });
    }

    const { data: track } = await supabaseAdmin
      .from('tracks')
      .select('name')
      .eq('id', trackId)
      .maybeSingle();

    let query = supabaseAdmin
      .from('lap_times')
      .select('time_ms, car_class, drivetrain, car_ordinal, players ( pseudo ), cars ( manufacturer, name, year )')
      .eq('track_id', trackId)
      .order('time_ms', { ascending: true })
      .limit(100);
    if (carClass)   query = query.eq('car_class', carClass);
    if (drivetrain) query = query.eq('drivetrain', drivetrain);

    const { data } = await query;

    // Meilleur temps par joueur + config, comme sur la page classements
    const seen = new Set<string>();
    const podium = ((data ?? []) as unknown as OgLap[])
      .filter(lap => !carFilter || carLabelOf(lap) === carFilter)
      .filter(lap => {
        const key = `${lap.players?.pseudo}_${lap.car_ordinal}_${lap.car_class}_${lap.drivetrain}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);

    const trackName  = track?.name ?? `Circuit #${trackId}`;
    const classStyle = carClass ? CLASS_STYLES[carClass] : null;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0a0a0a',
            padding: '40px 64px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* En-tête : marque + jeu */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 900 }}>
              <span style={{ color: '#ec4899' }}>Better</span>
              <span style={{ color: '#7c3aed' }}>Rivals</span>
            </div>
            <span style={{ color: '#737373', fontSize: 24, fontWeight: 700, letterSpacing: 4 }}>
              FORZA HORIZON 6
            </span>
          </div>

          {/* Circuit + filtres */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26 }}>
            <span style={{ color: '#ffffff', fontSize: 52, fontWeight: 800, lineHeight: 1.1 }}>
              {trackName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              {classStyle && (
                <span
                  style={{
                    backgroundColor: classStyle.backgroundColor,
                    color: classStyle.color,
                    fontSize: 24,
                    fontWeight: 800,
                    padding: '4px 18px',
                    borderRadius: 8,
                  }}
                >
                  Classe {carClass}
                </span>
              )}
              {drivetrain && (
                <span
                  style={{
                    backgroundColor: '#262626',
                    color: '#d4d4d4',
                    fontSize: 24,
                    fontWeight: 700,
                    padding: '4px 18px',
                    borderRadius: 8,
                  }}
                >
                  {drivetrain}
                </span>
              )}
              {carFilter && (
                <span
                  style={{
                    backgroundColor: '#262626',
                    color: '#d4d4d4',
                    fontSize: 24,
                    fontWeight: 700,
                    padding: '4px 18px',
                    borderRadius: 8,
                  }}
                >
                  {carFilter.length > 40 ? `${carFilter.slice(0, 40)}…` : carFilter}
                </span>
              )}
            </div>
          </div>

          {/* Podium */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24, flexGrow: 1 }}>
            {podium.length === 0 ? (
              <span style={{ color: '#737373', fontSize: 30 }}>
                Aucun chrono pour le moment — sois le premier !
              </span>
            ) : (
              podium.map((lap, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderRadius: 14,
                    padding: '10px 24px',
                    gap: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: MEDALS[i],
                      color: '#000000',
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <span style={{ color: '#ffffff', fontSize: 29, fontWeight: 800 }}>
                      {lap.players?.pseudo ?? '—'}
                    </span>
                    <span style={{ color: '#a3a3a3', fontSize: 19 }}>
                      {carLabelOf(lap) || '—'}{!carClass ? ` · ${lap.car_class}/${lap.drivetrain}` : !drivetrain ? ` · ${lap.drivetrain}` : ''}
                    </span>
                  </div>
                  <span style={{ color: '#ec4899', fontSize: 33, fontWeight: 800 }}>
                    {formatTime(lap.time_ms)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Pied */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
            <span style={{ color: '#737373', fontSize: 20 }}>
              Battez-vous à armes égales.
            </span>
            <span style={{ color: '#737373', fontSize: 20, fontWeight: 700 }}>
              better-rivals-fh6.org
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch {
    return new Response("Impossible de générer l'image", { status: 500 });
  }
}
