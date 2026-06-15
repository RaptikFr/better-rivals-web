import Link from 'next/link';
import { formatGap, type ConfigRivals } from '@/lib/rivals';

/**
 * Rivaux directs d'un joueur sur une configuration : pilote juste devant
 * (cible, plus rapide → écart négatif) et juste derrière (menace, plus
 * lent → écart positif). Convention de signe alignée sur le reste du site.
 */
export function RivalsCell({ rivals }: { rivals: ConfigRivals }) {
  if (!rivals.ahead && !rivals.behind) {
    return <span className="text-xs text-neutral-500">Seul sur la config</span>;
  }
  return (
    <div className="flex flex-col gap-0.5 text-xs whitespace-nowrap">
      {rivals.ahead ? (
        <span className="text-sky-400" title="Pilote juste devant — ta cible">
          ▲{' '}
          <Link href={`/joueurs/${encodeURIComponent(rivals.ahead.pseudo)}`} className="font-semibold hover:underline">
            {rivals.ahead.pseudo}
          </Link>{' '}
          <span className="font-mono">−{formatGap(rivals.ahead.gapMs)}</span>
        </span>
      ) : (
        <span className="text-neutral-500">▲ —</span>
      )}
      {rivals.behind ? (
        <span className="text-amber-400" title="Pilote juste derrière — ta menace">
          ▼{' '}
          <Link href={`/joueurs/${encodeURIComponent(rivals.behind.pseudo)}`} className="font-semibold hover:underline">
            {rivals.behind.pseudo}
          </Link>{' '}
          <span className="font-mono">+{formatGap(rivals.behind.gapMs)}</span>
        </span>
      ) : (
        <span className="text-neutral-500">▼ —</span>
      )}
    </div>
  );
}
