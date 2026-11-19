// Exercices de lecture : mot → translittération, lettre → nom et son, paires qui piègent.
import { useMemo, useState } from 'preact/hooks';
import { stripVowels } from '../../domain/arabic';
import { LETTER_BY_CHAR, POSITION_LABEL, letterForm, type Position } from '../../domain/letters';
import { letterChoices, pairChoices, translitChoices } from '../../domain/reading';
import type { Word } from '../../domain/types';
import { Ar, VisualBadge } from '../common';
import { ChoiceList, Feedback, WordDetails } from './Vocabulary';

export function TranslitQcm({ word, pool, withVowels, onAnswer, onNext }: { word: Word; pool: Word[]; withVowels: boolean; onAnswer: (ok: boolean) => void; onNext: () => void }) {
  const choices = useMemo(() => translitChoices(word, pool, withVowels), [word.id, withVowels]);
  const [picked, setPicked] = useState<number | null>(null);
  const ok = picked !== null && choices[picked].correct;
  return (
    <div class="exercise">
      <p class="prompt-label">{withVowels ? 'Comment se lit ce mot ?' : 'Comment se lit ce mot, sans ses voyelles ?'}</p>
      <div class="prompt">
        <bdi class="ar ar-xl" lang="ar" dir="rtl">{withVowels ? word.arabicVoweled : stripVowels(word.arabicVoweled)}</bdi>
      </div>
      <ChoiceList
        choices={choices}
        picked={picked}
        onPick={(i) => { setPicked(i); onAnswer(choices[i].correct); }}
        render={(c) => <span class="choice-translit">{c.text}</span>}
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

const POSITIONS: Position[] = ['isolee', 'initiale', 'mediane', 'finale'];

/** Les quatre formes d'une lettre, avec leur position. */
export function LetterForms({ letter, highlight }: { letter: string; highlight?: Position }) {
  return (
    <ul class="forms">
      {POSITIONS.map((p) => (
        <li key={p} class={highlight === p ? 'is-on' : ''}>
          <bdi class="ar ar-l" lang="ar" dir="rtl">{letterForm(letter, p)}</bdi>
          <span class="small muted">{POSITION_LABEL[p]}</span>
        </li>
      ))}
    </ul>
  );
}

function LetterSummary({ letter }: { letter: string }) {
  const info = LETTER_BY_CHAR.get(letter)!;
  return (
    <div class="details">
      <p class="french">
        {info.name} <bdi class="ar ar-m" lang="ar" dir="rtl">{info.nameAr}</bdi>
      </p>
      <p class="translit">{info.sound}</p>
      <p class="hint">{info.soundHint}</p>
    </div>
  );
}

/** Lettre → nom, puis son. La lettre s'affiche isolée, puis sous ses autres formes une fois mieux connue. */
export function LetterNameSound({ letter, varied, onAnswer, onNext }: { letter: string; varied: boolean; onAnswer: (ok: boolean) => void; onNext: () => void }) {
  // Lettre nouvelle : forme isolée. Ensuite, toutes les formes, pour la valider sous chacune.
  const position = useMemo<Position>(() => (varied ? POSITIONS[Math.floor(Math.random() * 4)] : 'isolee'), [letter]);
  const nameChoices = useMemo(() => letterChoices(letter, 'name'), [letter]);
  const soundChoices = useMemo(() => letterChoices(letter, 'sound'), [letter]);
  const [nameIdx, setNameIdx] = useState<number | null>(null);
  const [soundIdx, setSoundIdx] = useState<number | null>(null);
  const nameOk = nameIdx !== null && nameChoices[nameIdx].correct;
  const soundOk = soundIdx !== null && soundChoices[soundIdx].correct;
  const done = nameIdx !== null && soundIdx !== null;

  return (
    <div class="exercise">
      <p class="prompt-label">{nameIdx === null ? 'Quel est le nom de cette lettre ?' : 'Et quel son fait-elle ?'}</p>
      <div class="prompt prompt-letter">
        <bdi class="ar ar-xxl" lang="ar" dir="rtl">{letterForm(letter, position)}</bdi>
        <span class="small muted">{POSITION_LABEL[position]}</span>
      </div>
      {nameIdx === null ? (
        <ChoiceList choices={nameChoices} picked={null} onPick={setNameIdx} render={(c) => c.text} />
      ) : (
        <>
          <p class={`step-result ${nameOk ? 'ok' : 'bad'}`}>
            Nom : {nameOk ? 'juste' : `c’était ${LETTER_BY_CHAR.get(letter)!.name}`}
          </p>
          {!done && (
            <ChoiceList
              choices={soundChoices}
              picked={soundIdx}
              onPick={(i) => { setSoundIdx(i); onAnswer(nameOk && soundChoices[i].correct); }}
              render={(c) => <span class="choice-translit">{c.text}</span>}
            />
          )}
        </>
      )}
      {done && (
        <Feedback ok={nameOk && soundOk} onNext={onNext}>
          <LetterSummary letter={letter} />
          <LetterForms letter={letter} highlight={position} />
        </Feedback>
      )}
    </div>
  );
}

/** Paires qui piègent : un nom et un son, quatre lettres qui se ressemblent. */
export function Pairs({ letter, onAnswer, onNext }: { letter: string; onAnswer: (ok: boolean) => void; onNext: () => void }) {
  const info = LETTER_BY_CHAR.get(letter)!;
  const choices = useMemo(() => pairChoices(letter), [letter]);
  const [picked, setPicked] = useState<number | null>(null);
  const ok = picked !== null && choices[picked].correct;
  return (
    <div class="exercise">
      <p class="prompt-label">Quelle lettre est…</p>
      <div class="prompt">
        <div class="center">
          <p class="prompt-fr">{info.name}</p>
          <p class="translit">{info.sound} · {info.soundHint}</p>
        </div>
      </div>
      <ChoiceList
        choices={choices}
        arabic
        picked={picked}
        onPick={(i) => { setPicked(i); onAnswer(choices[i].correct); }}
        render={(c) => <bdi class="ar ar-l" lang="ar" dir="rtl">{c.letter}</bdi>}
      />
      {picked !== null && (
        <Feedback ok={ok} onNext={onNext}>
          {!ok && (
            <p class="center small">
              Tu as choisi <bdi class="ar ar-m" lang="ar" dir="rtl">{choices[picked].letter}</bdi> ({LETTER_BY_CHAR.get(choices[picked].letter)!.name}).
            </p>
          )}
          <LetterSummary letter={letter} />
          <LetterForms letter={letter} />
        </Feedback>
      )}
    </div>
  );
}
