import { render } from 'preact';
import '@fontsource/noto-naskh-arabic/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-600.css';
import './styles.css';
import { App } from './app';
import { AppProvider } from './store';
import { registerSW } from 'virtual:pwa-register';

// Demande au navigateur de ne pas effacer les données locales (important sur iPhone).
navigator.storage?.persist?.().catch(() => {});

registerSW({ immediate: true });

// Phase de test : toute erreur s'affiche en bas de l'écran, pour pouvoir la signaler (capture d'écran).
function showError(message: string) {
  let el = document.getElementById('error-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'error-banner';
    el.setAttribute('role', 'alert');
    el.addEventListener('click', () => el!.remove());
    document.body.appendChild(el);
  }
  el.textContent = `Erreur (fais une capture et envoie-la) : ${message}  — touche pour fermer`;
}
window.addEventListener('error', (e) => showError(e.message || String(e.error)));
window.addEventListener('unhandledrejection', (e) => showError(String(e.reason?.message ?? e.reason)));

render(
  <AppProvider>
    <App />
  </AppProvider>,
  document.getElementById('root')!,
);
