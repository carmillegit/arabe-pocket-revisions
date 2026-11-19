import { describe, expect, it } from 'vitest';
import { hasVowels, isArabicText, lettersOf, stripVowels, arabicSearchKey, latinSearchKey } from '../src/domain/arabic';

describe('retrait des voyelles', () => {
  it.each([
    ['قِطَّة', 'قطة'],
    ['كِتَاب', 'كتاب'],
    ['مُدَرِّس', 'مدرس'],
    ['بُرْتُقَالِيّ', 'برتقالي'],
    ['أَرْنَب', 'أرنب'],
    ['دُبّ', 'دب'],
    ['رَحْمٰن', 'رحمن'], // alif suscrit U+0670
    ['كِتَابٌ', 'كتاب'], // tanwin
  ])('%s → %s', (v, plain) => expect(stripVowels(v)).toBe(plain));

  it('garde les hamzas, qui sont des lettres', () => {
    expect(stripVowels('فَأْر')).toBe('فأر');
    expect(stripVowels('مَاء')).toBe('ماء');
  });

  it('détecte la présence de voyelles', () => {
    expect(hasVowels('كتاب')).toBe(false);
    expect(hasVowels('كِتَاب')).toBe(true);
  });
});

describe('contrôle de saisie', () => {
  it('accepte l’arabe vocalisé, les espaces et la ponctuation arabe', () => {
    expect(isArabicText('قِطَّة')).toBe(true);
    expect(isArabicText('هَذَا بَيْت؟')).toBe(true);
  });
  it('refuse les lettres latines et les chiffres', () => {
    expect(isArabicText('qiṭṭa')).toBe(false);
    expect(isArabicText('قطة1')).toBe(false);
    expect(isArabicText('')).toBe(false);
  });
});

describe('lettres d’un mot', () => {
  it('ramène les variantes à la lettre de base', () => {
    expect(lettersOf('امْرَأَة')).toEqual(['ا', 'م', 'ر', 'ت']);
    expect(lettersOf('قِطَّة')).toEqual(['ق', 'ط', 'ت']);
  });
  it('suit la hamza seule à part', () => {
    expect(lettersOf('مَاء')).toEqual(['م', 'ا', 'ء']);
  });
  it('sans doublon', () => {
    expect(lettersOf('بَاب')).toEqual(['ب', 'ا']);
  });
});

describe('recherche', () => {
  it('ignore voyelles et variantes en arabe', () => expect(arabicSearchKey('أَسَد')).toBe(arabicSearchKey('اسد')));
  it('ignore accents et signes en translittération', () => expect(latinSearchKey('ʿuṣfūr')).toBe('usfur'));
});
