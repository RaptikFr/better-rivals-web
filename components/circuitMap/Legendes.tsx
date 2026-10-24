import { BIN_FONDS, VIOLET_FOND, CMP_GAIN_FONDS, CMP_PERTE_FONDS } from './palette';

// Légendes étiquetées sous la carte du circuit, une par mode d'affichage.

const LIGNE = 'flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400';

function Pastille({ fond, children }: { fond: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm ${fond}`} />
      {children}
    </span>
  );
}

const NEUTRE_FOND = 'bg-neutral-300 dark:bg-neutral-700';

/** Mode « trace vs trace » : rampe divergente gain (violet) / perte (rose). */
export function LegendeComparaison() {
  return (
    <div className={LIGNE}>
      {[...CMP_GAIN_FONDS].reverse().map((f, b) => (
        <Pastille key={`g${b}`} fond={f}>
          {b === 0 ? 'Tu gagnes beaucoup' : b === 2 ? 'Tu gagnes un peu' : 'Tu gagnes'}
        </Pastille>
      ))}
      <Pastille fond={NEUTRE_FOND}>Égalité</Pastille>
      {CMP_PERTE_FONDS.map((f, b) => (
        <Pastille key={`p${b}`} fond={f}>
          {b === 0 ? 'Tu perds un peu' : b === 2 ? 'Tu perds beaucoup' : 'Tu perds'}
        </Pastille>
      ))}
    </div>
  );
}

/** Mode « secteurs disputés » : écart entre pilotes de la config. */
export function LegendeHeat() {
  return (
    <div className={LIGNE}>
      {BIN_FONDS.map((f, b) => (
        <Pastille key={b} fond={f}>
          {b === 0 ? 'Pilotes groupés' : b === 3 ? 'Tout se joue là' : b === 1 ? 'Écart modéré' : 'Gros écart'}
        </Pastille>
      ))}
      <Pastille fond={NEUTRE_FOND}>Moins de 2 pilotes</Pastille>
    </div>
  );
}

/** Mode par défaut : perte par secteur, bornes en secondes (`seuil` = maxDelta / 4). */
export function LegendeSecteurs({ seuil, fmtDelta }: { seuil: number; fmtDelta: (ms: number) => string }) {
  return (
    <div className={LIGNE}>
      <Pastille fond={VIOLET_FOND}>Meilleur secteur (toi)</Pastille>
      {BIN_FONDS.map((f, b) => (
        <Pastille key={b} fond={f}>
          {b === 0 ? `≤ ${fmtDelta(seuil).slice(1)}` :
           b === 3 ? `> ${fmtDelta(3 * seuil).slice(1)}` :
           `${fmtDelta(b * seuil).slice(1)} – ${fmtDelta((b + 1) * seuil).slice(1)}`}
        </Pastille>
      ))}
      <Pastille fond={NEUTRE_FOND}>Sans donnée</Pastille>
    </div>
  );
}
