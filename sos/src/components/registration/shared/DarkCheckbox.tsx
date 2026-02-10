import React from 'react';
import type { ThemeTokens } from './theme';

interface DarkCheckboxProps {
  theme: ThemeTokens;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  error?: string;
  children: React.ReactNode;
}

const DarkCheckbox: React.FC<DarkCheckboxProps> = ({
  theme,
  checked,
  onChange,
  id = 'acceptTerms',
  error,
  children,
}) => {
  return (
    <div>
      <div className={`flex items-start gap-3 p-4 bg-white/5 rounded-2xl border-2 ${error ? 'border-red-500/60' : 'border-white/10'} min-h-[48px]`}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`mt-1 h-5 w-5 rounded border-gray-600 bg-white/10 text-white focus:ring-2 ${theme.focusRing} cursor-pointer`}
          aria-required={true}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <label
          htmlFor={id}
          className="text-sm text-gray-300 font-medium cursor-pointer"
        >
          {children}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-xs text-red-400 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default DarkCheckbox;
