import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking, BookingFormData } from './context/MobileBookingContext';
import { ProgressBar } from './ui/ProgressBar';
import { ProviderMiniCard } from './ui/ProviderMiniCard';
import { StickyCTA } from './ui/StickyCTA';
import { CelebrationOverlay } from './ui/CelebrationOverlay';
import { useSwipeNavigation } from './hooks/useSwipeNavigation';

// Step screens
import { Step1NameScreen } from './steps/Step1NameScreen';
import { Step2CountryScreen } from './steps/Step2CountryScreen';
import { Step3TitleScreen } from './steps/Step3TitleScreen';
import { Step4DescriptionScreen } from './steps/Step4DescriptionScreen';
import { Step5PhoneScreen } from './steps/Step5PhoneScreen';
import { Step6ConfirmScreen } from './steps/Step6ConfirmScreen';

interface MobileBookingWizardProps {
  onSubmit: (data: BookingFormData) => Promise<void>;
  onBack: () => void;
  className?: string;
}

const stepComponents: Record<number, React.FC> = {
  1: Step1NameScreen,
  2: Step2CountryScreen,
  3: Step3TitleScreen,
  4: Step4DescriptionScreen,
  5: Step5PhoneScreen,
  6: Step6ConfirmScreen,
};

export const MobileBookingWizard: React.FC<MobileBookingWizardProps> = ({
  onSubmit,
  onBack,
  className = '',
}) => {
  const intl = useIntl();
  const {
    form,
    currentStep,
    goNextStep,
    goBackStep,
    isCurrentStepValid,
    showCelebration,
    setShowCelebration,
    setIsSubmitting,
    triggerHaptic,
  } = useMobileBooking();

  const { handleSubmit } = form;

  // Swipe navigation
  const { containerRef } = useSwipeNavigation({
    onSwipeLeft: () => {
      if (isCurrentStepValid && currentStep < 6) {
        goNextStep();
      }
    },
    onSwipeRight: () => {
      if (currentStep > 1) {
        goBackStep();
      }
    },
    enabled: true,
  });

  // Handle form submission
  const handleFormSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const data = form.getValues();
      await onSubmit(data);

      // Show celebration
      triggerHaptic('success');
      setShowCelebration(true);
    } catch (error) {
      console.error('[MobileBookingWizard] Submit error:', error);
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onSubmit, setIsSubmitting, setShowCelebration, triggerHaptic]);

  // Handle back button
  const handleBack = () => {
    if (currentStep > 1) {
      goBackStep();
    } else {
      onBack();
    }
  };

  // Render current step
  const StepComponent = stepComponents[currentStep];

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-50 to-white ${className}`}>
      {/* Header with back button and progress */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="px-4 py-3">
          {/* Top row: back + title */}
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2.5 -ml-1 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all touch-manipulation"
              aria-label={intl.formatMessage({ id: 'common.back', defaultMessage: 'Retour' })}
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  {intl.formatMessage({
                    id: 'bookingRequest.heroTitle',
                    defaultMessage: 'Votre demande',
                  })}
                </span>
              </h1>
            </div>
          </div>

          {/* Progress bar */}
          <ProgressBar />
        </div>
      </header>

      {/* Provider mini card */}
      <div className="px-4 pt-4">
        <ProviderMiniCard />
      </div>

      {/* Step content with swipe container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[50vh] overflow-hidden"
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {StepComponent && <StepComponent />}
            </motion.div>
          </AnimatePresence>
        </form>
      </div>

      {/* Sticky CTA */}
      <StickyCTA onSubmit={handleFormSubmit} />

      {/* Celebration overlay */}
      <CelebrationOverlay
        show={showCelebration}
        message={intl.formatMessage({
          id: 'bookingRequest.mobile.success',
          defaultMessage: 'Demande envoyee !',
        })}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
};

export default MobileBookingWizard;
