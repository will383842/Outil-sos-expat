import React from 'react';
import type { ThemeTokens } from './theme';
import IntlPhoneInput from '@/components/forms-data/IntlPhoneInput';

interface DarkPhoneInputProps {
  theme: ThemeTokens;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  locale: string;
  placeholder?: string;
  id?: string;
}

const DarkPhoneInput: React.FC<DarkPhoneInputProps> = ({
  theme,
  label,
  value,
  onChange,
  onBlur,
  error,
  touched,
  locale,
  placeholder = '+33 6 12 34 56 78',
  id = 'phone',
}) => {
  const hasError = !!(error && touched);

  return (
    <div className="dark-phone-wrapper" data-accent-rgb={theme.phoneAccentRgb} data-accent-hex={theme.phoneAccentHex}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-300 mb-2"
      >
        {label}
        <span className="text-red-400 ml-1" aria-hidden="true">*</span>
      </label>

      <IntlPhoneInput
        value={value}
        onChange={(val) => onChange(val || '')}
        onBlur={onBlur}
        defaultCountry="fr"
        placeholder={placeholder}
        locale={locale as never}
        name="phone"
        inputProps={{
          id,
          inputMode: 'tel' as const,
          autoComplete: 'tel',
          enterKeyHint: 'next' as const,
          'aria-required': 'true',
          'aria-invalid': hasError,
          'aria-describedby': hasError ? `${id}-error` : undefined,
        }}
      />
    </div>
  );
};

export default DarkPhoneInput;
