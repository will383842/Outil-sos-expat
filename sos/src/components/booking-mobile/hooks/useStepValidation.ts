import { useMemo } from 'react';
import { UseFormWatch } from 'react-hook-form';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { BookingFormData } from '../context/MobileBookingContext';

interface UseStepValidationProps {
  watch: UseFormWatch<BookingFormData>;
  currentStep: number;
}

export interface StepValidation {
  isValid: boolean;
  errors: string[];
  progress: number; // 0-100 percentage within step
}

export const useStepValidation = ({ watch, currentStep }: UseStepValidationProps): StepValidation => {
  const values = watch();

  return useMemo(() => {
    const errors: string[] = [];
    let progress = 0;

    switch (currentStep) {
      case 1: // Name screen
        const hasFirst = Boolean(values.firstName?.trim());
        const hasLast = Boolean(values.lastName?.trim());

        if (!hasFirst) errors.push('firstName');
        if (!hasLast) errors.push('lastName');

        if (hasFirst && hasLast) progress = 100;
        else if (hasFirst || hasLast) progress = 50;

        return {
          isValid: hasFirst && hasLast,
          errors,
          progress,
        };

      case 2: // Country screen
        const hasCountry = Boolean(values.currentCountry?.trim());
        const isOther = values.currentCountry === 'Autre';
        const hasOtherCountry = Boolean(values.autrePays?.trim());

        if (!hasCountry) errors.push('currentCountry');
        if (isOther && !hasOtherCountry) errors.push('autrePays');

        if (hasCountry && (!isOther || hasOtherCountry)) progress = 100;
        else if (hasCountry) progress = 50;

        return {
          isValid: hasCountry && (!isOther || hasOtherCountry),
          errors,
          progress,
        };

      case 3: // Title screen
        const titleLength = values.title?.trim().length ?? 0;
        const titleMin = 10;

        if (titleLength < titleMin) errors.push('title');

        progress = Math.min(100, (titleLength / titleMin) * 100);

        return {
          isValid: titleLength >= titleMin,
          errors,
          progress,
        };

      case 4: // Description screen
        const descLength = values.description?.trim().length ?? 0;
        const descMin = 50;

        if (descLength < descMin) errors.push('description');

        progress = Math.min(100, (descLength / descMin) * 100);

        return {
          isValid: descLength >= descMin,
          errors,
          progress,
        };

      case 5: // Phone screen
        const phone = values.clientPhone;
        let phoneValid = false;

        if (phone) {
          try {
            const parsed = parsePhoneNumberFromString(phone);
            phoneValid = parsed?.isValid() ?? false;
          } catch {
            phoneValid = false;
          }
        }

        if (!phoneValid) errors.push('clientPhone');
        progress = phoneValid ? 100 : phone ? 50 : 0;

        return {
          isValid: phoneValid,
          errors,
          progress,
        };

      case 6: // Confirm screen
        const hasAccepted = Boolean(values.acceptTerms);

        if (!hasAccepted) errors.push('acceptTerms');
        progress = hasAccepted ? 100 : 0;

        return {
          isValid: hasAccepted,
          errors,
          progress,
        };

      default:
        return {
          isValid: false,
          errors: ['unknown_step'],
          progress: 0,
        };
    }
  }, [currentStep, values]);
};

export default useStepValidation;
