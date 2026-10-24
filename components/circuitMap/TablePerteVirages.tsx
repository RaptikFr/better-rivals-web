import { typeVirage } from '@/lib/circuitGeometry';
import type { PerteVirage } from './types';

// « 🌀 Perte par virage » : fenêtre exacte du virage (trace), pas la tranche du
// secteur qui peut en chevaucher plusieurs (ex. « virages 5–6 »).
export default function TablePerteVirages({
  tracesAuth,
  tracesLoading,
  uneTraceAuMoins,
  perVirage,
  piresVirages,
  fmtDelta,
  decSep,
}: {
  tracesAuth:      boolean;
  tracesLoading:   boolean;
  /** Au moins une des deux traces (moi / rival) est disponible. */
  uneTraceAuMoins: boolean;
  perVirage:       PerteVirage[] | null;
  piresVirages:    PerteVirage[];
  fmtDelta:        (ms: number) => string;
  decSep:          string;
}) {
  const sec = (s: number) => `${s.toFixed(2).replace('.', decSep)} s`;
  return (
    <details open className="text-sm">
      <summary className="cursor-pointer text-neutral-500 hover:text-pink-400 transition-colors text-xs font-semibold">
        🌀 Perte par virage
      </summary>
      <div className="mt-2">
        {!tracesAuth ? (
          <p className="text-xs text-neutral-500">
            Connecte-toi pour comparer virage par virage avec un tour tracé de cette config.
          </p>
        ) : tracesLoading ? (
          <p className="text-xs text-neutral-500 animate-pulse">Chargement des tracés…</p>
        ) : !perVirage ? (
          <p className="text-xs text-neutral-500">
            {uneTraceAuMoins
              ? "Il manque l'une des deux traces (toi ou le rival) pour calculer la perte par virage."
              : 'Pas encore de tour tracé sur cette config — pose un temps avec le relais pour débloquer ce calcul.'}
          </p>
        ) : (
          <>
            {piresVirages.length > 0 && (
              <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                🔻 Le plus gros écart :{' '}
                {piresVirages.slice(0, 3).map((p, j) => (
                  <span key={p.virage.numero}>
                    {j > 0 && (j === Math.min(piresVirages.length, 3) - 1 ? ' puis ' : ', ')}
                    <strong>virage {p.virage.numero}</strong> ({fmtDelta(Math.round(p.deltaS * 1000))})
                  </span>
                ))}.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-2 py-1.5 font-bold">Virage</th>
                    <th className="px-2 py-1.5 font-bold">Type</th>
                    <th className="px-2 py-1.5 font-bold">Toi</th>
                    <th className="px-2 py-1.5 font-bold">{perVirage[0]?.rivalPseudo ?? 'Rival'}</th>
                    <th className="px-2 py-1.5 font-bold">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {perVirage.map(p => (
                    <tr key={p.virage.numero} className="border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-0">
                      <td className="px-2 py-1.5 font-bold text-neutral-500">V{p.virage.numero}</td>
                      <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400">
                        {p.virage.direction} · {typeVirage(p.virage)}
                      </td>
                      <td className="px-2 py-1.5 font-mono">{sec(p.moiS)}</td>
                      <td className="px-2 py-1.5 font-mono">{sec(p.rivalS)}</td>
                      <td className={`px-2 py-1.5 font-mono font-bold ${
                        p.deltaS > 0 ? 'text-pink-500' : p.deltaS < 0 ? 'text-violet-500' : ''
                      }`}>
                        {p.deltaS === 0
                          ? `±0${decSep}00 s`
                          : `${p.deltaS > 0 ? '+' : '−'}${sec(Math.abs(p.deltaS))}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
