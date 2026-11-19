// Ajout et modification d'un mot. Objectif : moins de 30 secondes pour un mot.
import { useMemo, useRef, useState } from 'preact/hooks';
import { hasVowels, isArabicText, lettersOf, normalizeArabic } from '../domain/arabic';
import type { ContentType, Source, Visual, Word } from '../domain/types';
import { createWithPlural, createWord, withDerived } from '../domain/words';
import { back, go } from '../router';
import { useApp } from '../store';
import { Ar, SpeakButton, TopBar, VisualBadge } from './common';
import { AUDIO_STATUS_LABEL, hasAudio } from '../domain/audio';

const TRANSLIT_KEYS = ['ā', 'ī', 'ū', 'ḥ', 'ṣ', 'ḍ', 'ṭ', 'ẓ', 'ʿ', 'ʾ'];
const NEW_CAT = '__new__';

function arabicCheck(v: string): { error?: string; warning?: string } {
  const s = v.trim();
  if (!s) return {};
  if (!isArabicText(s)) return { error: 'Seuls les caractères arabes sont acceptés dans ce champ.' };
  if (!hasVowels(s)) return { warning: 'Ce mot n’a aucune voyelle. Pense à le vocaliser.' };
  return {};
}

/** Champ de translittération avec une rangée de boutons pour les caractères spéciaux. */
function TranslitInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const insert = (ch: string) => {
    const el = ref.current;
    if (!el) return onChange(value + ch);
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ch + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };
  return (
    <>
      <input
        ref={ref}
        id={id}
        type="text"
        value={value}
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        onInput={(e) => onChange(e.currentTarget.value)}
      />
      <div class="keys" role="group" aria-label="Caractères spéciaux">
        {TRANSLIT_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            class="key"
            // Empêche le clavier de se fermer quand on touche un bouton.
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => insert(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </>
  );
}

function ArabicInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const check = arabicCheck(value);
  return (
    <>
      <input
        id={id}
        type="text"
        class="input-ar"
        lang="ar"
        dir="rtl"
        value={value}
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        aria-invalid={!!check.error}
        onInput={(e) => onChange(e.currentTarget.value)}
      />
      {check.error && <p class="msg msg-error">{check.error}</p>}
      {check.warning && <p class="msg msg-warn">{check.warning}</p>}
    </>
  );
}

