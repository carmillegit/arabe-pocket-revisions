import { useMemo, useState } from 'preact/hooks';
import { dayKey } from '../domain/dates';
import { ACTIVITIES, EXTRA_SIZE, SESSION_SIZE, allowedExercises, buildReviewQueue, dueItems } from '../domain/queue';
import { answerDays, bestStreak, letterKnownCounts, missedSince, streak, topMissedLetters, wordKnownCounts } from '../domain/stats';
import { go } from '../router';
import { useApp } from '../store';
import { Ar, Icon, plural } from './common';

const WEEK = 7 * 86_400_000;

export function Home() {
  const app = useApp();
  const { words, progress, repo, answers } = app;
  const today = dayKey();
  const [showFilters, setShowFilters] = useState(false);
  const [cat, setCat] = useState('');
  const [letter, setLetter] = useState('');
  const [missed, setMissed] = useState(false);
  // Activités cochées : mémorisées sur ce téléphone (simple confort, sans conséquence si perdu).
  const [acts, setActs] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('revision-activities') ?? '[]');
    } catch {
      return [];
    }
  });
  const toggleAct = (id: string) => {
    const next = acts.includes(id) ? acts.filter((a) => a !== id) : [...acts, id];
    setActs(next);
    try {
      localStorage.setItem('revision-activities', JSON.stringify(next));
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite */
    }
  };

  const due = useMemo(() => dueItems(app.queueContext()).length, [words, progress, today]);
  // Objectif du jour : 20 questions. Le compteur descend à chaque réponse donnée aujourd'hui.
  const seenToday = useMemo(() => answers.filter((a) => dayKey(a.at) === today).length, [answers, today]);
  const remaining = Math.min(due, Math.max(0, SESSION_SIZE - seenToday));
  const goalReached = remaining === 0 && seenToday > 0;
  const vocab = useMemo(() => wordKnownCounts(words, progress, repo.userId, today), [words, progress, today]);
  const abc = useMemo(() => letterKnownCounts(progress, repo.userId, today, app.lettersSince), [progress, today]);
  const days = streak(answerDays(answers), today);
  const best = bestStreak(answerDays(answers));
  const missedIds = useMemo(() => missedSince(answers, Date.now() - WEEK), [answers]);
  const hardLetters = useMemo(() => topMissedLetters(answers, 28).map((x) => x.letter), [answers]);
  const allLetters = useMemo(() => {
    const s = new Set(words.flatMap((w) => w.letters));
    return [...hardLetters.filter((l) => s.has(l)), ...[...s].filter((l) => !hardLetters.includes(l)).sort()];
  }, [words, hardLetters]);

  const lastSave = app.lastExportAt ?? app.firstLaunchAt;
  const needsBackup = Date.now() - lastSave > WEEK;
  const total = words.length || 1;
  const filtered = Boolean(cat || letter || missed || acts.length);
  // Nombre d'éléments à échéance qui correspondent aux filtres choisis.
  const matching = useMemo(
    () =>
      filtered
        ? buildReviewQueue(app.queueContext(), {
            filters: { category: cat || undefined, letter: letter || undefined, missedIds: missed ? missedIds : undefined },
            activities: allowedExercises(acts),
            limit: 100000,
          }).length
        : due,
    [filtered, cat, letter, missed, acts, words, progress, due],
  );

  return (
    <main class="screen">
      <header class="hello">
        <button type="button" class="icon-btn hello-settings" onClick={() => go('/reglages')} aria-label="Réglages">
          <Icon name="gear" />
        </button>
        <Ar text="مَرْحَبًا" size="l" />
        <p class="muted">{app.userName ? `Bonjour ${app.userName}` : "Bonjour"}</p>
      </header>

      {needsBackup && (
        <button type="button" class="banner" onClick={() => go('/reglages')}>
          <Icon name="download" />
          <span>
            <strong>Pense à sauvegarder.</strong> Ta dernière sauvegarde date de plus de 7 jours. Un nettoyage du
            navigateur effacerait tes données.
          </span>
        </button>
      )}

      <section class="card hero">
        {goalReached ? (
          <>
            <p class="hero-label hero-kicker hero-done">✓ Séance du jour terminée</p>
            <p class="hero-num">{seenToday}</p>
            <p class="hero-label">{seenToday > 1 ? 'questions vues aujourd’hui' : 'question vue aujourd’hui'}</p>
          </>
        ) : (
          <>
            <p class="hero-label hero-kicker">À réviser aujourd’hui</p>
            <p class="hero-num">{remaining}</p>
            <p class="hero-label">
              {due === 0 ? 'rien à réviser' : remaining > 1 ? 'questions restantes' : 'question restante'}
              {seenToday > 0 && ` · ${seenToday} vue${seenToday > 1 ? 's' : ''} aujourd’hui`}
            </p>
          </>
        )}
        {due > 0 ? (
          <button
            type="button"
            class={`btn btn-block ${goalReached ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() =>
              go('/seance', {
                mode: 'revision',
                n: String(goalReached ? EXTRA_SIZE : remaining),
                cat,
                lettre: letter,
                rates: missed ? '1' : undefined,
                act: acts.length ? acts.join(',') : undefined,
              })
            }
          >
            {goalReached ? `Encore ${Math.min(EXTRA_SIZE, due)}` : filtered ? 'Réviser (filtré)' : 'Réviser'}
          </button>
        ) : (
          <>
            <p class="muted center">Tout est révisé pour aujourd’hui. Bravo !</p>
            <button type="button" class="btn btn-secondary btn-block" onClick={() => go('/exercices')}>
              S’entraîner quand même
            </button>
          </>
        )}
        <button type="button" class="link-btn" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
          <Icon name="filter" size={18} /> {showFilters ? 'Masquer les filtres' : 'Filtrer la révision'}
        </button>
        {showFilters && (
          <div class="filters">
            <label class="field">
              <span>Catégorie</span>
              <select value={cat} onChange={(e) => setCat(e.currentTarget.value)}>
                <option value="">Toutes</option>
                {app.categories.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
            <label class="field">
              <span>Lettre</span>
              <select value={letter} onChange={(e) => setLetter(e.currentTarget.value)} class="select-ar">
                <option value="">Toutes</option>
                {allLetters.map((l) => (
                  <option key={l} value={l}>
                    {l}
                    {hardLetters.includes(l) ? '  (souvent ratée)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label class="check">
              <input type="checkbox" checked={missed} onChange={(e) => setMissed(e.currentTarget.checked)} />
              <span>Seulement les mots ratés cette semaine ({missedIds.size})</span>
            </label>
            <fieldset class="field acts">
              <legend>Activités <span class="muted">(aucune cochée = toutes)</span></legend>
              <div class="chips chips-wrap">
                {ACTIVITIES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    class={`chip ${acts.includes(a.id) ? 'is-on' : ''}`}
                    aria-pressed={acts.includes(a.id)}
                    onClick={() => toggleAct(a.id)}
                  >
                    {acts.includes(a.id) ? '✓ ' : ''}
                    {a.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {filtered && (
              <p class={`msg ${matching ? 'msg-ok' : 'msg-warn'}`} role="status">
                {matching
                  ? `Ces filtres correspondent à ${matching} élément${matching > 1 ? 's' : ''} en attente. Ta séance en reprend ${Math.min(matching, goalReached ? EXTRA_SIZE : remaining || EXTRA_SIZE)}.`
                  : 'Rien à réviser avec ces filtres aujourd’hui.'}
              </p>
            )}
          </div>
        )}
      </section>

      <section class="card">
        <div class="streak">
          <span class="streak-icon">
            <Icon name="flame" />
          </span>
          <div>
            <p class="streak-num">{plural(days, 'jour', 'jours')}</p>
            <p class="muted small">
              {days > 0
                ? 'de révision d’affilée'
                : best > 0
                  ? `Ta série s’est arrêtée (record : ${plural(best, 'jour', 'jours')}). Tes mots appris, eux, sont toujours là.`
                  : 'Révise aujourd’hui pour lancer ta série'}
            </p>
          </div>
        </div>
      </section>

      <div class="tiles tiles-2">
        <KnownTile title="Vocabulaire" unit={['mot', 'mots']} c={vocab} onClick={() => go('/mots')} />
        <KnownTile title="Lettres" unit={['lettre', 'lettres']} c={abc} onClick={() => go('/progression')} />
      </div>
    </main>
  );
}

function KnownTile({
  title,
  unit,
  c,
  onClick,
}: {
  title: string;
  unit: [string, string];
  c: { known: number; toLearn: number; total: number };
  onClick: () => void;
}) {
  return (
    <button type="button" class="tile known-tile" onClick={onClick}>
      <p class="known-title">{title}</p>
      <p class="tile-num">
        {c.known}
        <span class="known-total"> / {plural(c.total, unit[0], unit[1])}</span>
      </p>
      <span class="known-bar" role="img" aria-label={`${c.known} sus sur ${c.total}`}>
        <span style={{ width: `${c.total ? (c.known / c.total) * 100 : 0}%` }} />
      </span>
      <p class="tile-label">
        <strong>{c.known}</strong> su{c.known > 1 ? 's' : ''} · <strong>{c.toLearn}</strong> à apprendre
      </p>
    </button>
  );
}
