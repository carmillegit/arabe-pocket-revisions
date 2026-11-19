// Ajout du contenu des cours validés (mots nouveaux et remplacements), appliqué une seule fois par version.
// Ne touche pas aux mots que l'utilisatrice a déjà modifiés : un remplacement ne s'applique que si le mot
// a encore son texte d'origine.
import content from '../seed/mots_cours.json';
import { normalizeArabic } from '../domain/arabic';
import type { Visual, Word } from '../domain/types';
import { createWord, withDerived } from '../domain/words';
import type { Repository } from './repository';

interface CourseWord {
  id: string;
  arabicVoweled: string;
  transliteration: string;
  french: string;
  category: string;
  type: Word['type'];
  visual: Visual;
  source: Word['source'];
  status: Word['status'];
  linkedWordId: string | null;
}

interface Replacement {
  id: string;
  from: string;
  arabicVoweled: string;
  transliteration: string;
  french: string;
  pronunciationHint: string;
  status: Word['status'];
}

export const CONTENT_VERSION = content.contentVersion;

/** Calcule les mots à enregistrer, sans écrire : testable sans base de données. */
export function planCourseContent(current: Word[], userId: string, now: number): Word[] {
  const byId = new Map(current.map((w) => [w.id, w]));
  const changed = new Map<string, Word>();
  const put = (w: Word) => {
    changed.set(w.id, w);
    byId.set(w.id, w);
  };

  for (const r of content.replacements as Replacement[]) {
    const w = byId.get(r.id);
    if (w && normalizeArabic(w.arabicVoweled) === normalizeArabic(r.from)) {
      put(withDerived({
        ...w,
        arabicVoweled: r.arabicVoweled,
        transliteration: r.transliteration,
        french: r.french,
        pronunciationHint: r.pronunciationHint,
        status: r.status,
        source: 'cours',
        updatedAt: now,
      }));
    }
  }

  for (const c of content.words as CourseWord[]) {
    if (byId.has(c.id)) continue; // déjà ajouté (ou modifié par l'utilisatrice) : on n'y touche pas
    const w = createWord(
      {
        arabicVoweled: c.arabicVoweled,
        transliteration: c.transliteration,
        french: c.french,
        category: c.category,
        type: c.type,
        visual: c.visual,
        source: c.source,
        status: c.status,
      },
      userId,
      now,
      c.id,
    );
    // Lien singulier ↔ pluriel, seulement si le mot lié existe et n'est pas déjà lié.
    const target = c.linkedWordId ? byId.get(c.linkedWordId) : undefined;
    if (target && !target.linkedWordId) {
      w.linkedWordId = target.id;
      put({ ...target, linkedWordId: w.id, updatedAt: now });
    }
    put(w);
  }
  return [...changed.values()];
}

export async function applyCourseContent(repo: Repository, now = Date.now()): Promise<number> {
  const done = (await repo.getMeta<number>('contentVersion')) ?? 1;
  if (done >= CONTENT_VERSION) return 0;
  const words = planCourseContent(await repo.getWords(), repo.userId, now);
  if (words.length) await repo.saveWords(words);
  await repo.setMeta('contentVersion', CONTENT_VERSION);
  return words.length;
}
