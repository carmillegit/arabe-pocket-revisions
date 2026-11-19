// Révision espacée : 5 boîtes par élément et par compétence.
import { addDays, dayKey } from './dates';
import type { Progress, Skill, Word } from './types';

/** Intervalle en jours pour chaque boîte (index 0 = boîte 1). */
export const INTERVALS = [1, 3, 7, 14, 30] as const;
export const MAX_BOX = 5;

export function progressId(userId: string, itemId: string, skill: Skill): string {
  return `${userId}|${itemId}|${skill}`;
}

/** Un élément nouveau commence en boîte 1, avec une échéance immédiate. */
export function newProgress(userId: string, itemId: string, skill: Skill, today: string): Progress {
  return {
    id: progressId(userId, itemId, skill),
    userId,
    itemId,
    skill,
    box: 1,
    due: today,
    successes: 0,
    failures: 0,
    lastAnsweredAt: null,
  };
}

export function isDue(p: Progress, today: string): boolean {
  return p.due <= today;
}

/**
 * Applique une réponse.
 * - Erreur : retour en boîte 1 (échéance demain), toujours.
 * - Réussite à échéance : on monte d'une boîte.
 * - Réussite hors échéance (entraînement libre) : compteur seulement, la boîte ne bouge pas.
 */
export function applyAnswer(p: Progress, correct: boolean, now: number): Progress {
  const today = dayKey(now);
  if (!correct) {
    return {
      ...p,
      box: 1,
      due: addDays(today, INTERVALS[0]),
      failures: p.failures + 1,
      lastAnsweredAt: now,
    };
  }
  if (!isDue(p, today)) {
    return { ...p, successes: p.successes + 1, lastAnsweredAt: now };
  }
  const box = Math.min(MAX_BOX, p.box + 1);
  return {
    ...p,
    box,
    due: addDays(today, INTERVALS[box - 1]),
    successes: p.successes + 1,
    lastAnsweredAt: now,
  };
}

/** Compétences en service dans cette version de l'application. */
export const ENABLED_SKILLS: Skill[] = ['vocabulaire', 'lecture', 'ecriture'];

/** Les lettres se travaillent en lecture et en écriture. */
export const LETTER_SKILLS: Skill[] = ['lecture', 'ecriture'];

/** Compétences actives pour un mot : celles en service, l'écriture seulement sur activation. */
export function activeSkills(word: Word, enabled: Skill[] = ENABLED_SKILLS): Skill[] {
  return enabled.filter((s) => s !== 'ecriture' || word.writingEnabled);
}

export type Mastery = 'nouveau' | 'en_cours' | 'acquis';

/** Acquis : boîte 5 partout. Nouveau : boîte 1 partout. Sinon en cours. */
export function mastery(boxes: number[]): Mastery {
  if (boxes.length === 0) return 'nouveau';
  if (boxes.every((b) => b >= MAX_BOX)) return 'acquis';
  if (boxes.every((b) => b <= 1)) return 'nouveau';
  return 'en_cours';
}
