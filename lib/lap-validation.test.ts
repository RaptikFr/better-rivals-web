import { describe, it, expect } from 'vitest';
import {
  formatTime,
  bornesTempsMs,
  identifiantsValides,
  tempsDansBornes,
  plusRapideQueRecord,
} from './lap-validation';

describe('formatTime', () => {
  it('formate mm:ss.mmm avec zéros de remplissage', () => {
    expect(formatTime(0)).toBe('00:00.000');
    expect(formatTime(1234)).toBe('00:01.234');
    expect(formatTime(83_456)).toBe('01:23.456');
    expect(formatTime(600_000)).toBe('10:00.000');
  });
});

describe('bornesTempsMs', () => {
  it('circuit : bornes resserrées (20–100 m/s ± 20 %)', () => {
    const { minMs, maxMs } = bornesTempsMs(5, false); // 5 km
    // min = 5000 m / 100 m/s = 50 s × 0,8 = 40 s
    expect(minMs).toBeCloseTo(40_000);
    // max = 5000 m / 20 m/s = 250 s × 1,2 = 300 s
    expect(maxMs).toBeCloseTo(300_000);
  });

  it('sprint : bornes beaucoup plus larges que circuit', () => {
    const sprint  = bornesTempsMs(5, true);
    const circuit = bornesTempsMs(5, false);
    expect(sprint.minMs).toBeLessThan(circuit.minMs);
    expect(sprint.maxMs).toBeGreaterThan(circuit.maxMs);
  });
});

describe('identifiantsValides', () => {
  it('accepte des entiers positifs', () => {
    expect(identifiantsValides({ trackId: 12, carOrdinal: 4094, timeMs: 90_000 })).toBe(true);
  });

  it('rejette zéro, négatif, NaN et non-entier', () => {
    expect(identifiantsValides({ trackId: 0,   carOrdinal: 1, timeMs: 1 })).toBe(false);
    expect(identifiantsValides({ trackId: -1,  carOrdinal: 1, timeMs: 1 })).toBe(false);
    expect(identifiantsValides({ trackId: NaN, carOrdinal: 1, timeMs: 1 })).toBe(false);
    expect(identifiantsValides({ trackId: 1.5, carOrdinal: 1, timeMs: 1 })).toBe(false);
    expect(identifiantsValides({ trackId: 1,   carOrdinal: 1, timeMs: 0 })).toBe(false);
    expect(identifiantsValides({ trackId: 1,   carOrdinal: 1, timeMs: NaN })).toBe(false);
  });
});

describe('tempsDansBornes', () => {
  it('accepte un temps dans les bornes', () => {
    expect(tempsDansBornes(120_000, 5, false)).toBe(true); // 2 min sur 5 km
  });

  it('rejette un temps trop rapide ou trop lent', () => {
    expect(tempsDansBornes(30_000,  5, false)).toBe(false); // < 40 s
    expect(tempsDansBornes(400_000, 5, false)).toBe(false); // > 300 s
  });

  it('ne filtre pas si la longueur est inconnue (≤ 0)', () => {
    expect(tempsDansBornes(1, 0, false)).toBe(true);
    expect(tempsDansBornes(1, -3, false)).toBe(true);
  });

  it('accepte aux bornes exactes', () => {
    const { minMs, maxMs } = bornesTempsMs(5, false);
    expect(tempsDansBornes(minMs, 5, false)).toBe(true);
    expect(tempsDansBornes(maxMs, 5, false)).toBe(true);
  });
});

describe('plusRapideQueRecord', () => {
  it('rejette un temps sous 98,5 % du record', () => {
    expect(plusRapideQueRecord(98_000, 100_000)).toBe(true); // 98 % → trop rapide
  });

  it('tolère un temps juste au-dessus du seuil', () => {
    expect(plusRapideQueRecord(98_500, 100_000)).toBe(false); // exactement 98,5 %
    expect(plusRapideQueRecord(99_000, 100_000)).toBe(false);
  });

  it('ne juge pas en l’absence de record de référence', () => {
    expect(plusRapideQueRecord(1, null)).toBe(false);
    expect(plusRapideQueRecord(1, undefined)).toBe(false);
    expect(plusRapideQueRecord(1, 0)).toBe(false);
  });
});
