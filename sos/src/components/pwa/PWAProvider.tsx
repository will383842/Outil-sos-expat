// src/components/pwa/PWAProvider.tsx
/**
 * PWA Provider Component
 *
 * Integrates all PWA functionality into the app:
 * - Install banner (Android/Desktop)
 * - iOS install instructions
 * - Offline storage initialization
 * - Badge updates from notifications
 * - Service Worker update notifications
 */

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useIntl } from 'react-intl';
import InstallBanner from '../common/InstallBanner';
import IOSInstallInstructions from '../common/IOSInstallInstructions';
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
  /** Show install banner */
  showInstallBanner?: boolean;
  /** Show iOS instructions */
  showIOSInstructions?: boolean;
  /** Enable offline storage */
  enableOfflineStorage?: boolean;
  /** Enable badge updates */
  enableBadging?: boolean;
}

const PWAProvider: React.FC<PWAProviderProps> = ({
  children,
  showInstallBanner = true,
  showIOSInstructions = true,
  enableOfflineStorage = true,
  enableBadging = true,
}) => {
  const intl = useIntl();
  const { canPrompt, installed, install } = usePWAInstall();
  const { updateBadge } = useBadging();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Badge updates
  useEffect(() => {
    if (enableBadging && installed) {
      updateBadge(unreadCount);
    }
  }, [unreadCount, enableBadging, installed, updateBadge]);

  // iOS detection for instructions
  useEffect(() => {
    if (showIOSInstructions && !installed) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches;

      if (isIOS && !isStandalone) {
        // Show iOS instructions after delay
        const timer = setTimeout(() => setShowIOSPrompt(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [showIOSInstructions, installed]);

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

      {/* Install Banner - Android/Desktop */}
      {showInstallBanner && !installed && <InstallBanner />}

      {/* iOS Install Instructions */}
      {showIOSPrompt && (
        <IOSInstallInstructions onClose={() => setShowIOSPrompt(false)} />
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-sm font-medium z-[100] safe-area-inset-bottom">
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
