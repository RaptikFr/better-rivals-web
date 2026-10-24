import { describe, it, expect } from 'vitest';
import { computeLeaderChanges, progressionRecords, cleConfigLeader, type LeaderLap } from './leaders';

const lap = (player_id: string, time_ms: number, recorded_at: string, over: Partial<LeaderLap> = {}): LeaderLap => ({
  player_id, time_ms, recorded_at, track_id: 1, car_ordinal: 10, car_class: 'A', drivetrain: 'RWD', ...over,
});

describe('computeLeaderChanges', () => {
  it('émet un détrônage quand un autre joueur passe devant', () => {
    const ch = computeLeaderChanges([
      lap('a', 60_000, '2026-01-01T00:00:00Z'),
      lap('b', 59_000, '2026-01-02T00:00:00Z'),
    ]);
    expect(ch).toHaveLength(1);
    expect(ch[0]).toMatchObject({ newLeaderId: 'b', oldLeaderId: 'a', newTimeMs: 59_000, oldTimeMs: 60_000 });
  });

  it('ignore les améliorations du leader sur lui-même et les temps plus lents', () => {
    const ch = computeLeaderChanges([
      lap('a', 60_000, '2026-01-01T00:00:00Z'),
      lap('a', 58_000, '2026-01-02T00:00:00Z'),
      lap('b', 59_000, '2026-01-03T00:00:00Z'),
    ]);
    expect(ch).toHaveLength(0);
  });

  it('sépare les configs (transmission différente = autre classement)', () => {
    const ch = computeLeaderChanges([
      lap('a', 60_000, '2026-01-01T00:00:00Z'),
      lap('b', 59_000, '2026-01-02T00:00:00Z', { drivetrain: 'AWD' }),
    ]);
    expect(ch).toHaveLength(0);
  });
});

describe('progressionRecords', () => {
  it('garde chaque temps qui bat le record du moment, avec le gain', () => {
    const rows = [
      lap('b', 59_000, '2026-01-03T00:00:00Z'),
      lap('a', 60_000, '2026-01-01T00:00:00Z'),
      lap('a', 59_500, '2026-01-02T00:00:00Z'),
      lap('c', 61_000, '2026-01-04T00:00:00Z'), // plus lent : pas une étape
    ];
    const etapes = progressionRecords(rows).get(cleConfigLeader(rows[0]))!;
    expect(etapes.map(e => [e.player_id, e.time_ms, e.gainMs])).toEqual([
      ['a', 60_000, null],
      ['a', 59_500, 500],
      ['b', 59_000, 500],
    ]);
  });

  it('à date égale, applique le plus lent d’abord', () => {
    const rows = [
      lap('a', 59_000, '2026-01-01T00:00:00Z'),
      lap('b', 60_000, '2026-01-01T00:00:00Z'),
    ];
    const etapes = progressionRecords(rows).get(cleConfigLeader(rows[0]))!;
    expect(etapes.map(e => e.player_id)).toEqual(['b', 'a']);
  });
});
