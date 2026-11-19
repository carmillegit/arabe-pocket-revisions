// Une séance : révision du jour (mots à échéance) ou entraînement libre sur un exercice.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dayKey } from '../domain/dates';
import {
  EXTRA_SIZE,
  SESSION_SIZE,
  buildPracticeQueue,
  buildReviewQueue,
  progressFor,
  type QueueFilters,
  type QueueItem,
} from '../domain/queue';
import { buildChoices, type Choice, type Direction } from '../domain/quiz';
import { applyAnswer } from '../domain/srs';
import { missedSince } from '../domain/stats';
import type { ExerciseId, Progress, Session as SessionT, Word } from '../domain/types';
import { newId } from '../domain/words';
import { go } from '../router';
import { useApp } from '../store';
import { Ar, Icon, VisualBadge, ToVerify, plural } from './common';

type Mode = 'revision' | QueueItem['exercise'];
const MODES: Mode[] = ['revision', 'cartes', 'qcm_ar_fr', 'qcm_fr_ar'];

export function SessionScreen({ params }: { params: URLSearchParams }) {
  const app = useApp();
  const { words, repo } = app;
  const mode = (MODES.includes(params.get('mode') as Mode) ? params.get('mode') : 'revision') as Mode;
  const filters: QueueFilters = useMemo(
    () => ({
      category: params.get('cat') || undefined,
      letter: params.get('lettre') || undefined,
      missedIds: params.get('rates') ? missedSince(app.answers, Date.now() - 7 * 86_400_000) : undefined,
    }),
    [params.toString()],
  );

  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  // Copie locale de la progression, mise à jour à chaque réponse.
  const progressRef = useRef(new Map(app.progress));
  const sessionRef = useRef<SessionT | null>(null);
  const answeredRef = useRef(new Set<string>());

  const makeQueue = (limit: number): QueueItem[] =>
    mode === 'revision'
      ? buildReviewQueue(words, progressRef.current, repo.userId, dayKey(), {
          filters,
          limit,
          exclude: answeredRef.current,
        })
      : buildPracticeQueue(words, progressRef.current, repo.userId, mode, { filters, limit });

  const [queue, setQueue] = useState<QueueItem[]>(() => makeQueue(SESSION_SIZE));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ ok: 0, total: 0 });

  // À la sortie, on recharge l'état global (accueil, progression à jour).
  useEffect(() => () => void app.reload(), []);

  async function record(item: QueueItem, word: Word, correct: boolean) {
    const now = Date.now();
    const exercise: ExerciseId = mode === 'revision' ? 'revision' : mode;
    if (!sessionRef.current) {
      sessionRef.current = {
        id: newId('s-'),
        userId: repo.userId,
        date: dayKey(now),
        startedAt: now,
        exercise,
        questions: 0,
        successes: 0,
      };
    }
    const s = sessionRef.current;
    s.questions += 1;
    if (correct) s.successes += 1;
    const before: Progress = progressFor(progressRef.current, repo.userId, word, item.skill, dayKey(now));
    const after = applyAnswer(before, correct, now);
    progressRef.current.set(after.id, after);
    answeredRef.current.add(`${word.id}|${item.skill}`);
    setScore((x) => ({ ok: x.ok + (correct ? 1 : 0), total: x.total + 1 }));
    // Enregistré tout de suite : fermer l'appli ne fait perdre aucune réponse.
    await repo.recordAnswer(
      {
        id: newId('a-'),
        userId: repo.userId,
        sessionId: s.id,
        itemId: word.id,
        skill: item.skill,
        exercise: item.exercise,
        correct,
        at: now,
        letters: word.letters,
      },
      after,
      { ...s },
    );
  }

  const done = index >= queue.length;
  const item = queue[index];
  const word = item && byId.get(item.wordId);

  if (queue.length === 0) {
    return (
      <Shell onClose={() => go('/')}>
        <div class="end">
          <p class="end-title">Rien à réviser ici</p>
          <p class="muted">
            {mode === 'revision'
              ? 'Aucun mot à échéance avec ces filtres.'
              : 'Aucun mot ne correspond à cette catégorie.'}
          </p>
          <button type="button" class="btn btn-primary btn-block" onClick={() => go('/')}>
            Retour à l’accueil
          </button>
        </div>
      </Shell>
    );
  }

  if (done || !word) {
    const more = mode === 'revision' ? makeQueue(EXTRA_SIZE) : [];
    return (
      <Shell onClose={() => go('/')}>
        <div class="end">
          <p class="end-title">Séance terminée</p>
          <p class="end-score">
            {score.ok} / {score.total}
          </p>
          <p class="muted">bonnes réponses</p>
          {more.length > 0 && (
            <button
              type="button"
              class="btn btn-primary btn-block"
              onClick={() => {
                setQueue(more);
                setIndex(0);
              }}
            >
              Encore {plural(more.length, 'élément', 'éléments')}
            </button>
          )}
          {mode !== 'revision' && (
            <button
              type="button"
              class="btn btn-primary btn-block"
              onClick={() => {
                setQueue(makeQueue(SESSION_SIZE));
                setIndex(0);
              }}
            >
              Recommencer
            </button>
          )}
          <button type="button" class="btn btn-secondary btn-block" onClick={() => go('/')}>
            Terminer
          </button>
        </div>
      </Shell>
    );
  }

  const next = () => setIndex((i) => i + 1);

  return (
    <Shell onClose={() => go('/')} progress={(index + 1) / queue.length} counter={`${index + 1} / ${queue.length}`}>
      {item.exercise === 'cartes' ? (
        <Card key={`${index}-${word.id}`} word={word} onAnswer={(ok) => record(item, word, ok).then(next)} />
      ) : (
        <Qcm
          key={`${index}-${word.id}`}
          word={word}
          pool={words}
          dir={item.exercise === 'qcm_ar_fr' ? 'ar_fr' : 'fr_ar'}
          onAnswer={(ok) => record(item, word, ok)}
          onNext={next}
        />
      )}
    </Shell>
  );
}

