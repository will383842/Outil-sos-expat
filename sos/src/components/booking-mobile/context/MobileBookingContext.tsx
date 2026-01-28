import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import type { Provider } from '@/types/provider';

// Types
export interface BookingFormData {
  firstName: string;
  lastName: string;
  nationality: string;
  currentCountry: string;
  autrePays?: string;
  title: string;
  description: string;
  clientPhone: string;
  acceptTerms: boolean;
  clientLanguages: string[];
}

export type AnimationDirection = 'forward' | 'backward';

export interface MobileBookingContextValue {
  // Form
  form: UseFormReturn<BookingFormData>;

  // Step navigation
  currentStep: number;
  totalSteps: number;
  animationDirection: AnimationDirection;
  goToStep: (step: number) => void;
  goNextStep: () => void;
  goBackStep: () => void;

  // Validation
  isCurrentStepValid: boolean;
  getStepValidationStatus: (step: number) => boolean;

  // Provider
  provider: Provider | null;
  setProvider: (provider: Provider | null) => void;
  isLawyer: boolean;

  // Pricing
  displayEUR: number;
  displayDuration: number;
  setDisplayEUR: (price: number) => void;
  setDisplayDuration: (duration: number) => void;

  // UI State
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  showCelebration: boolean;
  setShowCelebration: (value: boolean) => void;

  // Haptic feedback
  triggerHaptic: (type: 'light' | 'medium' | 'success' | 'error') => void;

  // Languages
  languagesSpoken: Array<{ code: string; name: string; nativeName?: string }>;
  setLanguagesSpoken: (langs: Array<{ code: string; name: string; nativeName?: string }>) => void;
  hasLanguageMatch: boolean;
  setHasLanguageMatch: (match: boolean) => void;
}

const MobileBookingContext = createContext<MobileBookingContextValue | null>(null);

export const TOTAL_STEPS = 6;

// Step validation rules
const STEP_FIELDS: Record<number, (keyof BookingFormData)[]> = {
  1: ['firstName', 'lastName'],
  2: ['currentCountry'],
  3: ['title'],
  4: ['description'],
  5: ['clientPhone'],
  6: ['acceptTerms'],
};

interface MobileBookingProviderProps {
  children: React.ReactNode;
  defaultValues?: Partial<BookingFormData>;
}

export const MobileBookingProvider: React.FC<MobileBookingProviderProps> = ({
  children,
  defaultValues = {},
}) => {
  // Form setup
  const form = useForm<BookingFormData>({
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      nationality: '',
      currentCountry: '',
      autrePays: '',
      title: '',
      description: '',
      clientPhone: '',
      acceptTerms: false,
      clientLanguages: [],
      ...defaultValues,
    },
  });

  const { watch, formState: { errors } } = form;
  const watched = watch();

  // Step navigation state
  const [currentStep, setCurrentStep] = useState(1);
  const [animationDirection, setAnimationDirection] = useState<AnimationDirection>('forward');

  // Provider state
  const [provider, setProvider] = useState<Provider | null>(null);

  // Pricing state
  const [displayEUR, setDisplayEUR] = useState(49);
  const [displayDuration, setDisplayDuration] = useState(20);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Languages state
  const [languagesSpoken, setLanguagesSpoken] = useState<Array<{ code: string; name: string; nativeName?: string }>>([]);
  const [hasLanguageMatch, setHasLanguageMatch] = useState(true);

  // Derived state
  const isLawyer = provider?.type === 'lawyer' || provider?.role === 'lawyer';

  // Haptic feedback
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' | 'error') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 10,
        medium: 25,
        success: [10, 50, 10, 50, 30],
        error: [50, 30, 50],
      };
      try {
        navigator.vibrate(patterns[type]);
      } catch {
        // Vibration not supported
      }
    }
  }, []);

  // Validation logic
  const getStepValidationStatus = useCallback((step: number): boolean => {
    const values = watched;

    switch (step) {
      case 1: // Name
        return Boolean(values.firstName?.trim()) && Boolean(values.lastName?.trim());

      case 2: // Country
        const hasCountry = Boolean(values.currentCountry?.trim());
        const otherOk = values.currentCountry !== 'Autre' || Boolean(values.autrePays?.trim());
        return hasCountry && otherOk;

      case 3: // Title
        return (values.title?.trim().length ?? 0) >= 10;

      case 4: // Description
        return (values.description?.trim().length ?? 0) >= 50;

      case 5: // Phone
        if (!values.clientPhone) return false;
        // Basic E.164 validation
        return /^\+[1-9]\d{6,14}$/.test(values.clientPhone);

      case 6: // Terms
        return Boolean(values.acceptTerms);

      default:
        return false;
    }
  }, [watched]);

  const isCurrentStepValid = useMemo(() => {
    return getStepValidationStatus(currentStep);
  }, [currentStep, getStepValidationStatus]);

  // Navigation functions
  const goToStep = useCallback((step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;

    setAnimationDirection(step > currentStep ? 'forward' : 'backward');
    setCurrentStep(step);

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const goNextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS && isCurrentStepValid) {
      // Haptic feedback on milestone
      if (currentStep === 2 || currentStep === 4) {
        triggerHaptic('medium');
      } else {
        triggerHaptic('light');
      }

      setAnimationDirection('forward');
      setCurrentStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, isCurrentStepValid, triggerHaptic]);

  const goBackStep = useCallback(() => {
    if (currentStep > 1) {
      triggerHaptic('light');
      setAnimationDirection('backward');
      setCurrentStep(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, triggerHaptic]);

  const value = useMemo<MobileBookingContextValue>(() => ({
    form,
    currentStep,
    totalSteps: TOTAL_STEPS,
    animationDirection,
    goToStep,
    goNextStep,
    goBackStep,
    isCurrentStepValid,
    getStepValidationStatus,
    provider,
    setProvider,
    isLawyer,
    displayEUR,
    displayDuration,
    setDisplayEUR,
    setDisplayDuration,
    isSubmitting,
    setIsSubmitting,
    showCelebration,
    setShowCelebration,
    triggerHaptic,
    languagesSpoken,
    setLanguagesSpoken,
    hasLanguageMatch,
    setHasLanguageMatch,
  }), [
    form,
    currentStep,
    animationDirection,
    goToStep,
    goNextStep,
    goBackStep,
    isCurrentStepValid,
    getStepValidationStatus,
    provider,
    isLawyer,
    displayEUR,
    displayDuration,
    isSubmitting,
    showCelebration,
    triggerHaptic,
    languagesSpoken,
    hasLanguageMatch,
  ]);

  return (
    <MobileBookingContext.Provider value={value}>
      {children}
    </MobileBookingContext.Provider>
  );
};

export const useMobileBooking = (): MobileBookingContextValue => {
  const context = useContext(MobileBookingContext);
  if (!context) {
    throw new Error('useMobileBooking must be used within a MobileBookingProvider');
  }
  return context;
};

export default MobileBookingContext;
