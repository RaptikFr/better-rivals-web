import { describe, it, expect } from 'vitest';
import { estDepassement, cibleBattue, rivauxDepasses } from './notifRecords';

describe('estDepassement', () => {
  it('premier chrono : toute cible devant est dépassée', () => {
    expect(estDepassement(null, 60_000)).toBe(true);
  });
  it('la cible devait être devant l’ancien temps', () => {
    expect(estDepassement(61_000, 60_000)).toBe(true);
    expect(estDepassement(59_000, 60_000)).toBe(false);
    expect(estDepassement(60_000, 60_000)).toBe(false);
  });
});

describe('cibleBattue', () => {
  const cible = { player_id: 'b', time_ms: 60_000 };

  it('notifie quand on passe devant une cible qui nous précédait', () => {
    expect(cibleBattue(59_000, 61_000, cible)).toBe(true);
    expect(cibleBattue(59_000, null, cible)).toBe(true);
  });
  it('ne notifie pas sans cible ou sans la battre', () => {
    expect(cibleBattue(59_000, null, null)).toBe(false);
    expect(cibleBattue(60_000, null, cible)).toBe(false); // égalité : pas battue
    expect(cibleBattue(60_500, 61_000, cible)).toBe(false);
  });
  it('ne renotifie pas un joueur déjà devant qui s’améliore', () => {
    expect(cibleBattue(58_000, 59_000, cible)).toBe(false);
  });
});

describe('rivauxDepasses', () => {
  it('ne garde que les suiveurs réellement dépassés', () => {
    const rivaux = [
      { player_id: 'devant',  time_ms: 55_000 }, // toujours devant
      { player_id: 'depasse', time_ms: 59_500 }, // était devant (60 s), désormais derrière
      { player_id: 'derriere', time_ms: 62_000 }, // était déjà derrière
    ];
    expect(rivauxDepasses(59_000, 60_000, rivaux).map(r => r.player_id)).toEqual(['depasse']);
  });
});
