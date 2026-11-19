// Interface unique d'accès aux données. Les écrans ne connaissent que cette interface :
// en V1, on remplacera l'implémentation IndexedDB par un service hébergé sans toucher aux écrans.
import type { Answer, Category, Progress, Session, Word } from '../domain/types';
import type { Backup } from './backup';

export interface Repository {
  readonly userId: string;

  getWords(): Promise<Word[]>;
  /** Enregistre un ou plusieurs mots (création ou modification) en une seule opération. */
  saveWords(words: Word[]): Promise<void>;
  /** Supprime un mot, sa progression, et détache son mot lié. */
  deleteWord(id: string): Promise<void>;

  getCategories(): Promise<Category[]>;
  addCategory(name: string): Promise<void>;
  renameCategory(from: string, to: string): Promise<void>;
  deleteCategory(name: string): Promise<void>;

  getProgress(): Promise<Progress[]>;
  getAnswers(since?: number): Promise<Answer[]>;
  getSessions(sinceDay?: string): Promise<Session[]>;

  startSession(session: Session): Promise<void>;
  /** Enregistre une réponse, la progression et le compteur de séance en une seule transaction. */
  recordAnswer(answer: Answer, progress: Progress, session: Session): Promise<void>;

  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta<T>(key: string, value: T): Promise<void>;

  exportAll(): Promise<Backup>;
  importAll(backup: Backup, mode: 'merge' | 'replace'): Promise<void>;
}
