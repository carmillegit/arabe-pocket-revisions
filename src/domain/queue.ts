// Construction d'une séance : révision globale (mots à échéance) ou entraînement libre.
import { activeSkills, isDue, newProgress } from './srs';
import { shuffle, type Rng } from './quiz';
import type { ExerciseId, Progress, Skill, Word } from './types';

export const SESSION_SIZE = 20;
export const EXTRA_SIZE = 10;

export interface QueueFilters {
  category?: string;
  letter?: string;
  /** Identifiants des mots ratés cette semaine. */
  missedIds?: Set<string>;
}

export interface QueueItem {
  wordId: string;
  skill: Skill;
  exercise: Exclude<ExerciseId, 'revision'>;
}

export function filterWords(words: Word[], f: QueueFilters): Word[] {
  return words.filter(
    (w) =>
      (!f.category || w.category === f.category) &&
      (!f.letter || w.letters.includes(f.letter)) &&
      (!f.missedIds || f.missedIds.has(w.id)),
  );
}

/** Progression d'un élément, ou progression « neuve » virtuelle s'il n'a jamais été vu. */
export function progressFor(
  map: Map<string, Progress>,
  userId: string,
  word: Word,
  skill: Skill,
  today: string,
): Progress {
  return (
    map.get(`${userId}|${word.id}|${skill}`) ??
    // Un mot jamais vu est à échéance depuis le jour de sa création.
    { ...newProgress(userId, word.id, skill, today), due: minDay(today, word.createdAt) }
  );
}

function minDay(today: string, createdAt: number): string {
  const d = new Date(createdAt);
  const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return k < today ? k : today;
}

/** Exercice utilisé pour une compétence. Le vocabulaire alterne cartes et QCM dans les deux sens. */
const VOCAB_ROTATION: QueueItem['exercise'][] = ['cartes', 'qcm_ar_fr', 'qcm_fr_ar'];

export function exerciseFor(skill: Skill, index: number): QueueItem['exercise'] {
  switch (skill) {
    case 'vocabulaire':
    default:
      return VOCAB_ROTATION[index % VOCAB_ROTATION.length];
  }
}

/** Tous les couples mot × compétence à échéance, les plus en retard d'abord. */
export function dueItems(
  words: Word[],
  progress: Map<string, Progress>,
  userId: string,
  today: string,
  rng: Rng = Math.random,
): { word: Word; skill: Skill; p: Progress }[] {
  const out: { word: Word; skill: Skill; p: Progress }[] = [];
  for (const w of words) {
    for (const skill of activeSkills(w)) {
      const p = progressFor(progress, userId, w, skill, today);
      if (isDue(p, today)) out.push({ word: w, skill, p });
    }
  }
  // Mélange puis tri stable par échéance : à égalité, l'ordre reste aléatoire.
  return shuffle(out, rng).sort((a, b) => (a.p.due < b.p.due ? -1 : a.p.due > b.p.due ? 1 : 0));
}

export function buildReviewQueue(
  words: Word[],
  progress: Map<string, Progress>,
  userId: string,
  today: string,
  opts: { filters?: QueueFilters; limit?: number; exclude?: Set<string>; rng?: Rng } = {},
): QueueItem[] {
  const rng = opts.rng ?? Math.random;
  const pool = filterWords(words, opts.filters ?? {});
  const items = dueItems(pool, progress, userId, today, rng)
    .filter((x) => !opts.exclude?.has(`${x.word.id}|${x.skill}`))
    .slice(0, opts.limit ?? SESSION_SIZE);
  const offset = Math.floor(rng() * VOCAB_ROTATION.length);
  return shuffle(items, rng).map((x, i) => ({
    wordId: x.word.id,
    skill: x.skill,
    exercise: exerciseFor(x.skill, i + offset),
  }));
}

/** Entraînement libre : mots les moins maîtrisés d'abord, quelle que soit l'échéance. */
export function buildPracticeQueue(
  words: Word[],
  progress: Map<string, Progress>,
  userId: string,
  exercise: QueueItem['exercise'],
  opts: { filters?: QueueFilters; limit?: number; rng?: Rng } = {},
): QueueItem[] {
  const rng = opts.rng ?? Math.random;
  const pool = shuffle(filterWords(words, opts.filters ?? {}), rng);
  const box = (w: Word) => progress.get(`${userId}|${w.id}|vocabulaire`)?.box ?? 1;
  pool.sort((a, b) => box(a) - box(b));
  return shuffle(pool.slice(0, opts.limit ?? SESSION_SIZE), rng).map((w) => ({
    wordId: w.id,
    skill: 'vocabulaire',
    exercise,
  }));
}
