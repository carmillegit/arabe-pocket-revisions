// Navigation par ancre (#/mots, #/seance?mode=…) : fonctionne hors connexion et sur GitHub Pages.
import { useEffect, useState } from 'preact/hooks';

export interface Route {
  path: string;
  params: URLSearchParams;
}

function parse(): Route {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, q = ''] = h.split('?');
  return { path, params: new URLSearchParams(q) };
}

export function useRoute(): Route {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => {
      setR(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export function go(path: string, params?: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v) q.set(k, v);
  const s = q.toString();
  location.hash = s ? `${path}?${s}` : path;
}

export function back(fallback = '/') {
  if (history.length > 1) history.back();
  else go(fallback);
}
