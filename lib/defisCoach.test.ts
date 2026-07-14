import { describe, it, expect } from 'vitest';
import { cibleDefi, DEFI_ECART_MIN_MS, DEFI_GAIN_MIN_MS, DEFI_GAIN_MAX_MS } from './defisCoach';

describe('cibleDefi', () => {
  it('je détiens le meilleur secteur → pas de défi', () => {
    expect(cibleDefi(12_000, 12_000)).toBeNull();
    expect(cibleDefi(11_900, 12_000)).toBeNull();
  });

  it('trop proche du meilleur (< écart minimal) → pas de défi', () => {
    expect(cibleDefi(12_000 + DEFI_ECART_MIN_MS - 1, 12_000)).toBeNull();
  });

  it('écart moyen → 30 % de l’écart, arrondi aux 10 ms', () => {
    // écart 800 ms → 30 % = 240 ms.
    const p = cibleDefi(12_800, 12_000)!;
    expect(p.gainMs).toBe(240);
    expect(p.targetMs).toBe(12_560);
  });

  it('petit écart → gain plancher de 100 ms, cible jamais sous le meilleur', () => {
    // écart 150 ms → 30 % = 45 ms, remonté à 100 ms ; cible = 12 050 ≥ best.
    const p = cibleDefi(12_150, 12_000)!;
    expect(p.gainMs).toBe(DEFI_GAIN_MIN_MS);
    expect(p.targetMs).toBe(12_050);
    expect(p.targetMs).toBeGreaterThanOrEqual(12_000);
  });

  it('gros écart → gain plafonné à 1 s', () => {
    // écart 8 s → 30 % = 2,4 s, plafonné à 1 s.
    const p = cibleDefi(20_000, 12_000)!;
    expect(p.gainMs).toBe(DEFI_GAIN_MAX_MS);
    expect(p.targetMs).toBe(19_000);
  });

  it('entrées invalides → null', () => {
    expect(cibleDefi(NaN, 12_000)).toBeNull();
    expect(cibleDefi(12_000, 0)).toBeNull();
    expect(cibleDefi(-5, -10)).toBeNull();
  });
});
