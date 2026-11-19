// Format de sauvegarde (export / import), versionné, avec migration.
import type { Answer, Category, LetterPositionStat, Progress, Session, User, Visual, Word } from '../domain/types';
import { withDerived } from '../domain/words';

/** v1 : lots 1 et 2. v2 : ajout de la table lettre × position (lot 3). */
export const SCHEMA_VERSION = 2;
export const APP_ID = 'arabe-revision';

export interface Backup {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt: number;
  users: User[];
  categories: Category[];
  words: Word[];
  progress: Progress[];
  sessions: Session[];
  answers: Answer[];
  letterStats: LetterPositionStat[];
}

export class BackupError extends Error {}

/** Accepte une sauvegarde de l'appli, ou le fichier des mots de départ (format du cahier des charges). */
export function parseBackup(raw: unknown, userId: string): Backup {
  if (!raw || typeof raw !== 'object') throw new BackupError('Fichier illisible.');
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.words)) throw new BackupError('Ce fichier ne contient pas de liste de mots.');
  const version = typeof o.schemaVersion === 'number' ? o.schemaVersion : 1;
  if (version > SCHEMA_VERSION) {
    throw new BackupError("Ce fichier vient d'une version plus récente de l'application. Mets l'application à jour.");
  }
  const isApp = o.app === APP_ID;
  const now = Date.now();
  const words = (o.words as unknown[]).map((w, i) => toWord(w, userId, now + i));
  const categories = Array.isArray(o.categories)
    ? (o.categories as { name?: unknown }[])
        .filter((c) => typeof c?.name === 'string')
        .map((c) => ({ userId, name: c.name as string }))
    : [];
  for (const w of words) if (!categories.some((c) => c.name === w.category)) categories.push({ userId, name: w.category });
  return migrate({
    app: APP_ID,
    schemaVersion: version,
    exportedAt: typeof o.exportedAt === 'number' ? o.exportedAt : now,
    users: isApp && Array.isArray(o.users) ? (o.users as User[]) : [],
    categories,
    words,
    progress: isApp && Array.isArray(o.progress) ? (o.progress as Progress[]) : [],
    sessions: isApp && Array.isArray(o.sessions) ? (o.sessions as Session[]) : [],
    answers: isApp && Array.isArray(o.answers) ? (o.answers as Answer[]) : [],
    letterStats: isApp && Array.isArray(o.letterStats) ? (o.letterStats as LetterPositionStat[]) : [],
  });
}

/** Migrations successives du format. Aujourd'hui une seule version. */
function migrate(b: Backup): Backup {
  // v1 → v2 : la table lettre × position n'existait pas, elle commence vide.
  if (b.schemaVersion < 2) b = { ...b, letterStats: b.letterStats ?? [] };
  return { ...b, schemaVersion: SCHEMA_VERSION };
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function toVisual(v: unknown): Visual {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if ((o.kind === 'emoji' || o.kind === 'color') && typeof o.value === 'string') {
    return { kind: o.kind, value: o.value };
  }
  return null; // les icônes d'une bibliothèque externe ne sont pas reprises
}

function toWord(raw: unknown, userId: string, now: number): Word {
  const o = (raw ?? {}) as Record<string, unknown>;
  const arabic = str(o.arabicVoweled);
  if (!arabic) throw new BackupError('Un mot du fichier n’a pas de texte arabe.');
  const audio = (o.audio ?? {}) as Record<string, unknown>;
  return withDerived({
    id: str(o.id) || `w-${now}`,
    userId,
    authorId: str(o.authorId, str(o.userId, userId)),
    arabicVoweled: arabic,
    arabicPlain: '',
    transliteration: str(o.transliteration),
    french: str(o.french),
    category: str(o.category, 'Sans catégorie'),
    pronunciationHint: str(o.pronunciationHint),
    visual: toVisual(o.visual),
    type: (['mot', 'pluriel', 'verbe', 'phrase', 'texte'].includes(str(o.type)) ? o.type : 'mot') as Word['type'],
    linkedWordId: typeof o.linkedWordId === 'string' ? o.linkedWordId : null,
    level: str(o.level, 'debutant'),
    source: (['cours', 'perso', 'externe'].includes(str(o.source)) ? o.source : 'perso') as Word['source'],
    root: typeof o.root === 'string' && o.root ? o.root : null,
    letters: [],
    status: (['propose', 'a_verifier', 'valide'].includes(str(o.status)) ? o.status : 'valide') as Word['status'],
    audio: {
      file: typeof audio.file === 'string' ? audio.file : null,
      status: (['synthese_a_valider', 'valide', 'voix_humaine'].includes(str(audio.status))
        ? audio.status
        : 'synthese_a_valider') as Word['audio']['status'],
    },
    writingEnabled: o.writingEnabled === true,
    wordIds: Array.isArray(o.wordIds) ? (o.wordIds as string[]) : undefined,
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : now,
  });
}

/** Fusion : on garde, pour chaque identifiant, la version la plus récente. */
export function mergeBackups(current: Backup, incoming: Backup): Backup {
  const byId = <T,>(a: T[], b: T[], key: (x: T) => string, newer: (x: T, y: T) => boolean) => {
    const m = new Map(a.map((x) => [key(x), x]));
    for (const y of b) {
      const x = m.get(key(y));
      if (!x || newer(y, x)) m.set(key(y), y);
    }
    return [...m.values()];
  };
  return {
    ...current,
    words: byId(current.words, incoming.words, (w) => w.id, (y, x) => y.updatedAt > x.updatedAt),
    categories: byId(current.categories, incoming.categories, (c) => c.name, () => false),
    progress: byId(current.progress, incoming.progress, (p) => p.id, (y, x) => (y.lastAnsweredAt ?? 0) > (x.lastAnsweredAt ?? 0)),
    sessions: byId(current.sessions, incoming.sessions, (s) => s.id, (y, x) => y.questions > x.questions),
    answers: byId(current.answers, incoming.answers, (a) => a.id, () => false),
    letterStats: byId(current.letterStats, incoming.letterStats, (s) => s.id, (y, x) => (y.lastAnsweredAt ?? 0) > (x.lastAnsweredAt ?? 0)),
  };
}

export function summarize(b: Backup) {
  return {
    words: b.words.length,
    categories: b.categories.length,
    progress: b.progress.length,
    sessions: b.sessions.length,
  };
}
