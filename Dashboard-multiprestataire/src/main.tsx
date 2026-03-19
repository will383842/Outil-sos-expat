import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './i18n/config';
import App from './App';
import './index.css';

// Register Service Worker — show update toast when new version available
const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch custom event so App can show a toast (Toaster must be mounted)
    window.dispatchEvent(new CustomEvent('pwa:update-available'));
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

// Expose updateSW so the reload toast can activate the waiting SW before reloading
window.addEventListener('pwa:do-update', () => {
  updateSW(true);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
