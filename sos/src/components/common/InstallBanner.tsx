// src/components/common/InstallBanner.tsx
import React, { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { useIntl } from 'react-intl';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * Snackbar PWA discret — bas droite, minimaliste
 * - S'affiche uniquement si canInstall && shouldShowBanner
 * - Auto-dismiss après 8 secondes
 * - Design: fond blanc, bordure gauche rouge SOS
 */
const InstallBanner: React.FC = () => {
  const intl = useIntl();
  const { canPrompt, shouldShowBanner, install, closeForAWhile } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const shouldShow = canPrompt && shouldShowBanner;

  // Animation d'entrée avec délai
  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  // Auto-dismiss après 8 secondes
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => handleClose(), 8000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeForAWhile();
      setIsVisible(false);
      setIsClosing(false);
    }, 200);
  };

  const handleInstall = async () => {
    try {
      await install();
      handleClose();
    } catch {
      // Silently fail
    }
  };

  if (!shouldShow || !isVisible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-xs transition-all duration-300 ${
        isClosing ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 bg-white rounded-xl shadow-lg border-l-4 border-red-500 p-4">
        <Smartphone className="w-5 h-5 text-red-500 shrink-0" />
        <span className="text-sm text-gray-700 font-medium">
          {intl.formatMessage({ id: 'pwa.install.toast' })}
        </span>
        <button
          type="button"
          onClick={handleInstall}
          className="ml-auto px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {intl.formatMessage({ id: 'pwa.install.button' })}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label={intl.formatMessage({ id: 'pwa.install.close' })}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;
