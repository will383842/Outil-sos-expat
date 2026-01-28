import React, { useEffect, useState } from 'react';
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

  // Detect if keyboard is open to hide CTA
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Use visualViewport API to detect keyboard
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // If viewport height is significantly less than window height, keyboard is open
      const keyboardOpen = viewport.height < window.innerHeight * 0.75;
      setIsKeyboardOpen(keyboardOpen);
    };

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

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

  // Hide CTA when keyboard is open
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <div
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
              ? 'bg-red-500 active:bg-red-600'
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
