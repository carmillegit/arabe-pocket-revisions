// Audio des mots : fichiers générés une fois (voix de synthèse libre), livrés avec l'appli.
// Le lien se fait par le texte vocalisé : un même mot ajouté par n'importe qui retrouve son audio.
import manifest from '../seed/audio.json';
import { normalizeArabic } from './arabic';
import type { Word } from './types';

const FILES = manifest.files as Record<string, string>;

export function audioUrl(w: Pick<Word, 'arabicVoweled' | 'audio'>): string | null {
  return w.audio?.file ?? FILES[normalizeArabic(w.arabicVoweled)] ?? null;
}

export function hasAudio(w: Pick<Word, 'arabicVoweled' | 'audio'>): boolean {
  return audioUrl(w) !== null;
}

export const AUDIO_STATUS_LABEL: Record<Word['audio']['status'], string> = {
  synthese_a_valider: 'Voix de synthèse, à valider',
  valide: 'Voix de synthèse, validée',
  voix_humaine: 'Voix humaine',
};
