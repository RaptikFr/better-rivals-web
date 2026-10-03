import { describe, it, expect } from 'vitest';
import { erreurPseudo, echapperMotif, PSEUDO_MAX } from './pseudo';

describe('erreurPseudo', () => {
  it('accepte un gamertag courant', () => {
    expect(erreurPseudo('Raptik FR')).toBeNull();
    expect(erreurPseudo('  Nightmare_38 ')).toBeNull();
  });

  it('refuse un pseudo vide ou composé d\'espaces', () => {
    expect(erreurPseudo('')).not.toBeNull();
    expect(erreurPseudo('   ')).not.toBeNull();
  });

  it('refuse un pseudo trop long', () => {
    expect(erreurPseudo('a'.repeat(PSEUDO_MAX))).toBeNull();
    expect(erreurPseudo('a'.repeat(PSEUDO_MAX + 1))).not.toBeNull();
  });

  it('refuse les caractères qui cassent l\'URL ou le HTML', () => {
    for (const mauvais of ['<b>x', 'a/b', 'a\\b', 'a"b', "a'b", 'a&b', 'a\u0007b']) {
      expect(erreurPseudo(mauvais)).not.toBeNull();
    }
  });
});

describe('echapperMotif', () => {
  it('neutralise les jokers LIKE', () => {
    expect(echapperMotif('a_b')).toBe('a\\_b');
    expect(echapperMotif('%')).toBe('\\%');
    expect(echapperMotif('a\\b')).toBe('a\\\\b');
  });

  it('laisse intact un pseudo sans joker', () => {
    expect(echapperMotif('Raptik FR')).toBe('Raptik FR');
  });
});
