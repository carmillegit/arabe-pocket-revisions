// Dictée tracée : découpage du mot en lettres positionnées et mise à jour de la table lettre × position.
import { segment, unitForm, unitLetters, type Unit } from './positions';
import type { LetterPositionStat } from './types';
import { POSITION_LABEL, type Position } from './letters';

export interface DictationUnit extends Unit {
  /** Forme à afficher (forme liée correcte pour sa position). */
  form: string;
  letters: { letter: string; position: Position }[];
}

export function dictationUnits(arabic: string): DictationUnit[] {
  return segment(arabic).map((u) => ({ ...u, form: unitForm(u.text, u.position), letters: unitLetters(u) }));
}

export function statId(userId: string, letter: string, position: Position) {
  return `${userId}|${letter}|${position}`;
}

/** Applique les résultats d'une dictée à la table lettre × position. */
export function applyLetterResults(
  current: Map<string, LetterPositionStat>,
  userId: string,
  results: { letter: string; position: Position; ok: boolean }[],
  now: number,
): LetterPositionStat[] {
  const touched = new Map<string, LetterPositionStat>();
  for (const r of results) {
    const id = statId(userId, r.letter, r.position);
    const prev = touched.get(id) ?? current.get(id) ?? {
      id, userId, letter: r.letter, position: r.position, successes: 0, failures: 0, lastAnsweredAt: null,
    };
    touched.set(id, {
      ...prev,
      successes: prev.successes + (r.ok ? 1 : 0),
      failures: prev.failures + (r.ok ? 0 : 1),
      lastAnsweredAt: now,
    });
  }
  return [...touched.values()];
}

/** Les combinaisons lettre-position les plus ratées (« ع en milieu de mot »). */
export function topMissedLetterPositions(stats: LetterPositionStat[], n = 5) {
  return stats
    .filter((s) => s.failures > 0)
    .sort((a, b) => b.failures - a.failures || a.successes - b.successes)
    .slice(0, n)
    .map((s) => ({ ...s, label: POSITION_LABEL[s.position] }));
}
