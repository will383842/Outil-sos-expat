// Mobile Booking Wizard - 2026 Mobile-First UX
// One-field-per-screen design pattern

export { MobileBookingWrapper } from './MobileBookingWrapper';
export { MobileBookingWizard } from './MobileBookingWizard';
export { MobileBookingProvider, useMobileBooking } from './context/MobileBookingContext';
export type { BookingFormData } from './context/MobileBookingContext';

// UI Components
export { ProgressBar } from './ui/ProgressBar';
export { ProviderMiniCard } from './ui/ProviderMiniCard';
export { StickyCTA } from './ui/StickyCTA';
export { AnimatedInput } from './ui/AnimatedInput';
export { CelebrationOverlay } from './ui/CelebrationOverlay';

// Step Screens
export { Step1NameScreen } from './steps/Step1NameScreen';
export { Step2CountryScreen } from './steps/Step2CountryScreen';
export { Step3TitleScreen } from './steps/Step3TitleScreen';
export { Step4DescriptionScreen } from './steps/Step4DescriptionScreen';
export { Step5PhoneScreen } from './steps/Step5PhoneScreen';
export { Step6ConfirmScreen } from './steps/Step6ConfirmScreen';

// Hooks
export { useSwipeNavigation } from './hooks/useSwipeNavigation';
export { useHapticFeedback } from './hooks/useHapticFeedback';
export { useStepValidation } from './hooks/useStepValidation';
