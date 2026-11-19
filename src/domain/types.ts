// Modèle de données. Chaque ligne porte un userId dès la V0 (valeur fixe "local")
// pour permettre la V1 multi-comptes sans migration lourde.

export type Skill = 'lecture' | 'ecriture' | 'vocabulaire';

export type ContentType = 'mot' | 'pluriel' | 'verbe' | 'phrase' | 'texte';
export type Source = 'cours' | 'perso' | 'externe';
export type ContentStatus = 'propose' | 'a_verifier' | 'valide';
export type AudioStatus = 'synthese_a_valider' | 'valide' | 'voix_humaine';

export type Visual =
  | { kind: 'emoji'; value: string }
  | { kind: 'color'; value: string }
  | null;

export interface User {
  id: string;
  name: string;
  createdAt: number;
}

export interface Word {
  id: string;
  userId: string;
  authorId: string;
  arabicVoweled: string;
  /** Calculé : ne jamais saisir à la main. */
  arabicPlain: string;
  transliteration: string;
  french: string;
  category: string;
  pronunciationHint: string;
  visual: Visual;
  type: ContentType;
  linkedWordId: string | null;
  level: string;
  source: Source;
  root: string | null;
  /** Calculé : lettres de base contenues dans le mot (sans doublon). */
  letters: string[];
  status: ContentStatus;
  audio: { file: string | null; status: AudioStatus };
  /** Compétence écriture activée pour ce mot (case « à apprendre à écrire »). */
  writingEnabled: boolean;
  /** Pour un texte : identifiants des mots qui le composent (paliers suivants). */
  wordIds?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  userId: string;
  name: string;
}

/** Un « élément » est un mot (id du mot) ou une lettre (préfixe "L:"). */
export interface Progress {
  id: string; // `${userId}|${itemId}|${skill}`
  userId: string;
  itemId: string;
  skill: Skill;
  box: number; // 1 à 5
  due: string; // jour local AAAA-MM-JJ
  successes: number;
  failures: number;
  lastAnsweredAt: number | null;
}

export type ExerciseId =
  | 'revision'
  | 'cartes'
  | 'qcm_ar_fr'
  | 'qcm_fr_ar'
  | 'lecture_v'
  | 'lecture_nv'
  | 'lettre'
  | 'paires'
  | 'trace'
  | 'trace_memoire'
  | 'dictee';

export interface Answer {
  id: string;
  userId: string;
  sessionId: string;
  itemId: string;
  skill: Skill;
  exercise: ExerciseId;
  correct: boolean;
  at: number;
  letters: string[];
}

export interface Session {
  id: string;
  userId: string;
  date: string; // AAAA-MM-JJ
  startedAt: number;
  exercise: ExerciseId;
  questions: number;
  successes: number;
}

/** Réussites et échecs par lettre et par position (dictée tracée). */
export interface LetterPositionStat {
  id: string; // `${userId}|${letter}|${position}`
  userId: string;
  letter: string;
  position: 'isolee' | 'initiale' | 'mediane' | 'finale';
  successes: number;
  failures: number;
  lastAnsweredAt: number | null;
}

export const LOCAL_USER_ID = 'local';
