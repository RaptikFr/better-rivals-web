import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { formatTime } from '@/components/formatTime';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { DiscordTag } from '@/components/DiscordTag';
import { getTypeIcon, getSprintIcon } from '@/lib/trackIcons';
import { getCarteCircuit } from '@/lib/trackGeometry';
import { detecterVirages } from '@/lib/circuitGeometry';
import CircuitMap from '@/components/CircuitMap';
import type { Drivetrain } from '@/types/supabase';
import {
  getApprovedCircuits,
  getCircuitRanking,
  circuitSlug,
  parseCircuitId,
  MIN_TIMES_INDEXABLE,
} from '@/lib/circuitRankings';

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const circuits = await getApprovedCircuits().catch(() => []);
  return circuits.map(c => ({ slug: circuitSlug(c.id, c.name) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = parseCircuitId(slug);
  if (id === null) return { title: 'Circuit introuvable' };

  const { track, totalTimes } = await getCircuitRanking(id);
  if (!track) return { title: 'Circuit introuvable', robots: { index: false, follow: false } };

  const title = `Classement ${track.name} — Forza Horizon 6`;
  const description =
    `Les meilleurs temps sur ${track.name} dans Forza Horizon 6, classés par voiture, classe et transmission — à armes égales sur Better Rivals.`;
  const ogUrl = `/api/og/classement?track_id=${track.id}`;

  return {
    title,
    description,
    alternates: { canonical: `/circuits/${circuitSlug(track.id, track.name)}` },
    // Pages trop maigres : on évite de polluer l'index Google.
    robots: totalTimes < MIN_TIMES_INDEXABLE ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogUrl] },
  };
}

export default async function CircuitPage({ params }: Props) {
  const { slug } = await params;
  const id = parseCircuitId(slug);
  if (id === null) notFound();

  const [{ track, configs, totalTimes }, carte] = await Promise.all([
    getCircuitRanking(id),
    getCarteCircuit(id),
  ]);
  if (!track) notFound();

  // Redirige les slugs non canoniques (id seul, ancien nom) vers l'URL propre.
  const canonical = circuitSlug(track.id, track.name);
  if (slug !== canonical) redirect(`/circuits/${canonical}`);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto">

        <nav className="text-sm text-neutral-500 mb-4">
          <Link href="/circuits" className="hover:text-pink-400 transition-colors">Circuits</Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-700 dark:text-neutral-300">{track.name}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
              Classement {track.name} —{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
                Forza Horizon 6
              </span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              <span aria-hidden="true">{getTypeIcon(track.type ?? '')} {getSprintIcon(track.is_sprint ?? false)} </span>
              {track.type ?? 'Circuit'}
              {track.length_km ? ` · ${track.length_km} km` : ''}
              {' · '}{track.is_official ? 'Officiel' : 'Communauté'}
              {' · '}{totalTimes} temps enregistré{totalTimes !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href={`/classements?track_id=${track.id}`}
            className="flex-shrink-0 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black font-bold text-sm hover:scale-105 transition-transform"
          >
            Filtrer dans l&apos;outil de classement →
          </Link>
        </div>

        {carte && (
          <CircuitMap
            trackId={track.id}
            carte={carte}
            virages={detecterVirages(carte)}
            configs={configs.map(c => ({
              key:        c.key,
              carClass:   c.carClass,
              drivetrain: c.drivetrain,
              carLabel:   c.carLabel,
              carOrdinal: c.laps[0].car_ordinal,
            }))}
          />
        )}

        {configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-center">
            <span className="text-5xl">🏁</span>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">Aucun temps enregistré sur ce circuit</p>
            <p className="text-sm text-neutral-500 max-w-sm">Lance le relais Better Rivals, roule sur cette épreuve et sois le premier au classement&nbsp;!</p>
            <Link href="/telecharger" className="mt-2 text-pink-400 hover:text-pink-300 font-semibold text-sm">Télécharger le relais →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map(config => (
              <section
                key={config.key}
                className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                    style={CLASS_STYLES[config.carClass] ?? { backgroundColor: '#555', color: '#fff' }}
                  >
                    {config.carClass}
                  </span>
                  <DrivetrainBadge drivetrain={config.drivetrain as Drivetrain} />
                  <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 truncate">{config.carLabel}</h2>
                  <span className="text-xs text-neutral-500 ml-auto flex-shrink-0">
                    {config.laps.length} pilote{config.laps.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                        <th className="px-3 py-2 font-bold text-right">Rang</th>
                        <th className="px-3 py-2 font-bold">Pilote</th>
                        <th className="px-3 py-2 font-bold">Meilleur temps</th>
                        <th className="px-3 py-2 font-bold">Indice de Performance</th>
                        <th className="px-3 py-2 font-bold">Réglage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.laps.map(lap => (
                        <tr
                          key={lap.id}
                          className="border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-0"
                        >
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
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
