// Une séance : révision du jour (éléments à échéance) ou entraînement libre sur un exercice.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dayKey } from '../domain/dates';
import {
  EXTRA_SIZE,
  SESSION_SIZE,
  buildPracticeQueue,
  buildReviewQueue,
  progressFor,
  allowedExercises,
  isLetterItem,
  letterOfItem,
  type PracticeExercise,
  type QueueFilters,
  type QueueItem,
} from '../domain/queue';
import { applyAnswer } from '../domain/srs';
import { missedSince } from '../domain/stats';
import { unlockProgress } from '../domain/reading';
import type { Answer, ExerciseId, LetterPositionStat, Session as SessionT, Word } from '../domain/types';
import { applyLetterResults } from '../domain/dictation';
import { Dictation, type LetterResult } from './exercises/Dictation';
import { newId } from '../domain/words';
import { go } from '../router';
import { useApp } from '../store';
import { Icon, plural } from './common';
import { Card, Qcm } from './exercises/Vocabulary';
import { LetterNameSound, Pairs, TranslitQcm } from './exercises/Reading';
import { Trace } from './exercises/Trace';
import type { Position } from '../domain/letters';

type Mode = 'revision' | PracticeExercise;
const MODES: Mode[] = ['revision', 'cartes', 'qcm_ar_fr', 'qcm_fr_ar', 'lecture_v', 'lecture_nv', 'lettre', 'paires', 'trace', 'trace_memoire', 'dictee'];
const POSITIONS: Position[] = ['isolee', 'initiale', 'mediane', 'finale'];

