/**
 * Numéros de page à afficher : première, dernière, la courante et ses deux
 * voisines, avec « … » pour chaque trou (ex. 1 … 4 5 6 … 12).
 */
export function pagesAffichees(courante: number, total: number): (number | '...')[] {
  const pages = Array.from({ length: total }, (_, i) => i + 1)
    .filter(p => p === 1 || p === total || Math.abs(p - courante) <= 1);
  const out: (number | '...')[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push('...');
    out.push(p);
  });
  return out;
}
