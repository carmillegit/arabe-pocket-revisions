// Construction d'une séance : révision globale (éléments à échéance) ou entraînement libre.
// Un élément est un mot ou une lettre ; chaque élément a une progression par compétence.
import { dayKey } from './dates';
import { ALPHABET } from './arabic';
import { letterItemId, letterOfItem, isLetterItem } from './letters';
import { activeSkills, isDue, newProgress, LETTER_SKILLS } from './srs';
import { shuffle, type Rng } from './quiz';
import { hasAudio } from './audio';

const hasWordAudio = (w?: Word) => !!w && hasAudio(w);
import type { ExerciseId, Progress, Skill, Word } from './types';

export const SESSION_SIZE = 20;
export const EXTRA_SIZE = 10;

export type PracticeExercise = Exclude<ExerciseId, 'revision'>;

export interface QueueFilters {
  category?: string;
  letter?: string;
  /** Identifiants des éléments ratés cette semaine. */
  missedIds?: Set<string>;
}

export interface QueueItem {
  /** Id du mot, ou "L:<lettre>". */
  itemId: string;
  skill: Skill;
  exercise: PracticeExercise;
}

export interface QueueContext {
  words: Word[];
  progress: Map<string, Progress>;
  userId: string;
  today: string;
  /** Date d'arrivée des lettres dans l'appli (elles sont « nouvelles » depuis ce jour). */
  lettersSince: number;
  /** Lecture sans voyelles débloquée ? */
  noVowelsUnlocked: boolean;
  rng?: Rng;
}

export function filterWords(words: Word[], f: QueueFilters): Word[] {
  return words.filter(
    (w) =>
      (!f.category || w.category === f.category) &&
      (!f.letter || w.letters.includes(f.letter)) &&
      (!f.missedIds || f.missedIds.has(w.id)),
  );
}

export function filterLetters(f: QueueFilters): string[] {
  if (f.category) return [];
  return ALPHABET.filter(
    (l) => (!f.letter || l === f.letter) && (!f.missedIds || f.missedIds.has(letterItemId(l))),
  );
}

function day(t: number): string {
  return dayKey(t);
}

/** Progression d'un élément, ou progression « neuve » virtuelle s'il n'a jamais été vu. */
export function progressFor(
  map: Map<string, Progress>,
  userId: string,
  itemId: string,
  skill: Skill,
  today: string,
  createdAt: number,
): Progress {
  const existing = map.get(`${userId}|${itemId}|${skill}`);
  if (existing) return existing;
  // Un élément jamais vu est à échéance depuis le jour de sa création.
  const created = day(createdAt);
  return { ...newProgress(userId, itemId, skill, today), due: created < today ? created : today };
}

export function wordProgress(map: Map<string, Progress>, userId: string, w: Word, skill: Skill, today: string) {
  return progressFor(map, userId, w.id, skill, today, w.createdAt);
}

const VOCAB_ROTATION: PracticeExercise[] = ['cartes', 'qcm_ar_fr', 'qcm_fr_ar'];

/** Exercice pour un élément et une compétence. `n` fait alterner les variantes. */
/** À partir de la boîte 3, une lettre s'écrit de mémoire (sans modèle ni flèches). */
export const MEMORY_TRACE_BOX = 3;

/** À partir de la boîte 2, un mot qui a son audio s'écrit en dictée (entendre, tracer, vérifier). */
export const DICTATION_BOX = 2;

/**
 * Exercices possibles pour un élément et une compétence.
 * `rotate` : on alterne entre eux ; sinon, le premier est le préféré (selon le niveau),
 * les suivants servent quand le filtre d'activités écarte le préféré.
 */
export function exerciseOptions(
  itemId: string,
  skill: Skill,
  noVowelsUnlocked: boolean,
  box = 1,
  withAudio = false,
): { options: PracticeExercise[]; rotate: boolean } {
  if (skill === 'ecriture') {
    if (isLetterItem(itemId)) {
      return { options: box >= MEMORY_TRACE_BOX ? ['trace_memoire', 'trace'] : ['trace', 'trace_memoire'], rotate: false };
    }
    if (!withAudio) return { options: ['trace'], rotate: false };
    return { options: box >= DICTATION_BOX ? ['dictee', 'trace'] : ['trace', 'dictee'], rotate: false };
  }
  if (isLetterItem(itemId)) return { options: ['lettre', 'paires'], rotate: true };
  if (skill === 'lecture') return { options: noVowelsUnlocked ? ['lecture_v', 'lecture_nv'] : ['lecture_v'], rotate: true };
  return { options: VOCAB_ROTATION, rotate: true };
}

/** Choisit l'exercice parmi ceux autorisés (tous si `allowed` est absent). Null : élément écarté par le filtre. */
export function pickExercise(
  o: { options: PracticeExercise[]; rotate: boolean },
  n: number,
  allowed?: Set<PracticeExercise>,
): PracticeExercise | null {
  const ok = allowed ? o.options.filter((e) => allowed.has(e)) : o.options;
  if (ok.length === 0) return null;
  return o.rotate ? ok[n % ok.length] : ok[0];
}

export function exerciseFor(
  itemId: string,
  skill: Skill,
  n: number,
  noVowelsUnlocked: boolean,
  box = 1,
  withAudio = false,
): PracticeExercise {
  return pickExercise(exerciseOptions(itemId, skill, noVowelsUnlocked, box, withAudio), n)!;
}

