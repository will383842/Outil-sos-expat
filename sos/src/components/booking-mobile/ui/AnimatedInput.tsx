import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';
import { useMobileBooking } from '../context/MobileBookingContext';

interface AnimatedInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  isValid?: boolean;
  hint?: string;
  maxLength?: number;
  minLength?: number;
  rows?: number;
  autoFocus?: boolean;
  required?: boolean;
  className?: string;
  showCharCount?: boolean;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  isValid,
  hint,
  maxLength,
  minLength,
  rows = 4,
  autoFocus = false,
  required = false,
  className = '',
  showCharCount = false,
}) => {
  const { triggerHaptic } = useMobileBooking();
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto-focus on mount if specified
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Delay to ensure animation is complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Haptic feedback on validation state change
  useEffect(() => {
    if (!hasInteracted) return;

    if (isValid === true) {
      triggerHaptic('light');
    } else if (error) {
      triggerHaptic('error');
    }
  }, [isValid, error, hasInteracted, triggerHaptic]);

  const handleFocus = () => {
    setIsFocused(true);
    setHasInteracted(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const showError = error && hasInteracted && !isFocused;
  const showSuccess = isValid && hasInteracted && !error;

  // Base input classes
  const inputClasses = `
    w-full px-4 py-4 min-h-[56px]
    border-2 rounded-2xl
    bg-white text-gray-900 placeholder-gray-400
    text-[16px] touch-manipulation
    transition-all duration-200
    outline-none
    ${
      showError
        ? 'border-red-400 bg-red-50/50 animate-input-shake'
        : showSuccess
        ? 'border-green-400 bg-green-50/30'
        : isFocused
        ? 'border-red-500 ring-4 ring-red-500/10 shadow-lg shadow-red-500/5'
        : 'border-gray-200 hover:border-gray-300'
    }
    ${className}
  `;

  const InputComponent = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div className="w-full">
      {/* Label */}
      <motion.label
        htmlFor={name}
        className="block text-base font-semibold text-gray-800 mb-2"
        animate={{
          color: isFocused ? '#ef4444' : '#1f2937',
        }}
        transition={{ duration: 0.2 }}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </motion.label>

      {/* Input container */}
      <div className="relative">
        <InputComponent
          ref={inputRef as any}
          id={name}
          name={name}
          type={type === 'textarea' ? undefined : type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          maxLength={maxLength}
          className={inputClasses}
          rows={type === 'textarea' ? rows : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        />

        {/* Success/Error indicator */}
        <AnimatePresence>
          {(showSuccess || showError) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3 top-4"
            >
              {showSuccess ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom row: hint/error + char count */}
      <div className="mt-2 flex items-start justify-between gap-2">
        {/* Hint or Error message */}
        <AnimatePresence mode="wait">
          {showError ? (
            <motion.p
              key="error"
              id={`${name}-error`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm text-red-600 flex-1"
            >
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p
              key="hint"
              id={`${name}-hint`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-gray-500 flex-1"
            >
              {hint}
            </motion.p>
          ) : (
            <div className="flex-1" />
          )}
        </AnimatePresence>

        {/* Character count */}
        {showCharCount && (minLength || maxLength) && (
          <motion.span
            className={`text-xs tabular-nums ${
              minLength && value.length < minLength
                ? 'text-orange-500'
                : maxLength && value.length >= maxLength
                ? 'text-red-500'
                : 'text-gray-400'
            }`}
            animate={{
              scale: isFocused ? 1.05 : 1,
            }}
          >
            {value.length}
            {minLength && value.length < minLength && ` / ${minLength} min`}
            {maxLength && ` / ${maxLength}`}
          </motion.span>
        )}
      </div>
    </div>
  );
};

export default AnimatedInput;
