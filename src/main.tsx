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

render(
  <AppProvider>
    <App />
  </AppProvider>,
  document.getElementById('root')!,
);
