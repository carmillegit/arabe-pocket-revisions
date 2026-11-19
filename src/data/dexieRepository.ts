// Implémentation locale (IndexedDB via Dexie).
import Dexie, { type Table } from 'dexie';
import type { Answer, Category, Progress, Session, User, Word } from '../domain/types';
import { APP_ID, SCHEMA_VERSION, mergeBackups, type Backup } from './backup';
import type { Repository } from './repository';

interface Meta {
  key: string;
  value: unknown;
}

class AppDB extends Dexie {
  users!: Table<User, string>;
  words!: Table<Word, string>;
  categories!: Table<Category, [string, string]>;
  progress!: Table<Progress, string>;
  answers!: Table<Answer, string>;
  sessions!: Table<Session, string>;
  meta!: Table<Meta, string>;

  constructor(name: string) {
    super(name);
    // Version 1 du schéma. Toute évolution ajoute un .version(n).stores(...).upgrade(...)
    // et Dexie migre automatiquement les données au lancement suivant.
    this.version(1).stores({
      users: 'id',
      words: 'id, userId, category',
      categories: '[userId+name], userId',
      progress: 'id, userId, itemId',
      answers: 'id, userId, at, itemId',
      sessions: 'id, userId, date',
      meta: 'key',
    });
  }
}

export class DexieRepository implements Repository {
  private db: AppDB;

  constructor(
    readonly userId: string,
    dbName = 'arabe-revision',
  ) {
    this.db = new AppDB(dbName);
  }

  async ensureUser(name: string): Promise<void> {
    const u = await this.db.users.get(this.userId);
    if (!u) await this.db.users.put({ id: this.userId, name, createdAt: Date.now() });
  }

  getWords() {
    return this.db.words.where('userId').equals(this.userId).toArray();
  }

  async saveWords(words: Word[]) {
    await this.db.transaction('rw', this.db.words, this.db.categories, async () => {
      await this.db.words.bulkPut(words);
      for (const w of words) await this.db.categories.put({ userId: this.userId, name: w.category });
    });
  }

  async deleteWord(id: string) {
    await this.db.transaction('rw', this.db.words, this.db.progress, async () => {
      const w = await this.db.words.get(id);
      if (!w) return;
      if (w.linkedWordId) {
        const other = await this.db.words.get(w.linkedWordId);
        if (other && other.linkedWordId === id) {
          await this.db.words.put({ ...other, linkedWordId: null, updatedAt: Date.now() });
        }
      }
      await this.db.progress.where('itemId').equals(id).delete();
      await this.db.words.delete(id);
    });
  }

  getCategories() {
    return this.db.categories.where('userId').equals(this.userId).toArray();
  }

  async addCategory(name: string) {
    await this.db.categories.put({ userId: this.userId, name: name.trim() });
  }

  async renameCategory(from: string, to: string) {
    to = to.trim();
    if (!to || from === to) return;
    await this.db.transaction('rw', this.db.words, this.db.categories, async () => {
      const now = Date.now();
      const ws = await this.db.words.where('category').equals(from).filter((w) => w.userId === this.userId).toArray();
      await this.db.words.bulkPut(ws.map((w) => ({ ...w, category: to, updatedAt: now })));
      await this.db.categories.delete([this.userId, from]);
      await this.db.categories.put({ userId: this.userId, name: to });
    });
  }

  async deleteCategory(name: string) {
    const used = await this.db.words.where('category').equals(name).filter((w) => w.userId === this.userId).count();
    if (used > 0) throw new Error('Cette catégorie contient encore des mots.');
    await this.db.categories.delete([this.userId, name]);
  }

  getProgress() {
    return this.db.progress.where('userId').equals(this.userId).toArray();
  }

  async getAnswers(since = 0) {
    return (await this.db.answers.where('at').aboveOrEqual(since).toArray()).filter((a) => a.userId === this.userId);
  }

  async getSessions(sinceDay = '0000-00-00') {
    return (await this.db.sessions.where('date').aboveOrEqual(sinceDay).toArray()).filter((s) => s.userId === this.userId);
  }

  async startSession(session: Session) {
    await this.db.sessions.put(session);
  }

  async recordAnswer(answer: Answer, progress: Progress, session: Session) {
    await this.db.transaction('rw', this.db.answers, this.db.progress, this.db.sessions, async () => {
      await this.db.answers.put(answer);
      await this.db.progress.put(progress);
      await this.db.sessions.put(session);
    });
  }

  async getMeta<T>(key: string) {
    return (await this.db.meta.get(`${this.userId}:${key}`))?.value as T | undefined;
  }

  async setMeta<T>(key: string, value: T) {
    await this.db.meta.put({ key: `${this.userId}:${key}`, value });
  }

  async exportAll(): Promise<Backup> {
    const [users, categories, words, progress, sessions, answers] = await Promise.all([
      this.db.users.where('id').equals(this.userId).toArray(),
      this.getCategories(),
      this.getWords(),
      this.getProgress(),
      this.getSessions(),
      this.getAnswers(),
    ]);
    return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: Date.now(), users, categories, words, progress, sessions, answers };
  }

  async importAll(incoming: Backup, mode: 'merge' | 'replace') {
    const own = <T extends { userId: string }>(xs: T[]) => xs.map((x) => ({ ...x, userId: this.userId }));
    const inc: Backup = {
      ...incoming,
      categories: own(incoming.categories),
      words: own(incoming.words),
      progress: own(incoming.progress).map((p) => ({ ...p, id: `${this.userId}|${p.itemId}|${p.skill}` })),
      sessions: own(incoming.sessions),
      answers: own(incoming.answers),
    };
    const data = mode === 'merge' ? mergeBackups(await this.exportAll(), inc) : inc;
    const db = this.db;
    await db.transaction('rw', [db.words, db.categories, db.progress, db.sessions, db.answers], async () => {
      if (mode === 'replace') {
        await db.words.where('userId').equals(this.userId).delete();
        await db.categories.where('userId').equals(this.userId).delete();
        await db.progress.where('userId').equals(this.userId).delete();
        await db.sessions.where('userId').equals(this.userId).delete();
        await db.answers.filter((a) => a.userId === this.userId).delete();
      }
      await db.words.bulkPut(data.words);
      await db.categories.bulkPut(data.categories);
      await db.progress.bulkPut(data.progress);
      await db.sessions.bulkPut(data.sessions);
      await db.answers.bulkPut(data.answers);
    });
  }

  /** Pour les tests. */
  async destroy() {
    await this.db.delete();
  }
}
