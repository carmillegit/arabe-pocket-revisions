import { useMemo, useState } from 'preact/hooks';
import { dayKey } from '../domain/dates';
import { SESSION_SIZE, dueItems } from '../domain/queue';
import { answerDays, letterKnownCounts, missedSince, streak, topMissedLetters, wordKnownCounts } from '../domain/stats';
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

  const due = useMemo(() => dueItems(app.queueContext()).length, [words, progress, today]);
  const today20 = Math.min(due, SESSION_SIZE);
  const vocab = useMemo(() => wordKnownCounts(words, progress, repo.userId, today), [words, progress, today]);
  const abc = useMemo(() => letterKnownCounts(progress, repo.userId, today, app.lettersSince), [progress, today]);
  const days = streak(answerDays(answers), today);
  const missedIds = useMemo(() => missedSince(answers, Date.now() - WEEK), [answers]);
  const hardLetters = useMemo(() => topMissedLetters(answers, 28).map((x) => x.letter), [answers]);
  const allLetters = useMemo(() => {
    const s = new Set(words.flatMap((w) => w.letters));
    return [...hardLetters.filter((l) => s.has(l)), ...[...s].filter((l) => !hardLetters.includes(l)).sort()];
  }, [words, hardLetters]);

  const lastSave = app.lastExportAt ?? app.firstLaunchAt;
  const needsBackup = Date.now() - lastSave > WEEK;
  const total = words.length || 1;
  const filtered = Boolean(cat || letter || missed);

  return (
    <main class="screen">
      <header class="hello">
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
        <p class="hero-label hero-kicker">À réviser aujourd’hui</p>
        <p class="hero-num">{today20}</p>
        <p class="hero-label">{today20 > 1 ? 'questions dans ta séance du jour' : 'question dans ta séance du jour'}</p>
        {due > 0 ? (
          <button
            type="button"
            class="btn btn-primary btn-block"
            onClick={() =>
              go('/seance', { mode: 'revision', cat, lettre: letter, rates: missed ? '1' : undefined })
            }
          >
            {filtered ? 'Réviser (filtré)' : 'Réviser'}
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
            <p class="muted small">{days > 0 ? 'de révision d’affilée' : 'Révise aujourd’hui pour lancer ta série'}</p>
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
