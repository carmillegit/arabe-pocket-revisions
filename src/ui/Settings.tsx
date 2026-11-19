import { useRef, useState } from 'preact/hooks';
import { BackupError, parseBackup, summarize, type Backup } from '../data/backup';
import { useApp } from '../store';
import { Icon, TopBar, formatDate, plural } from './common';
import { go } from '../router';

async function saveFile(name: string, text: string): Promise<boolean> {
  const blob = new Blob([text], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  // Sur iPhone, la feuille de partage permet d'enregistrer dans Fichiers ou iCloud.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sauvegarde révisions arabe' });
      return true;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function Settings() {
  const app = useApp();
  const { repo, categories, words } = app;
  const [pending, setPending] = useState<Backup | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [newCat, setNewCat] = useState('');
  const [name, setName] = useState(app.userName);
  const fileRef = useRef<HTMLInputElement>(null);

  async function doExport() {
    const b = await repo.exportAll();
    const name = `revisions-arabe-${new Date().toISOString().slice(0, 10)}.json`;
    if (await saveFile(name, JSON.stringify(b))) {
      await repo.setMeta('lastExportAt', Date.now());
      await app.reload();
      setMsg({ kind: 'ok', text: `Sauvegarde créée : ${plural(b.words.length, 'mot', 'mots')}.` });
    }
  }

  async function pickFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      setPending(parseBackup(JSON.parse(await f.text()), repo.userId));
      setMsg(null);
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof BackupError ? err.message : 'Ce fichier n’est pas une sauvegarde valide.' });
    }
  }

  async function doImport() {
    if (!pending) return;
    if (mode === 'replace' && !confirm('Remplacer toutes tes données actuelles par celles du fichier ?')) return;
    await repo.importAll(pending, mode);
    await app.reload();
    setMsg({ kind: 'ok', text: 'Import terminé.' });
    setPending(null);
  }

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
  const s = pending && summarize(pending);

  return (
    <main class="screen">
      <TopBar title="Réglages" onBack={() => go('/')} />

      <section class="card">
        <h2 class="card-title">Sauvegarde</h2>
        <p class="muted small">
          Tes données restent sur ce téléphone. Exporte-les régulièrement : un nettoyage du navigateur les effacerait.
          {app.lastExportAt ? ` Dernière sauvegarde : ${formatDate(app.lastExportAt)}.` : ' Aucune sauvegarde pour l’instant.'}
        </p>
        <button type="button" class="btn btn-primary btn-block" onClick={doExport}>
          <Icon name="download" size={20} /> Exporter une sauvegarde
        </button>
        <button type="button" class="btn btn-secondary btn-block" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={20} /> Importer un fichier
        </button>
        <input ref={fileRef} class="visually-hidden" type="file" accept="application/json,.json" onChange={pickFile} />
        {s && (
          <div class="import-preview" role="dialog" aria-label="Aperçu de l’import">
            <p>
              Le fichier contient <strong>{plural(s.words, 'mot', 'mots')}</strong>, {plural(s.categories, 'catégorie', 'catégories')}
              {s.progress > 0 && <>, {plural(s.progress, 'suivi de progression', 'suivis de progression')}</>}
              {s.sessions > 0 && <>, {plural(s.sessions, 'séance', 'séances')}</>}.
            </p>
            <p class="small muted">Tu as actuellement {plural(words.length, 'mot', 'mots')}.</p>
            <label class="check">
              <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
              <span><strong>Fusionner</strong> : ajoute les nouveaux mots et garde la version la plus récente de chacun.</span>
            </label>
            <label class="check">
              <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              <span><strong>Remplacer</strong> : efface tes données actuelles.</span>
            </label>
            <div class="row-actions">
              <button type="button" class="btn btn-secondary" onClick={() => setPending(null)}>Annuler</button>
              <button type="button" class="btn btn-primary" onClick={doImport}>Importer</button>
            </div>
          </div>
        )}
        {msg && <p class={`msg ${msg.kind === 'ok' ? 'msg-ok' : 'msg-error'}`} role="status">{msg.text}</p>}
      </section>

      <section class="card">
        <h2 class="card-title">Prénom</h2>
        <form
          class="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await app.setUserName(name);
            setMsg({ kind: 'ok', text: 'Prénom enregistré.' });
          }}
        >
          <input type="text" placeholder="Facultatif" value={name} onInput={(e) => setName(e.currentTarget.value)} aria-label="Prénom" autocomplete="given-name" />
          <button type="submit" class="btn btn-secondary">OK</button>
        </form>
        <p class="small muted">Sert seulement à te saluer sur l’accueil. Il reste sur ce téléphone.</p>
      </section>

      <section class="card">
        <h2 class="card-title">Affichage des voyelles</h2>
        <label class="check">
          <input type="radio" name="vowels" checked={app.vowelMode === 'always'} onChange={() => app.setVowelMode('always')} />
          <span>Toujours affichées</span>
        </label>
        <label class="check">
          <input type="radio" name="vowels" checked={app.vowelMode === 'onDemand'} onChange={() => app.setVowelMode('onDemand')} />
          <span>Masquées, visibles sur demande</span>
        </label>
      </section>

      <section class="card">
        <h2 class="card-title">Catégories</h2>
        <ul class="list list-compact">
          {categories.map((c) => {
            const n = counts.get(c.name) ?? 0;
            return (
              <li key={c.name} class="cat-row">
                <span class="row-main">
                  <span class="row-title">{c.name}</span>
                  <span class="row-sub">{plural(n, 'mot', 'mots')}</span>
                </span>
                <button
                  type="button"
                  class="btn btn-small btn-secondary"
                  onClick={async () => {
                    const to = prompt('Nouveau nom', c.name);
                    if (to && to.trim() && to.trim() !== c.name) {
                      await repo.renameCategory(c.name, to);
                      await app.reload();
                    }
                  }}
                >
                  Renommer
                </button>
                {n === 0 && (
                  <button
                    type="button"
                    class="btn btn-small btn-danger-ghost"
                    onClick={async () => {
                      await repo.deleteCategory(c.name);
                      await app.reload();
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <form
          class="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newCat.trim()) return;
            await repo.addCategory(newCat);
            setNewCat('');
            await app.reload();
          }}
        >
          <input type="text" placeholder="Nouvelle catégorie" value={newCat} onInput={(e) => setNewCat(e.currentTarget.value)} aria-label="Nouvelle catégorie" />
          <button type="submit" class="btn btn-secondary">Ajouter</button>
        </form>
      </section>

      <section class="card">
        <h2 class="card-title">À propos</h2>
        <p class="small muted">
          Version de test (lot 1). Les 57 mots de départ ont été préparés par une IA : voyelles et sens sont « à
          vérifier » avec le cours ou la professeure.
        </p>
        <p class="small muted">Version {__APP_VERSION__}</p>
      </section>
    </main>
  );
}
