// Dictée tracée : j'entends un mot, je le trace de mémoire, puis je vérifie lettre par lettre.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { audioUrl } from '../../domain/audio';
import { dictationUnits } from '../../domain/dictation';
import { POSITION_LABEL, type Position } from '../../domain/letters';
import type { Word } from '../../domain/types';
import { Ar, SpeakButton, playAudio } from '../common';
import { Trace } from './Trace';

export type LetterResult = { letter: string; position: Position; ok: boolean };

export function Dictation({ word, onAnswer }: { word: Word; onAnswer: (ok: boolean, results: LetterResult[]) => void }) {
  const units = useMemo(() => dictationUnits(word.arabicVoweled), [word.id]);
  const [marks, setMarks] = useState<(boolean | null)[]>(() => units.map(() => null));
  const [busy, setBusy] = useState(false);

  // Lecture automatique à l'ouverture (l'iPhone peut la refuser : le bouton reste là).
  useEffect(() => {
    const url = audioUrl(word);
    if (url) playAudio(url);
  }, [word.id]);

  const setMark = (i: number, v: boolean) => setMarks((m) => m.map((x, k) => (k === i ? v : x)));
  const allMarked = marks.every((m) => m !== null);

  const validate = () => {
    if (busy || !allMarked) return;
    setBusy(true);
    const results = units.flatMap((u, i) => u.letters.map((l) => ({ ...l, ok: marks[i] === true })));
    onAnswer(marks.every((m) => m === true), results);
  };

  const head = (
    <div class="dictation-head">
      <p class="prompt-label">Écoute, puis écris le mot</p>
      <SpeakButton word={word} big />
    </div>
  );

  const afterReveal = () => (
    <div class="dictation-check">
      <div class="dictation-word">
        <Ar text={word.arabicVoweled} size="l" forceVowels />
        <p>
          <strong>{word.french}</strong> · <em>{word.transliteration}</em>
        </p>
      </div>
      <p class="prompt-label">Lettre par lettre, as-tu juste ?</p>
      <ol class="units">
        {units.map((u, i) => (
          <li key={i} class={marks[i] === true ? 'is-ok' : marks[i] === false ? 'is-bad' : ''}>
            <bdi class="ar ar-l" lang="ar" dir="rtl">{u.form}</bdi>
            <span class="unit-pos">{POSITION_LABEL[u.position]}</span>
            <span class="unit-btns">
              <button type="button" aria-pressed={marks[i] === true} onClick={() => setMark(i, true)} aria-label={`${u.text} ${POSITION_LABEL[u.position]} : juste`}>
                ✓ Juste
              </button>
              <button type="button" aria-pressed={marks[i] === false} onClick={() => setMark(i, false)} aria-label={`${u.text} ${POSITION_LABEL[u.position]} : à revoir`}>
                ✕ À revoir
              </button>
            </span>
          </li>
        ))}
      </ol>
      <div class="row-actions">
        <button type="button" class="btn btn-secondary" onClick={() => setMarks(units.map(() => true))}>
          Tout est juste
        </button>
        <button type="button" class="btn btn-primary" disabled={!allMarked || busy} onClick={validate}>
          Valider
        </button>
      </div>
      <p class="small muted center">Points et voyelles : seconde passe facultative, non notée.</p>
    </div>
  );

  return <Trace word={word} showArrows={false} dictation={{ head, afterReveal }} onAnswer={() => {}} />;
}
