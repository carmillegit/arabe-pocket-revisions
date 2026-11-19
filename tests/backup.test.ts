import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DexieRepository } from '../src/data/dexieRepository';
import { parseBackup, BackupError } from '../src/data/backup';
import { applyAnswer, newProgress } from '../src/domain/srs';
import { createWord } from '../src/domain/words';

const repos: DexieRepository[] = [];
const repo = (name: string) => { const r = new DexieRepository('local', name); repos.push(r); return r; };
afterEach(async () => { await Promise.all(repos.splice(0).map((r) => r.destroy())); });

const seed = JSON.parse(readFileSync(new URL('../src/seed/mots_depart.json', import.meta.url), 'utf8'));

describe('mots de départ', () => {
  it('importe les 57 mots, recalcule les champs dérivés et garde les liens', () => {
    const b = parseBackup(seed, 'local');
    expect(b.words.length).toBe(57);
    const femme = b.words.find((w) => w.id === 'w041')!;
    expect(femme.arabicPlain).toBe('امرأة');
    expect(femme.letters).toEqual(['ا', 'م', 'ر', 'ت']);
    expect(femme.linkedWordId).toBe('w042');
    expect(b.categories.map((c) => c.name)).toContain('Aliments');
  });

  it('refuse un fichier sans mots ou d’une version future', () => {
    expect(() => parseBackup({ foo: 1 }, 'local')).toThrow(BackupError);
    expect(() => parseBackup({ schemaVersion: 99, words: [] }, 'local')).toThrow(BackupError);
  });
});

describe('export puis import', () => {
  it('redonne exactement les mêmes mots et la même progression', async () => {
    const a = repo('a');
    await a.importAll(parseBackup(seed, 'local'), 'replace');
    const words = await a.getWords();
    const p = applyAnswer(newProgress('local', words[0].id, 'vocabulaire', '2026-11-19'), true, Date.now());
    const session = { id: 's1', userId: 'local', date: '2026-11-19', startedAt: 1, exercise: 'revision' as const, questions: 1, successes: 1 };
    await a.recordAnswer({ id: 'a1', userId: 'local', sessionId: 's1', itemId: words[0].id, skill: 'vocabulaire', exercise: 'cartes', correct: true, at: 1, letters: words[0].letters }, p, session);

    const exported = JSON.parse(JSON.stringify(await a.exportAll()));
    const b = repo('b');
    await b.importAll(parseBackup(exported, 'local'), 'replace');

    const sort = <T extends { id: string }>(x: T[]) => [...x].sort((m, n) => m.id.localeCompare(n.id));
    expect(sort(await b.getWords())).toEqual(sort(await a.getWords()));
    expect(await b.getProgress()).toEqual(await a.getProgress());
    expect(await b.getSessions()).toEqual(await a.getSessions());
    expect(await b.getAnswers()).toEqual(await a.getAnswers());
  });

  it('fusionner garde les mots existants et la version la plus récente', async () => {
    const a = repo('c');
    const mine = createWord({ arabicVoweled: 'بَحْر', transliteration: 'baḥr', french: 'mer', category: 'Nature' }, 'local');
    await a.saveWords([mine]);
    await a.importAll(parseBackup(seed, 'local'), 'merge');
    expect((await a.getWords()).length).toBe(58);
    await a.importAll(parseBackup(seed, 'local'), 'replace');
    expect((await a.getWords()).length).toBe(57);
  });

  it('supprimer un mot détache son pluriel', async () => {
    const a = repo('d');
    await a.importAll(parseBackup(seed, 'local'), 'replace');
    await a.deleteWord('w039');
    const words = await a.getWords();
    expect(words.find((w) => w.id === 'w040')!.linkedWordId).toBeNull();
  });
});
