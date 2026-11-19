// Exercices de lecture : mot → translittération, lettre → nom et son.
import { stripVowels } from './arabic';
import { LETTERS, LETTER_BY_CHAR, letterDistractors } from './letters';
import { shuffle, type Rng } from './quiz';
import type { Answer, Word } from './types';

/** Clé de comparaison exacte : en lecture, ḥ et h, ā et a sont des réponses différentes. */
const exactKey = (s: string) => s.normalize('NFC').trim().toLowerCase();

/** Substitutions qui testent un vrai déchiffrage : voyelles longues, emphatiques, lettres proches. */
const SWAPS: [string, string][] = [
  ['ā', 'a'], ['ī', 'i'], ['ū', 'u'],
  ['ḥ', 'h'], ['ṣ', 's'], ['ṭ', 't'], ['ḍ', 'd'], ['ẓ', 'z'],
  ['q', 'k'], ['ʿ', 'ʾ'], ['th', 't'], ['dh', 'd'], ['kh', 'h'], ['gh', 'r'],
];

/** Variantes « presque justes » d'une translittération (une seule différence chacune). */
export function nearMisses(t: string, withVowels: boolean): string[] {
  const out = new Set<string>();
  for (const [a, b] of SWAPS) {
    // Sans voyelles, on ne peut pas distinguer a/ā : on ne piège que sur les consonnes.
    if (!withVowels && ['ā', 'ī', 'ū'].includes(a)) continue;
    for (const [from, to] of [[a, b], [b, a]]) {
      let i = t.indexOf(from);
      while (i !== -1) {
        // Ne pas couper un digramme (kh, sh, th, dh, gh).
        const splitsDigraph =
          from.length === 1 &&
          ((from === 'h' && /[kstdg]/.test(t[i - 1] ?? '')) || (/[kstdg]/.test(from) && t[i + 1] === 'h'));
        if (splitsDigraph) {
          i = t.indexOf(from, i + 1);
          continue;
        }
        const v = t.slice(0, i) + to + t.slice(i + from.length);
        if (exactKey(v) !== exactKey(t)) out.add(v);
        i = t.indexOf(from, i + 1);
      }
    }
  }
  // Consonne doublée (chadda) oubliée ou ajoutée.
  for (let i = 1; i < t.length; i++) {
    if (t[i] === t[i - 1] && /[a-zḥṣṭḍẓ]/.test(t[i])) out.add(t.slice(0, i) + t.slice(i + 1));
  }
  return [...out];
}

export interface TextChoice {
  text: string;
  correct: boolean;
}

/** QCM mot → translittération : jusqu'à 2 pièges proches, puis les translittérations d'autres mots. */
export function translitChoices(target: Word, pool: Word[], withVowels: boolean, rng: Rng = Math.random): TextChoice[] {
  const right = target.transliteration;
  const seen = new Set([exactKey(right)]);
  const picks: string[] = [];
  const add = (s: string) => {
    const k = exactKey(s);
    if (!s.trim() || seen.has(k) || picks.length >= 3) return;
    seen.add(k);
    picks.push(s);
  };
  for (const v of shuffle(nearMisses(right, withVowels), rng).slice(0, 2)) add(v);
  const plain = stripVowels(target.arabicVoweled);
  const others = shuffle(
    pool.filter(
      (w) =>
        w.id !== target.id &&
        w.transliteration &&
        // Sans voyelles, deux mots de même squelette seraient indiscernables.
        (withVowels || stripVowels(w.arabicVoweled) !== plain),
    ),
    rng,
  );
  // D'abord des mots de longueur proche : plus difficile à éliminer d'un coup d'œil.
  others.sort((a, b) => Math.abs(a.transliteration.length - right.length) - Math.abs(b.transliteration.length - right.length));
  for (const w of others) add(w.transliteration);
  return shuffle([{ text: right, correct: true }, ...picks.map((text) => ({ text, correct: false }))], rng);
}

/** QCM lettre → nom, ou lettre → son. */
export function letterChoices(letter: string, field: 'name' | 'sound', rng: Rng = Math.random): TextChoice[] {
  const info = LETTER_BY_CHAR.get(letter)!;
  const ds = letterDistractors(letter, 3, rng).map((l) => LETTER_BY_CHAR.get(l)!);
  return shuffle(
    [info, ...ds].map((x) => ({ text: x[field], correct: x.letter === letter })),
    rng,
  );
}

/** QCM « paires qui piègent » : un nom et un son, quatre lettres qui se ressemblent. */
export function pairChoices(letter: string, rng: Rng = Math.random): { letter: string; correct: boolean }[] {
  return shuffle(
    [letter, ...letterDistractors(letter, 3, rng)].map((l) => ({ letter: l, correct: l === letter })),
    rng,
  );
}

export const UNLOCK_WINDOW = 20;
export const UNLOCK_RATE = 0.8;

/** « Sans voyelles » se débloque à 80 % de réussite sur les 20 dernières réponses « avec voyelles ». */
export function unlockProgress(answers: Answer[]): { count: number; rate: number; unlocked: boolean } {
  const last = answers
    .filter((a) => a.exercise === 'lecture_v')
    .sort((a, b) => b.at - a.at)
    .slice(0, UNLOCK_WINDOW);
  const ok = last.filter((a) => a.correct).length;
  const rate = last.length ? ok / last.length : 0;
  return { count: last.length, rate, unlocked: last.length >= UNLOCK_WINDOW && rate >= UNLOCK_RATE };
}

export const ALL_LETTERS = LETTERS.map((l) => l.letter);
