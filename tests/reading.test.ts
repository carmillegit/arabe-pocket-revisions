import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { nearMisses, translitChoices, unlockProgress, letterChoices, pairChoices } from '../src/domain/reading';
import { parseBackup } from '../src/data/backup';
import { buildReviewQueue, buildPracticeQueue, dueItems, exerciseFor } from '../src/domain/queue';
import { LETTERS } from '../src/domain/letters';
import type { Answer } from '../src/domain/types';

const seed = parseBackup(JSON.parse(readFileSync(new URL('../src/seed/mots_depart.json', import.meta.url), 'utf8')), 'u');
const words = seed.words.map((w) => ({ ...w, createdAt: new Date(2026, 10, 19).getTime() }));
const ctx = { words, progress: new Map(), userId: 'u', today: '2026-11-19', lettersSince: new Date(2026, 10, 19).getTime(), noVowelsUnlocked: false };

describe('pièges de translittération', () => {
  it('voyelles longues, emphatiques, chadda', () => {
    const v = nearMisses('ḥimār', true);
    expect(v).toContain('himār');
    expect(v).toContain('ḥimar');
    expect(nearMisses('qiṭṭa', true)).toContain('qiṭa');
  });
  it('ne coupe pas les digrammes', () => {
    for (const v of nearMisses('khubz', true)) expect(v).not.toMatch(/kḥ|ḳ/);
    expect(nearMisses('shams', true).some((v) => v.startsWith('sḥ'))).toBe(false);
  });
  it('sans voyelles, pas de piège sur les voyelles longues', () => {
    expect(nearMisses('ḥimār', false)).not.toContain('ḥimar');
  });
  it('quatre choix exacts et distincts, une bonne réponse', () => {
    for (const w of words) for (const wv of [true, false]) {
      const c = translitChoices(w, words, wv);
      expect(c.length).toBe(4);
      expect(c.filter((x) => x.correct).length).toBe(1);
      expect(new Set(c.map((x) => x.text)).size).toBe(4);
    }
  });
});

describe('lettres', () => {
  it('nom et son : une seule bonne réponse', () => {
    for (const l of LETTERS) for (const f of ['name', 'sound'] as const) {
      const c = letterChoices(l.letter, f);
      expect(c.filter((x) => x.correct).length).toBe(1);
      expect(new Set(c.map((x) => x.text)).size).toBe(4);
    }
  });
  it('paires : la lettre est dans les choix', () => {
    expect(pairChoices('ح').some((c) => c.letter === 'ح' && c.correct)).toBe(true);
  });
});

describe('déblocage sans voyelles', () => {
  const ans = (n: number, ok: number): Answer[] =>
    Array.from({ length: n }, (_, i) => ({ id: String(i), userId: 'u', sessionId: 's', itemId: 'w', skill: 'lecture', exercise: 'lecture_v', correct: i < ok, at: i, letters: [] }));
  it('il faut 20 réponses', () => expect(unlockProgress(ans(19, 19)).unlocked).toBe(false));
  it('80 % sur les 20 dernières', () => {
    expect(unlockProgress(ans(20, 16)).unlocked).toBe(true);
    expect(unlockProgress(ans(20, 15)).unlocked).toBe(false);
  });
});

describe('séances avec lettres', () => {
  it('à échéance : mots (vocabulaire, lecture) et lettres (lecture, écriture)', () => {
    expect(dueItems(ctx).length).toBe(57 * 2 + 28 * 2);
  });
  it('filtre catégorie : pas de lettres', () => {
    expect(buildReviewQueue(ctx, { filters: { category: 'Couleurs' } }).every((q) => !q.itemId.startsWith('L:'))).toBe(true);
  });
  it('filtre lettre : les mots qui la contiennent et la lettre elle-même', () => {
    const q = buildReviewQueue(ctx, { filters: { letter: 'ق' }, limit: 100 });
    expect(q.some((x) => x.itemId === 'L:ق')).toBe(true);
    expect(q.filter((x) => !x.itemId.startsWith('L:')).every((x) => words.find((w) => w.id === x.itemId)!.letters.includes('ق'))).toBe(true);
  });
  it('exercice choisi selon la compétence', () => {
    expect(exerciseFor('w1', 'ecriture', 0, false)).toBe('trace');
    expect(['lettre', 'paires']).toContain(exerciseFor('L:ب', 'lecture', 3, false));
    expect(exerciseFor('w1', 'lecture', 1, false)).toBe('lecture_v');
    expect(exerciseFor('w1', 'lecture', 1, true)).toBe('lecture_nv');
  });
  it('tracé de mots : seulement ceux à apprendre à écrire', () => {
    expect(buildPracticeQueue(ctx, 'trace', { target: 'mots' }).length).toBe(0);
    expect(buildPracticeQueue(ctx, 'trace', { target: 'lettres' }).length).toBe(20);
  });
});
