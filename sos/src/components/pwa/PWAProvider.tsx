// src/components/pwa/PWAProvider.tsx
/**
 * PWA Provider Component
 *
 * Integrates all PWA functionality into the app:
 * - Install banner (Android/Desktop/iOS) - managed in Layout.tsx
 * - Offline storage initialization
 * - Badge updates from notifications
 * - Service Worker update notifications
 * - Online/offline status tracking
 */

import React, { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';
import { useIntl } from 'react-intl';
// InstallBanner (unified for all platforms) is managed in Layout.tsx
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useBadging } from '@/hooks/useBadging';
import { initOfflineStorage, requestPersistentStorage } from '@/services/offlineStorage';

// Context for PWA state
interface PWAContextValue {
  isInstalled: boolean;
  isOnline: boolean;
  canInstall: boolean;
  triggerInstall: () => Promise<void>;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const PWAContext = createContext<PWAContextValue | null>(null);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
};

interface PWAProviderProps {
  children: React.ReactNode;
  /** Enable offline storage */
  enableOfflineStorage?: boolean;
  /** Enable badge updates */
  enableBadging?: boolean;
}

const PWAProvider: React.FC<PWAProviderProps> = ({
  children,
  enableOfflineStorage = true,
  enableBadging = true,
}) => {
  const intl = useIntl();
  const { canPrompt, installed, install } = usePWAInstall();
  const { updateBadge } = useBadging();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const updateDismissed = useRef(false);

  // Initialize offline storage
  useEffect(() => {
    if (enableOfflineStorage) {
      initOfflineStorage()
        .then(() => {
          console.log('[PWA] Offline storage initialized');
          // Request persistent storage
          return requestPersistentStorage();
        })
        .then((persisted) => {
          if (persisted) {
            console.log('[PWA] Persistent storage granted');
          }
        })
        .catch(console.error);
    }
  }, [enableOfflineStorage]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[PWA] App is online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[PWA] App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker update detection
  useEffect(() => {
    const handleSWUpdate = () => {
      if (!updateDismissed.current) {
        setShowUpdateBanner(true);
      }
    };
    window.addEventListener('sw-update-available', handleSWUpdate);
    return () => window.removeEventListener('sw-update-available', handleSWUpdate);
  }, []);

  const handleUpdateRefresh = useCallback(() => {
    setShowUpdateBanner(false);
    window.location.reload();
  }, []);

  const handleUpdateDismiss = useCallback(() => {
    setShowUpdateBanner(false);
    updateDismissed.current = true;
  }, []);

  // Badge updates
  useEffect(() => {
    if (enableBadging && installed) {
      updateBadge(unreadCount);
    }
  }, [unreadCount, enableBadging, installed, updateBadge]);

  // Note: iOS install instructions are now handled by InstallBanner component

  // Trigger install
  const triggerInstall = useCallback(async () => {
    if (canPrompt) {
      await install();
    }
  }, [canPrompt, install]);

  // Context value
  const contextValue: PWAContextValue = {
    isInstalled: installed,
    isOnline,
    canInstall: canPrompt,
    triggerInstall,
    unreadCount,
    setUnreadCount,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}

      {/* Install Banner (all platforms) is managed in Layout.tsx */}

      {/* SW Update banner */}
      {showUpdateBanner && (
        <div
          className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-3 z-[200] shadow-lg"
          style={{ paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))' }}
          role="alert"
        >
          <div className="flex items-center justify-center gap-3 px-4">
            <span className="text-sm font-medium">
              {intl.formatMessage({ id: 'pwa.update.available', defaultMessage: 'Nouvelle version disponible' })}
            </span>
            <button
              onClick={handleUpdateRefresh}
              className="px-3 py-1 bg-white text-blue-600 rounded-lg text-sm font-bold touch-manipulation"
            >
              {intl.formatMessage({ id: 'pwa.update.refresh', defaultMessage: 'Actualiser' })}
            </button>
            <button
              onClick={handleUpdateDismiss}
              className="text-white/80 hover:text-white text-lg leading-none touch-manipulation"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-sm font-medium z-[100]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {intl.formatMessage({ id: 'pwa.offline.message' })}
          </span>
        </div>
      )}
    </PWAContext.Provider>
  );
};

export default PWAProvider;
