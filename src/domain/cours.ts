// Fiches de cours : contenu validé, et lien entre les exemples et les mots de l'app.
import content from '../content/cours.json';
import { arabicSearchKey, normalizeArabic } from './arabic';
import type { Word } from './types';

export interface VocabRow {
  ar: string;
  tr: string;
  fr: string;
}

export type CoursBlock =
  | { type: 'rules'; title: string; items: string[] }
  | { type: 'vocab'; title: string; rows: VocabRow[] };

export interface CoursSession {
  id: string;
  date: string;
  title: string;
  blocks: CoursBlock[];
  homework?: string | null;
}

export const COURS: CoursSession[] = content.sessions as CoursSession[];

export function coursById(id: string): CoursSession | undefined {
  return COURS.find((s) => s.id === id);
}

/** Trouve le mot de l'app qui correspond à un exemple : même écriture vocalisée, sinon même squelette. */
export function wordIndex(words: Word[]) {
  const exact = new Map<string, Word>();
  const loose = new Map<string, Word>();
  for (const w of words) {
    exact.set(normalizeArabic(w.arabicVoweled), w);
    if (!loose.has(arabicSearchKey(w.arabicVoweled))) loose.set(arabicSearchKey(w.arabicVoweled), w);
  }
  return (ar: string): Word | undefined => exact.get(normalizeArabic(ar)) ?? loose.get(arabicSearchKey(ar));
}

/** Les mots de l'app présents dans une séance. */
export function sessionWordIds(s: CoursSession, words: Word[]): Set<string> {
  const find = wordIndex(words);
  const ids = new Set<string>();
  for (const b of s.blocks) if (b.type === 'vocab') for (const r of b.rows) {
    const w = find(r.ar);
    if (w) ids.add(w.id);
  }
  return ids;
}

export function formatSessionDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Nom court d'une séance : « Séance 1 · 07/10 » (numérotée dans l'ordre des dates). */
export function sessionLabel(s: CoursSession): string {
  const n = [...COURS].sort((a, b) => a.date.localeCompare(b.date)).findIndex((x) => x.id === s.id) + 1;
  const [, m, d] = s.date.split('-');
  return `Séance ${n} · ${d}/${m}`;
}
