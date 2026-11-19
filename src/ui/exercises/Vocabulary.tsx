// Exercices de vocabulaire : cartes recto/verso, QCM dans les deux sens.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildChoices, type Choice, type Direction } from '../../domain/quiz';
import type { Word } from '../../domain/types';
import { Ar, ToVerify, VisualBadge } from '../common';

export function WordDetails({ word }: { word: Word }) {
  return (
    <div class="details">
      <p class="translit">{word.transliteration}</p>
      <p class="french">{word.french}</p>
      {word.pronunciationHint && <p class="hint">{word.pronunciationHint}</p>}
      <ToVerify w={word} />
    </div>
  );
}

export function Card({ word, onAnswer }: { word: Word; onAnswer: (ok: boolean) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const answer = (ok: boolean) => {
    if (busy) return;
    setBusy(true);
    onAnswer(ok);
  };
  return (
    <div class="exercise">
      <p class="prompt-label">Tu connais ce mot ?</p>
      <button type="button" class={`flashcard ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlipped(true)} aria-label={flipped ? undefined : 'Retourner la carte'}>
        <VisualBadge visual={word.visual} size={72} />
        <Ar text={word.arabicVoweled} size="xl" forceVowels={flipped} />
        {flipped ? <WordDetails word={word} /> : <span class="muted small">Touche pour retourner</span>}
      </button>
      <div class="actions">
        {flipped ? (
          <>
            <button type="button" class="btn btn-bad" onClick={() => answer(false)}>À revoir</button>
            <button type="button" class="btn btn-good" onClick={() => answer(true)}>Su</button>
          </>
        ) : (
          <button type="button" class="btn btn-primary btn-block" onClick={() => setFlipped(true)}>Retourner</button>
        )}
      </div>
    </div>
  );
}

/** Liste de choix commune à tous les QCM. */
export function ChoiceList<T extends { correct: boolean }>({
  choices,
  render,
  arabic,
  picked,
  onPick,
}: {
  choices: T[];
  render: (c: T) => preact.ComponentChildren;
  arabic?: boolean;
  picked: number | null;
  onPick: (i: number) => void;
}) {
  return (
    <ul class={`choices ${arabic ? 'choices-ar' : ''}`}>
      {choices.map((c, i) => {
        const state = picked === null ? '' : c.correct ? 'is-correct' : i === picked ? 'is-wrong' : 'is-dim';
        return (
          <li key={i}>
            <button type="button" class={`choice ${state}`} onClick={() => picked === null && onPick(i)} aria-disabled={picked !== null}>
              {render(c)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Retour après une réponse : toujours affiché, même quand c'est juste. */
export function Feedback({ ok, children, onNext, nextLabel = 'Continuer' }: { ok: boolean; children: preact.ComponentChildren; onNext: () => void; nextLabel?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  return (
    <div class={`feedback ${ok ? 'fb-ok' : 'fb-bad'}`} role="status">
      <p class="fb-title">{ok ? 'Bonne réponse' : 'Pas tout à fait'}</p>
      {children}
      <button ref={ref} type="button" class="btn btn-primary btn-block" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

export function Qcm({ word, pool, dir, onAnswer, onNext }: { word: Word; pool: Word[]; dir: Direction; onAnswer: (ok: boolean) => void; onNext: () => void }) {
  const choices = useMemo<Choice[]>(() => buildChoices(word, pool, dir), [word.id, dir]);
  const [picked, setPicked] = useState<number | null>(null);
  const ok = picked !== null && choices[picked].correct;
  return (
    <div class="exercise">
      <p class="prompt-label">{dir === 'ar_fr' ? 'Que veut dire ce mot ?' : 'Comment dit-on en arabe…'}</p>
      <div class="prompt">
        {dir === 'ar_fr' ? <Ar text={word.arabicVoweled} size="xl" toggle /> : <p class="prompt-fr">{word.french}</p>}
      </div>
      <ChoiceList
        choices={choices}
        arabic={dir === 'fr_ar'}
        picked={picked}
        onPick={(i) => { setPicked(i); onAnswer(choices[i].correct); }}
        render={(c) => (dir === 'fr_ar' ? <Ar text={c.text} size="l" /> : c.text)}
      />
      {picked !== null && (
        <Feedback ok={ok} onNext={onNext}>
          <div class="fb-word">
            <VisualBadge visual={word.visual} size={40} />
            <Ar text={word.arabicVoweled} size="l" forceVowels />
          </div>
          <WordDetails word={word} />
        </Feedback>
      )}
    </div>
  );
}
