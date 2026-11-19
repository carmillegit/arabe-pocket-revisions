// Table fixe des 28 lettres (plus la hamza seule), avec familles de forme et de son.
import type { Rng } from './quiz';
import { shuffle } from './quiz';

export interface LetterInfo {
  letter: string;
  /** Nom translittéré (alif, bāʾ…). */
  name: string;
  /** Nom écrit en arabe, vocalisé. */
  nameAr: string;
  /** Translittération du son. */
  sound: string;
  /** Description du son en français. */
  soundHint: string;
  /** Lettres de même squelette (seuls les points changent). */
  shapeFamily: string;
  dots: { count: number; position: 'dessus' | 'dessous' | 'aucun' };
  /** Se lie à la lettre suivante ? (ا د ذ ر ز و : non) */
  joinsNext: boolean;
}

const L = (
  letter: string,
  name: string,
  nameAr: string,
  sound: string,
  soundHint: string,
  shapeFamily: string,
  dots: number,
  pos: 'dessus' | 'dessous' | 'aucun',
  joinsNext = true,
): LetterInfo => ({ letter, name, nameAr, sound, soundHint, shapeFamily, dots: { count: dots, position: pos }, joinsNext });

export const LETTERS: LetterInfo[] = [
  L('ا', 'alif', 'أَلِف', 'ā', 'a long ; porte aussi la hamza', 'ا', 0, 'aucun', false),
  L('ب', 'bāʾ', 'بَاء', 'b', 'b comme en français', 'ب', 1, 'dessous'),
  L('ت', 'tāʾ', 'تَاء', 't', 't comme en français', 'ب', 2, 'dessus'),
  L('ث', 'thāʾ', 'ثَاء', 'th', 'th anglais de « think »', 'ب', 3, 'dessus'),
  L('ج', 'jīm', 'جِيم', 'j', 'dj', 'ح', 1, 'dessous'),
  L('ح', 'ḥāʾ', 'حَاء', 'ḥ', 'h soufflé du fond de la gorge', 'ح', 0, 'aucun'),
  L('خ', 'khāʾ', 'خَاء', 'kh', 'comme la jota espagnole', 'ح', 1, 'dessus'),
  L('د', 'dāl', 'دَال', 'd', 'd comme en français', 'د', 0, 'aucun', false),
  L('ذ', 'dhāl', 'ذَال', 'dh', 'th anglais de « this »', 'د', 1, 'dessus', false),
  L('ر', 'rāʾ', 'رَاء', 'r', 'r roulé', 'ر', 0, 'aucun', false),
  L('ز', 'zāy', 'زَاي', 'z', 'z comme en français', 'ر', 1, 'dessus', false),
  L('س', 'sīn', 'سِين', 's', 's léger', 'س', 0, 'aucun'),
  L('ش', 'shīn', 'شِين', 'sh', 'ch comme dans « chat »', 'س', 3, 'dessus'),
  L('ص', 'ṣād', 'صَاد', 'ṣ', 's emphatique (langue large, son grave)', 'ص', 0, 'aucun'),
  L('ض', 'ḍād', 'ضَاد', 'ḍ', 'd emphatique', 'ص', 1, 'dessus'),
  L('ط', 'ṭāʾ', 'طَاء', 'ṭ', 't emphatique', 'ط', 0, 'aucun'),
  L('ظ', 'ẓāʾ', 'ظَاء', 'ẓ', 'dh emphatique', 'ط', 1, 'dessus'),
  L('ع', 'ʿayn', 'عَيْن', 'ʿ', 'son de gorge serrée', 'ع', 0, 'aucun'),
  L('غ', 'ghayn', 'غَيْن', 'gh', 'r grasseyé', 'ع', 1, 'dessus'),
  L('ف', 'fāʾ', 'فَاء', 'f', 'f comme en français', 'ف', 1, 'dessus'),
  L('ق', 'qāf', 'قَاف', 'q', 'k profond, au fond de la gorge', 'ف', 2, 'dessus'),
  L('ك', 'kāf', 'كَاف', 'k', 'k comme en français', 'ك', 0, 'aucun'),
  L('ل', 'lām', 'لَام', 'l', 'l comme en français', 'ل', 0, 'aucun'),
  L('م', 'mīm', 'مِيم', 'm', 'm comme en français', 'م', 0, 'aucun'),
  L('ن', 'nūn', 'نُون', 'n', 'n comme en français', 'ب', 1, 'dessus'),
  L('ه', 'hāʾ', 'هَاء', 'h', 'h expiré, léger', 'ه', 0, 'aucun'),
  L('و', 'wāw', 'وَاو', 'w / ū', 'w de « ouate », ou ū long', 'و', 0, 'aucun', false),
  L('ي', 'yāʾ', 'يَاء', 'y / ī', 'y de « yeux », ou ī long', 'ب', 2, 'dessous'),
];

export const HAMZA_INFO = { letter: 'ء', name: 'hamza', sound: 'ʾ', soundHint: 'coup de glotte' };

export const LETTER_BY_CHAR = new Map(LETTERS.map((l) => [l.letter, l]));

/** Paires qui piègent : sons proches, à distinguer (cahier des charges). */
export const SOUND_GROUPS = ['حخه', 'صس', 'ضد', 'طت', 'ظذ', 'قك', 'عغ'];

export const LETTER_ITEM_PREFIX = 'L:';
export const letterItemId = (l: string) => `${LETTER_ITEM_PREFIX}${l}`;
export const isLetterItem = (id: string) => id.startsWith(LETTER_ITEM_PREFIX);
export const letterOfItem = (id: string) => id.slice(LETTER_ITEM_PREFIX.length);

/** Lettres qui ressemblent à `l` (même squelette ou son proche). */
export function confusables(l: string): string[] {
  const info = LETTER_BY_CHAR.get(l);
  const out = new Set<string>();
  if (info) for (const x of LETTERS) if (x.shapeFamily === info.shapeFamily) out.add(x.letter);
  for (const g of SOUND_GROUPS) if (g.includes(l)) for (const ch of g) out.add(ch);
  out.delete(l);
  return [...out];
}

/** Trois lettres pièges pour `l` : d'abord les confusables, puis au hasard. */
export function letterDistractors(l: string, n = 3, rng: Rng = Math.random): string[] {
  const near = shuffle(confusables(l), rng).slice(0, n);
  const others = shuffle(
    LETTERS.map((x) => x.letter).filter((x) => x !== l && !near.includes(x)),
    rng,
  );
  return [...near, ...others].slice(0, n);
}

export type Position = 'isolee' | 'initiale' | 'mediane' | 'finale';
export const POSITION_LABEL: Record<Position, string> = {
  isolee: 'isolée',
  initiale: 'en début de mot',
  mediane: 'en milieu de mot',
  finale: 'en fin de mot',
};

const ZWJ = '‍';

/** Forme d'une lettre selon sa position (rendue par la police grâce au liant invisible). */
export function letterForm(l: string, pos: Position): string {
  const joinsNext = LETTER_BY_CHAR.get(l)?.joinsNext ?? false;
  switch (pos) {
    case 'isolee':
      return l;
    case 'initiale':
      return joinsNext ? l + ZWJ : l;
    case 'mediane':
      return joinsNext ? ZWJ + l + ZWJ : ZWJ + l;
    case 'finale':
      return ZWJ + l;
  }
}
