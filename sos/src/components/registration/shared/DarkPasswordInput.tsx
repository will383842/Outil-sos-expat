import React, { useState, useMemo } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import type { ThemeTokens } from './theme';
import { darkInputBase, darkInputError, darkInputFilled } from './theme';
import { evaluatePasswordStrength } from './passwordStrength';

interface DarkPasswordInputProps {
  theme: ThemeTokens;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  id?: string;
  strengthLabelId: string;
  showPasswordLabel: string;
  hidePasswordLabel: string;
}

const DarkPasswordInput: React.FC<DarkPasswordInputProps> = ({
  theme,
  label,
  value,
  onChange,
  onBlur,
  error,
  touched,
  id = 'password',
  strengthLabelId,
  showPasswordLabel,
  hidePasswordLabel,
}) => {
  const [show, setShow] = useState(false);
  const strength = useMemo(() => evaluatePasswordStrength(value), [value]);

  const hasError = !!(error && touched);
  const isFilled = value.length >= 8 && !hasError && touched;

  const inputClasses = [
    darkInputBase,
    theme.focusRing,
    theme.focusBorder,
    hasError ? darkInputError : '',
    isFilled ? darkInputFilled : '',
    'pl-12 pr-12',
  ].filter(Boolean).join(' ');

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-300 mb-2"
      >
        {label}
        <span className="text-red-400 ml-1" aria-hidden="true">*</span>
      </label>
      <div className="relative">
        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${theme.iconText}`} aria-hidden="true" />
        <input
          id={id}
          name="password"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete="new-password"
          className={inputClasses}
          placeholder="••••••••"
          aria-required="true"
          aria-invalid={hasError}
          aria-describedby={value.length > 0 ? `${id}-strength` : undefined}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          onClick={() => setShow(s => !s)}
          aria-label={show ? hidePasswordLabel : showPasswordLabel}
        >
          {show
            ? <EyeOff className="w-5 h-5" aria-hidden="true" />
            : <Eye className="w-5 h-5" aria-hidden="true" />
          }
        </button>
      </div>

      {value.length > 0 && (
        <div className="mt-3" id={`${id}-strength`}>
          <div
            className="h-1.5 bg-white/10 rounded-full overflow-hidden"
            role="progressbar"
            aria-label={strengthLabelId}
            aria-valuenow={strength.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full transition-all duration-500 ${strength.darkColor}`}
              style={{ width: `${strength.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            {strengthLabelId}: {strength.label}
          </p>
        </div>
      )}
    </div>
  );
};

export default DarkPasswordInput;
