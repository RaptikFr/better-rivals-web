import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatTime } from '@/components/formatTime';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { DiscordTag } from '@/components/DiscordTag';
import { getTypeIcon, getSprintIcon } from '@/lib/trackIcons';
import type { Drivetrain } from '@/types/supabase';
import { carSlug, parseCarOrdinal } from '@/lib/carSlug';
import { getCarsWithTimes, getCarRanking, MIN_TIMES_INDEXABLE } from '@/lib/carRankings';
import { circuitSlug } from '@/lib/circuitRankings';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

function carFullName(manufacturer: string, name: string, year: number | null) {
  return `${year ?? ''} ${manufacturer} ${name}`.trim();
}

export async function generateStaticParams() {
  const cars = await getCarsWithTimes().catch(() => []);
  return cars.map(c => ({ slug: carSlug(c.ordinal, c.manufacturer, c.name) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ordinal = parseCarOrdinal(slug);
  if (ordinal === null) return { title: 'Voiture introuvable' };

  const { car, totalTimes } = await getCarRanking(ordinal);
  if (!car) return { title: 'Voiture introuvable', robots: { index: false, follow: false } };

  const label = `${car.manufacturer} ${car.name}`;
  const title = `Meilleurs temps ${label} — Forza Horizon 6`;
  const description =
    `Les meilleurs temps de la ${label} dans Forza Horizon 6, tous circuits confondus, par classe et transmission — à armes égales sur Better Rivals.`;

  return {
    title,
    description,
    alternates: { canonical: `/voitures/${carSlug(car.ordinal, car.manufacturer, car.name)}` },
    robots: totalTimes < MIN_TIMES_INDEXABLE ? { index: false, follow: true } : undefined,
    openGraph: { title, description, images: [{ url: '/og-image.jpg', width: 1280, height: 512 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.jpg'] },
  };
}

export default async function VoiturePage({ params }: Props) {
  const { slug } = await params;
  const ordinal = parseCarOrdinal(slug);
  if (ordinal === null) notFound();

  const { car, circuits, totalTimes } = await getCarRanking(ordinal);
  if (!car) notFound();

  // Redirige les slugs non canoniques (ordinal seul, ancien nom) vers l'URL propre.
  const canonical = carSlug(car.ordinal, car.manufacturer, car.name);
  if (slug !== canonical) redirect(`/voitures/${canonical}`);

  const fullName = carFullName(car.manufacturer, car.name, car.year);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto">

        <nav className="text-sm text-neutral-500 mb-4">
          <Link href="/voitures" className="hover:text-pink-400 transition-colors">Voitures</Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-700 dark:text-neutral-300">{car.manufacturer} {car.name}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          Meilleurs temps {car.manufacturer} {car.name} —{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
            Forza Horizon 6
          </span>
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          {fullName}
          {car.car_type ? ` · ${car.car_type}` : ''}
          {' · '}{circuits.length} circuit{circuits.length !== 1 ? 's' : ''}
          {' · '}{totalTimes} temps enregistré{totalTimes !== 1 ? 's' : ''}
        </p>

        {circuits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-center">
            <span className="text-5xl">🚗</span>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">Aucun temps enregistré avec cette voiture</p>
            <p className="text-sm text-neutral-500 max-w-sm">Lance le relais Better Rivals, roule avec cette voiture et sois le premier au classement&nbsp;!</p>
            <Link href="/telecharger" className="mt-2 text-pink-400 hover:text-pink-300 font-semibold text-sm">Télécharger le relais →</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {circuits.map(circuit => (
              <section
                key={circuit.trackId}
                className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-4 bg-neutral-200/60 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-lg text-neutral-900 dark:text-white">
                    <Link
                      href={`/circuits/${circuitSlug(circuit.trackId, circuit.trackName)}`}
                      className="hover:text-pink-400 transition-colors"
                    >
                      <span aria-hidden="true">{getTypeIcon(circuit.trackType ?? '')} {getSprintIcon(circuit.trackIsSprint ?? false)} </span>
                      {circuit.trackName}
                    </Link>
                  </h2>
                  {circuit.trackLengthKm && (
                    <span className="text-sm text-neutral-500">· {circuit.trackLengthKm} km</span>
                  )}
                </div>

                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {circuit.configs.map(config => (
                    <div key={config.key}>
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                          style={CLASS_STYLES[config.carClass] ?? { backgroundColor: '#555', color: '#fff' }}
                        >
                          {config.carClass}
                        </span>
                        <DrivetrainBadge drivetrain={config.drivetrain as Drivetrain} />
                        <span className="text-xs text-neutral-500 ml-auto flex-shrink-0">
                          {config.laps.length} pilote{config.laps.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-y border-neutral-200 dark:border-neutral-800">
                              <th className="px-3 py-2 font-bold text-right">Rang</th>
                              <th className="px-3 py-2 font-bold">Pilote</th>
                              <th className="px-3 py-2 font-bold">Meilleur temps</th>
                              <th className="px-3 py-2 font-bold">Indice de Performance</th>
                              <th className="px-3 py-2 font-bold">Réglage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {config.laps.map(lap => (
                              <tr key={lap.id} className="border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-0">
                                <td className="px-3 py-2 text-right font-bold text-neutral-500 tabular-nums">{lap.rank}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <Link
                                    href={`/joueurs/${encodeURIComponent(lap.players?.pseudo ?? '')}`}
                                    className="font-bold text-neutral-900 dark:text-white hover:text-pink-400 transition-colors"
                                  >
                                    {lap.players?.pseudo ?? 'Inconnu'}
                                  </Link>
                                  <DiscordTag tag={lap.players?.discord_tag} />
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-pink-400 whitespace-nowrap">{formatTime(lap.time_ms)}</td>
                                <td className="px-3 py-2 font-mono text-xs text-neutral-500 whitespace-nowrap">PI {lap.car_pi}</td>
                                <td className="px-3 py-2 font-mono text-xs text-neutral-500 whitespace-nowrap">{lap.share_code || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
