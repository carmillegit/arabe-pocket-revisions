import { useState } from 'preact/hooks';
import { UNLOCK_RATE, UNLOCK_WINDOW, unlockProgress } from '../domain/reading';
import { go } from '../router';
import { useApp } from '../store';
import { Icon, TopBar } from './common';

interface Ex {
  mode: string;
  title: string;
  desc: string;
  params?: Record<string, string>;
  locked?: string;
  soon?: string;
  /** Les lettres ne dépendent pas d'une catégorie de mots. */
  letters?: boolean;
}

export function Exercises() {
  const { categories, noVowelsUnlocked, answers, words } = useApp();
  const [cat, setCat] = useState('');
  const unlock = unlockProgress(answers);
  const toWrite = words.filter((w) => w.writingEnabled).length;

  const groups: { skill: string; items: Ex[] }[] = [
    {
      skill: 'Vocabulaire',
      items: [
        { mode: 'cartes', title: 'Cartes', desc: 'Recto : le mot arabe. Verso : le sens. Tu dis si tu savais.' },
        { mode: 'qcm_ar_fr', title: 'QCM arabe → français', desc: 'Un mot arabe, quatre sens possibles.' },
        { mode: 'qcm_fr_ar', title: 'QCM français → arabe', desc: 'Un sens, quatre mots arabes possibles.' },
      ],
    },
    {
      skill: 'Lecture',
      items: [
        { mode: 'lettre', title: 'Lettre → nom et son', desc: 'Reconnaître les 28 lettres, sous toutes leurs formes.', letters: true },
        { mode: 'paires', title: 'Paires qui piègent', desc: 'ح خ ه, ص س, ض د, ط ت, ظ ذ, ق ك, ع غ…', letters: true },
        { mode: 'lecture_v', title: 'Mot vocalisé → translittération', desc: 'Déchiffrer un mot avec ses voyelles.' },
        {
          mode: 'lecture_nv',
          title: 'Mot sans voyelles → translittération',
          desc: 'Lire un mot sans ses voyelles.',
          locked: noVowelsUnlocked
            ? undefined
            : `Se débloque à ${UNLOCK_RATE * 100} % de réussite sur les ${UNLOCK_WINDOW} dernières réponses de l’exercice précédent (${unlock.count}/${UNLOCK_WINDOW} réponses, ${Math.round(unlock.rate * 100)} %).`,
        },
      ],
    },
    {
      skill: 'Écriture',
      items: [
        { mode: 'trace', params: { cible: 'lettres' }, title: 'Tracer les lettres', desc: 'Sur le modèle, avec le sens du tracé, puis de mémoire.', letters: true },
        { mode: 'trace_memoire', title: 'Écrire les lettres de mémoire', desc: 'Niveau 2 : le nom, le son et la position, sans modèle. Puis on révèle et tu te notes.', letters: true },
        {
          mode: 'trace',
          params: { cible: 'mots' },
          title: 'Tracer des mots',
          desc: toWrite
            ? `${toWrite} mot${toWrite > 1 ? 's' : ''} à apprendre à écrire.`
            : 'Coche « À apprendre à écrire » dans la fiche d’un mot pour l’ajouter ici.',
        },
        { mode: 'dictee', title: 'Dictée tracée', desc: 'Écouter le mot, l’écrire de mémoire, puis vérifier lettre par lettre, selon sa position.' },
      ],
    },
  ];

  return (
    <main class="screen">
      <TopBar title="Exercices" />
      <p class="muted intro">
        Entraînement libre : tes réponses sont enregistrées, mais seule la révision du jour fait monter les éléments de
        boîte.
      </p>
      <label class="field">
        <span>Catégorie (pour les mots)</span>
        <select value={cat} onChange={(e) => setCat(e.currentTarget.value)}>
          <option value="">Toutes</option>
          {categories.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
      </label>
      {groups.map((g) => (
        <section key={g.skill}>
          <h2 class="section-title">{g.skill}</h2>
          <ul class="list">
            {g.items.map((ex) => {
              const disabled = Boolean(ex.locked || ex.soon);
              return (
                <li key={ex.title}>
                  <button
                    type="button"
                    class="row"
                    disabled={disabled}
                    onClick={() => go('/seance', { mode: ex.mode, cat: ex.letters ? undefined : cat, ...ex.params, retour: '/exercices' })}
                  >
                    <span class="row-main">
                      <span class="row-title">{ex.title}</span>
                      <span class="row-sub">{ex.locked ?? ex.desc}</span>
                    </span>
                    {ex.soon ? <span class="tag">{ex.soon}</span> : ex.locked ? <Icon name="lock" size={20} /> : <Icon name="back" size={20} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
