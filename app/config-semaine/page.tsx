import type { Metadata } from 'next';
import Link from 'next/link';
import { getConfigSemaine } from '@/lib/configSemaine';
import { formatTime } from '@/lib/lap-validation';

export const metadata: Metadata = {
  title: 'Config de la semaine',
  description:
    'Le défi de la semaine sur Better Rivals : une configuration (circuit, voiture, classe, transmission) mise en avant. Qui signe le meilleur temps avant la fin de la fenêtre ?',
};

// La fenêtre bouge : on évite de figer la page au build.
export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function ConfigSemainePage() {
  const data = await getConfigSemaine().catch(() => null);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
            ⭐ Config de la semaine
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Une configuration mise en avant chaque semaine. Pose ton meilleur temps avant la fin de la fenêtre pour décrocher la couronne.
          </p>
        </div>

        {!data ? (
          <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-neutral-500">Aucune config de la semaine en ce moment. Reviens bientôt ! 🏁</p>
          </div>
        ) : (
          <>
            {/* En-tête de la config */}
            <div className="bg-gradient-to-br from-pink-500/10 to-violet-600/10 border border-pink-500/30 rounded-xl p-6 mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 bg-pink-500/20 border border-pink-500/40 text-pink-500 rounded-full text-xs font-bold">
                  {data.config.car_class}
                </span>
                <span className="px-2.5 py-1 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full text-xs font-bold">
                  {data.config.drivetrain}
                </span>
                <span className="ml-auto text-xs text-neutral-500">
                  Fenêtre : {formatDate(data.config.starts_at)} → {formatDate(data.config.ends_at)}
                </span>
              </div>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">{data.config.car_label}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">🏁 {data.config.track_name}</p>
              <Link
                href={data.link}
                className="inline-block mt-4 text-sm font-semibold text-pink-500 hover:text-pink-400 transition-colors"
              >
                Voir le classement complet de la config →
              </Link>
            </div>

            {/* Classement de la semaine */}
            {data.classement.length === 0 ? (
              <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-10 text-center">
                <p className="text-neutral-500">Personne n&apos;a encore posé de temps cette semaine. À toi de jouer ! 🚀</p>
              </div>
            ) : (
              <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                {data.classement.map((row, i) => (
                  <div
                    key={row.player_id}
                    className={`flex items-center gap-4 px-5 py-3.5 border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-0 ${
                      i === 0 ? 'bg-gradient-to-r from-amber-400/10 to-transparent' : ''
                    }`}
                  >
                    <span className="w-8 text-center text-lg font-bold tabular-nums">
                      {MEDALS[i] ?? <span className="text-neutral-500 text-sm">{i + 1}</span>}
                    </span>
                    <Link
                      href={`/joueurs/${encodeURIComponent(row.pseudo)}`}
                      className="flex-1 font-semibold text-neutral-900 dark:text-white hover:text-pink-500 transition-colors truncate"
                    >
                      {row.pseudo}
                      {i === 0 && (
                        <span className="ml-2 align-middle px-2 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-500 rounded-full text-[11px] font-bold">
                          👑 En tête
                        </span>
                      )}
                    </Link>
                    <span className="font-mono text-sm font-bold text-neutral-900 dark:text-white tabular-nums">
                      {formatTime(row.time_ms)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
