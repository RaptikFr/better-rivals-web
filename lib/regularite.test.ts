import { describe, it, expect } from 'vitest';
import {
  decouperSessions,
  scoreSession,
  regulariteConfig,
  SESSION_GAP_MS,
  type TourSession,
} from './regularite';

const MIN = 60_000;

/** n tours consécutifs (1 min d'écart), temps donnés en ms, démarrant à t0. */
function session(tempsMs: number[], t0 = 0): TourSession[] {
  return tempsMs.map((lapMs, i) => ({ lapMs, at: t0 + i * MIN }));
}

describe('decouperSessions', () => {
  it('renvoie [] sans tours', () => {
    expect(decouperSessions([])).toEqual([]);
  });

  it('groupe les tours rapprochés en une session', () => {
    const tours = session([61_000, 60_500, 60_800]);
    expect(decouperSessions(tours)).toHaveLength(1);
  });

  it('coupe sur un trou > gap et trie par date', () => {
    const s1 = session([61_000, 60_500, 60_800]);
    const s2 = session([62_000, 61_500], 3 * MIN + SESSION_GAP_MS + 1);
    // Ordre mélangé en entrée (la table est lue triée DESC).
    const sessions = decouperSessions([...s2, ...s1]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toHaveLength(3);
    expect(sessions[1]).toHaveLength(2);
  });

  it('un trou égal au gap ne coupe pas', () => {
    const tours = [
      { lapMs: 60_000, at: 0 },
      { lapMs: 60_000, at: SESSION_GAP_MS },
      { lapMs: 60_000, at: SESSION_GAP_MS + MIN },
    ];
    expect(decouperSessions(tours)).toHaveLength(1);
  });
});

describe('scoreSession', () => {
  it('null en dessous de 3 tours', () => {
    expect(scoreSession(session([60_000, 60_100]))).toBeNull();
  });

  it('tours identiques → écart nul, métronome', () => {
    const s = scoreSession(session([60_000, 60_000, 60_000, 60_000]))!;
    expect(s.ecartMs).toBe(0);
    expect(s.cv).toBe(0);
    expect(s.niveau).toBe('metronome');
    expect(s.nbTours).toBe(4);
  });

  it('dispersion faible (±0,2 s sur 1 min) → métronome', () => {
    const s = scoreSession(session([60_000, 60_200, 59_800, 60_100]))!;
    expect(s.niveau).toBe('metronome');
    expect(s.ecartMs).toBeGreaterThan(0);
  });

  it('dispersion moyenne (~1 % sur 1 min) → régulier', () => {
    const s = scoreSession(session([60_000, 61_000, 59_200, 60_800]))!;
    expect(s.niveau).toBe('regulier');
  });

  it('grosse dispersion → variable ou pire', () => {
    const s = scoreSession(session([60_000, 63_000, 58_000, 62_500]))!;
    expect(['variable', 'irregulier']).toContain(s.niveau);
  });

  it('exclut le tour raté (> 110 % de la médiane) sans le compter contre le pilote', () => {
    // 4 tours serrés + 1 crash à 80 s : le crash ne doit pas dégrader le score.
    const s = scoreSession(session([60_000, 60_200, 59_900, 60_100, 80_000]))!;
    expect(s.nbTours).toBe(4);
    expect(s.nbToursTotal).toBe(5);
    expect(s.niveau).toBe('metronome');
  });

  it('null si les tours propres restants sont < 3', () => {
    // 2 tours propres + 2 crashs → pas scorable.
    expect(scoreSession(session([60_000, 60_100, 90_000, 95_000]))).toBeNull();
  });

  it('écarte le tour n°1 (départ arrêté) même s\'il passe le filtre médiane', () => {
    // Tour 1 à +3 s (départ arrêté, < 110 % de la médiane) + 3 tours lancés serrés.
    const tours: TourSession[] = [
      { lapMs: 63_000, at: 0,       lapNumber: 1 },
      { lapMs: 60_000, at: MIN,     lapNumber: 2 },
      { lapMs: 60_100, at: 2 * MIN, lapNumber: 3 },
      { lapMs: 59_950, at: 3 * MIN, lapNumber: 4 },
    ];
    const s = scoreSession(tours)!;
    expect(s.nbTours).toBe(3);
    expect(s.niveau).toBe('metronome');
  });

  it('null si, une fois les tours n°1 écartés, il reste < 3 tours', () => {
    const tours: TourSession[] = [
      { lapMs: 63_000, at: 0,       lapNumber: 1 },
      { lapMs: 60_000, at: MIN,     lapNumber: 2 },
      { lapMs: 60_100, at: 2 * MIN, lapNumber: 3 },
    ];
    expect(scoreSession(tours)).toBeNull();
  });

  it('lapNumber absent ou null (ancien relais) : tour compté comme avant', () => {
    const tours: TourSession[] = [
      { lapMs: 60_000, at: 0, lapNumber: null },
      { lapMs: 60_100, at: MIN },
      { lapMs: 60_050, at: 2 * MIN },
    ];
    const s = scoreSession(tours)!;
    expect(s.nbTours).toBe(3);
  });

  it('finSession = horodatage du dernier tour', () => {
    const s = scoreSession(session([60_000, 60_100, 60_050], 1_000_000))!;
    expect(s.finSession).toBe(1_000_000 + 2 * MIN);
  });
});

describe('regulariteConfig', () => {
  it('null sans session scorable', () => {
    expect(regulariteConfig(session([60_000, 60_100]))).toBeNull();
  });

  it('dernière = la plus récente, meilleure = CV le plus bas', () => {
    const reguliere = session([60_000, 60_050, 59_950], 0);            // très serrée
    const dispersee = session([60_000, 61_500, 58_800], 10 * SESSION_GAP_MS); // plus récente, moins serrée
    const r = regulariteConfig([...reguliere, ...dispersee])!;
    expect(r.nbSessions).toBe(2);
    expect(r.derniere.finSession).toBeGreaterThan(r.meilleure.finSession);
    expect(r.meilleure.cv).toBeLessThan(r.derniere.cv);
  });

  it('ignore les sessions trop courtes mais garde les scorables', () => {
    const courte = session([60_000, 60_100], 0);
    const scorable = session([60_000, 60_050, 60_100], 10 * SESSION_GAP_MS);
    const r = regulariteConfig([...courte, ...scorable])!;
    expect(r.nbSessions).toBe(1);
    expect(r.derniere.nbTours).toBe(3);
  });
});
