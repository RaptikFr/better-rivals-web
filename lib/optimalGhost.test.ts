import { describe, it, expect } from 'vitest';
import { construireFantomeOptimal, type CandidatFantome } from './optimalGhost';

// Deux tours synthétiques sur 200 m (d 0..200), 2 secteurs égaux (0-100 / 100-200) :
//  • A est plus rapide sur le 1er secteur (3 s vs 4 s), plus lent sur le 2e (6 s vs 4 s) ;
//  • B est l'inverse. Le fantôme recollé doit donc prendre A puis B.
function candidatA(): CandidatFantome {
  return {
    pseudo: 'A', timeMs: 9000,
    d: [0, 50, 100, 150, 200],
    t: [0, 1.5, 3, 6, 9],
    v: [100, 110, 120, 60, 70],
  };
}
function candidatB(): CandidatFantome {
  return {
    pseudo: 'B', timeMs: 8000,
    d: [0, 50, 100, 150, 200],
    t: [0, 2, 4, 6, 8],
    v: [90, 95, 100, 130, 140],
  };
}

describe('construireFantomeOptimal', () => {
  it('recolle chaque secteur sur le candidat le plus rapide à cet endroit', () => {
    const g = construireFantomeOptimal([candidatA(), candidatB()], 2);
    expect(g).not.toBeNull();
    expect(g!.seams).toHaveLength(2);
    expect(g!.seams[0].pseudo).toBe('A'); // secteur 1 : A en 3s vs B en 4s
    expect(g!.seams[0].durMs).toBe(3000);
    expect(g!.seams[1].pseudo).toBe('B'); // secteur 2 : B en 4s vs A en 3s
    expect(g!.seams[1].durMs).toBe(4000);
    expect(g!.timeMs).toBe(7000); // 3s + 4s, plus rapide que A (9s) et B (8s)
  });

  it('recale l\'horloge du 2e secteur sur le temps cumulé (pas de trou ni de retour en arrière)', () => {
    const g = construireFantomeOptimal([candidatA(), candidatB()], 2);
    // Le premier point du 2e secteur doit démarrer exactement à la fin du 1er (3s).
    const idxFrontiere = g!.d.findIndex(x => x >= 0.5);
    expect(g!.t[idxFrontiere]).toBeCloseTo(3, 5);
    // Le temps ne recule jamais.
    for (let i = 1; i < g!.t.length; i++) expect(g!.t[i]).toBeGreaterThanOrEqual(g!.t[i - 1]);
    // La distance normalisée couvre bien 0..1.
    expect(g!.d[0]).toBeCloseTo(0, 5);
    expect(g!.d[g!.d.length - 1]).toBeCloseTo(1, 5);
  });

  it('un seul candidat : le fantôme est identique à ce tour (rien à recoller)', () => {
    const g = construireFantomeOptimal([candidatA()], 2);
    expect(g).not.toBeNull();
    expect(g!.timeMs).toBe(9000);
    expect(g!.seams.every(s => s.pseudo === 'A')).toBe(true);
  });

  it('aucun candidat exploitable → null', () => {
    expect(construireFantomeOptimal([], 5)).toBeNull();
    expect(construireFantomeOptimal([{ pseudo: 'X', timeMs: 1000, d: [0], t: [0], v: [0] }], 5)).toBeNull();
  });

  it('n < 2 → null', () => {
    expect(construireFantomeOptimal([candidatA()], 1)).toBeNull();
    expect(construireFantomeOptimal([candidatA()], 0)).toBeNull();
  });

  it('ignore les candidats malformés et garde les exploitables', () => {
    const malforme: CandidatFantome = { pseudo: 'Z', timeMs: 500, d: [0, 10], t: [0], v: [0, 1] }; // t trop court
    const g = construireFantomeOptimal([malforme, candidatB()], 2);
    expect(g).not.toBeNull();
    expect(g!.seams.every(s => s.pseudo === 'B')).toBe(true);
  });
});
