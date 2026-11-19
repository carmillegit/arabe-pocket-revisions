import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBackup } from '../src/data/backup';
import { allowedExercises, buildReviewQueue, exerciseOptions, pickExercise } from '../src/domain/queue';

const words = parseBackup(JSON.parse(readFileSync(new URL('../src/seed/mots_depart.json', import.meta.url), 'utf8')), 'u')
  .words.map((w) => ({ ...w, createdAt: new Date(2026, 10, 19).getTime() }));
const ctx = { words, progress: new Map(), userId: 'u', today: '2026-11-19', lettersSince: new Date(2026, 10, 19).getTime(), noVowelsUnlocked: false };

describe('filtre par activités (choix multiple)', () => {
  it('aucune activité cochée = toutes', () => {
    expect(allowedExercises([])).toBeUndefined();
  });

  it('« Cartes » seule : le vocabulaire passe entièrement en cartes, rien d’autre', () => {
    const q = buildReviewQueue(ctx, { limit: 1000, activities: allowedExercises(['cartes']) });
    expect(q.length).toBe(57);
    expect(q.every((x) => x.exercise === 'cartes')).toBe(true);
  });

  it('« Lettres » + « Tracé » : lettres en lecture et en écriture, pas de mots en lecture', () => {
    const q = buildReviewQueue(ctx, { limit: 1000, activities: allowedExercises(['lettres', 'trace']) });
    const ex = new Set(q.map((x) => x.exercise));
    expect([...ex].every((e) => ['lettre', 'paires', 'trace', 'trace_memoire'].includes(e))).toBe(true);
    expect(q.filter((x) => x.itemId.startsWith('L:')).length).toBe(56);
  });

  it('« Dictée » seule : un mot à écrire avec audio passe en dictée même au niveau 1', () => {
    const o = exerciseOptions('w001', 'ecriture', false, 1, true);
    expect(pickExercise(o, 0)).toBe('trace');
    expect(pickExercise(o, 0, allowedExercises(['dictee']))).toBe('dictee');
  });

  it('une lettre au niveau mémoire reste en mémoire si le tracé est permis', () => {
    expect(pickExercise(exerciseOptions('L:ب', 'ecriture', false, 3), 0, allowedExercises(['trace']))).toBe('trace_memoire');
  });

  it('activité impossible : élément écarté', () => {
    expect(pickExercise(exerciseOptions('w001', 'lecture', false), 0, allowedExercises(['cartes']))).toBeNull();
  });

  it('la limite de séance s’applique après le filtre', () => {
    expect(buildReviewQueue(ctx, { limit: 20, activities: allowedExercises(['qcm']) }).length).toBe(20);
  });
});
