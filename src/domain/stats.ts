// Statistiques de progression (calculées, jamais stockées).
import { addDays, dayKey } from './dates';
import { activeSkills, mastery, type Mastery } from './srs';
import { progressFor } from './queue';
import type { Answer, Progress, Session, Word } from './types';

export function wordMastery(w: Word, progress: Map<string, Progress>, userId: string, today: string): Mastery {
  return mastery(activeSkills(w).map((s) => progressFor(progress, userId, w, s, today).box));
}

export function masteryCounts(words: Word[], progress: Map<string, Progress>, userId: string, today: string) {
  const c: Record<Mastery, number> = { nouveau: 0, en_cours: 0, acquis: 0 };
  for (const w of words) c[wordMastery(w, progress, userId, today)]++;
  return c;
}

export function byCategory(words: Word[], progress: Map<string, Progress>, userId: string, today: string) {
  const m = new Map<string, Record<Mastery, number>>();
  for (const w of words) {
    const c = m.get(w.category) ?? { nouveau: 0, en_cours: 0, acquis: 0 };
    c[wordMastery(w, progress, userId, today)]++;
    m.set(w.category, c);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
}

/** Jours consécutifs avec au moins une réponse, jusqu'à aujourd'hui (ou hier si rien aujourd'hui). */
export function streak(answerDays: Set<string>, today: string): number {
  let d = answerDays.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (answerDays.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function answerDays(answers: Answer[]): Set<string> {
  return new Set(answers.map((a) => dayKey(a.at)));
}

export function topMissedLetters(answers: Answer[], n = 5): { letter: string; misses: number }[] {
  const c = new Map<string, number>();
  for (const a of answers) if (!a.correct) for (const l of a.letters) c.set(l, (c.get(l) ?? 0) + 1);
  return [...c.entries()]
    .map(([letter, misses]) => ({ letter, misses }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, n);
}

export function topMissedWords(words: Word[], progress: Progress[], n = 10) {
  const byId = new Map(words.map((w) => [w.id, w]));
  const c = new Map<string, number>();
  for (const p of progress) if (p.failures > 0) c.set(p.itemId, (c.get(p.itemId) ?? 0) + p.failures);
  return [...c.entries()]
    .filter(([id]) => byId.has(id))
    .map(([id, misses]) => ({ word: byId.get(id)!, misses }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, n);
}

export function missedSince(answers: Answer[], since: number): Set<string> {
  return new Set(answers.filter((a) => !a.correct && a.at >= since).map((a) => a.itemId));
}

/** Questions et réussites par jour sur les `days` derniers jours (le plus ancien d'abord). */
export function history(sessions: Session[], today: string, days = 30) {
  const m = new Map<string, { questions: number; successes: number }>();
  for (let i = days - 1; i >= 0; i--) m.set(addDays(today, -i), { questions: 0, successes: 0 });
  for (const s of sessions) {
    const d = m.get(s.date);
    if (d) {
      d.questions += s.questions;
      d.successes += s.successes;
    }
  }
  return [...m.entries()].map(([date, v]) => ({ date, ...v }));
}
