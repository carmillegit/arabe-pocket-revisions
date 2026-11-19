import { useMemo, useState } from 'preact/hooks';
import { arabicSearchKey, containsArabic, latinSearchKey } from '../domain/arabic';
import { dayKey } from '../domain/dates';
import { wordMastery } from '../domain/stats';
import { go } from '../router';
import { useApp } from '../store';
import { Ar, Icon, MasteryDot, TopBar, VisualBadge, plural } from './common';

export function Words() {
  const { words, categories, progress, repo } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const today = dayKey();

  const list = useMemo(() => {
    const query = q.trim();
    const ar = containsArabic(query);
    const key = ar ? arabicSearchKey(query) : latinSearchKey(query);
    return words.filter((w) => {
      if (cat && w.category !== cat) return false;
      if (!key) return true;
      return ar
        ? arabicSearchKey(w.arabicVoweled).includes(key)
        : latinSearchKey(w.french).includes(key) || latinSearchKey(w.transliteration).includes(key);
    });
  }, [words, q, cat]);

  return (
    <main class="screen">
      <TopBar
        title="Mots"
        right={
          <button type="button" class="icon-btn icon-btn-accent" onClick={() => go('/mots/nouveau')} aria-label="Ajouter un mot">
            <Icon name="plus" />
          </button>
        }
      />
      <label class="search">
        <Icon name="search" size={20} />
        <input
          type="search"
          placeholder="Arabe, translittération ou français"
          value={q}
          onInput={(e) => setQ(e.currentTarget.value)}
          aria-label="Rechercher un mot"
        />
      </label>
      <div class="chips" role="group" aria-label="Catégorie">
        <button type="button" class={`chip ${cat === '' ? 'is-on' : ''}`} aria-pressed={cat === ''} onClick={() => setCat('')}>
          Toutes
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            type="button"
            class={`chip ${cat === c.name ? 'is-on' : ''}`}
            aria-pressed={cat === c.name}
            onClick={() => setCat(cat === c.name ? '' : c.name)}
          >
            {c.name}
          </button>
        ))}
      </div>
      <p class="muted small count">{plural(list.length, 'mot', 'mots')}</p>
      {list.length === 0 ? (
        <div class="empty">
          <p>Aucun mot trouvé.</p>
          <button type="button" class="btn btn-primary" onClick={() => go('/mots/nouveau')}>
            Ajouter un mot
          </button>
        </div>
      ) : (
        <ul class="list">
          {list.map((w) => (
            <li key={w.id}>
              <button type="button" class="row word-row" onClick={() => go(`/mots/${encodeURIComponent(w.id)}`)}>
                <VisualBadge visual={w.visual} size={36} />
                <span class="row-main">
                  <span class="row-title">{w.french}</span>
                  <span class="row-sub">
                    {w.transliteration}
                    {w.type === 'pluriel' && ' · pluriel'}
                    {w.status !== 'valide' && <span class="tag tag-warn tag-inline">à vérifier</span>}
                  </span>
                </span>
                <Ar text={w.arabicVoweled} size="m" class="row-ar" />
                <MasteryDot m={wordMastery(w, progress, repo.userId, today)} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
