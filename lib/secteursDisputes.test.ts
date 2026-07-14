import { describe, it, expect } from 'vitest';
import { ecartsParSecteur, secteursDisputes, type LigneBestSector } from './secteursDisputes';

const ligne = (player: string, index1: number, ms: number): LigneBestSector =>
  ({ player_id: player, sector_index: index1, best_ms: ms });

describe('ecartsParSecteur', () => {
  it('aucune ligne → tableau vide', () => {
    expect(ecartsParSecteur([])).toEqual([]);
  });

  it('un seul pilote → écart nul partout (pas de comparaison possible)', () => {
    const e = ecartsParSecteur([ligne('a', 1, 10_000), ligne('a', 2, 11_000)]);
    expect(e).toHaveLength(2);
    expect(e.every(x => x.ecartMs === 0 && x.nbPilotes === 1)).toBe(true);
  });

  it('deux pilotes → écart max−min, indices 1-based mappés en 0-based', () => {
    const e = ecartsParSecteur([
      ligne('a', 1, 10_000), ligne('b', 1, 10_400),
      ligne('a', 2, 11_000), ligne('b', 2, 11_050),
    ]);
    expect(e[0]).toMatchObject({ index: 0, nbPilotes: 2, bestMs: 10_000, worstMs: 10_400, ecartMs: 400 });
    expect(e[1].ecartMs).toBe(50);
  });

  it('secteur sans donnée au milieu → présent, neutre', () => {
    const e = ecartsParSecteur([ligne('a', 1, 10_000), ligne('a', 3, 9_000), ligne('b', 3, 9_500)]);
    expect(e).toHaveLength(3);
    expect(e[1]).toMatchObject({ nbPilotes: 0, bestMs: null, ecartMs: 0 });
    expect(e[2].ecartMs).toBe(500);
  });

  it('lignes invalides (ms ≤ 0, index hors borne) ignorées sans crash', () => {
    const e = ecartsParSecteur([ligne('a', 2, 10_000), ligne('b', 2, 0), ligne('c', 2, -5)]);
    expect(e[1].nbPilotes).toBe(1);
    expect(e[1].ecartMs).toBe(0);
  });
});

describe('secteursDisputes', () => {
  it('trie par écart décroissant et écarte les secteurs à moins de 2 pilotes', () => {
    const e = ecartsParSecteur([
      ligne('a', 1, 10_000), ligne('b', 1, 10_100),
      ligne('a', 2, 11_000),
      ligne('a', 3, 9_000), ligne('b', 3, 9_800),
    ]);
    const d = secteursDisputes(e);
    expect(d.map(x => x.index)).toEqual([2, 0]);
    expect(d[0].ecartMs).toBe(800);
  });
});
