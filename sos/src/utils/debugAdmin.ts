// =============================================================================
// 🔍 SYSTÈME DE DIAGNOSTIC COMPLET - ADMIN CONSOLE DEBUG
// =============================================================================
// À placer dans : src/utils/debugAdmin.ts
// Utilisation : Importer et appeler les hooks dans les composants à analyser
// =============================================================================

import React, { useRef, useEffect, useCallback } from 'react';

// Types
interface DebugEvent {
  id: number;
  timestamp: number;
  relativeTime: number;
  type: 'MOUNT' | 'UNMOUNT' | 'RENDER' | 'STATE' | 'AUTH' | 'FIRESTORE' | 'NAVIGATION' | 'ERROR' | 'EFFECT' | 'CONTEXT' | 'CLEANUP' | 'ABORT';
  component: string;
  action: string;
  data?: Record<string, unknown>;
  stack?: string;
}

interface ComponentStats {
  renderCount: number;
  mountCount: number;
  unmountCount: number;
  lastRenderTime: number;
  renderTimes: number[];
  isCurrentlyMounted: boolean;
}

interface FirestoreQueryStats {
  collection: string;
  startCount: number;
  successCount: number;
  errorCount: number;
  abortCount: number;
  avgDuration: number;
  durations: number[];
}

// =============================================================================
// CLASSE PRINCIPALE DE DEBUG
// =============================================================================

class AdminDebugSystem {
  private events: DebugEvent[] = [];
  private startTime: number = Date.now();
  private eventId: number = 0;
  private componentStats: Map<string, ComponentStats> = new Map();
  private firestoreStats: Map<string, FirestoreQueryStats> = new Map();
  private activeQueries: Map<string, number> = new Map(); // queryId -> startTime
  private authStateChanges: Array<{ time: number; user: unknown; loading: boolean }> = [];
  private navigationHistory: Array<{ time: number; from: string; to: string }> = [];
  private isEnabled: boolean = true;
  private consoleGroupOpen: boolean = false;

  // Styles pour la console
  private styles = {
    MOUNT: 'background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;',
    UNMOUNT: 'background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;',
    RENDER: 'background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px;',
    STATE: 'background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px;',
    AUTH: 'background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;',
    FIRESTORE: 'background: #6366f1; color: white; padding: 2px 8px; border-radius: 4px;',
    NAVIGATION: 'background: #64748b; color: white; padding: 2px 8px; border-radius: 4px;',
    ERROR: 'background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;',
    EFFECT: 'background: #06b6d4; color: white; padding: 2px 8px; border-radius: 4px;',
    CONTEXT: 'background: #ec4899; color: white; padding: 2px 8px; border-radius: 4px;',
    CLEANUP: 'background: #f97316; color: white; padding: 2px 8px; border-radius: 4px;',
    ABORT: 'background: #b91c1c; color: yellow; padding: 2px 8px; border-radius: 4px; font-weight: bold;',
  };

  constructor() {
    this.setupGlobalErrorCapture();
    this.setupNavigationCapture();
    this.announceStart();
  }

  private announceStart(): void {
    console.log('%c🔍 ADMIN DEBUG SYSTEM ACTIVÉ', 'font-size: 16px; font-weight: bold; color: #22c55e;');
    console.log('%c📊 Commandes disponibles:', 'font-weight: bold;');
    console.log('   window.adminDebug.getReport()     - Rapport complet');
    console.log('   window.adminDebug.getTimeline()   - Timeline des événements');
    console.log('   window.adminDebug.getProblems()   - Problèmes détectés');
    console.log('   window.adminDebug.getFirestore()  - Stats Firestore');
    console.log('   window.adminDebug.reset()         - Réinitialiser');
    console.log('   window.adminDebug.export()        - Exporter en JSON');
  }

