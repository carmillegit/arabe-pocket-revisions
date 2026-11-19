import { useState } from 'preact/hooks';
import { go } from '../router';
import { useApp } from '../store';
import { Icon, TopBar } from './common';

interface Ex {
  id: string;
  title: string;
  desc: string;
  ready: boolean;
  lot?: string;
}

const GROUPS: { skill: string; items: Ex[] }[] = [
  {
    skill: 'Vocabulaire',
    items: [
      { id: 'cartes', title: 'Cartes', desc: 'Recto : le mot arabe. Verso : le sens. Tu dis si tu savais.', ready: true },
      { id: 'qcm_ar_fr', title: 'QCM arabe → français', desc: 'Un mot arabe, quatre sens possibles.', ready: true },
      { id: 'qcm_fr_ar', title: 'QCM français → arabe', desc: 'Un sens, quatre mots arabes possibles.', ready: true },
    ],
  },
  {
    skill: 'Lecture',
    items: [
      { id: 'lettre', title: 'Lettre → nom et son', desc: 'Reconnaître les 28 lettres.', ready: false, lot: 'Lot 2' },
      { id: 'paires', title: 'Paires qui piègent', desc: 'ح خ ه, ص س, ض د…', ready: false, lot: 'Lot 2' },
      { id: 'lecture_v', title: 'Mot vocalisé → translittération', desc: 'Déchiffrer un mot avec ses voyelles.', ready: false, lot: 'Lot 2' },
      { id: 'lecture_nv', title: 'Mot sans voyelles → translittération', desc: 'Débloqué à 80 % de réussite sur l’exercice précédent.', ready: false, lot: 'Lot 2' },
    ],
  },
  {
    skill: 'Écriture',
    items: [
      { id: 'trace', title: 'Tracé sur modèle', desc: 'Tracer au doigt sur le modèle, puis de mémoire.', ready: false, lot: 'Lot 2' },
      { id: 'dictee', title: 'Dictée tracée', desc: 'Écouter, tracer, vérifier lettre par lettre.', ready: false, lot: 'Lot 3' },
    ],
  },
];

export function Exercises() {
  const { categories } = useApp();
  const [cat, setCat] = useState('');
  return (
    <main class="screen">
      <TopBar title="Exercices" />
      <p class="muted intro">
        Entraînement libre : tes réponses sont enregistrées, mais seule la révision du jour fait monter les mots de
        boîte.
      </p>
      <label class="field">
        <span>Catégorie</span>
        <select value={cat} onChange={(e) => setCat(e.currentTarget.value)}>
          <option value="">Toutes</option>
          {categories.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
      </label>
      {GROUPS.map((g) => (
        <section key={g.skill}>
          <h2 class="section-title">{g.skill}</h2>
          <ul class="list">
            {g.items.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  class="row"
                  disabled={!ex.ready}
                  onClick={() => go('/seance', { mode: ex.id, cat })}
                >
                  <span class="row-main">
                    <span class="row-title">{ex.title}</span>
                    <span class="row-sub">{ex.desc}</span>
                  </span>
                  {ex.ready ? (
                    <Icon name="back" size={20} />
                  ) : (
                    <span class="tag">{ex.lot}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
