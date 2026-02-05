import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Euro, Loader2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking } from '../context/MobileBookingContext';

interface StickyCTAProps {
  onSubmit: () => void;
}

export const StickyCTA: React.FC<StickyCTAProps> = ({ onSubmit }) => {
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
  const ctaRef = useRef<HTMLDivElement>(null);

  // Position CTA above keyboard using direct DOM manipulation (no React re-renders)
  // This gives pixel-perfect tracking without lag from setState batching
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      if (!ctaRef.current) return;
      const keyboardHeight = window.innerHeight - viewport.height;
      const offset = keyboardHeight > 50 ? keyboardHeight : 0;
      ctaRef.current.style.bottom = `${offset}px`;
      ctaRef.current.style.paddingBottom = offset > 0 ? '0px' : 'env(safe-area-inset-bottom, 0px)';
    };

    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  const handleNext = () => {
    if (!isCurrentStepValid || isSubmitting) return;

    // Blur active input to cleanly dismiss keyboard before transitioning
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isLastStep) {
      triggerHaptic('medium');
      onSubmit();
    } else {
      goNextStep();
    }
  };

  const handleBack = () => {
    // Blur active input to cleanly dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (currentStep > 1) {
      goBackStep();
    }
  };

  return (
    <div
      ref={ctaRef}
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="p-3 flex gap-2">
        {/* Back button */}
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium flex items-center justify-center touch-manipulation active:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Next/Submit button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!isCurrentStepValid || isSubmitting}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 touch-manipulation ${
            isCurrentStepValid && !isSubmitting
              ? 'bg-orange-500 active:bg-orange-600 shadow-lg shadow-orange-500/30'
              : 'bg-gray-300'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{intl.formatMessage({ id: 'bookingRequest.processing' })}</span>
            </>
          ) : isLastStep ? (
            <>
              <Euro size={18} />
              <span>{intl.formatMessage({ id: 'bookingRequest.continuePay' })}</span>
              <span className="font-bold">{displayEUR.toFixed(2)}€</span>
            </>
          ) : (
            <>
              <span>{intl.formatMessage({ id: 'common.next', defaultMessage: 'Suivant' })}</span>
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StickyCTA;
