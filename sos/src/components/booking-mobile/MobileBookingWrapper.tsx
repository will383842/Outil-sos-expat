import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MobileBookingProvider, BookingFormData } from './context/MobileBookingContext';
import { MobileBookingWizard } from './MobileBookingWizard';
import type { Provider } from '@/types/provider';
import { languagesData } from '@/data/languages-spoken';

interface MobileBookingWrapperProps {
  // Provider data
  provider: Provider | null;
  isLawyer: boolean;

  // Pricing
  displayEUR: number;
  displayDuration: number;

  // Callbacks
  onSubmit: (data: BookingFormData) => Promise<void>;
  onBack: () => void;

  // Initial values from wizard/session
  initialValues?: Partial<BookingFormData>;

  // Desktop fallback content
  desktopContent: React.ReactNode;
}

// Media query hook
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

export const MobileBookingWrapper: React.FC<MobileBookingWrapperProps> = ({
  provider,
  isLawyer,
  displayEUR,
  displayDuration,
  onSubmit,
  onBack,
  initialValues = {},
  desktopContent,
}) => {
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Read wizard data from sessionStorage
  const wizardDefaultValues = useMemo(() => {
    const defaults: Partial<BookingFormData> = { ...initialValues };

    try {
      const wizardData = sessionStorage.getItem('wizardFilters');
      if (wizardData) {
        const { country, languages: wizardLanguages } = JSON.parse(wizardData) as {
          country?: string;
          languages?: string[];
          type?: string;
        };

        // Store country code directly (the select uses code as value)
        if (country) {
          defaults.currentCountry = country;
        }

        // Convert language codes
        if (wizardLanguages && wizardLanguages.length > 0) {
          defaults.clientLanguages = wizardLanguages
            .map((code) => {
              const langData = languagesData.find(
                (l) => l.code.toLowerCase() === code.toLowerCase()
              );
              return langData?.code || null;
            })
            .filter((code): code is string => code !== null);
        }
      }
    } catch (e) {
      console.warn('[MobileBookingWrapper] Failed to read wizard data', e);
    }

    return defaults;
  }, [initialValues]);

  // If not mobile, render desktop content
  if (!isMobile) {
    return <>{desktopContent}</>;
  }

  // Mobile: render wizard
  return (
    <MobileBookingProvider defaultValues={wizardDefaultValues}>
      <MobileBookingWizardWithProvider
        provider={provider}
        isLawyer={isLawyer}
        displayEUR={displayEUR}
        displayDuration={displayDuration}
        onSubmit={onSubmit}
        onBack={onBack}
      />
    </MobileBookingProvider>
  );
};

// Inner component that uses the context
interface MobileBookingWizardWithProviderProps {
  provider: Provider | null;
  isLawyer: boolean;
  displayEUR: number;
  displayDuration: number;
  onSubmit: (data: BookingFormData) => Promise<void>;
  onBack: () => void;
}

const MobileBookingWizardWithProvider: React.FC<MobileBookingWizardWithProviderProps> = ({
  provider,
  isLawyer,
  displayEUR,
  displayDuration,
  onSubmit,
  onBack,
}) => {
  // Import context hook here to ensure it's within provider
  const { useMobileBooking } = require('./context/MobileBookingContext');
  const { setProvider, setDisplayEUR, setDisplayDuration } = useMobileBooking();

  // Sync external props to context
  useEffect(() => {
    setProvider(provider);
  }, [provider, setProvider]);

  useEffect(() => {
    setDisplayEUR(displayEUR);
  }, [displayEUR, setDisplayEUR]);

  useEffect(() => {
    setDisplayDuration(displayDuration);
  }, [displayDuration, setDisplayDuration]);

  return (
    <MobileBookingWizard
      onSubmit={onSubmit}
      onBack={onBack}
    />
  );
};

export default MobileBookingWrapper;
