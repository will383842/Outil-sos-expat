// src/components/common/IOSInstallInstructions.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, Share } from 'lucide-react';
import { useIntl } from 'react-intl';

/**
 * Toast iOS ultra-simple — 1 phrase d'instruction
 * - Uniquement sur iOS Safari
 * - Design minimaliste et non-intrusif
 */

const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua);
  const notFirefox = !/FxiOS/.test(ua);
  return iOS && webkit && notChrome && notFirefox;
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean })?.standalone === true
  );
};

const STORAGE_KEY = 'ios_install_dismissed_at';
const DISMISS_DAYS = 1;

interface IOSInstallInstructionsProps {
  onClose?: () => void;
}

const IOSInstallInstructions: React.FC<IOSInstallInstructionsProps> = ({ onClose }) => {
  const intl = useIntl();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isIOSSafari() || isStandalone()) return;

    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setIsVisible(false);
      setIsClosing(false);
      onClose?.();
    }, 200);
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-sm transition-all duration-300 ${
        isClosing ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg p-4">
        <div className="shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <Share className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-sm text-gray-700 flex-1">
          {intl.formatMessage(
            { id: 'pwa.ios.toast' },
            {
              share: <strong key="share" className="text-gray-900">{intl.formatMessage({ id: 'pwa.ios.share' })}</strong>,
              addHome: <strong key="add" className="text-gray-900">{intl.formatMessage({ id: 'pwa.ios.addHome' })}</strong>
            }
          )}
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label={intl.formatMessage({ id: 'pwa.install.close' })}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default IOSInstallInstructions;
