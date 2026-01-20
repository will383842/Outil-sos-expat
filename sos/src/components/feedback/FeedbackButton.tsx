// src/components/feedback/FeedbackButton.tsx
// Bouton de feedback flottant adaptatif (mobile-first)
import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useIntl } from 'react-intl';
import FeedbackModal from './FeedbackModal';

interface FeedbackButtonProps {
  /** Position du bouton */
  position?: 'bottom-right' | 'bottom-left';
  /** Cacher sur certaines pages (ex: admin) */
  hidden?: boolean;
  /** Contexte de page pour pré-remplissage */
  pageContext?: string;
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  position = 'bottom-right',
  hidden = false,
  pageContext,
}) => {
  const { isMobile, isTablet } = useDeviceDetection();
  const intl = useIntl();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Arrêter le pulse après 30 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPulse(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  // Ne pas afficher si hidden
  if (hidden) return null;

  const positionClasses = {
    'bottom-right': 'right-4 sm:right-6',
    'bottom-left': 'left-4 sm:left-6',
  };

  const handleOpen = () => {
    setIsModalOpen(true);
    setShowPulse(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Version mobile : bouton FAB compact
  if (isMobile || isTablet) {
    return (
      <>
        {/* Bouton FAB mobile */}
        <div
          className={`fixed bottom-20 ${positionClasses[position]} z-40 flex flex-col items-end gap-2`}
        >
          {/* Bouton principal */}
          <button
            onClick={handleOpen}
            className={`
              flex items-center justify-center
              w-12 h-12 sm:w-14 sm:h-14
              bg-gradient-to-r from-red-600 to-red-700
              hover:from-red-700 hover:to-red-800
              text-white rounded-full shadow-lg
              transition-all duration-300 ease-out
              active:scale-95
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              ${showPulse ? 'animate-pulse' : ''}
            `}
            aria-label={intl.formatMessage({ id: 'feedback.button.label', defaultMessage: 'Signaler un problème' })}
          >
            <MessageSquarePlus size={22} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Modal */}
        <FeedbackModal
          isOpen={isModalOpen}
          onClose={handleClose}
          pageContext={pageContext}
        />
      </>
    );
  }

  // Version desktop : bouton avec label
  return (
    <>
      <div
        className={`fixed bottom-6 ${positionClasses[position]} z-40`}
      >
        {isMinimized ? (
          // Version minimisée
          <button
            onClick={handleMinimize}
            className={`
              flex items-center justify-center
              w-12 h-12
              bg-gradient-to-r from-red-600 to-red-700
              hover:from-red-700 hover:to-red-800
              text-white rounded-full shadow-lg
              transition-all duration-300 ease-out
              hover:scale-105
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              ${showPulse ? 'animate-pulse' : ''}
            `}
            aria-label={intl.formatMessage({ id: 'feedback.button.expand', defaultMessage: 'Afficher le bouton de feedback' })}
          >
            <MessageSquarePlus size={20} />
          </button>
        ) : (
          // Version complète avec label
          <div className="flex items-center gap-2">
            {/* Bouton de minimisation */}
            <button
              onClick={handleMinimize}
              className="
                w-6 h-6 flex items-center justify-center
                bg-gray-200 hover:bg-gray-300
                text-gray-600 rounded-full
                transition-colors duration-200
                opacity-0 group-hover:opacity-100
              "
              aria-label={intl.formatMessage({ id: 'feedback.button.minimize', defaultMessage: 'Réduire' })}
            >
              <X size={14} />
            </button>

            {/* Bouton principal */}
            <button
              onClick={handleOpen}
              className={`
                group flex items-center gap-2
                px-4 py-3
                bg-gradient-to-r from-red-600 to-red-700
                hover:from-red-700 hover:to-red-800
                text-white rounded-full shadow-lg
                transition-all duration-300 ease-out
                hover:shadow-xl hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                ${showPulse ? 'animate-pulse' : ''}
              `}
              aria-label={intl.formatMessage({ id: 'feedback.button.label', defaultMessage: 'Signaler un problème' })}
            >
              <MessageSquarePlus size={20} className="flex-shrink-0" />
              <span className="font-medium text-sm whitespace-nowrap">
                {intl.formatMessage({ id: 'feedback.button.text', defaultMessage: 'Un problème ?' })}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={handleClose}
        pageContext={pageContext}
      />
    </>
  );
};

export default FeedbackButton;
