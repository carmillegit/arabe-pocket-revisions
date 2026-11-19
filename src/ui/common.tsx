// Composants partagés : texte arabe, visuel, icônes, en-têtes.
import { useState } from 'preact/hooks';
import { stripVowels } from '../domain/arabic';
import type { Mastery } from '../domain/srs';
import type { Visual, Word } from '../domain/types';
import { useApp } from '../store';

/** Texte arabe : sens droite-gauche, police intégrée, voyelles selon le réglage. */
export function Ar({
  text,
  size = 'm',
  class: cls = '',
  toggle = false,
  forceVowels = false,
}: {
  text: string;
  size?: 's' | 'm' | 'l' | 'xl';
  class?: string;
  /** Affiche le bouton « Voir les voyelles » (jamais à l'intérieur d'un autre bouton). */
  toggle?: boolean;
  forceVowels?: boolean;
}) {
  const { vowelMode } = useApp();
  const [shown, setShown] = useState(false);
  const hide = vowelMode === 'onDemand' && !shown && !forceVowels;
  return (
    <span class={`ar-wrap ${cls}`}>
      <bdi class={`ar ar-${size}`} lang="ar" dir="rtl">
        {hide ? stripVowels(text) : text}
      </bdi>
      {vowelMode === 'onDemand' && toggle && !forceVowels && (
        <button
          type="button"
          class="vowel-toggle"
          aria-pressed={shown}
          onClick={(e) => {
            e.stopPropagation();
            setShown(!shown);
          }}
        >
          {shown ? 'Masquer les voyelles' : 'Voir les voyelles'}
        </button>
      )}
    </span>
  );
}

export function VisualBadge({ visual, size = 40 }: { visual: Visual; size?: number }) {
  if (!visual) return <span class="visual visual-empty" style={{ width: size, height: size }} aria-hidden="true" />;
  if (visual.kind === 'color') {
    return (
      <span
        class="visual visual-color"
        style={{ width: size, height: size, background: visual.value }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span class="visual" style={{ width: size, height: size, fontSize: size * 0.7 }} aria-hidden="true">
      {visual.value}
    </span>
  );
}

export const MASTERY_LABEL: Record<Mastery, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  acquis: 'Acquis',
};

export function MasteryDot({ m }: { m: Mastery }) {
  return <span class={`mdot m-${m}`} title={MASTERY_LABEL[m]} aria-label={MASTERY_LABEL[m]} />;
}

export function ToVerify({ w }: { w: Word }) {
  if (w.status === 'valide') return null;
  return <span class="tag tag-warn">à vérifier</span>;
}

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: preact.ComponentChildren }) {
  return (
    <header class="topbar">
      {onBack ? (
        <button type="button" class="icon-btn" onClick={onBack} aria-label="Retour">
          <Icon name="back" />
        </button>
      ) : (
        <span class="icon-btn-spacer" />
      )}
      <h1>{title}</h1>
      {right ?? <span class="icon-btn-spacer" />}
    </header>
  );
}

const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  play: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  flame: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-4 3 0-2 0-4-1-6-3 3-5 7-5 12 0 4 3 7 7 7z',
  check: 'M5 12.5l4.5 4.5L19 7',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 1 1 8 0v3',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  filter: 'M3 5h18M6 12h12M10 19h4',
};

export function Icon({ name, size = 24 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function formatDate(t: number): string {
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}
