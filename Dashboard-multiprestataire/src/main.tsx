import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Register Service Worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update prompt to user
    if (confirm('Une nouvelle version est disponible. Recharger ?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App prête pour utilisation hors ligne');
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
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