/** Activités proposées dans le filtre de révision (choix multiple). */
export const ACTIVITIES: { id: string; label: string; exercises: PracticeExercise[] }[] = [
  { id: 'cartes', label: 'Cartes', exercises: ['cartes'] },
  { id: 'qcm', label: 'QCM de sens', exercises: ['qcm_ar_fr', 'qcm_fr_ar'] },
  { id: 'lecture', label: 'Lecture de mots', exercises: ['lecture_v', 'lecture_nv'] },
  { id: 'lettres', label: 'Lettres : nom, son, paires', exercises: ['lettre', 'paires'] },
  { id: 'trace', label: 'Tracé', exercises: ['trace', 'trace_memoire'] },
  { id: 'dictee', label: 'Dictée', exercises: ['dictee'] },
];

/** Exercices autorisés pour une liste d'activités (vide = toutes). */
export function allowedExercises(activityIds: string[]): Set<PracticeExercise> | undefined {
  const picked = ACTIVITIES.filter((a) => activityIds.includes(a.id));
  return picked.length ? new Set(picked.flatMap((a) => a.exercises)) : undefined;
}

interface DueEntry {
  itemId: string;
  skill: Skill;
  p: Progress;
}

/** Tous les couples élément × compétence à échéance, les plus en retard d'abord. */
export function dueItems(ctx: QueueContext, filters: QueueFilters = {}): DueEntry[] {
  const { progress, userId, today } = ctx;
  const out: DueEntry[] = [];
  for (const w of filterWords(ctx.words, filters)) {
    for (const skill of activeSkills(w)) {
      const p = wordProgress(progress, userId, w, skill, today);
      if (isDue(p, today)) out.push({ itemId: w.id, skill, p });
    }
  }
  for (const l of filterLetters(filters)) {
    const id = letterItemId(l);
    for (const skill of LETTER_SKILLS) {
      const p = progressFor(progress, userId, id, skill, today, ctx.lettersSince);
      if (isDue(p, today)) out.push({ itemId: id, skill, p });
    }
  }
  // Mélange puis tri stable par échéance : à égalité, l'ordre reste aléatoire.
  return shuffle(out, ctx.rng).sort((a, b) => (a.p.due < b.p.due ? -1 : a.p.due > b.p.due ? 1 : 0));
}

export function buildReviewQueue(
  ctx: QueueContext,
  opts: { filters?: QueueFilters; limit?: number; exclude?: Set<string>; activities?: Set<PracticeExercise> } = {},
): QueueItem[] {
  const rng = ctx.rng ?? Math.random;
  const offset = Math.floor(rng() * 6);
  const byId = new Map(ctx.words.map((w) => [w.id, w]));
  const out: QueueItem[] = [];
  // Les plus en retard d'abord ; un élément sans exercice autorisé par le filtre est écarté.
  for (const x of dueItems(ctx, opts.filters)) {
    if (out.length >= (opts.limit ?? SESSION_SIZE)) break;
    if (opts.exclude?.has(`${x.itemId}|${x.skill}`)) continue;
    const o = exerciseOptions(x.itemId, x.skill, ctx.noVowelsUnlocked, x.p.box, hasWordAudio(byId.get(x.itemId)));
    const exercise = pickExercise(o, out.length + offset, opts.activities);
    if (exercise) out.push({ itemId: x.itemId, skill: x.skill, exercise });
  }
  return shuffle(out, rng);
}

const PRACTICE_SKILL: Record<PracticeExercise, Skill> = {
  cartes: 'vocabulaire',
  qcm_ar_fr: 'vocabulaire',
  qcm_fr_ar: 'vocabulaire',
  lecture_v: 'lecture',
  lecture_nv: 'lecture',
  lettre: 'lecture',
  paires: 'lecture',
  trace: 'ecriture',
  trace_memoire: 'ecriture',
  dictee: 'ecriture',
};

/**
 * Entraînement libre : éléments les moins maîtrisés d'abord, quelle que soit l'échéance.
 * Pour le tracé, `target` choisit les lettres ou les mots « à apprendre à écrire ».
 */
export function buildPracticeQueue(
  ctx: QueueContext,
  exercise: PracticeExercise,
  opts: { filters?: QueueFilters; limit?: number; target?: 'lettres' | 'mots' } = {},
): QueueItem[] {
  const rng = ctx.rng ?? Math.random;
  const skill = PRACTICE_SKILL[exercise];
  const f = opts.filters ?? {};
  const onLetters =
    exercise === 'lettre' || exercise === 'paires' || exercise === 'trace_memoire' || (exercise === 'trace' && opts.target !== 'mots');
  let ids: string[];
  if (onLetters) ids = filterLetters({ ...f, category: undefined }).map(letterItemId);
  else {
    let ws = filterWords(ctx.words, f);
    if (exercise === 'trace') ws = ws.filter((w) => w.writingEnabled);
    if (exercise === 'dictee') ws = ws.filter((w) => hasWordAudio(w));
    ids = ws.map((w) => w.id);
  }
  const box = (id: string) => ctx.progress.get(`${ctx.userId}|${id}|${skill}`)?.box ?? 1;
  const pool = shuffle(ids, rng).sort((a, b) => box(a) - box(b));
  return shuffle(pool.slice(0, opts.limit ?? SESSION_SIZE), rng).map((itemId) => ({ itemId, skill, exercise }));
}

export { letterOfItem, isLetterItem };
