import { describe, it, expect } from 'vitest';
import { syntheseParVoiture, estNeutre, type RapportCopilote } from './copiloteSynthese';

function rapport(sur: Partial<RapportCopilote>): RapportCopilote {
  return {
    track_id:    7,
    car_ordinal: 3307,
    car_class:   'A',
    drivetrain:  'RWD',
    titre:       'Survirage de puissance',
    conseils:    [],
    created_at:  '2026-07-01T10:00:00Z',
    track_name:  'Circuit de l’autoroute',
    car_label:   '2019 Nissan 370Z Nismo',
    ...sur,
  };
}

describe('estNeutre', () => {
  it('reconnaît un tour sans souci', () => {
    expect(estNeutre('Comportement neutre')).toBe(true);
    expect(estNeutre('Survirage de puissance')).toBe(false);
  });
});

describe('syntheseParVoiture', () => {
  it('regroupe par voiture × classe × transmission, tous circuits confondus', () => {
    const synth = syntheseParVoiture([
      rapport({ track_id: 7,  track_name: 'Autoroute' }),
      rapport({ track_id: 12, track_name: 'Shirakawa' }),
      rapport({ car_class: 'B' }), // autre build → autre carte
    ]);
    expect(synth).toHaveLength(2);
    const a = synth.find(s => s.carClass === 'A')!;
    expect(a.nbDiagnostics).toBe(2);
    expect(a.nbCircuits).toBe(2);
  });

  it('compte les occurrences ET les circuits distincts d’un souci', () => {
    const [s] = syntheseParVoiture([
      rapport({ track_id: 7,  track_name: 'Autoroute' }),
      rapport({ track_id: 7,  track_name: 'Autoroute' }),
      rapport({ track_id: 12, track_name: 'Shirakawa' }),
      rapport({ track_id: 12, track_name: 'Shirakawa', titre: 'Sous-virage en entrée' }),
    ]);
    const survirage = s.soucis.find(x => x.texte === 'Survirage de puissance')!;
    expect(survirage.count).toBe(3);
    expect(survirage.nbCircuits).toBe(2);
    expect(survirage.circuits).toEqual(['Autoroute', 'Shirakawa']);
    const sousVirage = s.soucis.find(x => x.texte === 'Sous-virage en entrée')!;
    expect(sousVirage.nbCircuits).toBe(1);
    // Multi-circuits d'abord.
    expect(s.soucis[0].texte).toBe('Survirage de puissance');
  });

  it('sépare les tours neutres et agrège les conseils', () => {
    const [s] = syntheseParVoiture([
      rapport({ titre: 'Comportement neutre' }),
      rapport({ conseils: ['Assouplir l’antiroulis arrière', 'Baisser la pression AR'] }),
      rapport({ track_id: 12, track_name: 'Shirakawa', conseils: ['Assouplir l’antiroulis arrière'] }),
    ]);
    expect(s.nbNeutres).toBe(1);
    expect(s.soucis.find(x => /neutre/i.test(x.texte))).toBeUndefined();
    expect(s.conseils[0]).toMatchObject({ texte: 'Assouplir l’antiroulis arrière', count: 2, nbCircuits: 2 });
  });

  it('trie les cartes par diagnostic le plus récent', () => {
    const synth = syntheseParVoiture([
      rapport({ created_at: '2026-07-01T10:00:00Z' }),
      rapport({ car_ordinal: 4094, car_label: 'GT-R', created_at: '2026-07-05T10:00:00Z' }),
    ]);
    expect(synth[0].carLabel).toBe('GT-R');
    expect(synth[1].dernierAt).toBe('2026-07-01T10:00:00Z');
  });
});
