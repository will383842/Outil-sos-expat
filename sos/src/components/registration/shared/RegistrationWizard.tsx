import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import type { ThemeTokens } from './theme';
import StepProgressBar from './StepProgressBar';
import { useIntl, FormattedMessage } from 'react-intl';

interface WizardStep {
  label: string;
  content: React.ReactNode;
  validate: () => boolean;
}

interface RegistrationWizardProps {
  theme: ThemeTokens;
  steps: WizardStep[];
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  canSubmit: boolean;
  generalError?: string;
  botError?: string;
  // Honeypot
  honeypotValue: string;
  setHoneypotValue: (v: string) => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

const RegistrationWizard: React.FC<RegistrationWizardProps> = ({
  theme,
  steps,
  onSubmit,
  isSubmitting,
  canSubmit,
  generalError,
  botError,
  honeypotValue,
  setHoneypotValue,
}) => {
  const intl = useIntl();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [stepErrors, setStepErrors] = useState<Record<number, boolean>>({});
  const stepContentRef = useRef<HTMLDivElement>(null);

  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps;
  const currentStepData = steps[currentStep - 1];

  // Focus management: move focus to step content area after transition
  useEffect(() => {
    if (stepContentRef.current) {
      // Small delay to let animation complete
      const timer = setTimeout(() => {
        const firstInput = stepContentRef.current?.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([tabindex="-1"]), textarea, button[role="combobox"], select'
        );
        if (firstInput) {
          firstInput.focus({ preventScroll: true });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const goNext = useCallback(() => {
    if (!currentStepData.validate()) {
      setStepErrors(prev => ({ ...prev, [currentStep]: true }));
      return;
    }
    setStepErrors(prev => ({ ...prev, [currentStep]: false }));
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, currentStepData, totalSteps]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLastStep) {
      goNext();
      return;
    }
    // Last step - run final validation and submit
    if (!currentStepData.validate()) {
      setStepErrors(prev => ({ ...prev, [currentStep]: true }));
      return;
    }
    await onSubmit();
  }, [isLastStep, goNext, currentStepData, currentStep, onSubmit]);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Honeypot */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          opacity: 0,
          height: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <label htmlFor="website_url">Website URL (leave empty)</label>
        <input
          type="text"
          id="website_url"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          value={honeypotValue}
          onChange={(e) => setHoneypotValue(e.target.value)}
        />
        <label htmlFor="phone_confirm">Phone Confirm (leave empty)</label>
        <input
          type="text"
          id="phone_confirm"
          name="phone_confirm"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* General error / bot error */}
      {(generalError || botError) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-medium text-red-400">{botError || generalError}</p>
        </motion.div>
      )}

      {/* Progress bar */}
      <StepProgressBar
        theme={theme}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabels={steps.map(s => s.label)}
      />

      {/* Step content with slide animation */}
      {/* overflow-x: clip prevents horizontal slide overflow; overflow-y: visible lets phone dropdown escape */}
      <div className="relative z-50 min-h-[300px]" style={{ overflowX: 'clip', overflowY: 'visible' }} ref={stepContentRef}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg">
              {currentStepData.content}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step error feedback */}
      {stepErrors[currentStep] && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-400 text-center font-medium"
          role="alert"
        >
          <FormattedMessage id="common.fixErrors" defaultMessage="Please fix the errors above before continuing." />
        </motion.p>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={goPrev}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-semibold hover:bg-white/10 transition-all min-h-[48px]"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <FormattedMessage id="common.back" defaultMessage="Back" />
          </button>
        ) : (
          <div />
        )}

        {isLastStep ? (
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className={`
              flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl
              font-bold text-white text-base min-h-[48px]
              transition-all duration-200 shadow-lg
              ${canSubmit && !isSubmitting
                ? `bg-gradient-to-r ${theme.accentGradient} hover:opacity-90 hover:shadow-xl active:scale-[0.98]`
                : 'bg-gray-700 cursor-not-allowed opacity-60'
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <FormattedMessage id="common.loading" defaultMessage="Loading..." />
              </>
            ) : (
              <>
                <FormattedMessage id="common.createAccount" defaultMessage="Create Account" />
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </>
            )}
          </button>
        ) : (
          <button
            type="submit"
            className={`
              flex items-center gap-2 px-8 py-3.5 rounded-2xl
              font-bold text-white text-base min-h-[48px]
              bg-gradient-to-r ${theme.accentGradient}
              hover:opacity-90 hover:shadow-xl active:scale-[0.98]
              transition-all duration-200 shadow-lg
            `}
          >
            <FormattedMessage id="common.next" defaultMessage="Next" />
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
};

export default RegistrationWizard;
