// Outils sur le texte arabe.

/** Voyelles et signes : U+064B à U+0652, plus le alif suscrit U+0670. */
const DIACRITICS = /[ً-ْٰ]/g;

export function normalizeArabic(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

export function stripVowels(s: string): string {
  return s.replace(DIACRITICS, '').normalize('NFC');
}

export function hasVowels(s: string): boolean {
  return /[ً-ْٰ]/.test(s);
}

/** Lettres, voyelles, alif wasla, tatweel, espaces et ponctuation arabe. */
const ARABIC_ONLY = /^[ء-غـ-ْٰٱ\s،؛؟]+$/;

export function isArabicText(s: string): boolean {
  return ARABIC_ONLY.test(s);
}

/** Les 28 lettres de l'alphabet, dans l'ordre. */
export const ALPHABET = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص',
  'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
] as const;

/** La hamza seule est suivie à part. */
export const HAMZA = 'ء';

/** Une variante se rattache à sa lettre de base (même lettre, autre forme). */
const VARIANT_TO_BASE: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ؤ': 'و',
  'ئ': 'ي', 'ى': 'ي',
  'ة': 'ت',
};

export function baseLetter(ch: string): string {
  return VARIANT_TO_BASE[ch] ?? ch;
}

const TRACKED = new Set<string>([...ALPHABET, HAMZA]);

/** Lettres de base contenues dans un texte, sans doublon, dans l'ordre d'apparition. */
export function lettersOf(s: string): string[] {
  const out: string[] = [];
  for (const ch of stripVowels(s)) {
    const b = baseLetter(ch);
    if (TRACKED.has(b) && !out.includes(b)) out.push(b);
  }
  return out;
}

/** Forme de recherche : sans voyelles, variantes ramenées à leur lettre de base. */
export function arabicSearchKey(s: string): string {
  return [...stripVowels(s)].map(baseLetter).join('');
}

/** Forme de recherche latine : sans accents ni points, sans ʿ ʾ. */
export function latinSearchKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ʿʾ'’`]/g, '')
    .toLowerCase()
    .trim();
}

export function containsArabic(s: string): boolean {
  return /[؀-ۿ]/.test(s);
}
