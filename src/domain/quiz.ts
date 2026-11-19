// Génération des QCM : une bonne réponse, des choix distincts, ordre aléatoire.
import { arabicSearchKey, latinSearchKey } from './arabic';
import type { Word } from './types';

export type Rng = () => number;

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Direction = 'ar_fr' | 'fr_ar';

export function answerText(w: Word, dir: Direction): string {
  return dir === 'ar_fr' ? w.french : w.arabicVoweled;
}

/** Clé de comparaison : deux réponses identiques à l'écran ne doivent jamais coexister. */
function compareKey(text: string, dir: Direction): string {
  return dir === 'ar_fr' ? latinSearchKey(text) : arabicSearchKey(text);
}

function isLinked(a: Word, b: Word): boolean {
  return a.linkedWordId === b.id || b.linkedWordId === a.id;
}

/**
 * Choisit jusqu'à `n` distracteurs pour `target`.
 * - jamais le mot lui-même, ni son singulier/pluriel lié ;
 * - jamais une réponse identique à la bonne, ni deux fois la même ;
 * - en priorité la même catégorie, puis le reste.
 */
export function pickDistractors(
  target: Word,
  pool: Word[],
  dir: Direction,
  n = 3,
  rng: Rng = Math.random,
): Word[] {
  const seen = new Set<string>([compareKey(answerText(target, dir), dir)]);
  const candidates = pool.filter((w) => w.id !== target.id && !isLinked(w, target));
  const sameCat = shuffle(candidates.filter((w) => w.category === target.category), rng);
  const others = shuffle(candidates.filter((w) => w.category !== target.category), rng);
  const out: Word[] = [];
  for (const w of [...sameCat, ...others]) {
    if (out.length >= n) break;
    const key = compareKey(answerText(w, dir), dir);
    if (!key || seen.has(key)) continue;
    // Deux distracteurs liés entre eux (singulier + pluriel) ne vont pas ensemble non plus.
    if (out.some((o) => isLinked(o, w))) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

export interface Choice {
  wordId: string;
  text: string;
  correct: boolean;
}

export function buildChoices(target: Word, pool: Word[], dir: Direction, rng: Rng = Math.random): Choice[] {
  const distractors = pickDistractors(target, pool, dir, 3, rng);
  return shuffle(
    [target, ...distractors].map((w) => ({
      wordId: w.id,
      text: answerText(w, dir),
      correct: w.id === target.id,
    })),
    rng,
  );
}
