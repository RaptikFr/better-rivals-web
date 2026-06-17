import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabase';

// Carte Open Graph générée à la volée pour chaque profil joueur : c'est l'image
// qui s'affiche quand un lien /joueurs/<pseudo> est collé sur Discord, X, etc.
// La lecture Supabase (non cachée) rend la route dynamique → image par pseudo.

export const alt = 'Profil pilote Better Rivals';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo: raw } = await params;
  const pseudo = decodeURIComponent(raw);

  let chronos = 0;
  let circuits = 0;
  let cars = 0;
  let found = false;

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('pseudo', pseudo)
    .single();

  if (player) {
    found = true;
    const { data: laps } = await supabase
      .from('lap_times')
      .select('track_id, car_ordinal')
      .eq('player_id', player.id);
    chronos  = laps?.length ?? 0;
    circuits = new Set((laps ?? []).map(l => l.track_id)).size;
    cars     = new Set((laps ?? []).map(l => l.car_ordinal)).size;
  }

  const initial = pseudo.charAt(0).toUpperCase() || '?';
  const stats = [
    { label: 'Chronos',  value: chronos },
    { label: 'Circuits', value: circuits },
    { label: 'Voitures', value: cars },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0a',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Marque */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 38, fontWeight: 800 }}>
          <span style={{ color: '#ec4899' }}>Better</span>
          <span style={{ color: '#7c3aed' }}>Rivals</span>
          <span style={{ color: '#525252', fontSize: 28, fontWeight: 600, marginLeft: 18 }}>
            Forza Horizon 6
          </span>
        </div>

        {/* Pilote */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              width: 168,
              height: 168,
              borderRadius: 84,
              backgroundImage: 'linear-gradient(135deg, #ec4899, #7c3aed)',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 84,
              fontWeight: 800,
              color: '#ffffff',
              marginRight: 44,
            }}
          >
            {initial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 76, fontWeight: 800, color: '#ffffff' }}>{pseudo}</div>
            <div style={{ fontSize: 30, color: '#a3a3a3', marginTop: 8 }}>
              {found ? 'Pilote Better Rivals' : 'Profil introuvable'}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex' }}>
          {stats.map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', marginRight: 72 }}>
              <span style={{ fontSize: 68, fontWeight: 800, color: '#ec4899' }}>{s.value}</span>
              <span style={{ fontSize: 28, color: '#a3a3a3' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
