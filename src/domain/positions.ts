// Découpage d'un mot en lettres, avec leur position (initiale, médiane, finale, isolée).
// Calcul par règles, sans IA. Les voyelles sont ignorées.
import { baseLetter, stripVowels } from './arabic';
import type { Position } from './letters';

/** Lettres qui ne se lient pas à la suivante. */
const NO_JOIN_NEXT = new Set([...'اأإآٱدذرزوؤةء']);
/** La hamza seule ne se lie à aucune voisine. */
const NO_JOIN_PREV = new Set(['ء']);
const ALIFS = new Set([...'اأإآٱ']);

export interface Unit {
  /** Texte de l'unité : une lettre, ou la ligature lam-alif (لا, لأ…). */
  text: string;
  position: Position;
}

/** Découpe un texte (sans tenir compte des voyelles) en unités positionnées. Les espaces séparent les mots. */
export function segment(text: string): Unit[] {
  const out: Unit[] = [];
  for (const word of stripVowels(text).split(/\s+/).filter(Boolean)) {
    const chars = [...word].filter((c) => /[ء-يٱ]/.test(c));
    const units: string[] = [];
    for (let i = 0; i < chars.length; i++) {
      // Ligature lam-alif : comptée comme une seule unité.
      if (chars[i] === 'ل' && ALIFS.has(chars[i + 1])) {
        units.push(chars[i] + chars[i + 1]);
        i++;
      } else units.push(chars[i]);
    }
    const joinsNext = (u: string) => u.length === 1 && !NO_JOIN_NEXT.has(u);
    const joinsPrev = (u: string) => !NO_JOIN_PREV.has(u[0]);
    units.forEach((u, i) => {
      const prev = i > 0 && joinsNext(units[i - 1]) && joinsPrev(u);
      const next = i < units.length - 1 && joinsNext(u) && joinsPrev(units[i + 1]);
      out.push({ text: u, position: prev && next ? 'mediane' : prev ? 'finale' : next ? 'initiale' : 'isolee' });
    });
  }
  return out;
}

/** Squelette sans points ni hamza, pour la première passe du tracé. */
const SKELETON: Record<string, string | ((p: Position) => string)> = {
  'ب': 'ٮ', 'ت': 'ٮ', 'ث': 'ٮ',
  'ن': (p) => (p === 'initiale' || p === 'mediane' ? 'ٮ' : 'ں'),
  'ي': (p) => (p === 'initiale' || p === 'mediane' ? 'ٮ' : 'ى'),
  'ئ': (p) => (p === 'initiale' || p === 'mediane' ? 'ٮ' : 'ى'),
  'ج': 'ح', 'خ': 'ح',
  'ذ': 'د', 'ز': 'ر', 'ش': 'س', 'ض': 'ص', 'ظ': 'ط', 'غ': 'ع',
  'ف': 'ڡ',
  'ق': (p) => (p === 'initiale' || p === 'mediane' ? 'ڡ' : 'ٯ'),
  'ة': 'ه',
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ؤ': 'و',
};

export function skeleton(text: string): string {
  const words = stripVowels(text).split(/\s+/).filter(Boolean);
  return words
    .map((w) =>
      segment(w)
        .map((u) =>
          [...u.text]
            .map((ch, k) => {
              const rule = SKELETON[ch];
              const pos = u.text.length > 1 ? (k === 0 ? u.position : 'finale') : u.position;
              return rule === undefined ? ch : typeof rule === 'string' ? rule : rule(pos);
            })
            .join(''),
        )
        .join(''),
    )
    .join(' ');
}

const ZWJ = '‍';

/** Forme affichée d'une unité selon sa position (liant invisible pour forcer la forme liée). */
export function unitForm(text: string, position: Position): string {
  const joinsNext = text.length === 1 && !NO_JOIN_NEXT.has(text);
  switch (position) {
    case 'isolee':
      return text;
    case 'initiale':
      return joinsNext ? text + ZWJ : text;
    case 'mediane':
      return ZWJ + text + (joinsNext ? ZWJ : '');
    case 'finale':
      return ZWJ + text;
  }
}

/** Lettres de base à compter pour une unité (la ligature lam-alif compte ل puis ا final). */
export function unitLetters(u: Unit): { letter: string; position: Position }[] {
  const base = (ch: string) => baseLetter(ch);
  if (u.text.length > 1) {
    return [
      { letter: base(u.text[0]), position: u.position },
      { letter: base(u.text[1]), position: 'finale' },
    ];
  }
  return [{ letter: base(u.text), position: u.position }];
}
