import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dictationUnits, applyLetterResults, topMissedLetterPositions } from '../src/domain/dictation';
import { audioUrl, hasAudio } from '../src/domain/audio';
import { exerciseFor, buildPracticeQueue } from '../src/domain/queue';
import { parseBackup, SCHEMA_VERSION } from '../src/data/backup';
import { DexieRepository } from '../src/data/dexieRepository';
import type { LetterPositionStat } from '../src/domain/types';

const seedRaw = JSON.parse(readFileSync(new URL('../src/seed/mots_depart.json', import.meta.url), 'utf8'));
const words = parseBackup(seedRaw, 'u').words;

describe('dictée : découpage', () => {
  it('كتاب : 4 lettres, positions et lettres de base', () => {
    const u = dictationUnits('كِتَاب');
    expect(u.map((x) => x.position)).toEqual(['initiale', 'mediane', 'finale', 'isolee']);
    expect(u.flatMap((x) => x.letters.map((l) => l.letter))).toEqual(['ك', 'ت', 'ا', 'ب']);
  });
  it('lam-alif : une unité, deux lettres comptées', () => {
    const u = dictationUnits('سَلَام');
    expect(u[1].text).toBe('لا');
    expect(u[1].letters).toEqual([{ letter: 'ل', position: 'finale' }, { letter: 'ا', position: 'finale' }]);
  });
  it('ة compte comme ت, en fin de mot', () => {
    const u = dictationUnits('قِطَّة');
    expect(u[2].letters).toEqual([{ letter: 'ت', position: 'finale' }]);
  });
  it('les formes affichées forcent la forme liée', () => {
    expect(dictationUnits('بَيْت')[1].form).toBe('‍ي‍');
    expect(dictationUnits('بَيْت')[2].form).toBe('‍ت');
  });
});

describe('table lettre × position', () => {
  it('cumule réussites et échecs, et classe les plus ratées', () => {
    const cur = new Map<string, LetterPositionStat>();
    let s = applyLetterResults(cur, 'u', [
      { letter: 'ع', position: 'mediane', ok: false },
      { letter: 'ع', position: 'mediane', ok: false },
      { letter: 'ب', position: 'finale', ok: true },
      { letter: 'ق', position: 'initiale', ok: false },
    ], 1);
    s.forEach((x) => cur.set(x.id, x));
    const top = topMissedLetterPositions([...cur.values()]);
    expect(top[0]).toMatchObject({ letter: 'ع', position: 'mediane', failures: 2, label: 'en milieu de mot' });
    expect(top.some((x) => x.letter === 'ب')).toBe(false);
  });
});

describe('audio', () => {
  it('les 57 mots de départ ont un fichier audio qui existe', () => {
    for (const w of words) {
      const url = audioUrl(w);
      expect(url, w.french).not.toBeNull();
      expect(existsSync(new URL(`../public/${url}`, import.meta.url)), url!).toBe(true);
    }
  });
  it('un mot ajouté avec la même écriture retrouve son audio', () => {
    expect(hasAudio({ arabicVoweled: ' كِتَاب ', audio: { file: null, status: 'synthese_a_valider' } })).toBe(true);
    expect(hasAudio({ arabicVoweled: 'بَحْر', audio: { file: null, status: 'synthese_a_valider' } })).toBe(false);
  });
  it('écriture d’un mot : tracé guidé, puis dictée s’il a un audio', () => {
    expect(exerciseFor('w1', 'ecriture', 0, false, 1, true)).toBe('trace');
    expect(exerciseFor('w1', 'ecriture', 0, false, 2, true)).toBe('dictee');
    expect(exerciseFor('w1', 'ecriture', 0, false, 3, false)).toBe('trace');
  });
  it('entraînement à la dictée : seulement les mots avec audio', () => {
    const extra = parseBackup({ words: [{ id: 'x', arabicVoweled: 'بَحْر', french: 'mer', category: 'Nature' }] }, 'u').words;
    const ctx = { words: [...words, ...extra], progress: new Map(), userId: 'u', today: '2026-11-19', lettersSince: 0, noVowelsUnlocked: false };
    const q = buildPracticeQueue(ctx, 'dictee', { limit: 100 });
    expect(q.length).toBe(57);
    expect(q.every((x) => x.skill === 'ecriture')).toBe(true);
  });
});

describe('sauvegarde version 2', () => {
  const repos: DexieRepository[] = [];
  afterEach(async () => { await Promise.all(repos.splice(0).map((r) => r.destroy())); });

  it('une sauvegarde v1 (lots 1-2) s’importe, avec une table lettre × position vide', () => {
    const v1 = { app: 'arabe-revision', schemaVersion: 1, words: seedRaw.words, progress: [], sessions: [], answers: [] };
    const b = parseBackup(v1, 'u');
    expect(b.schemaVersion).toBe(SCHEMA_VERSION);
    expect(b.letterStats).toEqual([]);
  });

  it('export puis import conserve la table lettre × position', async () => {
    const a = new DexieRepository('local', 'v2a'); repos.push(a);
    await a.importAll(parseBackup(seedRaw, 'local'), 'replace');
    const stat: LetterPositionStat = { id: 'local|ع|mediane', userId: 'local', letter: 'ع', position: 'mediane', successes: 1, failures: 2, lastAnsweredAt: 5 };
    await a.recordAnswer(
      { id: 'a1', userId: 'local', sessionId: 's', itemId: 'w004', skill: 'ecriture', exercise: 'dictee', correct: false, at: 5, letters: [] },
      { id: 'local|w004|ecriture', userId: 'local', itemId: 'w004', skill: 'ecriture', box: 1, due: '2026-11-20', successes: 0, failures: 1, lastAnsweredAt: 5 },
      { id: 's', userId: 'local', date: '2026-11-19', startedAt: 1, exercise: 'revision', questions: 1, successes: 0 },
      [stat],
    );
    const exported = JSON.parse(JSON.stringify(await a.exportAll()));
    expect(exported.schemaVersion).toBe(2);
    const b = new DexieRepository('local', 'v2b'); repos.push(b);
    await b.importAll(parseBackup(exported, 'local'), 'replace');
    expect(await b.getLetterStats()).toEqual([stat]);
  });
});
