import { useMemo, useState } from 'preact/hooks';
import { dayKey } from '../domain/dates';
import { SESSION_SIZE, dueItems } from '../domain/queue';
import { answerDays, byCategory, history, letterMastery, masteryCounts, streak, topMissedLetters, topMissedWords } from '../domain/stats';
import type { LetterPositionStat, Session } from '../domain/types';
import { topMissedLetterPositions } from '../domain/dictation';
import { letterForm } from '../domain/letters';
import { addDays, parseDay } from '../domain/dates';
import { go } from '../router';
import { useApp } from '../store';
import { Ar, MASTERY_MARK, TopBar, VisualBadge, plural } from './common';
import { useEffect } from 'preact/hooks';

const M_KEYS = ['nouveau', 'en_cours', 'acquis'] as const;
const M_LABELS = { nouveau: 'à apprendre', en_cours: 'en cours', acquis: 'acquis' };

export function ProgressScreen() {
  const { words, progress, progressList, answers, repo } = useApp();
  const today = dayKey();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hover, setHover] = useState<number | null>(null);

  const [letterStats, setLetterStats] = useState<LetterPositionStat[]>([]);
  useEffect(() => {
    repo.getSessions(addDays(today, -29)).then(setSessions);
    repo.getLetterStats().then(setLetterStats);
  }, []);
  const missedPositions = useMemo(() => topMissedLetterPositions(letterStats, 5), [letterStats]);

  const app = useApp();
  const due = useMemo(() => dueItems(app.queueContext()).length, [words, progress]);
  const alphabet = useMemo(() => letterMastery(progress, repo.userId, today, app.lettersSince), [progress]);
  const counts = useMemo(() => masteryCounts(words, progress, repo.userId, today), [words, progress]);
  const cats = useMemo(() => byCategory(words, progress, repo.userId, today), [words, progress]);
  const letters = useMemo(() => topMissedLetters(answers, 5), [answers]);
  const missedWords = useMemo(() => topMissedWords(words, progressList, 10), [words, progressList]);
  const hist = useMemo(() => history(sessions, today, 30), [sessions]);
  const maxQ = Math.max(1, ...hist.map((h) => h.questions));
  const days = streak(answerDays(answers), today);
  const totalQ = hist.reduce((s, h) => s + h.questions, 0);
  const totalOk = hist.reduce((s, h) => s + h.successes, 0);
  const shown = hover !== null ? hist[hover] : null;

  return (
    <main class="screen">
      <TopBar title="Progression" />

      <div class="tiles">
        <div class="tile"><p class="tile-num">{Math.min(due, SESSION_SIZE)}</p><p class="tile-label">à réviser aujourd’hui</p></div>
        <div class="tile"><p class="tile-num">{days}</p><p class="tile-label">{days > 1 ? 'jours d’affilée' : 'jour d’affilée'}</p></div>
        <div class="tile"><p class="tile-num">{counts.acquis}</p><p class="tile-label">{counts.acquis > 1 ? 'mots acquis' : 'mot acquis'}</p></div>
      </div>

      <section class="card">
        <h2 class="card-title">Par catégorie</h2>
        <ul class="legend">
          {M_KEYS.map((k) => (
            <li key={k}><span class={`mdot m-${k}`} /> <span aria-hidden="true">{MASTERY_MARK[k]}</span> {M_LABELS[k]}</li>
          ))}
        </ul>
        <ul class="cat-bars">
          {cats.map(([name, c]) => {
            const total = c.nouveau + c.en_cours + c.acquis;
            return (
              <li key={name}>
                <button type="button" class="cat-bar" onClick={() => go('/seance', { mode: 'revision', cat: name })}>
                  <span class="cat-head">
                    <span>{name}</span>
                    <span class="muted small">{c.acquis} / {total} acquis</span>
                  </span>
                  <span class="stack" role="img" aria-label={`${c.nouveau} à apprendre, ${c.en_cours} en cours, ${c.acquis} acquis`}>
                    {M_KEYS.map((k) => c[k] > 0 && <span key={k} class={`seg m-${k}`} style={{ flexGrow: c[k] / total }} />)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section class="card">
        <h2 class="card-title">Alphabet</h2>
        <ul class="legend">
          {M_KEYS.map((k) => (
            <li key={k}><span class={`mdot m-${k}`} /> <span aria-hidden="true">{MASTERY_MARK[k]}</span> {M_LABELS[k]}</li>
          ))}
        </ul>
        <ul class="alphabet">
          {alphabet.map(({ letter, m }) => (
            <li key={letter}>
              <button type="button" class={`abc m-bg-${m}`} onClick={() => go('/seance', { mode: 'revision', lettre: letter })} aria-label={`${letter} : ${M_LABELS[m]}`}>
                <bdi class="ar" lang="ar" dir="rtl">{letter}</bdi>
                <span class="abc-mark" aria-hidden="true">{MASTERY_MARK[m]}</span>
              </button>
            </li>
          ))}
        </ul>
        <p class="small muted">Une lettre est acquise en lecture et en écriture. Touche-la pour réviser les mots qui la contiennent.</p>
      </section>

      <section class="card">
        <h2 class="card-title">Lettres les plus ratées</h2>
        {letters.length === 0 ? (
          <p class="muted">Pas encore d’erreurs enregistrées.</p>
        ) : (
          <ul class="letters">
            {letters.map((l) => (
              <li key={l.letter}>
                <button type="button" class="letter-chip" onClick={() => go('/seance', { mode: 'revision', lettre: l.letter })} aria-label={`Réviser les mots avec ${l.letter}`}>
                  <Ar text={l.letter} size="l" />
                  <span class="small muted">{plural(l.misses, 'erreur', 'erreurs')}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p class="small muted">Touche une lettre pour réviser les mots qui la contiennent.</p>
      </section>

      <section class="card">
        <h2 class="card-title">Lettres selon leur position</h2>
        {missedPositions.length === 0 ? (
          <p class="muted">Pas encore d’erreur en dictée tracée.</p>
        ) : (
          <ul class="list list-compact">
            {missedPositions.map((x) => (
              <li key={x.id} class="pos-row">
                <bdi class="ar ar-l" lang="ar" dir="rtl">{letterForm(x.letter, x.position)}</bdi>
                <span class="row-main">
                  <span class="row-title">
                    <bdi lang="ar" dir="rtl" class="ar">{x.letter}</bdi> {x.label}
                  </span>
                  <span class="row-sub">
                    {plural(x.failures, 'erreur', 'erreurs')} · {plural(x.successes, 'réussite', 'réussites')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p class="small muted">Les 5 combinaisons les plus ratées en dictée tracée.</p>
      </section>

      <section class="card">
        <h2 class="card-title">Mots les plus ratés</h2>
        {missedWords.length === 0 ? (
          <p class="muted">Pas encore d’erreurs enregistrées.</p>
        ) : (
          <ul class="list list-compact">
            {missedWords.map(({ word, misses }) => (
              <li key={word.id}>
                <button type="button" class="row word-row" onClick={() => go(`/mots/${encodeURIComponent(word.id)}`)}>
                  <VisualBadge visual={word.visual} size={32} />
                  <span class="row-main">
                    <span class="row-title">{word.french}</span>
                    <span class="row-sub">{plural(misses, 'erreur', 'erreurs')}</span>
                  </span>
                  <Ar text={word.arabicVoweled} size="m" class="row-ar" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section class="card">
        <h2 class="card-title">30 derniers jours</h2>
        <p class="hist-readout" aria-live="polite">
          {shown
            ? `${parseDay(shown.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} : ${plural(shown.questions, 'question', 'questions')}, ${shown.successes} réussies`
            : `${plural(totalQ, 'question', 'questions')}, ${totalQ ? Math.round((totalOk / totalQ) * 100) : 0} % de réussite`}
        </p>
        <div class="hist" role="img" aria-label={`Questions par jour sur 30 jours, ${totalQ} au total`} onPointerLeave={() => setHover(null)}>
          {hist.map((h, i) => (
            <span
              key={h.date}
              class={`hist-col ${hover === i ? 'is-on' : ''}`}
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
            >
              {h.questions > 0 && <span class="hist-bar" style={{ height: `${(h.questions / maxQ) * 100}%` }} />}
            </span>
          ))}
        </div>
        <div class="hist-axis small muted">
          <span>il y a 30 j</span>
          <span>aujourd’hui</span>
        </div>
      </section>
    </main>
  );
}
