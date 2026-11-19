import { describe, expect, it } from 'vitest';
import { segment, skeleton } from '../src/domain/positions';
import { confusables, letterDistractors, LETTERS } from '../src/domain/letters';

const I = 'isolee', D = 'initiale', M = 'mediane', F = 'finale';
const pos = (w: string) => segment(w).map((u) => `${u.text}:${u.position}`);
const expectPos = (w: string, ...p: [string, string][]) => expect(pos(w)).toEqual(p.map(([t, q]) => `${t}:${q}`));

describe('position des lettres (au moins 20 mots)', () => {
  it('كتاب : ب isolée après un alif', () => expectPos('كِتَاب', ['ك', D], ['ت', M], ['ا', F], ['ب', I]));
  it('بيت', () => expectPos('بَيْت', ['ب', D], ['ي', M], ['ت', F]));
  it('لا : ligature comptée comme une unité', () => expectPos('لا', ['لا', I]));
  it('سلام : lam-alif en milieu de mot', () => expectPos('سَلَام', ['س', D], ['لا', F], ['م', I]));
  it('ة finale', () => expectPos('قِطَّة', ['ق', D], ['ط', M], ['ة', F]));
  it('ة isolée après une lettre qui ne se lie pas', () => expectPos('وَرْدَة', ['و', I], ['ر', I], ['د', I], ['ة', I]));
  it('مدرس', () => expectPos('مُدَرِّس', ['م', D], ['د', F], ['ر', I], ['س', I]));
  it('مدرسة', () => expectPos('مَدْرَسَة', ['م', D], ['د', F], ['ر', I], ['س', D], ['ة', F]));
  it('أرنب', () => expectPos('أَرْنَب', ['أ', I], ['ر', I], ['ن', D], ['ب', F]));
  it('دجاجة', () => expectPos('دَجَاجَة', ['د', I], ['ج', D], ['ا', F], ['ج', D], ['ة', F]));
  it('باب', () => expectPos('بَاب', ['ب', D], ['ا', F], ['ب', I]));
  it('دب', () => expectPos('دُبّ', ['د', I], ['ب', I]));
  it('شمس', () => expectPos('شَمْس', ['ش', D], ['م', M], ['س', F]));
  it('ماء : hamza seule', () => expectPos('مَاء', ['م', D], ['ا', F], ['ء', I]));
  it('عصفور', () => expectPos('عُصْفُور', ['ع', D], ['ص', M], ['ف', M], ['و', F], ['ر', I]));
  it('رجال', () => expectPos('رِجَال', ['ر', I], ['ج', D], ['ا', F], ['ل', I]));
  it('امرأة', () => expectPos('امْرَأَة', ['ا', I], ['م', D], ['ر', F], ['أ', I], ['ة', I]));
  it('يد', () => expectPos('يَد', ['ي', D], ['د', F]));
  it('قلم', () => expectPos('قَلَم', ['ق', D], ['ل', M], ['م', F]));
  it('ثلج', () => expectPos('ثَلْج', ['ث', D], ['ل', M], ['ج', F]));
  it('تلميذ', () => expectPos('تِلْمِيذ', ['ت', D], ['ل', M], ['م', M], ['ي', M], ['ذ', F]));
  it('أزرق', () => expectPos('أَزْرَق', ['أ', I], ['ز', I], ['ر', I], ['ق', I]));
  it('بنفسجي', () => expectPos('بَنَفْسَجِيّ', ['ب', D], ['ن', M], ['ف', M], ['س', M], ['ج', M], ['ي', F]));
  it('plusieurs mots', () => expectPos('بَيْت كَبِير', ['ب', D], ['ي', M], ['ت', F], ['ك', D], ['ب', M], ['ي', M], ['ر', F]));
});

describe('squelette sans points', () => {
  it('retire points, hamza et voyelles', () => {
    expect(skeleton('بَيْت')).toBe('ٮٮٮ');
    expect(skeleton('نُون')).toBe('ٮوں');
    expect(skeleton('أَرْنَب')).toBe('ارٮٮ');
    expect(skeleton('قَهْوَة')).toBe('ڡهوه');
    expect(skeleton('شَجَرَة')).toBe('سحره');
  });
});

describe('lettres', () => {
  it('28 lettres', () => expect(LETTERS.length).toBe(28));
  it('paires qui piègent', () => {
    expect(confusables('ح').sort()).toEqual(['ج', 'خ', 'ه'].sort());
    expect(confusables('ق')).toContain('ك');
    expect(confusables('ض')).toContain('د');
  });
  it('trois distracteurs distincts, jamais la lettre elle-même', () => {
    for (const l of LETTERS) {
      for (let i = 0; i < 50; i++) {
        const d = letterDistractors(l.letter);
        expect(d.length).toBe(3);
        expect(new Set(d).size).toBe(3);
        expect(d).not.toContain(l.letter);
      }
    }
  });
});
