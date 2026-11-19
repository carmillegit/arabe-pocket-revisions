import { describe, expect, it } from 'vitest';
import { buildChoices, pickDistractors } from '../src/domain/quiz';
import { createWord, createWithPlural } from '../src/domain/words';
import { arabicSearchKey, latinSearchKey } from '../src/domain/arabic';

const mk = (ar: string, fr: string, cat = 'Animaux') =>
  createWord({ arabicVoweled: ar, transliteration: '', french: fr, category: cat }, 'u');

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

describe('distracteurs', () => {
  const [rajul, rijal] = createWithPlural(
    { arabicVoweled: 'رَجُل', transliteration: 'rajul', french: 'homme', category: 'Personnes' },
    { arabicVoweled: 'رِجَال', transliteration: 'rijāl', french: 'hommes' }, 'u');
  const [imra, nisa] = createWithPlural(
    { arabicVoweled: 'امْرَأَة', transliteration: 'imraʾa', french: 'femme', category: 'Personnes' },
    { arabicVoweled: 'نِسَاء', transliteration: 'nisāʾ', french: 'femmes' }, 'u');
  const pool = [
    rajul, rijal, imra, nisa,
    mk('قِطَّة', 'chat'), mk('كَلْب', 'chien'), mk('قط', 'Chat'), // doublon de réponse « chat »
    mk('أَسَد', 'lion'), mk('دُبّ', 'ours'),
    mk('بَيْت', 'maison', 'Mots de base'),
  ];

  it('quatre choix distincts, une seule bonne réponse, sur 500 tirages', () => {
    const rng = seeded(42);
    for (let i = 0; i < 500; i++) {
      for (const target of pool) {
        for (const dir of ['ar_fr', 'fr_ar'] as const) {
          const c = buildChoices(target, pool, dir, rng);
          expect(c.length).toBe(4);
          expect(c.filter((x) => x.correct).length).toBe(1);
          const keys = c.map((x) => (dir === 'ar_fr' ? latinSearchKey(x.text) : arabicSearchKey(x.text)));
          expect(new Set(keys).size).toBe(4);
        }
      }
    }
  });

  it('jamais le singulier et son pluriel ensemble', () => {
    const rng = seeded(7);
    for (let i = 0; i < 500; i++) {
      for (const t of [rajul, rijal, mk('طِفْل', 'enfant', 'Personnes')]) {
        const ids = [t.id, ...pickDistractors(t, pool, 'ar_fr', 3, rng).map((w) => w.id)];
        expect(ids.includes(rajul.id) && ids.includes(rijal.id)).toBe(false);
        expect(ids.includes(imra.id) && ids.includes(nisa.id)).toBe(false);
      }
    }
  });

  it('privilégie la même catégorie', () => {
    const d = pickDistractors(pool[4], pool, 'ar_fr', 3, seeded(1));
    expect(d.every((w) => w.category === 'Animaux')).toBe(true);
  });

  it('moins de choix quand il y a trop peu de mots', () => {
    const small = [mk('قِطَّة', 'chat'), mk('كَلْب', 'chien')];
    expect(buildChoices(small[0], small, 'ar_fr').length).toBe(2);
  });
});
