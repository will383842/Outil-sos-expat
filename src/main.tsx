// 🚀 Point d'entrée ultra-moderne 2025 pour outil interne ChatGPT
// Plateforme d'assistance IA pour équipe de support

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 🔧 Configuration environnement pour outil interne
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.company.fr';

// 📊 Monitoring et analytics pour usage interne
if (isProduction) {
  // Configuration analytics interne (Google Analytics, Mixpanel, etc.)
  console.log('🚀 IA Platform démarrée en production');
  console.log('📊 Version:', appVersion);
  
  // Tracking des erreurs en production (Sentry, LogRocket, etc.)
  window.addEventListener('error', (event) => {
    console.error('💥 Erreur application:', event.error);
    // Ici on enverrait l'erreur à un service de monitoring
    // sentry.captureException(event.error);
  });

  // Tracking des performances pour optimisation équipe
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    console.log('⚡ Temps de chargement:', Math.round(loadTime), 'ms');
    
    // Métriques Web Vitals pour l'équipe tech
    // getCLS, getFID, getFCP, getLCP, getTTFB
  });
}

// 🔧 Configuration développement pour équipe
if (isDevelopment) {
  console.log('🛠️ IA Platform en mode développement');
  console.log('🔗 API URL:', apiUrl);
  console.log('🎯 Version:', appVersion);
  
  // Hot Module Replacement info
  if (import.meta.hot) {
    console.log('🔥 Hot reload activé');
  }
  
  // Outils développement React (React DevTools)
  if (typeof window !== 'undefined') {
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ && window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (id, root) => {
        // Logging pour debugging équipe
      };
    }
  }
}

// 🚨 Error Boundary global pour stabilité production
class GlobalErrorBoundary extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'GlobalErrorBoundary';
  }
}

// 📱 Détection PWA et installation pour équipe mobile
if ('serviceWorker' in navigator && isProduction) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('📱 Service Worker enregistré:', registration.scope);
        
        // Notification équipe pour mise à jour disponible
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Nouvelle version disponible');
          // Notification toast pour l'équipe
        });
      })
      .catch((error) => {
        console.error('❌ Erreur Service Worker:', error);
      });
  });

  // Prompt d'installation PWA pour équipe
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📲 Installation PWA disponible');
    // Stocker l'événement pour installation ultérieure
    (window as any).deferredPrompt = e;
  });
}

// 🌐 Configuration internationalisation (i18n) pour équipe
const supportedLanguages = ['fr', 'en'] as const;
const defaultLanguage = 'fr';
const userLanguage = navigator.language.split('-')[0] as typeof supportedLanguages[number];
const appLanguage = supportedLanguages.includes(userLanguage) ? userLanguage : defaultLanguage;

// Stockage préférence langue équipe
localStorage.setItem('app-language', appLanguage);
console.log('🌍 Langue détectée:', appLanguage);

// 🎨 Gestion du thème pour interface équipe
const detectTheme = (): 'light' | 'dark' | 'auto' => {
  const savedTheme = localStorage.getItem('app-theme') as 'light' | 'dark' | 'auto';
  if (savedTheme) return savedTheme;
  
  // Préférence système par défaut
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
  const root = document.documentElement;
  
  if (theme === 'auto') {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', systemDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
  
  localStorage.setItem('app-theme', theme);
};

// Initialiser le thème
applyTheme(detectTheme());

// Écouter les changements de préférence système
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const currentTheme = localStorage.getItem('app-theme');
  if (currentTheme === 'auto' || !currentTheme) {
    applyTheme('auto');
  }
});

// 🔋 Monitoring des performances pour optimisation équipe
const startPerformanceMonitoring = () => {
  // Memory usage pour débogage
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('💾 Mémoire utilisée:', Math.round(memory.usedJSHeapSize / 1024 / 1024), 'MB');
  }
  
  // Network status pour équipe mobile
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    console.log('📶 Connexion:', connection.effectiveType, '- Débit:', connection.downlink, 'Mbps');
  }
  
  // Battery status pour équipe mobile
  if ('getBattery' in navigator) {
    (navigator as any).getBattery().then((battery: any) => {
      console.log('🔋 Batterie:', Math.round(battery.level * 100) + '%');
    });
  }
};