export function WordForm({ id }: { id: string | null }) {
  const app = useApp();
  const { words, categories, repo } = app;
  const existing = id ? words.find((w) => w.id === id) : undefined;
  const linked = existing?.linkedWordId ? words.find((w) => w.id === existing.linkedWordId) : undefined;

  const [arabic, setArabic] = useState(existing?.arabicVoweled ?? '');
  const [translit, setTranslit] = useState(existing?.transliteration ?? '');
  const [french, setFrench] = useState(existing?.french ?? '');
  const [category, setCategory] = useState(existing?.category ?? categories[0]?.name ?? 'Mots de base');
  const [newCat, setNewCat] = useState('');
  const [hint, setHint] = useState(existing?.pronunciationHint ?? '');
  const [visualKind, setVisualKind] = useState<'emoji' | 'color'>(existing?.visual?.kind === 'color' ? 'color' : 'emoji');
  const [emoji, setEmoji] = useState(existing?.visual?.kind === 'emoji' ? existing.visual.value : '');
  const [color, setColor] = useState(existing?.visual?.kind === 'color' ? existing.visual.value : '#E24B4A');
  const [type, setType] = useState<ContentType>(existing?.type ?? 'mot');
  const [writing, setWriting] = useState(existing?.writingEnabled ?? false);
  const [verified, setVerified] = useState(existing ? existing.status === 'valide' : true);
  const [level, setLevel] = useState(existing?.level ?? 'debutant');
  const [source, setSource] = useState<Source>(existing?.source ?? 'cours');
  const [root, setRoot] = useState(existing?.root ?? '');
  const [more, setMore] = useState(false);
  const [audioStatus, setAudioStatus] = useState<Word['audio']['status']>(existing?.audio.status ?? 'synthese_a_valider');

  const canAddPlural = !linked && type === 'mot';
  const [withPlural, setWithPlural] = useState(false);
  const [plAr, setPlAr] = useState('');
  const [plTr, setPlTr] = useState('');
  const [plFr, setPlFr] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const letters = useMemo(() => (isArabicText(arabic.trim()) ? lettersOf(arabic) : []), [arabic]);

  const finalCategory = category === NEW_CAT ? newCat.trim() : category;
  const visual: Visual = visualKind === 'color' ? { kind: 'color', value: color } : emoji.trim() ? { kind: 'emoji', value: emoji.trim() } : null;

  const errors: string[] = [];
  if (!arabic.trim() || arabicCheck(arabic).error) errors.push('le mot arabe');
  if (!translit.trim()) errors.push('la translittération');
  if (!french.trim()) errors.push('le sens en français');
  if (!finalCategory) errors.push('la catégorie');
  if (withPlural && canAddPlural) {
    if (!plAr.trim() || arabicCheck(plAr).error) errors.push('le pluriel en arabe');
    if (!plTr.trim()) errors.push('la translittération du pluriel');
    if (!plFr.trim()) errors.push('le sens du pluriel');
  }
  const duplicate = words.find(
    (w) => w.id !== existing?.id && normalizeArabic(w.arabicVoweled) === normalizeArabic(arabic),
  );

  async function save(addAnother: boolean) {
    setSubmitted(true);
    if (errors.length) return;
    const now = Date.now();
    const fields = {
      arabicVoweled: arabic,
      transliteration: translit,
      french,
      category: finalCategory,
      pronunciationHint: hint,
      visual,
      type,
      level,
      source,
      root: root || null,
      status: verified ? ('valide' as const) : ('a_verifier' as const),
      writingEnabled: writing,
    };
    let toSave: Word[];
    if (existing) {
      toSave = [withDerived({ ...existing, ...fields, audio: { ...existing.audio, status: audioStatus }, transliteration: translit.trim(), french: french.trim(), pronunciationHint: hint.trim(), root: root.trim() || null, updatedAt: now })];
    } else if (withPlural && canAddPlural) {
      toSave = createWithPlural(fields, { arabicVoweled: plAr, transliteration: plTr, french: plFr }, repo.userId, now);
    } else {
      toSave = [createWord(fields, repo.userId, now)];
    }
    if (existing && withPlural && canAddPlural) {
      const [, p] = createWithPlural(fields, { arabicVoweled: plAr, transliteration: plTr, french: plFr }, repo.userId, now);
      p.linkedWordId = existing.id;
      toSave[0].linkedWordId = p.id;
      toSave.push(p);
    }
    await repo.saveWords(toSave);
    await app.reload();
    if (addAnother) {
      go('/mots/nouveau', { t: String(now) });
    } else {
      back('/mots');
    }
  }

  async function remove() {
    if (!existing) return;
    const extra = linked ? `\nSon mot lié (${linked.french}) sera conservé, mais détaché.` : '';
    if (!confirm(`Supprimer « ${existing.french} » et sa progression ?${extra}`)) return;
    await repo.deleteWord(existing.id);
    await app.reload();
    back('/mots');
  }

  return (
    <main class="screen form-screen">
      <TopBar title={existing ? 'Modifier le mot' : 'Nouveau mot'} onBack={() => back('/mots')} />

      <div class="preview">
        <VisualBadge visual={visual} size={48} />
        {arabic.trim() && !arabicCheck(arabic).error ? <Ar text={arabic} size="xl" forceVowels /> : <span class="muted">Aperçu du mot</span>}
        {letters.length > 0 && (
          <p class="small muted">
            Lettres : <bdi lang="ar" dir="rtl" class="ar">{letters.join(' ')}</bdi>
          </p>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save(false); }} noValidate>
        <div class="field">
          <label for="f-ar">Mot arabe, avec voyelles</label>
          <ArabicInput id="f-ar" value={arabic} onChange={setArabic} />
          {duplicate && <p class="msg msg-warn">Ce mot existe déjà ({duplicate.french}).</p>}
        </div>
        <div class="field">
          <label for="f-tr">Translittération</label>
          <TranslitInput id="f-tr" value={translit} onChange={setTranslit} />
        </div>
        <div class="field">
          <label for="f-fr">Sens en français</label>
          <input id="f-fr" type="text" value={french} onInput={(e) => setFrench(e.currentTarget.value)} />
        </div>
        <div class="field">
          <label for="f-cat">Catégorie</label>
          <select id="f-cat" value={category} onChange={(e) => setCategory(e.currentTarget.value)}>
            {categories.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
            <option value={NEW_CAT}>+ Nouvelle catégorie…</option>
          </select>
          {category === NEW_CAT && (
            <input
              type="text"
              placeholder="Nom de la catégorie"
              value={newCat}
              onInput={(e) => setNewCat(e.currentTarget.value)}
              aria-label="Nom de la nouvelle catégorie"
              autoFocus
            />
          )}
        </div>
        <div class="field">
          <label for="f-hint">Indice de prononciation <span class="muted">(facultatif)</span></label>
          <input id="f-hint" type="text" value={hint} placeholder="ex. ق profond, ā long" onInput={(e) => setHint(e.currentTarget.value)} />
        </div>
        <div class="field">
          <span class="label">Image <span class="muted">(facultatif)</span></span>
          <div class="seg-ctl" role="group">
            <button type="button" aria-pressed={visualKind === 'emoji'} onClick={() => setVisualKind('emoji')}>Emoji</button>
            <button type="button" aria-pressed={visualKind === 'color'} onClick={() => setVisualKind('color')}>Couleur</button>
          </div>
          {visualKind === 'emoji' ? (
            <input type="text" class="input-emoji" value={emoji} placeholder="🐱" maxLength={12} onInput={(e) => setEmoji(e.currentTarget.value)} aria-label="Emoji" />
          ) : (
            <input type="color" value={color} onInput={(e) => setColor(e.currentTarget.value)} aria-label="Couleur" />
          )}
        </div>

        {linked ? (
          <div class="field">
            <span class="label">{existing?.type === 'pluriel' ? 'Singulier' : 'Pluriel'}</span>
            <button type="button" class="row" onClick={() => go(`/mots/${encodeURIComponent(linked.id)}`)}>
              <span class="row-main"><span class="row-title">{linked.french}</span><span class="row-sub">{linked.transliteration}</span></span>
              <Ar text={linked.arabicVoweled} size="m" />
            </button>
          </div>
        ) : (
          canAddPlural && (
            <div class="field">
              <label class="check">
                <input type="checkbox" checked={withPlural} onChange={(e) => setWithPlural(e.currentTarget.checked)} />
                <span>Ajouter le pluriel</span>
              </label>
              {withPlural && (
                <div class="sub-form">
                  <label for="p-ar">Pluriel en arabe</label>
                  <ArabicInput id="p-ar" value={plAr} onChange={setPlAr} />
                  <label for="p-tr">Translittération</label>
                  <TranslitInput id="p-tr" value={plTr} onChange={setPlTr} />
                  <label for="p-fr">Sens en français</label>
                  <input id="p-fr" type="text" value={plFr} onInput={(e) => setPlFr(e.currentTarget.value)} />
                </div>
              )}
            </div>
          )
        )}

        {existing && hasAudio(existing) && (
          <div class="field">
            <span class="label">Audio</span>
            <div class="audio-row">
              <SpeakButton word={{ ...existing, audio: { ...existing.audio, status: audioStatus } }} note={false} />
              <select value={audioStatus} onChange={(e) => setAudioStatus(e.currentTarget.value as Word['audio']['status'])} aria-label="Statut de l’audio">
                {(Object.keys(AUDIO_STATUS_LABEL) as Word['audio']['status'][]).map((k) => (
                  <option key={k} value={k}>{AUDIO_STATUS_LABEL[k]}</option>
                ))}
              </select>
            </div>
            {normalizeArabic(arabic) !== normalizeArabic(existing.arabicVoweled) && (
              <p class="msg msg-warn">Tu as modifié le mot arabe : l’audio actuel ne correspondra plus et sera retiré. Il faudra en générer un nouveau.</p>
            )}
          </div>
        )}

        <label class="check">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.currentTarget.checked)} />
          <span>Vérifié (cours ou professeur)</span>
        </label>
        <label class="check">
          <input type="checkbox" checked={writing} onChange={(e) => setWriting(e.currentTarget.checked)} />
          <span>À apprendre à écrire <span class="muted">(exercices d’écriture : lot 2)</span></span>
        </label>

        <button type="button" class="link-btn" aria-expanded={more} onClick={() => setMore(!more)}>
          {more ? 'Moins d’options' : 'Plus d’options'}
        </button>
        {more && (
          <div class="sub-form">
            <label for="f-type">Type</label>
            <select id="f-type" value={type} onChange={(e) => setType(e.currentTarget.value as ContentType)}>
              <option value="mot">Mot</option>
              <option value="pluriel">Pluriel</option>
              <option value="verbe">Verbe (passé, 3e pers. masc. sing.)</option>
              <option value="phrase">Phrase</option>
            </select>
            <label for="f-src">Source</label>
            <select id="f-src" value={source} onChange={(e) => setSource(e.currentTarget.value as Source)}>
              <option value="cours">Cours</option>
              <option value="perso">Perso</option>
              <option value="externe">Externe</option>
            </select>
            <label for="f-lvl">Niveau</label>
            <select id="f-lvl" value={level} onChange={(e) => setLevel(e.currentTarget.value)}>
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </select>
            <label for="f-root">Racine <span class="muted">(facultatif, trois lettres)</span></label>
            <input id="f-root" type="text" class="input-ar" lang="ar" dir="rtl" value={root} onInput={(e) => setRoot(e.currentTarget.value)} />
          </div>
        )}

        {submitted && errors.length > 0 && (
          <p class="msg msg-error" role="alert">À compléter : {errors.join(', ')}.</p>
        )}

        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">Enregistrer</button>
          {!existing && (
            <button type="button" class="btn btn-secondary btn-block" onClick={() => save(true)}>
              Enregistrer et ajouter un autre
            </button>
          )}
          {existing && (
            <button type="button" class="btn btn-danger-ghost btn-block" onClick={remove}>
              Supprimer ce mot
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
