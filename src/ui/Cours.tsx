// Onglet Cours : une fiche par séance (règles, exemples avec audio, lien vers les mots).
import { useMemo } from 'preact/hooks';
import { audioUrl } from '../domain/audio';
import { COURS, coursById, formatSessionDate, sessionWordIds, wordIndex, type CoursSession } from '../domain/cours';
import { dayKey } from '../domain/dates';
import { wordMastery } from '../domain/stats';
import { go } from '../router';
import { useApp } from '../store';
import { Icon, MasteryTag, TopBar, VisualBadge, playAudio, plural } from './common';

/** Texte mêlant français et arabe : l'arabe est isolé (sens de lecture) et affiché dans la police arabe. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/([؀-ۿً-ْٰـ]+(?:[  ]+[؀-ۿً-ْٰـ]+)*)/);
  return (
    <>
      {parts.map((p, i) =>
        /[؀-ۿ]/.test(p) ? (
          <bdi key={i} class="ar ar-inline" lang="ar" dir="rtl">
            {p}
          </bdi>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function CoursList() {
  const { words } = useApp();
  // La séance la plus récente en premier.
  const sessions = [...COURS].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <main class="screen">
      <TopBar title="Cours" />
      <p class="muted intro">Les règles vues en cours, séance par séance, avec leurs exemples à écouter.</p>
      <ul class="list">
        {sessions.map((s) => {
          const n = sessionWordIds(s, words).size;
          return (
            <li key={s.id}>
              <button type="button" class="row" onClick={() => go(`/cours/${s.id}`)}>
                <span class="row-main">
                  <span class="row-sub cours-date">{formatSessionDate(s.date)}</span>
                  <span class="row-title">
                    <RichText text={s.title} />
                  </span>
                  <span class="row-sub">{plural(n, 'mot', 'mots')}</span>
                </span>
                <Icon name="back" size={20} />
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export function CoursSessionScreen({ id }: { id: string }) {
  const s = coursById(id);
  if (!s) {
    return (
      <main class="screen">
        <TopBar title="Cours" onBack={() => go('/cours')} />
        <p class="muted">Séance introuvable.</p>
      </main>
    );
  }
  return <SessionView s={s} />;
}

function SessionView({ s }: { s: CoursSession }) {
  const { words, progress, repo } = useApp();
  const today = dayKey();
  const find = useMemo(() => wordIndex(words), [words]);
  const ids = useMemo(() => [...sessionWordIds(s, words)], [s, words]);

  return (
    <main class="screen cours">
      <TopBar title="Cours" onBack={() => go('/cours')} />
      <header class="cours-head">
        <p class="cours-date">{formatSessionDate(s.date)}</p>
        <h2 class="cours-title">
          <RichText text={s.title} />
        </h2>
      </header>

      {ids.length > 0 && (
        <div class="cours-actions">
          <button type="button" class="btn btn-primary" onClick={() => go('/seance', { mode: 'revision', seance: s.id })}>
            Réviser cette séance
          </button>
          <button type="button" class="btn btn-secondary" onClick={() => go('/seance', { mode: 'cartes', seance: s.id })}>
            Cartes ({ids.length})
          </button>
        </div>
      )}

      {s.blocks.map((b, i) =>
        b.type === 'rules' ? (
          <section key={i} class="card">
            <h3 class="card-title">{b.title}</h3>
            <ul class="rules">
              {b.items.map((t, k) => (
                <li key={k}>
                  <RichText text={t} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section key={i} class="card">
            <h3 class="card-title">{b.title}</h3>
            <ul class="vocab">
              {b.rows.map((r, k) => {
                const w = find(r.ar);
                const url = w ? audioUrl(w) : null;
                return (
                  <li key={k}>
                    <button
                      type="button"
                      class="vocab-row"
                      onClick={() => url && playAudio(url)}
                      aria-label={url ? `Écouter ${r.fr}` : undefined}
                      disabled={!url}
                    >
                      {w ? <VisualBadge visual={w.visual} size={28} /> : <span class="visual" style={{ width: 28 }} />}
                      <span class="vocab-fr">
                        <span class="row-title">{r.fr}</span>
                        <span class="row-sub">{r.tr}</span>
                      </span>
                      <bdi class="ar ar-m vocab-ar" lang="ar" dir="rtl">
                        {r.ar}
                      </bdi>
                      {url && (
                        <span class="vocab-speak" aria-hidden="true">
                          <Icon name="speaker" size={18} />
                        </span>
                      )}
                    </button>
                    {w && (
                      <button type="button" class="vocab-open" onClick={() => go(`/mots/${encodeURIComponent(w.id)}`)} aria-label={`Ouvrir la fiche de « ${r.fr} »`}>
                        <MasteryTag m={wordMastery(w, progress, repo.userId, today)} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ),
      )}

      {s.homework && <p class="muted small center">Devoirs : {s.homework}</p>}
    </main>
  );
}
