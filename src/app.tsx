import { useRoute } from './router';
import { Icon } from './ui/common';
import { Home } from './ui/Home';
import { Exercises } from './ui/Exercises';
import { Words } from './ui/Words';
import { WordForm } from './ui/WordForm';
import { ProgressScreen } from './ui/ProgressScreen';
import { Settings } from './ui/Settings';
import { SessionScreen } from './ui/Session';
import { CoursList, CoursSessionScreen } from './ui/Cours';

const TABS = [
  { path: '/', label: 'Accueil', icon: 'home' },
  { path: '/exercices', label: 'Exercices', icon: 'play' },
  { path: '/mots', label: 'Mots', icon: 'book' },
  { path: '/progression', label: 'Progression', icon: 'chart' },
  { path: '/cours', label: 'Cours', icon: 'school' },
];

export function App() {
  const { path, params } = useRoute();
  let screen;
  let nav = true;
  if (path === '/seance') {
    screen = <SessionScreen key={location.hash} params={params} />;
    nav = false;
  } else if (path === '/mots/nouveau') {
    screen = <WordForm key={location.hash} id={null} />;
    nav = false;
  } else if (path.startsWith('/mots/')) {
    const id = decodeURIComponent(path.slice('/mots/'.length));
    screen = <WordForm key={id} id={id} />;
    nav = false;
  } else if (path === '/exercices') screen = <Exercises />;
  else if (path === '/mots') screen = <Words />;
  else if (path === '/progression') screen = <ProgressScreen />;
  else if (path === '/reglages') screen = <Settings />;
  else if (path === '/cours') screen = <CoursList />;
  else if (path.startsWith('/cours/')) screen = <CoursSessionScreen key={path} id={decodeURIComponent(path.slice('/cours/'.length))} />;
  else screen = <Home />;

  const active = TABS.find((t) => t.path !== '/' && path.startsWith(t.path))?.path ?? '/';
  return (
    <div class={`app ${nav ? 'has-nav' : ''}`}>
      {screen}
      {nav && (
        <nav class="tabbar" aria-label="Navigation principale">
          {TABS.map((t) => (
            <a
              key={t.path}
              href={`#${t.path}`}
              class={`tab ${active === t.path ? 'is-active' : ''}`}
              aria-current={active === t.path ? 'page' : undefined}
            >
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
