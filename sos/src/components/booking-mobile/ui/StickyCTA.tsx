import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Euro, Loader2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';

interface StickyCTAProps {
  onSubmit: () => void;
  className?: string;
}

export const StickyCTA: React.FC<StickyCTAProps> = ({ onSubmit, className = '' }) => {
  const intl = useIntl();
  const {
    currentStep,
    totalSteps,
    goNextStep,
    goBackStep,
    isCurrentStepValid,
    isSubmitting,
    displayEUR,
    triggerHaptic,
  } = useMobileBooking();

  const isLastStep = currentStep === totalSteps;

  const handleNext = () => {
    if (!isCurrentStepValid || isSubmitting) return;

    if (isLastStep) {
      triggerHaptic('medium');
      onSubmit();
    } else {
      goNextStep();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goBackStep();
    }
  };

  return (
    <div
      className={`
        fixed bottom-0 inset-x-0 z-50
        bg-white/95 backdrop-blur-xl
        border-t border-gray-100
        shadow-[0_-4px_20px_rgba(0,0,0,0.08)]
        ${className}
      `}
      style={{
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="p-4 flex gap-3 max-w-lg mx-auto">
        {/* Back button */}
        <AnimatePresence>
          {currentStep > 1 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              onClick={handleBack}
              className="
                px-4 py-4 rounded-2xl
                border-2 border-gray-200
                text-gray-700 font-semibold text-lg
                flex items-center justify-center gap-1
                touch-manipulation
                hover:bg-gray-50 active:scale-[0.97]
                transition-all duration-150
                min-h-[60px] min-w-[60px]
              "
              aria-label={intl.formatMessage({ id: 'common.back', defaultMessage: 'Retour' })}
            >
              <ChevronLeft size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Next/Submit button */}
        <motion.button
          type="button"
          onClick={handleNext}
          disabled={!isCurrentStepValid || isSubmitting}
          whileTap={isCurrentStepValid && !isSubmitting ? { scale: 0.97 } : {}}
          className={`
            flex-1 py-4 px-4 rounded-2xl
            font-bold text-lg text-white
            flex items-center justify-center gap-2
            touch-manipulation
            transition-all duration-200
            min-h-[60px]
            ${
              isCurrentStepValid && !isSubmitting
                ? 'bg-gradient-to-r from-red-500 via-orange-500 to-rose-500 shadow-lg shadow-red-500/30'
                : 'bg-gray-300 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>
                {intl.formatMessage({
                  id: 'bookingRequest.processing',
                  defaultMessage: 'Traitement...',
                })}
              </span>
            </>
          ) : isLastStep ? (
            <>
              <Euro size={20} />
              <span>
                {intl.formatMessage({
                  id: 'bookingRequest.continuePay',
                  defaultMessage: 'Continuer',
                })}
              </span>
              <span className="font-extrabold">
                {displayEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              </span>
            </>
          ) : (
            <>
              <span>
                {intl.formatMessage({
                  id: 'common.next',
                  defaultMessage: 'Suivant',
                })}
              </span>
              <ChevronRight size={20} />
            </>
          )}
        </motion.button>
      </div>

      {/* Validation hint when not valid */}
      <AnimatePresence>
        {!isCurrentStepValid && !isSubmitting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2 max-w-lg mx-auto"
          >
            <p className="text-center text-xs text-gray-500">
              {intl.formatMessage({
                id: 'bookingRequest.mobile.completeField',
                defaultMessage: 'Completez ce champ pour continuer',
              })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StickyCTA;
