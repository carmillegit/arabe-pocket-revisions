// Création et normalisation des mots : les champs calculés le sont toujours ici.
import { lettersOf, normalizeArabic, stripVowels } from './arabic';
import type { ContentStatus, ContentType, Source, Visual, Word } from './types';

export function newId(prefix = ''): string {
  const c = globalThis.crypto;
  const raw = c?.randomUUID ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix + raw;
}

/** Recalcule les champs dérivés (sans voyelles, lettres) à partir de l'arabe vocalisé. */
export function withDerived(w: Word): Word {
  const arabicVoweled = normalizeArabic(w.arabicVoweled);
  return {
    ...w,
    arabicVoweled,
    arabicPlain: stripVowels(arabicVoweled),
    letters: lettersOf(arabicVoweled),
  };
}

export interface WordInput {
  arabicVoweled: string;
  transliteration: string;
  french: string;
  category: string;
  pronunciationHint?: string;
  visual?: Visual;
  type?: ContentType;
  linkedWordId?: string | null;
  level?: string;
  source?: Source;
  root?: string | null;
  status?: ContentStatus;
  writingEnabled?: boolean;
}

export function createWord(input: WordInput, userId: string, now = Date.now(), id = newId('w-')): Word {
  return withDerived({
    id,
    userId,
    authorId: userId,
    arabicVoweled: input.arabicVoweled,
    arabicPlain: '',
    transliteration: input.transliteration.trim(),
    french: input.french.trim(),
    category: input.category,
    pronunciationHint: input.pronunciationHint?.trim() ?? '',
    visual: input.visual ?? null,
    type: input.type ?? 'mot',
    linkedWordId: input.linkedWordId ?? null,
    level: input.level ?? 'debutant',
    source: input.source ?? 'perso',
    root: input.root?.trim() || null,
    letters: [],
    status: input.status ?? 'valide',
    audio: { file: null, status: 'synthese_a_valider' },
    writingEnabled: input.writingEnabled ?? false,
    createdAt: now,
    updatedAt: now,
  });
}

/** Crée un mot et son pluriel, liés l'un à l'autre, en une seule saisie. */
export function createWithPlural(
  singular: WordInput,
  plural: Pick<WordInput, 'arabicVoweled' | 'transliteration' | 'french'>,
  userId: string,
  now = Date.now(),
): [Word, Word] {
  const s = createWord(singular, userId, now);
  const p = createWord(
    {
      ...singular,
      ...plural,
      type: 'pluriel',
      pronunciationHint: '',
      writingEnabled: false,
    },
    userId,
    now,
  );
  s.linkedWordId = p.id;
  p.linkedWordId = s.id;
  return [s, p];
}
