// État de l'application, chargé en mémoire (quelques centaines de mots : c'est instantané).
import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';
import type { Answer, Category, Progress, Word } from './domain/types';
import { LOCAL_USER_ID } from './domain/types';
import { DexieRepository } from './data/dexieRepository';
import type { Repository } from './data/repository';
import { parseBackup } from './data/backup';
import seed from './seed/mots_depart.json';

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
  reload: () => Promise<void>;
  setVowelMode: (m: VowelMode) => Promise<void>;
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
    await repo.ensureUser('Camille');
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
    const [words, categories, progressList, answers, vowelMode, lastExportAt] = await Promise.all([
      repo.getWords(),
      repo.getCategories(),
      repo.getProgress(),
      repo.getAnswers(Date.now() - 31 * 86_400_000),
      repo.getMeta<VowelMode>('vowelMode'),
      repo.getMeta<number>('lastExportAt'),
    ]);
    words.sort((a, b) => a.french.localeCompare(b.french, 'fr'));
    categories.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    setData({
      repo,
      userName: 'Camille',
      words,
      categories,
      progress: new Map(progressList.map((p) => [p.id, p])),
      progressList,
      answers,
      vowelMode: vowelMode ?? 'always',
      lastExportAt: lastExportAt ?? null,
      firstLaunchAt,
      reload: load,
      setVowelMode: async (m) => {
        await repo.setMeta('vowelMode', m);
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
