import type { PointCarte } from '@/lib/circuitGeometry';

// Palette de DONNÉES de la carte du circuit (components/CircuitMap.tsx).

// Rampe séquentielle « temps perdu » (famille rose), 4 pas, une teinte par mode,
// validée clair ET sombre (validateur dataviz : L monotone, ΔL ≥ 0.06,
// contraste du pas clair ≥ 2:1 sur la surface). Hex bruts exprès : une couleur
// de DONNÉE ne suit ni les skins ni le remap d'accent.
export const BIN_STROKES = [
  '[stroke:#fb7185] dark:[stroke:#9f1239]',
  '[stroke:#e11d48]',
  '[stroke:#9f1239] dark:[stroke:#fb7185]',
  '[stroke:#4c0519] dark:[stroke:#fda4af]',
];
export const BIN_FONDS = [
  '[background:#fb7185] dark:[background:#9f1239]',
  '[background:#e11d48]',
  '[background:#9f1239] dark:[background:#fb7185]',
  '[background:#4c0519] dark:[background:#fda4af]',
];
export const VIOLET_STROKE  = '[stroke:#7c3aed] dark:[stroke:#a78bfa]';
export const VIOLET_FOND    = '[background:#7c3aed] dark:[background:#a78bfa]';
export const NEUTRE_STROKE  = 'stroke-neutral-300 dark:stroke-neutral-700';

// Rampe DIVERGENTE du mode « trace vs trace » : rose = je perds, violet = je
// gagne (mêmes familles de données que le reste de la carte), 3 pas par côté
// d'intensité croissante, inversée en sombre comme BIN_STROKES. Validée
// (validateur dataviz) : luminosité monotone par rampe, contraste ≥ 3:1 sur la
// surface sombre ; en clair les pas faibles s'appuient sur le relief existant
// (infobulle + tableaux + légende étiquetée).
export const CMP_PERTE_STROKES = [
  '[stroke:#fb7185] dark:[stroke:#e11d48]',
  '[stroke:#e11d48] dark:[stroke:#fb7185]',
  '[stroke:#9f1239] dark:[stroke:#fda4af]',
];
export const CMP_GAIN_STROKES = [
  '[stroke:#a78bfa] dark:[stroke:#7c3aed]',
  '[stroke:#7c3aed] dark:[stroke:#a78bfa]',
  '[stroke:#5b21b6] dark:[stroke:#c4b5fd]',
];
export const CMP_PERTE_FONDS = [
  '[background:#fb7185] dark:[background:#e11d48]',
  '[background:#e11d48] dark:[background:#fb7185]',
  '[background:#9f1239] dark:[background:#fda4af]',
];
export const CMP_GAIN_FONDS = [
  '[background:#a78bfa] dark:[background:#7c3aed]',
  '[background:#7c3aed] dark:[background:#a78bfa]',
  '[background:#5b21b6] dark:[background:#c4b5fd]',
];

export function cheminSvg(pts: PointCarte[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.z.toFixed(1)}`).join(' ');
}