  private setupGlobalErrorCapture(): void {
    if (typeof window === 'undefined') return;

    // Capturer les erreurs non gérées
    window.addEventListener('error', (event) => {
      this.log('ERROR', 'Global', 'Uncaught Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Capturer les rejections de promesses
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const isAbortError = reason?.name === 'AbortError' || 
                          (reason?.message && reason.message.includes('aborted'));
      
      if (isAbortError) {
        this.log('ABORT', 'Promise', 'AbortError détecté', {
          message: reason?.message || 'Request aborted',
          stack: reason?.stack?.split('\n').slice(0, 5).join('\n'),
        });
      } else {
        this.log('ERROR', 'Promise', 'Unhandled Rejection', {
          reason: String(reason),
          stack: reason?.stack?.split('\n').slice(0, 5).join('\n'),
        });
      }
    });
  }

  private setupNavigationCapture(): void {
    if (typeof window === 'undefined') return;

    let lastPath = window.location.pathname;

    // Observer les changements d'URL
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      const result = originalPushState.apply(history, args);
      this.handleNavigation(lastPath, window.location.pathname, 'pushState');
      lastPath = window.location.pathname;
      return result;
    };

    history.replaceState = (...args) => {
      const result = originalReplaceState.apply(history, args);
      this.handleNavigation(lastPath, window.location.pathname, 'replaceState');
      lastPath = window.location.pathname;
      return result;
    };

    window.addEventListener('popstate', () => {
      this.handleNavigation(lastPath, window.location.pathname, 'popstate');
      lastPath = window.location.pathname;
    });
  }

  private handleNavigation(from: string, to: string, method: string): void {
    if (from === to) return;
    
    this.navigationHistory.push({
      time: Date.now() - this.startTime,
      from,
      to,
    });

    this.log('NAVIGATION', 'Router', `${method}: ${from} → ${to}`, { from, to, method });
  }

  // ==========================================================================
  // MÉTHODES DE LOGGING
  // ==========================================================================

  log(
    type: DebugEvent['type'],
    component: string,
    action: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.isEnabled) return;

    const now = Date.now();
    const event: DebugEvent = {
      id: ++this.eventId,
      timestamp: now,
      relativeTime: now - this.startTime,
      type,
      component,
      action,
      data,
      stack: new Error().stack?.split('\n').slice(3, 7).join('\n'),
    };

    this.events.push(event);

    // Affichage console avec style
    const style = this.styles[type] || this.styles.STATE;
    const timeStr = `${event.relativeTime}ms`.padStart(7);
    
