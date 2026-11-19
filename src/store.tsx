// État de l'application, chargé en mémoire (quelques centaines de mots : c'est instantané).
import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';
import type { Answer, Category, Progress, Word } from './domain/types';
import type { QueueContext } from './domain/queue';
import { dayKey } from './domain/dates';
import { unlockProgress } from './domain/reading';
import { LOCAL_USER_ID } from './domain/types';
import { DexieRepository } from './data/dexieRepository';
import type { Repository } from './data/repository';
import { parseBackup } from './data/backup';
import seed from './seed/mots_depart.json';
import { applyCourseContent } from './data/courseContent';

export type VowelMode = 'always' | 'onDemand';

export interface AppData {
  repo: Repository;
  userName: string;
  words: Word[];
  categories: Category[];
  progress: Map<string, Progress>;
  progressList: Progress[];
  /** Réponses des 30 derniers jours (séries, lettres ratées). */
  answers: Answer[];
  vowelMode: VowelMode;
  lastExportAt: number | null;
  firstLaunchAt: number;
  /** Arrivée des 28 lettres dans l'appli (lot 2). */
  lettersSince: number;
  noVowelsUnlocked: boolean;
  /** Contexte commun pour construire une séance. */
  queueContext: () => QueueContext;
  reload: () => Promise<void>;
  setVowelMode: (m: VowelMode) => Promise<void>;
  setUserName: (n: string) => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

export function useApp(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider manquant');
  return v;
}

const repo = new DexieRepository(LOCAL_USER_ID);

async function firstLaunch(): Promise<number> {
  let first = await repo.getMeta<number>('firstLaunchAt');
  if (!first) {
    first = Date.now();
    await repo.ensureUser('');
    const b = parseBackup(seed, LOCAL_USER_ID);
    // Les mots de départ sont « créés » aujourd'hui : ils sont tous à découvrir.
    b.words = b.words.map((w) => ({ ...w, createdAt: first!, updatedAt: first! }));
    await repo.importAll(b, 'merge');
    await repo.setMeta('firstLaunchAt', first);
  }
  return first;
}

export function AppProvider({ children }: { children: preact.ComponentChildren }) {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const firstLaunchAt = await firstLaunch();
    // Contenu des cours validé (mots nouveaux, remplacements) : appliqué une fois par version.
    await applyCourseContent(repo);
    const [words, categories, progressList, answers, vowelMode, lastExportAt] = await Promise.all([
      repo.getWords(),
      repo.getCategories(),
      repo.getProgress(),
      repo.getAnswers(Date.now() - 31 * 86_400_000),
      repo.getMeta<VowelMode>('vowelMode'),
      repo.getMeta<number>('lastExportAt'),
    ]);
    const userName = (await repo.getMeta<string>('userName')) ?? '';
    let lettersSince = await repo.getMeta<number>('lettersSince');
    if (!lettersSince) {
      lettersSince = Date.now();
      await repo.setMeta('lettersSince', lettersSince);
    }
    let noVowelsUnlocked = (await repo.getMeta<boolean>('noVowelsUnlocked')) ?? false;
    if (!noVowelsUnlocked && unlockProgress(await repo.getAnswers(0)).unlocked) {
      noVowelsUnlocked = true;
      await repo.setMeta('noVowelsUnlocked', true);
    }
    const progress = new Map(progressList.map((p) => [p.id, p]));
    words.sort((a, b) => a.french.localeCompare(b.french, 'fr'));
    categories.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    setData({
      repo,
      userName,
      words,
      categories,
      progress,
      progressList,
      answers,
      vowelMode: vowelMode ?? 'always',
      lastExportAt: lastExportAt ?? null,
      firstLaunchAt,
      lettersSince,
      noVowelsUnlocked,
      queueContext: () => ({ words, progress, userId: repo.userId, today: dayKey(), lettersSince: lettersSince!, noVowelsUnlocked }),
      reload: load,
      setVowelMode: async (m) => {
        await repo.setMeta('vowelMode', m);
        await load();
      },
      setUserName: async (n) => {
        await repo.setMeta('userName', n.trim());
        await load();
      },
    });
  }, []);

  useEffect(() => {
    load().catch((e) => setError(String(e?.message ?? e)));
  }, [load]);

  if (error) {
    return (
      <div class="boot">
        <p>Impossible d’ouvrir les données locales.</p>
        <p class="muted">{error}</p>
        <p class="muted">En navigation privée, le stockage peut être bloqué.</p>
      </div>
    );
  }
  if (!data) return <div class="boot" aria-busy="true" />;
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}
