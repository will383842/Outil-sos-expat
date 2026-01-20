// src/components/feedback/FeedbackModal.tsx
// Modal de feedback avec formulaire complet
import React, { useEffect, useRef, useId } from 'react';
import { X, Monitor, Smartphone, Globe, Clock } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import FeedbackForm from './FeedbackForm';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageContext?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  pageContext,
}) => {
  const intl = useIntl();
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { isMobile, isTablet, breakpoint, isIOS, isAndroid } = useDeviceDetection();

  // Focus trap et restauration du focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Informations de contexte pour l'utilisateur
  const deviceIcon = isMobile ? Smartphone : Monitor;
  const deviceLabel = isMobile
    ? intl.formatMessage({ id: 'feedback.device.mobile', defaultMessage: 'Mobile' })
    : isTablet
      ? intl.formatMessage({ id: 'feedback.device.tablet', defaultMessage: 'Tablette' })
      : intl.formatMessage({ id: 'feedback.device.desktop', defaultMessage: 'Ordinateur' });

  const osLabel = isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop';
  const currentPage = window.location.pathname;
  const timestamp = new Date().toLocaleString(intl.locale);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`
          bg-white w-full
          ${isMobile || isTablet
            ? 'rounded-t-2xl max-h-[90vh]'
            : 'rounded-2xl max-w-lg max-h-[85vh]'
          }
          overflow-hidden shadow-2xl
          focus:outline-none
          animate-in slide-in-from-bottom duration-300
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
          <div>
            <h2
              id={titleId}
              className="text-lg sm:text-xl font-semibold text-gray-900"
            >
              {intl.formatMessage({ id: 'feedback.modal.title', defaultMessage: 'Signaler un problème' })}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {intl.formatMessage({ id: 'feedback.modal.subtitle', defaultMessage: 'Aidez-nous à améliorer votre expérience' })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={intl.formatMessage({ id: 'feedback.modal.close', defaultMessage: 'Fermer' })}
            className="
              p-2 rounded-full
              text-gray-400 hover:text-gray-600 hover:bg-gray-100
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-red-500
            "
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] sm:max-h-[calc(85vh-200px)]">
          {/* Formulaire */}
          <div className="p-4 sm:p-5">
            <FeedbackForm
              onClose={onClose}
              pageContext={pageContext}
            />
          </div>
        </div>

        {/* Footer avec infos contextuelles */}
        <div className="px-4 sm:px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              {React.createElement(deviceIcon, { size: 14 })}
              <span>{deviceLabel} ({osLabel})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe size={14} />
              <span className="truncate max-w-[150px]" title={currentPage}>
                {currentPage}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{timestamp}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {intl.formatMessage({
              id: 'feedback.modal.privacy',
              defaultMessage: 'Ces informations nous aident à reproduire et corriger le problème.'
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
