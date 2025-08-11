/// <reference types="vite/client" />

/**
 * Vite Environment Configuration for SOS Expat Analytics
 * @description Configuration TypeScript pour les variables d'environnement et types Vite
 */

// ========================================
// TYPES POUR LES MODULES (imports d'assets)
// ========================================

// Support des fichiers CSS modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Support des assets
declare module '*.svg' {
  import React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  export { ReactComponent };
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.ico' {
  const src: string;
  export default src;
}

// Support des fichiers de données
declare module '*.json' {
  const value: any;
  export default value;
}

declare module '*.yaml' {
  const data: any;
  export default data;
}

declare module '*.yml' {
  const data: any;
  export default data;
}

// Support des Web Workers
declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module '*?worker&inline' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

// ========================================
/*           EXTENSIONS GLOBALES          */
// ========================================

declare global {
  // VARIABLES D'ENVIRONNEMENT (⚠️ inclut Firebase)
  interface ImportMetaEnv {
    // Configuration de l'application
    readonly VITE_APP_NAME: string;
    readonly VITE_APP_VERSION: string;
    readonly VITE_APP_DESCRIPTION: string;

    // URLs et endpoints
    readonly VITE_API_BASE_URL: string;
    readonly VITE_API_TIMEOUT: string;
    readonly VITE_WEBSOCKET_URL: string;

    // Configuration de sécurité
    readonly VITE_API_KEY: string;
    readonly VITE_AUTH_DOMAIN: string;
    readonly VITE_ALLOWED_ORIGINS: string;

    // Services externes
    readonly VITE_MAPS_API_KEY: string;
    readonly VITE_ANALYTICS_ID: string;
    readonly VITE_SENTRY_DSN: string;

    // Développement
    readonly VITE_DEBUG_MODE: string;
    readonly VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
    readonly VITE_MOCK_API: string;

    // Authentification
    readonly VITE_AUTH_CLIENT_ID: string;
    readonly VITE_AUTH_REDIRECT_URI: string;
    readonly VITE_SESSION_TIMEOUT: string;

    // Features
    readonly VITE_ENABLE_REAL_TIME: string;
    readonly VITE_ENABLE_NOTIFICATIONS: string;
    readonly VITE_ENABLE_EXPORTS: string;
    readonly VITE_ENABLE_ADVANCED_ANALYTICS: string;

    // Limites
    readonly VITE_MAX_FILE_SIZE: string;
    readonly VITE_MAX_REQUESTS_PER_MINUTE: string;
    readonly VITE_CACHE_DURATION: string;

    // Langues / régions
    readonly VITE_DEFAULT_LANGUAGE: string;
    readonly VITE_SUPPORTED_LOCALES: string;
    readonly VITE_DEFAULT_TIMEZONE: string;

    // Environnement
    readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
    readonly VITE_BUILD_VERSION: string;
    readonly VITE_BUILD_DATE: string;

    // 🔥 Firebase (nécessaire pour src/lib/firebase.ts)
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
  }

  // Hot Module Replacement (fusionné ici pour éviter les doublons)
  interface ViteHotContext {
    readonly data: any;
    accept(): void;
    accept(cb: (mod: any) => void): void;
    accept(dep: string, cb: (mod: any) => void): void;
    accept(deps: readonly string[], cb: (mods: any[]) => void): void;
    dispose(cb: (data: any) => void): void;
    decline(): void;
    invalidate(): void;
    on<T extends string>(event: T, cb: (data: any) => void): void;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
    readonly hot?: ViteHotContext;
  }

  // Extension de Window pour les outils de développement
  interface Window {
    // Debug et développement
    __SOS_EXPAT_DEBUG__?: boolean;
    __VITE_DEV_TOOLS__?: any;

    // Analytics et monitoring
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];

    // Configuration runtime
    __APP_CONFIG__?: {
      version: string;
      buildDate: string;
      environment: string;
      features: Record<string, boolean>;
    };

    // Services externes
    google?: any;
    Microsoft?: any;
  }

  // Variables globales pour le développement
  const __DEV__: boolean;
  const __PROD__: boolean;
  const __TEST__: boolean;
}

// ========================================
// TYPES UTILITAIRES POUR L'APPLICATION
// ========================================

// Type pour les variables d'environnement typées
export type EnvConfig = {
  [K in keyof ImportMetaEnv]: ImportMetaEnv[K] extends string ? string : ImportMetaEnv[K];
};

// Type pour les features flags
export type FeatureFlags = {
  realTime: boolean;
  notifications: boolean;
  exports: boolean;
  advancedAnalytics: boolean;
};

// Type pour la configuration runtime
export type RuntimeConfig = {
  apiBaseUrl: string;
  apiTimeout: number;
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
  version: string;
  features: FeatureFlags;
};

// ========================================
// AUGMENTATION DES TYPES VITE
// ========================================

declare module 'vite' {
  interface UserConfig {
    // Extensions personnalisées pour la configuration Vite
    sosExpat?: {
      enableMockApi?: boolean;
      customHeaders?: Record<string, string>;
      proxyRules?: Record<string, string>;
    };
  }
}

// ========================================
// DÉCLARATIONS POUR LES OUTILS DE BUILD
// ========================================

// Support pour les imports dynamiques
declare function importMeta(): ImportMeta;

// Variables injectées au build
declare const __BUILD_VERSION__: string;
declare const __BUILD_DATE__: string;
declare const __COMMIT_HASH__: string;

// Assure que ce fichier reste un module, tout en permettant `declare global`
export {};
