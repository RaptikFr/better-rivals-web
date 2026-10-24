import type { Virage } from '@/lib/circuitGeometry';
import type { SecteurInfo } from './types';

// Détail par secteur en tableau (lisible sans les couleurs de la carte).
export default function TableSecteurs({
  secteurs,
  avecVirages,
  viragesDuSecteur,
  aMesDonnees,
  formatTime,
  fmtDelta,
}: {
  secteurs:         SecteurInfo[];
  avecVirages:      boolean;
  viragesDuSecteur: (i: number) => Virage[];
  aMesDonnees:      boolean;
  formatTime:       (ms: number) => string;
  fmtDelta:         (ms: number) => string;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-neutral-500 hover:text-pink-400 transition-colors text-xs font-semibold">
        Détail des secteurs
      </summary>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
              <th className="px-2 py-1.5 font-bold">Secteur</th>
              {avecVirages && <th className="px-2 py-1.5 font-bold">Virages</th>}
              <th className="px-2 py-1.5 font-bold">Meilleur</th>
              <th className="px-2 py-1.5 font-bold">Détenteur</th>
              {aMesDonnees && <th className="px-2 py-1.5 font-bold">Toi</th>}
              {aMesDonnees && <th className="px-2 py-1.5 font-bold">Écart</th>}
            </tr>
          </thead>
          <tbody>
            {secteurs.map((s, i) => {
              const vs = avecVirages ? viragesDuSecteur(i) : [];
              return (
                <tr key={i} className="border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-0">
                  <td className="px-2 py-1.5 font-bold text-neutral-500">S{i + 1}</td>
                  {avecVirages && (
                    <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400">
                      {vs.length > 0 ? vs.map(v => `V${v.numero}`).join(', ') : '—'}
                    </td>
                  )}
                  <td className="px-2 py-1.5 font-mono">{s.bestMs !== null ? formatTime(s.bestMs) : '—'}</td>
                  <td className="px-2 py-1.5">{s.bestPseudo ?? '—'}</td>
                  {aMesDonnees && <td className="px-2 py-1.5 font-mono">{s.mienMs !== null ? formatTime(s.mienMs) : '—'}</td>}
                  {aMesDonnees && (
                    <td className="px-2 py-1.5 font-mono font-bold">
                      {s.deltaMs === null ? '—' : s.deltaMs <= 0 ? '💜' : fmtDelta(s.deltaMs)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
