import React, { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useMobileBooking, BookingFormData } from './context/MobileBookingContext';
import { ProgressBar } from './ui/ProgressBar';
import { StickyCTA } from './ui/StickyCTA';

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
}) => {
  const intl = useIntl();
  const {
    form,
    currentStep,
    goBackStep,
    setIsSubmitting,
    triggerHaptic,
  } = useMobileBooking();

  // Handle form submission
  const handleFormSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const data = form.getValues();
      console.log('[MobileBookingWizard] Submitting data:', data);
      await onSubmit(data);
      triggerHaptic('success');
    } catch (error) {
      console.error('[MobileBookingWizard] Submit error:', error);
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onSubmit, setIsSubmitting, triggerHaptic]);

  // Handle back button
  const handleBack = () => {
    if (currentStep > 1) {
      goBackStep();
    } else {
      onBack();
    }
  };

  const StepComponent = stepComponents[currentStep];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
              aria-label={intl.formatMessage({ id: 'common.back', defaultMessage: 'Retour' })}
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {intl.formatMessage({ id: 'bookingRequest.heroTitle', defaultMessage: 'Votre demande' })}
            </h1>
          </div>
          <ProgressBar />
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1">
        {StepComponent && <StepComponent />}
      </div>

      {/* Sticky CTA */}
      <StickyCTA onSubmit={handleFormSubmit} />
    </div>
  );
};

export default MobileBookingWizard;