if (isDevelopment) {
  startPerformanceMonitoring();
}

// 🚀 Configuration globale pour l'équipe
window.__APP_CONFIG__ = {
  version: appVersion,
  environment: isDevelopment ? 'development' : 'production',
  apiUrl,
  language: appLanguage,
  theme: detectTheme(),
  features: {
    analytics: isProduction,
    devTools: isDevelopment,
    pwa: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    offline: 'serviceWorker' in navigator,
    realtime: 'WebSocket' in window
  }
};

// 📊 Métriques de démarrage pour équipe tech
const appStartTime = performance.now();
console.log('🏁 Initialisation app:', Math.round(appStartTime), 'ms');

// 🎯 Initialisation des fonctionnalités internes
const initializeInternalFeatures = () => {
  // Raccourcis clavier pour équipe
  document.addEventListener('keydown', (e) => {
    // Ctrl+K ou Cmd+K : Recherche rapide
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      console.log('🔍 Recherche rapide activée');
      // Ouvrir modal de recherche
    }
    
    // Ctrl+/ ou Cmd+/ : Raccourcis aide
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      console.log('❓ Aide raccourcis activée');
      // Afficher aide raccourcis
    }
    
    // Escape : Fermer modals
    if (e.key === 'Escape') {
      console.log('🚪 Fermeture modals');
      // Fermer toutes les modals ouvertes
    }
  });

  // Notifications permission pour équipe
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      console.log('🔔 Notifications:', permission);
    });
  }

  // Gestion hors ligne pour équipe mobile
  window.addEventListener('online', () => {
    console.log('🌐 Connexion rétablie');
    // Synchroniser données en attente
  });

  window.addEventListener('offline', () => {
    console.log('📵 Mode hors ligne');
    // Informer équipe du mode offline
  });
};

// 🎭 Splash screen et loading pour UX équipe
const showSplashScreen = () => {
  const splash = document.createElement('div');
  splash.id = 'app-splash';
  splash.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #f8fafc 0%, #ddd6fe 50%, #e0e7ff 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: Inter, sans-serif;
    ">
      <div style="text-align: center;">
        <div style="
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          animation: pulse 2s infinite;
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
            <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14l-2-4H7l-2 4z"/>
          </svg>
        </div>
        <h1 style="
          font-size: 24px;
          font-weight: 800;
          background: linear-gradient(135deg, #1e293b, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 12px;
        ">IA Platform</h1>
        <p style="color: #64748b; margin: 0; font-weight: 500;">
          Chargement de l'outil interne...
        </p>
      </div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    </style>
  `;
  
  document.body.appendChild(splash);
  
  // Supprimer splash après chargement
  setTimeout(() => {
    splash.remove();
  }, 1500);
};

// 🚀 Rendu de l'application
const renderApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('❌ Élément root introuvable');
    return;
  }

  // Splash screen pendant chargement
  if (isProduction) {
    showSplashScreen();
  }

  // Création du root React 18
  const root = createRoot(rootElement);

  // Configuration React StrictMode pour détection problèmes
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Initialiser fonctionnalités après rendu
  setTimeout(() => {
    initializeInternalFeatures();
    
    const totalLoadTime = performance.now() - appStartTime;
    console.log('✅ App totalement chargée en:', Math.round(totalLoadTime), 'ms');
    
    // Métriques pour équipe tech
    if (isDevelopment) {
      console.log('🎯 Config app:', window.__APP_CONFIG__);
    }
  }, 100);
};

// 🎬 Démarrage de l'application
renderApp();

// 🔄 Hot Module Replacement pour développement
if (import.meta.hot) {
  import.meta.hot.accept('./App.tsx', () => {
    console.log('🔥 Hot reload: App.tsx mis à jour');
  });
}

// 🌍 Export des utilitaires globaux pour équipe
declare global {
  interface Window {
    __APP_CONFIG__: {
      version: string;
      environment: 'development' | 'production';
      apiUrl: string;
      language: string;
      theme: string;
      features: {
        analytics: boolean;
        devTools: boolean;
        pwa: boolean;
        notifications: boolean;
        offline: boolean;
        realtime: boolean;
      };
    };
    deferredPrompt?: any;
  }
}