    if (type === 'ERROR' || type === 'ABORT') {
      console.groupCollapsed(
        `%c${type}%c [${timeStr}] ${component} - ${action}`,
        style,
        'color: inherit;'
      );
      if (data) console.log('Data:', data);
      if (event.stack) console.log('Stack:', event.stack);
      console.groupEnd();
    } else {
      console.log(
        `%c${type}%c [${timeStr}] ${component} - ${action}`,
        style,
        'color: inherit;',
        data || ''
      );
    }
  }

  // ==========================================================================
  // TRACKING DES COMPOSANTS
  // ==========================================================================

  trackRender(component: string, props?: Record<string, unknown>, state?: Record<string, unknown>): void {
    const stats = this.getOrCreateComponentStats(component);
    stats.renderCount++;
    stats.lastRenderTime = Date.now() - this.startTime;
    stats.renderTimes.push(stats.lastRenderTime);

    const sanitizedProps = this.sanitize(props);
    const sanitizedState = this.sanitize(state);

    this.log('RENDER', component, `Render #${stats.renderCount}`, {
      props: sanitizedProps,
      state: sanitizedState,
    });

    // Alertes
    if (stats.renderCount > 5) {
      this.log('ERROR', component, `⚠️ RENDERS EXCESSIFS: ${stats.renderCount} fois en ${stats.lastRenderTime}ms`);
    }

    // Détection de re-render rapide (< 100ms)
    if (stats.renderTimes.length >= 2) {
      const lastTwo = stats.renderTimes.slice(-2);
      const gap = lastTwo[1] - lastTwo[0];
      if (gap < 100 && gap > 0) {
        this.log('ERROR', component, `⚠️ RE-RENDER RAPIDE: ${gap}ms depuis le dernier render`);
      }
    }
  }

  trackMount(component: string): void {
    const stats = this.getOrCreateComponentStats(component);
    stats.mountCount++;
    stats.isCurrentlyMounted = true;

    this.log('MOUNT', component, `Mount #${stats.mountCount}`);

    // Alerte si re-mount (était démonté puis remonté)
    if (stats.unmountCount > 0 && stats.mountCount > stats.unmountCount) {
      this.log('ERROR', component, `⚠️ RE-MOUNT DÉTECTÉ (mount #${stats.mountCount} après ${stats.unmountCount} unmount)`);
    }
  }

  trackUnmount(component: string): void {
    const stats = this.getOrCreateComponentStats(component);
    stats.unmountCount++;
    stats.isCurrentlyMounted = false;

    this.log('UNMOUNT', component, `Unmount #${stats.unmountCount}`);

    // Alerte si unmount rapide après mount
    const timeSinceLastRender = (Date.now() - this.startTime) - stats.lastRenderTime;
    if (timeSinceLastRender < 500) {
      this.log('ERROR', component, `⚠️ UNMOUNT RAPIDE: ${timeSinceLastRender}ms après le dernier render`);
    }
  }

  trackEffect(component: string, effectName: string, phase: 'setup' | 'cleanup', deps?: unknown[]): void {
    const type = phase === 'cleanup' ? 'CLEANUP' : 'EFFECT';
    this.log(type, component, `${effectName} - ${phase}`, {
      deps: this.sanitize(deps),
    });
  }

  // ==========================================================================
  // TRACKING AUTH
  // ==========================================================================

  trackAuthChange(source: string, user: unknown, loading: boolean, extra?: Record<string, unknown>): void {
    const sanitizedUser = user ? {
      uid: (user as any)?.uid?.substring(0, 8) + '...',
      email: (user as any)?.email,
      role: (user as any)?.role,
      emailVerified: (user as any)?.emailVerified,
    } : null;

    this.authStateChanges.push({
      time: Date.now() - this.startTime,
      user: sanitizedUser,
      loading,
    });

    this.log('AUTH', source, `Auth State Change`, {
      hasUser: !!user,
      ...sanitizedUser,
      loading,
      ...extra,
    });

    // Détection de changements rapides
    if (this.authStateChanges.length >= 2) {
      const lastTwo = this.authStateChanges.slice(-2);
      const gap = lastTwo[1].time - lastTwo[0].time;
      if (gap < 200) {
        this.log('ERROR', source, `⚠️ AUTH CHANGES RAPIDES: 2 changements en ${gap}ms`);
      }
    }
  }

  // ==========================================================================
  // TRACKING FIRESTORE
  // ==========================================================================

  trackFirestoreStart(collection: string, operation: string, queryId: string): void {
    const stats = this.getOrCreateFirestoreStats(collection);
    stats.startCount++;
    this.activeQueries.set(queryId, Date.now());

    this.log('FIRESTORE', collection, `${operation} START`, { queryId });
  }

  trackFirestoreSuccess(collection: string, operation: string, queryId: string, resultCount?: number): void {
    const stats = this.getOrCreateFirestoreStats(collection);
    stats.successCount++;

    const startTime = this.activeQueries.get(queryId);
    if (startTime) {
      const duration = Date.now() - startTime;
      stats.durations.push(duration);
      stats.avgDuration = stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length;
      this.activeQueries.delete(queryId);

      this.log('FIRESTORE', collection, `${operation} SUCCESS (${duration}ms)`, { queryId, resultCount, duration });
    } else {
      this.log('FIRESTORE', collection, `${operation} SUCCESS`, { queryId, resultCount });
    }
  }

  trackFirestoreError(collection: string, operation: string, queryId: string, error: unknown): void {
    const stats = this.getOrCreateFirestoreStats(collection);
    stats.errorCount++;
    this.activeQueries.delete(queryId);

    this.log('ERROR', collection, `${operation} ERROR`, {
      queryId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  trackFirestoreAbort(collection: string, operation: string, queryId: string): void {
    const stats = this.getOrCreateFirestoreStats(collection);
    stats.abortCount++;
    this.activeQueries.delete(queryId);

    this.log('ABORT', collection, `${operation} ABORTED`, { queryId });

    // Alerte si trop d'aborts
    if (stats.abortCount > 3) {
      this.log('ERROR', collection, `⚠️ TROP D'ABORTS: ${stats.abortCount} requêtes annulées`);
    }
  }

  // ==========================================================================
  // TRACKING CONTEXT
  // ==========================================================================

  trackContextChange(contextName: string, field: string, oldValue: unknown, newValue: unknown): void {
    // Ne logger que les changements significatifs
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;

    this.log('CONTEXT', contextName, `${field} changed`, {
      from: this.sanitize(oldValue),
      to: this.sanitize(newValue),
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getOrCreateComponentStats(component: string): ComponentStats {
    if (!this.componentStats.has(component)) {
      this.componentStats.set(component, {
        renderCount: 0,
        mountCount: 0,
        unmountCount: 0,
        lastRenderTime: 0,
        renderTimes: [],
        isCurrentlyMounted: false,
      });
    }
    return this.componentStats.get(component)!;
  }

  private getOrCreateFirestoreStats(collection: string): FirestoreQueryStats {
    if (!this.firestoreStats.has(collection)) {
      this.firestoreStats.set(collection, {
        collection,
        startCount: 0,
        successCount: 0,
        errorCount: 0,
        abortCount: 0,
        avgDuration: 0,
        durations: [],
      });
    }
    return this.firestoreStats.get(collection)!;
  }

  private sanitize(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'function') return '[Function]';
    if (obj instanceof Date) return obj.toISOString();
    
    try {
      return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof Date) return value.toISOString();
        if (key === 'password' || key === 'token' || key === 'secret') return '[REDACTED]';
        if (typeof value === 'object' && value !== null) {
          // Limiter la profondeur
          const keys = Object.keys(value);
          if (keys.length > 20) {
            return `[Object with ${keys.length} keys]`;
          }
        }
        return value;
      }));
    } catch {
      return '[Non-serializable]';
    }
  }

  // ==========================================================================
  // RAPPORTS
  // ==========================================================================

  getReport(): void {
    console.log('\n%c═══════════════════════════════════════════════════════════════', 'color: #3b82f6;');
    console.log('%c                    📊 RAPPORT DE DIAGNOSTIC                    ', 'font-size: 18px; font-weight: bold; color: #3b82f6;');
    console.log('%c═══════════════════════════════════════════════════════════════', 'color: #3b82f6;');

    // Stats composants
    console.log('\n%c📦 STATISTIQUES DES COMPOSANTS:', 'font-size: 14px; font-weight: bold;');
    console.table(
      Array.from(this.componentStats.entries()).map(([name, stats]) => ({
        Composant: name,
        Renders: stats.renderCount,
        Mounts: stats.mountCount,
        Unmounts: stats.unmountCount,
        'Monté?': stats.isCurrentlyMounted ? '✅' : '❌',
        'Problème?': stats.renderCount > 5 || stats.unmountCount > 1 ? '⚠️' : '✓',
      }))
    );

    // Stats Firestore
    console.log('\n%c🔥 STATISTIQUES FIRESTORE:', 'font-size: 14px; font-weight: bold;');
    console.table(
      Array.from(this.firestoreStats.entries()).map(([name, stats]) => ({
        Collection: name,
        Démarrées: stats.startCount,
        Réussies: stats.successCount,
        Erreurs: stats.errorCount,
        Annulées: stats.abortCount,
        'Durée moy.': `${Math.round(stats.avgDuration)}ms`,
        'Problème?': stats.abortCount > 0 || stats.errorCount > 0 ? '⚠️' : '✓',
      }))
    );

    // Auth changes
    console.log('\n%c🔐 CHANGEMENTS AUTH:', 'font-size: 14px; font-weight: bold;');
    console.table(
      this.authStateChanges.map((change, i) => ({
        '#': i + 1,
        Temps: `${change.time}ms`,
        User: change.user ? (change.user as any).uid : 'null',
        Role: change.user ? (change.user as any).role : '-',
        Loading: change.loading ? '⏳' : '✓',
      }))
    );

    // Problèmes détectés
    this.getProblems();
  }

  getProblems(): void {
    console.log('\n%c🚨 PROBLÈMES DÉTECTÉS:', 'font-size: 14px; font-weight: bold; color: #ef4444;');

    const problems: string[] = [];

    // Composants avec trop de renders
    this.componentStats.forEach((stats, name) => {
      if (stats.renderCount > 5) {
        problems.push(`❌ ${name}: ${stats.renderCount} renders (trop élevé)`);
      }
      if (stats.unmountCount > 1) {
        problems.push(`❌ ${name}: ${stats.unmountCount} unmounts (re-montage excessif)`);
      }
      if (stats.mountCount > stats.unmountCount + 1) {
        problems.push(`❌ ${name}: Déséquilibre mount/unmount`);
      }
    });

    // Firestore avec aborts
    this.firestoreStats.forEach((stats, collection) => {
      if (stats.abortCount > 0) {
        problems.push(`❌ Firestore ${collection}: ${stats.abortCount} requêtes annulées`);
      }
      if (stats.errorCount > 0) {
        problems.push(`❌ Firestore ${collection}: ${stats.errorCount} erreurs`);
      }
    });

    // Auth changes rapides
    for (let i = 1; i < this.authStateChanges.length; i++) {
      const gap = this.authStateChanges[i].time - this.authStateChanges[i - 1].time;
      if (gap < 200) {
        problems.push(`❌ Auth: Changements trop rapides (${gap}ms)`);
      }
    }

    if (problems.length === 0) {
      console.log('%c✅ Aucun problème majeur détecté', 'color: #22c55e;');
    } else {
      problems.forEach(p => console.log(`%c${p}`, 'color: #ef4444;'));
    }

    console.log('\n%c💡 RECOMMANDATIONS:', 'font-size: 14px; font-weight: bold; color: #f59e0b;');
    
    if ((this.componentStats.get('AdminLayout')?.renderCount ?? 0) > 3) {
      console.log('→ AdminLayout se re-rend trop. Vérifier les dépendances du contexte Auth.');
    }
    
    const totalAborts = Array.from(this.firestoreStats.values()).reduce((sum, s) => sum + s.abortCount, 0);
    if (totalAborts > 3) {
      console.log('→ Requêtes Firestore annulées. Probablement dû aux composants qui se démontent trop vite.');
      console.log('→ Solution: Désactiver React.StrictMode en dev OU stabiliser les effets.');
    }

    if (this.authStateChanges.length > 4) {
      console.log('→ Trop de changements Auth. Le contexte re-calcule trop souvent.');
    }
  }

  getTimeline(): void {
    console.log('\n%c📜 TIMELINE DES ÉVÉNEMENTS:', 'font-size: 14px; font-weight: bold;');
    
    this.events.slice(-50).forEach(event => {
      const style = this.styles[event.type];
      console.log(
        `%c${event.type.padEnd(10)}%c [${String(event.relativeTime).padStart(6)}ms] ${event.component} - ${event.action}`,
        style,
        'color: inherit;'
      );
    });
  }

  getFirestore(): void {
    console.log('\n%c🔥 DÉTAIL FIRESTORE:', 'font-size: 14px; font-weight: bold;');
    
    const firestoreEvents = this.events.filter(e => 
      e.type === 'FIRESTORE' || e.type === 'ABORT' || (e.type === 'ERROR' && e.component !== 'Global')
    );

    firestoreEvents.forEach(event => {
      const style = this.styles[event.type];
      console.log(
        `%c${event.type}%c [${event.relativeTime}ms] ${event.component} - ${event.action}`,
        style,
        'color: inherit;',
        event.data || ''
      );
    });
  }

  export(): string {
    const data = {
      duration: Date.now() - this.startTime,
      events: this.events,
      componentStats: Object.fromEntries(this.componentStats),
      firestoreStats: Object.fromEntries(this.firestoreStats),
      authStateChanges: this.authStateChanges,
      navigationHistory: this.navigationHistory,
    };
    
    const json = JSON.stringify(data, null, 2);
    console.log('%c📁 Export JSON copié dans le presse-papier', 'color: #22c55e;');
    
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(json);
    }
    
    return json;
  }

  reset(): void {
    this.events = [];
    this.startTime = Date.now();
    this.eventId = 0;
    this.componentStats.clear();
    this.firestoreStats.clear();
    this.activeQueries.clear();
    this.authStateChanges = [];
    this.navigationHistory = [];
    console.log('%c🔄 Debug system reset', 'color: #3b82f6;');
  }

  enable(): void {
    this.isEnabled = true;
    console.log('%c✅ Debug system enabled', 'color: #22c55e;');
  }

  disable(): void {
    this.isEnabled = false;
    console.log('%c⏸️ Debug system disabled', 'color: #f59e0b;');
  }
}

