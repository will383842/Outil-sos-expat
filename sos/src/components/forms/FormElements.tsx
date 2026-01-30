/**
 * FormElements - Unified form components for 2026 UX best practices
 * Mobile-first, accessible, with smooth micro-interactions
 */

import React, { useState, useRef, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  ChevronDown,
  Search,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

// ============================================
// Design Tokens - Mobile-first 2026
// ============================================
export const formStyles = {
  // Base input - 48px height for touch targets (44px minimum)
  input: `
    w-full px-4 py-3.5
    bg-white dark:bg-gray-900/50
    border border-gray-200 dark:border-gray-700/50
    rounded-2xl
    text-base text-gray-900 dark:text-white
    placeholder:text-gray-400 dark:placeholder:text-gray-500
    focus:outline-none focus:ring-2 focus:ring-offset-0
    focus:border-transparent
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  // Input with icon padding
  inputWithIcon: 'pl-12',

  // Input states
  inputError: 'border-red-400 dark:border-red-500 focus:ring-red-500/30',
  inputSuccess: 'border-green-400 dark:border-green-500 focus:ring-green-500/30',
  inputDefault: 'focus:ring-blue-500/30 dark:focus:ring-blue-400/30',

  // Label
  label: `
    block text-sm font-medium
    text-gray-700 dark:text-gray-300
    mb-2
  `,

  // Helper text
  helperText: 'mt-1.5 text-xs text-gray-500 dark:text-gray-400',

  // Error message
  errorText: 'mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1',

  // Success message
  successText: 'mt-1.5 text-xs text-green-500 dark:text-green-400 flex items-center gap-1',

  // Icon container
  iconContainer: `
    absolute left-4 top-1/2 -translate-y-1/2
    text-gray-400 dark:text-gray-500
    pointer-events-none
    transition-colors duration-200
  `,

  // Primary button - gradient with hover effects
  buttonPrimary: `
    w-full py-4 px-6
    bg-gradient-to-r from-red-500 to-orange-500
    hover:from-red-600 hover:to-orange-600
    active:from-red-700 active:to-orange-700
    text-white font-semibold
    rounded-2xl
    shadow-lg shadow-red-500/25
    hover:shadow-xl hover:shadow-red-500/30
    transform hover:-translate-y-0.5 active:translate-y-0
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:transform-none disabled:shadow-none
    flex items-center justify-center gap-2
  `,

  // Secondary button
  buttonSecondary: `
    w-full py-4 px-6
    bg-gray-100 dark:bg-gray-800
    hover:bg-gray-200 dark:hover:bg-gray-700
    text-gray-900 dark:text-white font-medium
    rounded-2xl
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `,

  // Chip/Tag for selections
  chip: `
    inline-flex items-center gap-1.5
    px-3 py-1.5
    bg-gradient-to-r from-red-500 to-orange-500
    text-white text-sm font-medium
    rounded-xl
    transition-all duration-200
    hover:shadow-md
  `,

  // Chip removable
  chipRemovable: `
    inline-flex items-center gap-1.5
    pl-3 pr-2 py-1.5
    bg-gradient-to-r from-red-500 to-orange-500
    text-white text-sm font-medium
    rounded-xl
    transition-all duration-200
    hover:shadow-md
    cursor-pointer
  `,

  // Toggle button (for platform selection)
  toggleButton: `
    px-4 py-2.5
    rounded-xl
    text-sm font-medium
    border-2 border-transparent
    transition-all duration-200
  `,

  toggleButtonActive: `
    bg-gradient-to-r from-red-500 to-orange-500
    text-white
    shadow-md shadow-red-500/20
  `,

  toggleButtonInactive: `
    bg-gray-100 dark:bg-gray-800
    text-gray-700 dark:text-gray-300
    hover:bg-gray-200 dark:hover:bg-gray-700
    hover:border-gray-300 dark:hover:border-gray-600
  `,

  // Dropdown container
  dropdown: `
    absolute z-50 mt-2 w-full
    bg-white dark:bg-gray-900
    border border-gray-200 dark:border-gray-700
    rounded-2xl
    shadow-xl shadow-black/10 dark:shadow-black/30
    overflow-hidden
    animate-in fade-in slide-in-from-top-2 duration-200
  `,

  // Dropdown item
  dropdownItem: `
    w-full px-4 py-3
    flex items-center gap-3
    text-left text-sm
    text-gray-900 dark:text-white
    hover:bg-gray-50 dark:hover:bg-gray-800
    transition-colors duration-150
    cursor-pointer
  `,

  // Section title
  sectionTitle: `
    text-lg font-semibold
    text-gray-900 dark:text-white
    mb-4
  `,

  // Form card container
  formCard: `
    bg-white/80 dark:bg-gray-900/50
    backdrop-blur-xl
    border border-gray-200/50 dark:border-gray-700/50
    rounded-3xl
    shadow-xl shadow-black/5 dark:shadow-black/20
    p-6 md:p-8
  `,

  // Error alert
  errorAlert: `
    flex items-start gap-3
    p-4 mb-6
    bg-red-50 dark:bg-red-900/20
    border border-red-200 dark:border-red-800/50
    rounded-2xl
    text-red-700 dark:text-red-400
  `,

  // Success state
  successState: `
    text-center py-12
    animate-in fade-in zoom-in-95 duration-300
  `,
} as const;

// ============================================
// FormInput Component
// ============================================
interface FormInputProps {
  id: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'password';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: React.ReactNode;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  success?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  maxLength?: number;
  className?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  id,
  name,
  type = 'text',
  value,
  onChange,
  label,
  placeholder,
  icon,
  error,
  success,
  helperText,
  required,
  disabled,
  autoComplete,
  maxLength,
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === 'password' && showPassword ? 'text' : type;

  const stateClass = error
    ? formStyles.inputError
    : success
      ? formStyles.inputSuccess
      : formStyles.inputDefault;

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className={formStyles.label}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <div className={`${formStyles.iconContainer} ${error ? 'text-red-400' : success ? 'text-green-400' : ''}`}>
            {icon}
          </div>
        )}

        <input
          type={inputType}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`
            ${formStyles.input}
            ${icon ? formStyles.inputWithIcon : ''}
            ${stateClass}
            ${type === 'password' ? 'pr-12' : ''}
          `}
        />

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>

      {error && (
        <p className={formStyles.errorText}>
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className={formStyles.helperText}>{helperText}</p>
      )}
    </div>
  );
};

// ============================================
// FormSelect Component
// ============================================
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface FormSelectProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  label: React.ReactNode;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  options,
  placeholder,
  icon,
  error,
  required,
  disabled,
  searchable = false,
  className = '',
}) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = searchable && search
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`space-y-1 ${className}`}>
      <label htmlFor={id} className={formStyles.label}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <div className={`${formStyles.iconContainer} ${error ? 'text-red-400' : ''}`}>
            {icon}
          </div>
        )}

        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`
            ${formStyles.input}
            ${icon ? formStyles.inputWithIcon : ''}
            ${error ? formStyles.inputError : formStyles.inputDefault}
            pr-10 text-left
            flex items-center justify-between
          `}
        >
          <span className={selectedOption ? '' : 'text-gray-400 dark:text-gray-500'}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : (
              placeholder || intl.formatMessage({ id: 'form.select.placeholder', defaultMessage: 'Select...' })
            )}
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className={formStyles.dropdown}>
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'form.search', defaultMessage: 'Search...' })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-blue-500/30"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="max-h-[280px] overflow-y-auto overscroll-contain">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  <FormattedMessage id="form.noResults" defaultMessage="No results found" />
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      ${formStyles.dropdownItem}
                      ${opt.value === value ? 'bg-red-50 dark:bg-red-900/20' : ''}
                      ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {opt.value === value && (
                      <Check className="w-4 h-4 text-red-500" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className={formStyles.errorText}>
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
};

// ============================================
// FormTextarea Component
// ============================================
interface FormTextareaProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  label: React.ReactNode;
  placeholder?: string;
  error?: string;
  helperText?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  className?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  placeholder,
  error,
  helperText,
  required,
  disabled,
  rows = 3,
  maxLength,
  showCount = false,
  className = '',
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className={formStyles.label}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`
          ${formStyles.input}
          ${error ? formStyles.inputError : formStyles.inputDefault}
          resize-none
        `}
      />

      <div className="flex justify-between items-center">
        {error ? (
          <p className={formStyles.errorText}>
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        ) : helperText ? (
          <p className={formStyles.helperText}>{helperText}</p>
        ) : (
          <span />
        )}

        {showCount && maxLength && (
          <span className={`text-xs ${value.length >= maxLength ? 'text-red-500' : 'text-gray-400'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================
// FormChips Component (Multi-select as chips)
// ============================================
interface ChipOption {
  value: string;
  label: string;
}

interface FormChipsProps {
  selected: string[];
  onChange: (values: string[]) => void;
  options: ChipOption[];
  label: React.ReactNode;
  error?: string;
  helperText?: React.ReactNode;
  required?: boolean;
  maxItems?: number;
  className?: string;
}

export const FormChips: React.FC<FormChipsProps> = ({
  selected,
  onChange,
  options,
  label,
  error,
  helperText,
  required,
  maxItems,
  className = '',
}) => {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else if (!maxItems || selected.length < maxItems) {
      onChange([...selected, value]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className={formStyles.label}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          const isDisabled = !isSelected && maxItems && selected.length >= maxItems;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              disabled={isDisabled}
              className={`
                ${formStyles.toggleButton}
                ${isSelected ? formStyles.toggleButtonActive : formStyles.toggleButtonInactive}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className={formStyles.errorText}>
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className={formStyles.helperText}>{helperText}</p>
      )}
    </div>
  );
};

// ============================================
// FormCheckbox Component
// ============================================
interface FormCheckboxProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  error?: string;
  disabled?: boolean;
  variant?: 'default' | 'warning';
  className?: string;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({
  id,
  name,
  checked,
  onChange,
  label,
  error,
  disabled,
  variant = 'default',
  className = '',
}) => {
  const checkboxColor = variant === 'warning'
    ? 'text-amber-600 focus:ring-amber-500'
    : 'text-red-500 focus:ring-red-500';

  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            id={id}
            name={name}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className={`
              w-5 h-5
              rounded-md
              border-2 border-gray-300 dark:border-gray-600
              ${checkboxColor}
              focus:ring-2 focus:ring-offset-0
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
        </div>

        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
          {label}
        </span>
      </label>

      {error && (
        <p className={`${formStyles.errorText} mt-2 ml-8`}>
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
};

// ============================================
// FormButton Component
// ============================================
interface FormButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  accentColor?: 'red' | 'purple';
}

export const FormButton: React.FC<FormButtonProps> = ({
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  onClick,
  children,
  className = '',
  accentColor = 'red',
}) => {
  const baseStyle = variant === 'primary' ? formStyles.buttonPrimary : formStyles.buttonSecondary;

  // Override gradient for purple accent
  const colorOverride = variant === 'primary' && accentColor === 'purple'
    ? 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-purple-500/25 hover:shadow-purple-500/30'
    : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyle} ${colorOverride} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <FormattedMessage id="form.submitting" defaultMessage="Processing..." />
        </>
      ) : (
        children
      )}
    </button>
  );
};

// ============================================
// FormSection Component
// ============================================
interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className={formStyles.sectionTitle}>{title}</h3>}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

// ============================================
// FormError Component
// ============================================
interface FormErrorProps {
  error: string | null;
}

export const FormError: React.FC<FormErrorProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className={formStyles.errorAlert}>
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm">{error}</p>
    </div>
  );
};

// ============================================
// FormSuccess Component
// ============================================
interface FormSuccessProps {
  title: React.ReactNode;
  message: React.ReactNode;
  icon?: React.ReactNode;
}

export const FormSuccess: React.FC<FormSuccessProps> = ({
  title,
  message,
  icon,
}) => {
  return (
    <div className={formStyles.successState}>
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
        {icon || <Check className="w-10 h-10 text-white" />}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>
      <p className="text-gray-500 dark:text-gray-400">
        {message}
      </p>
    </div>
  );
};

// ============================================
// FormWarningBox Component (for blogger definitive role)
// ============================================
interface FormWarningBoxProps {
  title: React.ReactNode;
  message: React.ReactNode;
  children?: React.ReactNode;
}

export const FormWarningBox: React.FC<FormWarningBoxProps> = ({
  title,
  message,
  children,
}) => {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200">
            {title}
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {message}
          </p>
          {children && <div className="pt-2">{children}</div>}
        </div>
      </div>
    </div>
  );
};

export default {
  FormInput,
  FormSelect,
  FormTextarea,
  FormChips,
  FormCheckbox,
  FormButton,
  FormSection,
  FormError,
  FormSuccess,
  FormWarningBox,
  formStyles,
};
