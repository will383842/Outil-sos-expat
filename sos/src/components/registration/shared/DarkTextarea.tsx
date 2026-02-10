import React from 'react';
import type { ThemeTokens } from './theme';
import { darkInputBase, darkInputError, darkInputFilled } from './theme';

interface DarkTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  theme: ThemeTokens;
  label: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  currentLength: number;
  minLength: number;
  maxLength: number;
  remainingMessage: string;
  completeMessage: string;
}

const DarkTextarea = React.forwardRef<HTMLTextAreaElement, DarkTextareaProps>(
  ({ theme, label, error, touched, required, currentLength, minLength, maxLength, remainingMessage, completeMessage, id, className = '', ...props }, ref) => {
    const hasError = !!(error && touched);
    const trimmedLength = (props.value as string || '').trim().length;
    const isFilled = trimmedLength >= minLength && !hasError && touched;

    const textareaClasses = [
      darkInputBase,
      theme.focusRing,
      theme.focusBorder,
      hasError ? darkInputError : '',
      isFilled ? darkInputFilled : '',
      'resize-none',
      className,
    ].filter(Boolean).join(' ');

    const progressPercent = Math.min((currentLength / maxLength) * 100, 100);
    const isBelowMin = trimmedLength < minLength;

    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
        </label>
        <textarea
          ref={ref}
          id={id}
          className={textareaClasses}
          aria-required={required}
          aria-invalid={hasError}
          aria-describedby={`${id}-progress`}
          rows={5}
          maxLength={maxLength}
          {...props}
        />

        <div className="mt-3" id={`${id}-progress`}>
          <div
            className="h-1.5 bg-white/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={currentLength}
            aria-valuemin={0}
            aria-valuemax={maxLength}
          >
            <div
              className={`h-full transition-all duration-300 ${isBelowMin ? 'bg-orange-500' : 'bg-green-500'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-2 font-medium">
            <span className={isBelowMin ? 'text-orange-400' : 'text-green-400'}>
              {isBelowMin ? remainingMessage : completeMessage}
            </span>
            <span className={currentLength > maxLength - 50 ? 'text-orange-400' : 'text-gray-500'}>
              {currentLength}/{maxLength}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

DarkTextarea.displayName = 'DarkTextarea';
export default DarkTextarea;
