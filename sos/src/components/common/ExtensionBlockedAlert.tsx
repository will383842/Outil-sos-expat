// src/components/common/ExtensionBlockedAlert.tsx
// Composant élégant pour alerter l'utilisateur d'un blocage par extension

import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { AlertTriangle, Shield, X, ExternalLink, RefreshCw } from 'lucide-react';

interface ExtensionBlockedAlertProps {
  onDismiss?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const ExtensionBlockedAlert: React.FC<ExtensionBlockedAlertProps> = ({
  onDismiss,
  onRetry,
  isRetrying = false,
}) => {
  const intl = useIntl();
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Animation d'entrée
  const [isAnimated, setIsAnimated] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  if (!isVisible) return null;

  const steps = [
    {
      icon: '🔒',
      key: 'extension.blocked.step1',
      fallback: 'Essayez en mode Navigation Privée (Ctrl+Shift+N)',
    },
    {
      icon: '🛡️',
      key: 'extension.blocked.step2',
      fallback: 'Désactivez temporairement votre antivirus web',
    },
    {
      icon: '🚫',
      key: 'extension.blocked.step3',
      fallback: 'Désactivez les bloqueurs de publicités pour ce site',
    },
    {
      icon: '✅',
      key: 'extension.blocked.step4',
      fallback: 'Ajoutez ce site à la liste blanche de votre antivirus',
    },
  ];

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black/60 backdrop-blur-sm
        transition-all duration-300
        ${isAnimated ? 'opacity-100' : 'opacity-0'}
      `}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="extension-alert-title"
      aria-describedby="extension-alert-desc"
    >
      <div
        className={`
          relative w-full max-w-lg
          bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900
          rounded-2xl shadow-2xl border border-amber-500/30
          overflow-hidden
          transition-all duration-300
          ${isAnimated ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
      >
        {/* Barre décorative en haut */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

        {/* Bouton fermer */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={intl.formatMessage({ id: 'common.close', defaultMessage: 'Fermer' })}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-6">
          {/* Icône et titre */}
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 id="extension-alert-title" className="text-lg font-bold text-white mb-1">
                {intl.formatMessage({
                  id: 'extension.blocked.title',
                  defaultMessage: 'Problème de connexion détecté',
                })}
              </h2>
              <p id="extension-alert-desc" className="text-sm text-gray-300">
                {intl.formatMessage({
                  id: 'extension.blocked.description',
                  defaultMessage: 'Une extension de navigateur semble bloquer la connexion à nos serveurs.',
                })}
              </p>
            </div>
          </div>

          {/* Message principal */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200">
                {intl.formatMessage({
                  id: 'extension.blocked.cause',
                  defaultMessage: 'Ceci est généralement causé par un antivirus (Avast, Norton, Kaspersky) ou un bloqueur de publicités.',
                })}
              </p>
            </div>
          </div>

          {/* Bouton pour afficher les solutions */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors mb-4"
          >
            <span className="text-sm font-medium text-white">
              {intl.formatMessage({
                id: 'extension.blocked.showSolutions',
                defaultMessage: 'Voir les solutions',
              })}
            </span>
            <span className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {/* Solutions détaillées */}
          {showDetails && (
            <div className="space-y-2 mb-4 animate-fadeIn">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
                >
                  <span className="text-lg flex-shrink-0">{step.icon}</span>
                  <span className="text-sm text-gray-300">
                    {intl.formatMessage({ id: step.key, defaultMessage: step.fallback })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4
                  rounded-xl font-semibold text-sm
                  transition-all duration-200
                  ${isRetrying
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg'
                  }
                `}
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying
                  ? intl.formatMessage({ id: 'common.retrying', defaultMessage: 'Nouvelle tentative...' })
                  : intl.formatMessage({ id: 'common.retry', defaultMessage: 'Réessayer' })
                }
              </button>
            )}

            <a
              href="https://support.google.com/chrome/answer/95464"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-sm text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {intl.formatMessage({
                id: 'extension.blocked.privateMode',
                defaultMessage: 'Mode privé',
              })}
            </a>
          </div>

          {/* Note de bas de page */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            {intl.formatMessage({
              id: 'extension.blocked.note',
              defaultMessage: 'Cette alerte apparaît uniquement en cas de problème de connexion.',
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExtensionBlockedAlert;