export function SessionScreen({ params }: { params: URLSearchParams }) {
  const app = useApp();
  const { words, repo } = app;
  const mode = (MODES.includes(params.get('mode') as Mode) ? params.get('mode') : 'revision') as Mode;
  const target = params.get('cible') === 'mots' ? 'mots' : 'lettres';
  const filters: QueueFilters = useMemo(
    () => ({
      category: params.get('cat') || undefined,
      letter: params.get('lettre') || undefined,
      missedIds: params.get('rates') ? missedSince(app.answers, Date.now() - 7 * 86_400_000) : undefined,
    }),
    [params.toString()],
  );

  const activities = useMemo(() => allowedExercises((params.get('act') ?? '').split(',').filter(Boolean)), [params.toString()]);
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  // Copie locale de la progression, mise à jour à chaque réponse.
  const progressRef = useRef(new Map(app.progress));
  const sessionRef = useRef<SessionT | null>(null);
  const answeredRef = useRef(new Set<string>());
  const lectureAnswers = useRef<Answer[]>(app.answers.filter((a) => a.exercise === 'lecture_v'));
  // Table lettre × position, chargée au début de la séance (dictée tracée).
  const letterStatsRef = useRef(new Map<string, LetterPositionStat>());
  useEffect(() => {
    repo.getLetterStats().then((xs) => xs.forEach((x) => letterStatsRef.current.set(x.id, x)));
  }, []);
  const [unlockedNow, setUnlockedNow] = useState(false);

  const ctx = () => ({ ...app.queueContext(), progress: progressRef.current });
  const makeQueue = (limit: number): QueueItem[] =>
    mode === 'revision'
      ? buildReviewQueue(ctx(), { filters, limit, exclude: answeredRef.current, activities })
      : buildPracticeQueue(ctx(), mode, { filters, limit, target });

  // Taille demandée par l'accueil (questions restantes du jour, ou « encore 10 »).
  const firstSize = Math.max(1, Math.min(50, Number(params.get('n')) || SESSION_SIZE));
  const [queue, setQueue] = useState<QueueItem[]>(() => makeQueue(firstSize));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ ok: 0, total: 0 });

  // À la sortie, on recharge l'état global (accueil, progression à jour).
  useEffect(() => () => void app.reload(), []);

  async function record(item: QueueItem, correct: boolean, letterResults: LetterResult[] = []) {
    const now = Date.now();
    const exercise: ExerciseId = mode === 'revision' ? 'revision' : mode;
    if (!sessionRef.current) {
      sessionRef.current = { id: newId('s-'), userId: repo.userId, date: dayKey(now), startedAt: now, exercise, questions: 0, successes: 0 };
    }
    const s = sessionRef.current;
    s.questions += 1;
    if (correct) s.successes += 1;
    const word = byId.get(item.itemId);
    const createdAt = word ? word.createdAt : app.lettersSince;
    const before = progressFor(progressRef.current, repo.userId, item.itemId, item.skill, dayKey(now), createdAt);
    const after = applyAnswer(before, correct, now);
    progressRef.current.set(after.id, after);
    answeredRef.current.add(`${item.itemId}|${item.skill}`);
    setScore((x) => ({ ok: x.ok + (correct ? 1 : 0), total: x.total + 1 }));
    const answer: Answer = {
      id: newId('a-'),
      userId: repo.userId,
      sessionId: s.id,
      itemId: item.itemId,
      skill: item.skill,
      exercise: item.exercise,
      correct,
      at: now,
      letters: word ? word.letters : [letterOfItem(item.itemId)],
    };
    // Enregistré tout de suite : fermer l'appli ne fait perdre aucune réponse.
    const stats = applyLetterResults(letterStatsRef.current, repo.userId, letterResults, now);
    stats.forEach((x) => letterStatsRef.current.set(x.id, x));
    await repo.recordAnswer(answer, after, { ...s }, stats);
    if (item.exercise === 'lecture_v' && !app.noVowelsUnlocked && !unlockedNow) {
      lectureAnswers.current.push(answer);
      if (unlockProgress(lectureAnswers.current).unlocked) {
        await repo.setMeta('noVowelsUnlocked', true);
        setUnlockedNow(true);
      }
    }
  }

  const done = index >= queue.length;
  const item = queue[index];
  const word = item && !isLetterItem(item.itemId) ? byId.get(item.itemId) : undefined;
  const letter = item && isLetterItem(item.itemId) ? letterOfItem(item.itemId) : undefined;

  if (queue.length === 0) {
    const why =
      mode === 'revision'
        ? 'Aucun élément à échéance avec ces filtres (catégorie, lettre ou activités).'
        : mode === 'trace' && target === 'mots'
          ? 'Aucun mot n’est marqué « à apprendre à écrire ». Coche la case dans la fiche d’un mot.'
          : mode === 'dictee'
            ? 'Aucun mot de cette sélection n’a encore d’audio.'
          : 'Aucun élément ne correspond à ce choix.';
    return (
      <Shell onClose={() => go('/')}>
        <div class="end">
          <p class="end-title">Rien à réviser ici</p>
          <p class="muted">{why}</p>
          <button type="button" class="btn btn-primary btn-block" onClick={() => go('/')}>
            Retour à l’accueil
          </button>
        </div>
      </Shell>
    );
  }

  if (done || (!word && !letter)) {
    const more = mode === 'revision' ? makeQueue(EXTRA_SIZE) : [];
    return (
      <Shell onClose={() => go('/')}>
        <div class="end">
          <p class="end-title">Séance terminée</p>
          <p class="end-score">
            {score.ok} / {score.total}
          </p>
          <p class="muted">bonnes réponses</p>
          {unlockedNow && (
            <p class="msg msg-ok">
              Bravo ! Plus de 80 % de réussite : la lecture <strong>sans voyelles</strong> est débloquée.
            </p>
          )}
          {more.length > 0 && (
            <button type="button" class="btn btn-primary btn-block" onClick={() => { setQueue(more); setIndex(0); }}>
              Encore {plural(more.length, 'élément', 'éléments')}
            </button>
          )}
          {mode !== 'revision' && (
            <button type="button" class="btn btn-primary btn-block" onClick={() => { setQueue(makeQueue(SESSION_SIZE)); setIndex(0); }}>
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
  const key = `${index}-${item.itemId}-${item.exercise}`;
  const onAnswer = (ok: boolean) => record(item, ok);
  let body: preact.ComponentChildren;
  switch (item.exercise) {
    case 'cartes':
      body = <Card key={key} word={word!} onAnswer={(ok) => record(item, ok).then(next)} />;
      break;
    case 'qcm_ar_fr':
    case 'qcm_fr_ar':
      body = <Qcm key={key} word={word!} pool={words} dir={item.exercise === 'qcm_ar_fr' ? 'ar_fr' : 'fr_ar'} onAnswer={onAnswer} onNext={next} />;
      break;
    case 'lecture_v':
    case 'lecture_nv':
      body = <TranslitQcm key={key} word={word!} pool={words} withVowels={item.exercise === 'lecture_v'} onAnswer={onAnswer} onNext={next} />;
      break;
    case 'lettre':
      body = (
        <LetterNameSound
          key={key}
          letter={letter!}
          varied={(progressRef.current.get(`${repo.userId}|${item.itemId}|lecture`)?.box ?? 1) > 1}
          onAnswer={onAnswer}
          onNext={next}
        />
      );
      break;
    case 'paires':
      body = <Pairs key={key} letter={letter!} onAnswer={onAnswer} onNext={next} />;
      break;
    case 'trace': {
      const box = progressRef.current.get(`${repo.userId}|${item.itemId}|ecriture`)?.box ?? 1;
      body = <Trace key={key} word={word} letter={letter} showArrows={box <= 2} onAnswer={(ok) => record(item, ok).then(next)} />;
      break;
    }
    case 'trace_memoire':
      body = (
        <Trace
          key={key}
          letter={letter}
          showArrows={false}
          memory={POSITIONS[(index + item.itemId.charCodeAt(2)) % 4]}
          onAnswer={(ok) => record(item, ok).then(next)}
        />
      );
      break;
    case 'dictee':
      body = <Dictation key={key} word={word!} onAnswer={(ok, results) => record(item, ok, results).then(next)} />;
      break;
  }

  return (
    <Shell onClose={() => go('/')} progress={(index + 1) / queue.length} counter={`${index + 1} / ${queue.length}`} wide={item.exercise === 'trace' || item.exercise === 'trace_memoire' || item.exercise === 'dictee'}>
      {body}
    </Shell>
  );
}

function Shell({
  children,
  onClose,
  progress,
  counter,
  wide,
}: {
  children: preact.ComponentChildren;
  onClose: () => void;
  progress?: number;
  counter?: string;
  wide?: boolean;
}) {
  return (
    <main class={`screen session ${wide ? 'session-wide' : ''}`}>
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

export type { Word };
