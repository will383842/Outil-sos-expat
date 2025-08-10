/// <reference types="vite/client" />

/**
 * Vite Environment Configuration for SOS Expat Analytics
 * @description Configuration TypeScript pour les variables d'environnement et types Vite
 */

// ========================================
// VARIABLES D'ENVIRONNEMENT
// ========================================

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
  
  // Configuration des services externes
  readonly VITE_MAPS_API_KEY: string;
  readonly VITE_ANALYTICS_ID: string;
  readonly VITE_SENTRY_DSN: string;
  
  // Configuration de développement
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  readonly VITE_MOCK_API: string;
  
  // Configuration de l'authentification
  readonly VITE_AUTH_CLIENT_ID: string;
  readonly VITE_AUTH_REDIRECT_URI: string;
  readonly VITE_SESSION_TIMEOUT: string;
  
  // Configuration des features
  readonly VITE_ENABLE_REAL_TIME: string;
  readonly VITE_ENABLE_NOTIFICATIONS: string;
  readonly VITE_ENABLE_EXPORTS: string;
  readonly VITE_ENABLE_ADVANCED_ANALYTICS: string;
  
  // Configuration des limites
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_MAX_REQUESTS_PER_MINUTE: string;
  readonly VITE_CACHE_DURATION: string;
  
  // Configuration des langues et régions
  readonly VITE_DEFAULT_LANGUAGE: string;
  readonly VITE_SUPPORTED_LOCALES: string;
  readonly VITE_DEFAULT_TIMEZONE: string;
  
  // Configuration de l'environnement
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
  readonly VITE_BUILD_VERSION: string;
  readonly VITE_BUILD_DATE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ========================================
// TYPES POUR LES MODULES
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
// EXTENSIONS GLOBALES
// ========================================

declare global {
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
  [K in keyof ImportMetaEnv]: ImportMetaEnv[K] extends string 
    ? string 
    : ImportMetaEnv[K];
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
// SUPPORT HOT MODULE REPLACEMENT
// ========================================

// Types pour HMR personnalisé
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

declare interface ImportMeta {
  readonly hot?: ViteHotContext;
}

// ========================================
// SUPPORT DES EXTENSIONS SPÉCIFIQUES
// ========================================

// Support des fichiers de configuration
declare module '*.config.js' {
  const config: any;
  export default config;
}

declare module '*.config.ts' {
  const config: any;
  export default config;
}

// Support des fichiers de traduction
declare module '*/locales/*.json' {
  const translations: Record<string, string>;
  export default translations;
}

// Support des schémas de validation
declare module '*.schema.json' {
  const schema: any;
  export default schema;
}

// ========================================
// DÉCLARATIONS POUR LES OUTILS DE BUILD
// ========================================

// Support pour les imports dynamiques
declare function importMeta(): ImportMeta;

// Support pour les variables injectées au build
declare const __BUILD_VERSION__: string;
declare const __BUILD_DATE__: string;
declare const __COMMIT_HASH__: string;