function Shell({
  children,
  onClose,
  progress,
  counter,
}: {
  children: preact.ComponentChildren;
  onClose: () => void;
  progress?: number;
  counter?: string;
}) {
  return (
    <main class="screen session">
      <header class="session-bar">
        <button type="button" class="icon-btn" onClick={onClose} aria-label="Quitter la séance (tes réponses sont enregistrées)">
          <Icon name="close" />
        </button>
        {progress !== undefined && (
          <div class="pbar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        <span class="counter">{counter}</span>
      </header>
      {children}
    </main>
  );
}

function WordDetails({ word }: { word: Word }) {
  return (
    <div class="details">
      <p class="translit">{word.transliteration}</p>
      <p class="french">{word.french}</p>
      {word.pronunciationHint && <p class="hint">{word.pronunciationHint}</p>}
      <ToVerify w={word} />
    </div>
  );
}

function Card({ word, onAnswer }: { word: Word; onAnswer: (ok: boolean) => void }) {
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
      <button
        type="button"
        class={`flashcard ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped(true)}
        aria-label={flipped ? undefined : 'Retourner la carte'}
      >
        <VisualBadge visual={word.visual} size={72} />
        <Ar text={word.arabicVoweled} size="xl" forceVowels={flipped} />
        {flipped ? <WordDetails word={word} /> : <span class="muted small">Touche pour retourner</span>}
      </button>
      <div class="actions">
        {flipped ? (
          <>
            <button type="button" class="btn btn-bad" onClick={() => answer(false)}>
              À revoir
            </button>
            <button type="button" class="btn btn-good" onClick={() => answer(true)}>
              Su
            </button>
          </>
        ) : (
          <button type="button" class="btn btn-primary btn-block" onClick={() => setFlipped(true)}>
            Retourner
          </button>
        )}
      </div>
    </div>
  );
}

function Qcm({
  word,
  pool,
  dir,
  onAnswer,
  onNext,
}: {
  word: Word;
  pool: Word[];
  dir: Direction;
  onAnswer: (ok: boolean) => void;
  onNext: () => void;
}) {
  const choices = useMemo<Choice[]>(() => buildChoices(word, pool, dir), [word.id, dir]);
  const [picked, setPicked] = useState<string | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pick = (c: Choice) => {
    if (picked) return;
    setPicked(c.wordId);
    onAnswer(c.correct);
  };
  useEffect(() => {
    if (picked) nextRef.current?.focus();
  }, [picked]);
  const ok = picked === word.id;

  return (
    <div class="exercise">
      <p class="prompt-label">{dir === 'ar_fr' ? 'Que veut dire ce mot ?' : 'Comment dit-on en arabe…'}</p>
      <div class="prompt">
        {dir === 'ar_fr' ? <Ar text={word.arabicVoweled} size="xl" toggle /> : <p class="prompt-fr">{word.french}</p>}
      </div>
      <ul class={`choices ${dir === 'fr_ar' ? 'choices-ar' : ''}`}>
        {choices.map((c) => {
          const state = !picked ? '' : c.correct ? 'is-correct' : c.wordId === picked ? 'is-wrong' : 'is-dim';
          return (
            <li key={c.wordId}>
              <button type="button" class={`choice ${state}`} onClick={() => pick(c)} disabled={!!picked && !state.startsWith('is-c') && c.wordId !== picked}>
                {dir === 'fr_ar' ? <Ar text={c.text} size="l" /> : c.text}
              </button>
            </li>
          );
        })}
      </ul>
      {picked && (
        <div class={`feedback ${ok ? 'fb-ok' : 'fb-bad'}`} role="status">
          <p class="fb-title">{ok ? 'Bonne réponse' : 'Pas tout à fait'}</p>
          <div class="fb-word">
            <VisualBadge visual={word.visual} size={40} />
            <Ar text={word.arabicVoweled} size="l" forceVowels />
          </div>
          <WordDetails word={word} />
          <button ref={nextRef} type="button" class="btn btn-primary btn-block" onClick={onNext}>
            Continuer
          </button>
        </div>
      )}
    </div>
  );
}
