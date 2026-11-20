import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { parseBackup } from '../src/data/backup';
import { planCourseContent, applyCourseContent, CONTENT_VERSION } from '../src/data/courseContent';
import { DexieRepository } from '../src/data/dexieRepository';
import { COURS, sessionLabel, sessionWordIds, wordIndex } from '../src/domain/cours';
import { audioUrl } from '../src/domain/audio';

const seed = parseBackup(JSON.parse(readFileSync(new URL('../src/seed/mots_depart.json', import.meta.url), 'utf8')), 'u').words;
const after = () => {
  const changed = planCourseContent(seed, 'u', 1000);
  const m = new Map(seed.map((w) => [w.id, w]));
  for (const w of changed) m.set(w.id, w);
  return [...m.values()];
};

describe('contenu des cours', () => {
  it('nom des séances : « Séance 1 · 07/10 »', () => {
    expect(COURS.map(sessionLabel)).toEqual(['Séance 1 · 07/10', 'Séance 2 · 14/10', 'Séance 3 · 04/11', 'Séance 4 · 13/11', 'Séance 5 · 18/11']);
  });

  it('5 séances, dans l’ordre des dates', () => {
    expect(COURS.map((s) => s.date)).toEqual(['2026-10-07', '2026-10-14', '2026-11-04', '2026-11-13', '2026-11-18']);
  });

  it('remplacements : خَوْخ (à vérifier) et أُسْتَاذ', () => {
    const words = after();
    const prunes = words.find((w) => w.id === 'w056')!;
    expect([prunes.arabicVoweled, prunes.french, prunes.status]).toEqual(['خَوْخ', 'prunes', 'a_verifier']);
    expect(words.find((w) => w.id === 'w044')!.arabicVoweled).toBe('أُسْتَاذ');
  });

  it('un mot déjà modifié par l’utilisatrice n’est pas remplacé', () => {
    const edited = seed.map((w) => (w.id === 'w044' ? { ...w, arabicVoweled: 'مُعَلِّم' } : w));
    const changed = planCourseContent(edited, 'u', 1000);
    expect(changed.find((w) => w.id === 'w044')).toBeUndefined();
  });

  it('76 mots nouveaux, sans doublon, أَنْتَ et أَنْتِ distincts', () => {
    const words = after();
    expect(words.length).toBe(57 + 76);
    expect(new Set(words.map((w) => w.arabicVoweled)).size).toBe(words.length);
    expect(words.some((w) => w.arabicVoweled === 'أَنْتِ')).toBe(true);
  });

  it('pluriels reliés dans les deux sens', () => {
    const words = after();
    const byId = new Map(words.map((w) => [w.id, w]));
    const pl = words.find((w) => w.arabicVoweled === 'سَيَّارَات')!;
    expect(pl.linkedWordId).toBe('w031');
    expect(byId.get('w031')!.linkedWordId).toBe(pl.id);
  });

  it('chaque exemple des fiches retrouve son mot (sauf le prénom Lisa)', () => {
    const find = wordIndex(after());
    const missing = COURS.flatMap((s) => s.blocks.flatMap((b) => (b.type === 'vocab' ? b.rows : [])))
      .filter((r) => !find(r.ar)).map((r) => r.fr);
    expect(missing).toEqual(['Lisa (prénom)']);
  });

  it('chaque mot des fiches a son audio', () => {
    const words = after();
    for (const s of COURS) for (const id of sessionWordIds(s, words)) {
      const w = words.find((x) => x.id === id)!;
      const url = audioUrl(w);
      expect(url, w.french).not.toBeNull();
      expect(existsSync(new URL(`../public/${url}`, import.meta.url)), url!).toBe(true);
    }
  });
});

describe('application à une installation existante', () => {
  const repos: DexieRepository[] = [];
  afterEach(async () => { await Promise.all(repos.splice(0).map((r) => r.destroy())); });

  it('s’applique une seule fois et crée les catégories', async () => {
    const r = new DexieRepository('local', 'cours1'); repos.push(r);
    await r.importAll(parseBackup(JSON.parse(readFileSync(new URL('../src/seed/mots_depart.json', import.meta.url), 'utf8')), 'local'), 'replace');
    expect(await applyCourseContent(r)).toBeGreaterThan(76);
    expect(await r.getMeta('contentVersion')).toBe(CONTENT_VERSION);
    expect(await applyCourseContent(r)).toBe(0);
    expect((await r.getWords()).length).toBe(133);
    const cats = (await r.getCategories()).map((c) => c.name);
    expect(cats).toEqual(expect.arrayContaining(['Pays', 'Personnes']));
    expect(cats.some((c) => c.startsWith('Cours du'))).toBe(false);
  });
});

describe('passage des catégories par séance aux thèmes (v2 → v3)', () => {
  const repos: DexieRepository[] = [];
  afterEach(async () => { await Promise.all(repos.splice(0).map((r) => r.destroy())); });

  it('recatégorise les mots ajoutés en v2 et supprime les catégories « Cours du … » vides', async () => {
    const r = new DexieRepository('local', 'cours-v2'); repos.push(r);
    await r.importAll(parseBackup(JSON.parse(readFileSync(new URL('../src/seed/mots_depart.json', import.meta.url), 'utf8')), 'local'), 'replace');
    // État d'une installation v2 : deux mots du cours rangés par séance, dont un que l'utilisatrice a déplacé.
    const words = planCourseContent(await r.getWords(), 'local', 1);
    const v2 = words.map((w) =>
      w.arabicVoweled === 'بَابَا' ? { ...w, category: 'Cours du 4/11' } : w.arabicVoweled === 'زَيْت' ? { ...w, category: 'Mes favoris' } : w,
    );
    await r.saveWords(v2);
    await r.setMeta('contentVersion', 2);
    await applyCourseContent(r);
    const after = await r.getWords();
    expect(after.find((w) => w.arabicVoweled === 'بَابَا')!.category).toBe('Personnes');
    expect(after.find((w) => w.arabicVoweled === 'زَيْت')!.category).toBe('Mes favoris');
    expect((await r.getCategories()).some((c) => c.name.startsWith('Cours du'))).toBe(false);
  });
});
