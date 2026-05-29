import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { getTypeIcon } from '@/app/lib/trackIcons';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function DefiBanner() {
  const now = new Date().toISOString();
  const { data: defi } = await supabaseAdmin
    .from('defis')
    .select('id, car_class, week_end, tracks(name, type), cars(manufacturer, name, year)')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (!defi) return null;

  const track = defi.tracks as unknown as { name: string; type: string } | null;
  const car   = defi.cars   as unknown as { manufacturer: string; name: string; year: number } | null;
  const classStyle = CLASS_STYLES[defi.car_class] ?? { backgroundColor: '#555', color: '#fff' };

  return (
    <div className="mt-24 max-w-5xl mx-auto w-full border-t border-neutral-200 dark:border-neutral-800 pt-16">
      <h2 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
        🏆 Défi de la semaine
      </h2>
      <p className="text-neutral-600 dark:text-neutral-400 text-center mb-8">
        Un circuit imposé, une classe imposée. Le meilleur temps gagne.
      </p>

      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1 flex items-center gap-4">
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-extrabold flex-shrink-0"
            style={classStyle}
          >
            {defi.car_class}
          </span>
          <div>
            <p className="font-extrabold text-lg text-neutral-900 dark:text-white">
              {getTypeIcon(track?.type ?? '')} {track?.name ?? '—'}
            </p>
            {car && (
              <p className="text-sm text-neutral-400">
                🚗 {car.year} {car.manufacturer} {car.name}
              </p>
            )}
            <p className="text-sm text-neutral-500">
              Jusqu&apos;au {new Date(defi.week_end).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <Link
          href="/defis"
          className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold rounded-full hover:opacity-90 transition-opacity text-center"
        >
          Voir le classement →
        </Link>
      </div>
    </div>
  );
}
