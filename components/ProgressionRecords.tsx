import Link from 'next/link';
import { formatTime } from '@/components/formatTime';
import { dateAbsolute } from '@/lib/dateAbsolute';

// Progression du record d'une config (rendu serveur, indexable) : courbe en
// escalier des records successifs + liste des étapes. Données préparées par la
// page (lib/leaders.ts progressionRecords).

export interface EtapeAffichee {
  pseudo:      string;
  time_ms:     number;
  recorded_at: string;
  gainMs:      number | null;
}

export interface ProgressionConfig {
  key:        string;
  titre:      string; // « voiture (classe/transmission) »
  etapes:     EtapeAffichee[];
}

const L = 320, H = 90, P = 6;

/** Courbe en escalier : x = temps réel écoulé, y = chrono (plus bas = plus rapide). */
function Escalier({ etapes }: { etapes: EtapeAffichee[] }) {
  const xs = etapes.map(e => new Date(e.recorded_at).getTime());
  const ys = etapes.map(e => e.time_ms);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
  const sx = (x: number) => P + ((x - x0) / Math.max(1, x1 - x0)) * (L - 2 * P);
  // Temps le plus lent en haut, le plus rapide en bas : la courbe « descend ».
  const sy = (y: number) => P + ((yMax - y) / Math.max(1, yMax - yMin)) * (H - 2 * P);

  let d = `M ${sx(xs[0])} ${sy(ys[0])}`;
  for (let i = 1; i < etapes.length; i++) d += ` H ${sx(xs[i])} V ${sy(ys[i])}`;

  return (
    <svg viewBox={`0 0 ${L} ${H}`} className="w-full h-24" role="img"
      aria-label={`Record passé de ${formatTime(ys[0])} à ${formatTime(ys[ys.length - 1])}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} className="text-pink-500" />
      {etapes.map((e, i) => (
        <circle key={i} cx={sx(xs[i])} cy={sy(ys[i])} r={3} className="fill-violet-500" />
      ))}
    </svg>
  );
}

export default function ProgressionRecords({ configs }: { configs: ProgressionConfig[] }) {
  if (configs.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">📈 Progression des records</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {configs.map(c => {
          const premier = c.etapes[0];
          const dernier = c.etapes[c.etapes.length - 1];
          return (
            <div key={c.key} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate" title={c.titre}>{c.titre}</p>
              <p className="text-xs text-neutral-500 mb-2">
                {formatTime(premier.time_ms)} → <strong className="text-pink-500">{formatTime(dernier.time_ms)}</strong>
                {' '}({c.etapes.length - 1} record{c.etapes.length > 2 ? 's' : ''} battu{c.etapes.length > 2 ? 's' : ''})
              </p>
              <Escalier etapes={c.etapes} />
              <ol className="mt-2 space-y-1 text-xs">
                {c.etapes.slice(-4).reverse().map((e, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">
                      <Link href={`/joueurs/${encodeURIComponent(e.pseudo)}`} className="font-medium hover:text-pink-400">{e.pseudo}</Link>
                      <span className="text-neutral-500"> · {dateAbsolute(e.recorded_at)}</span>
                    </span>
                    <span className="font-mono tabular-nums flex-shrink-0">
                      {formatTime(e.time_ms)}
                      {e.gainMs !== null && <span className="text-emerald-500"> −{(e.gainMs / 1000).toFixed(3)}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
