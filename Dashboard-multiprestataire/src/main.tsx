import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './i18n/config';
import App from './App';
import './index.css';

// Register Service Worker with auto-update (silent on iOS)
const updateSW = registerSW({
  onNeedRefresh() {
    // Auto-update silently — confirm() doesn't work on iOS standalone PWA
    updateSW(true);
  },
  onOfflineReady() {
    console.log('App prête pour utilisation hors ligne');
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Check for updates every 15 minutes (faster than 1h for critical fixes)
      setInterval(() => {
        registration.update();
      }, 15 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('SW registration error:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
