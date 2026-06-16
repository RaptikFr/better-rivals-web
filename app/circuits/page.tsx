import type { Metadata } from 'next';
import Link from 'next/link';
import { getApprovedCircuits, circuitSlug } from '@/lib/circuitRankings';
import { getTypeIcon, getSprintIcon } from '@/lib/trackIcons';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Circuits',
  description:
    "Tous les circuits de Forza Horizon 6 classés sur Better Rivals : consultez les meilleurs temps par épreuve, à armes égales.",
  alternates: { canonical: '/circuits' },
};

export default async function CircuitsIndexPage() {
  const circuits = await getApprovedCircuits().catch(() => []);
  const officiels   = circuits.filter(c => c.is_official);
  const communaute  = circuits.filter(c => !c.is_official);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
          Circuits — Forza Horizon 6
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 text-lg mb-8">
          Choisis une épreuve pour voir son classement Better Rivals : les meilleurs temps par voiture, classe et transmission.
        </p>

        {circuits.length === 0 ? (
          <p className="text-neutral-500">Aucun circuit disponible pour l&apos;instant.</p>
        ) : (
          <>
            <CircuitSection title="Circuits officiels" circuits={officiels} />
            <CircuitSection title="Épreuves communauté" circuits={communaute} />
          </>
        )}
      </div>
    </main>
  );
}

function CircuitSection({
  title,
  circuits,
}: {
  title: string;
  circuits: Awaited<ReturnType<typeof getApprovedCircuits>>;
}) {
  if (circuits.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {circuits.map(c => (
          <Link
            key={c.id}
            href={`/circuits/${circuitSlug(c.id, c.name)}`}
            className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 hover:border-pink-500/50 transition-colors"
          >
            <span aria-hidden="true">{getTypeIcon(c.type ?? '')} {getSprintIcon(c.is_sprint ?? false)}</span>
            <span className="font-semibold text-neutral-900 dark:text-white truncate">{c.name}</span>
            {c.length_km && <span className="ml-auto text-xs text-neutral-500 flex-shrink-0">{c.length_km} km</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}
