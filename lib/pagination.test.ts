import { describe, it, expect } from 'vitest';
import { pagesAffichees } from './pagination';

describe('pagesAffichees', () => {
  it('affiche tout quand il y a peu de pages', () => {
    expect(pagesAffichees(1, 1)).toEqual([1]);
    expect(pagesAffichees(2, 3)).toEqual([1, 2, 3]);
  });
  it('insère « … » de part et d’autre de la page courante', () => {
    expect(pagesAffichees(6, 12)).toEqual([1, '...', 5, 6, 7, '...', 12]);
  });
  it('pas de « … » pour un trou d’une seule page absente côté début', () => {
    expect(pagesAffichees(3, 10)).toEqual([1, 2, 3, 4, '...', 10]);
  });
  it('gère les extrémités', () => {
    expect(pagesAffichees(1, 8)).toEqual([1, 2, '...', 8]);
    expect(pagesAffichees(8, 8)).toEqual([1, '...', 7, 8]);
  });
});