// =============================================================================
// INSTANCE SINGLETON
// =============================================================================

export const adminDebug = new AdminDebugSystem();

// Exposer globalement
if (typeof window !== 'undefined') {
  (window as any).adminDebug = adminDebug;
}

// =============================================================================
// HOOKS REACT POUR LE DEBUG
// =============================================================================

/**
 * Hook pour tracer le cycle de vie complet d'un composant
 */
export function useDebugLifecycle(componentName: string): void {
  const renderCount = useRef(0);
  const mountTime = useRef<number>(0);

  // Track render
  renderCount.current++;
  adminDebug.trackRender(componentName);

  useEffect(() => {
    mountTime.current = Date.now();
    adminDebug.trackMount(componentName);

    return () => {
      adminDebug.trackUnmount(componentName);
    };
  }, [componentName]);
}

/**
 * Hook pour tracer un effet spécifique
 */
export function useDebugEffect(
  componentName: string,
  effectName: string,
  effect: () => void | (() => void),
  deps: React.DependencyList
): void {
  useEffect(() => {
    adminDebug.trackEffect(componentName, effectName, 'setup', deps as unknown[]);
    
    const cleanup = effect();
    
    return () => {
      adminDebug.trackEffect(componentName, effectName, 'cleanup', deps as unknown[]);
      if (cleanup) cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook pour tracer les changements d'état
 */
export function useDebugState<T>(
  componentName: string,
  stateName: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(initialValue);
  const prevState = useRef<T>(initialValue);

  useEffect(() => {
    if (prevState.current !== state) {
      adminDebug.trackContextChange(componentName, stateName, prevState.current, state);
      prevState.current = state;
    }
  }, [componentName, stateName, state]);

  return [state, setState];
}

/**
 * Wrapper pour les requêtes Firestore
 */
export function wrapFirestoreQuery<T>(
  collection: string,
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const queryId = `${collection}-${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  adminDebug.trackFirestoreStart(collection, operation, queryId);
  
  return queryFn()
    .then((result) => {
      const count = Array.isArray(result) ? result.length : 1;
      adminDebug.trackFirestoreSuccess(collection, operation, queryId, count);
      return result;
    })
    .catch((error) => {
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        adminDebug.trackFirestoreAbort(collection, operation, queryId);
      } else {
        adminDebug.trackFirestoreError(collection, operation, queryId, error);
      }
      throw error;
    });
}

export default adminDebug;