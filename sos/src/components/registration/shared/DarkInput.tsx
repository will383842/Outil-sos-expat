import React from 'react';
import type { ThemeTokens } from './theme';
import { darkInputBase, darkInputError, darkInputFilled } from './theme';

interface DarkInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  theme: ThemeTokens;
  label: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
}

const DarkInput = React.forwardRef<HTMLInputElement, DarkInputProps>(
  ({ theme, label, error, touched, required, icon, className = '', id, ...props }, ref) => {
    const hasError = !!(error && touched);
    const hasValue = !!props.value && String(props.value).trim().length > 0;
    const isFilled = hasValue && !hasError && touched;

    const inputClasses = [
      darkInputBase,
      theme.focusRing,
      theme.focusBorder,
      hasError ? darkInputError : '',
      isFilled ? darkInputFilled : '',
      icon ? 'pl-12' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
        </label>
        <div className="relative">
          {icon && (
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${theme.iconText}`}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={inputClasses}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${id}-error` : undefined}
            {...props}
          />
        </div>
      </div>
    );
  }
);

DarkInput.displayName = 'DarkInput';
export default DarkInput;
