import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import type { ThemeTokens } from './theme';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface DarkMultiSelectProps {
  theme: ThemeTokens;
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  id?: string;
  getDisplayLabel?: (value: string) => string;
}

const DarkMultiSelect: React.FC<DarkMultiSelectProps> = ({
  theme,
  label,
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  touched,
  required,
  id = 'multiselect',
  getDisplayLabel,
}) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hasError = !!(error && touched);
  const listboxId = `${id}-listbox`;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const activeDescendant = highlightedIndex >= 0 && filtered[highlightedIndex]
    ? `${id}-option-${highlightedIndex}`
    : undefined;

  const toggleOption = useCallback((optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
    setSearch('');
    setHighlightedIndex(-1);
  }, [value, onChange]);

  const removeTag = useCallback((optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  }, [value, onChange]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
        if (isOpen && onBlur) onBlur();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onBlur]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          toggleOption(filtered[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearch('');
        break;
    }
  }, [isOpen, filtered, highlightedIndex, toggleOption]);

  const getLabel = useCallback((v: string) => {
    if (getDisplayLabel) return getDisplayLabel(v);
    return options.find(o => o.value === v)?.label || v;
  }, [options, getDisplayLabel]);

  const selectedCountText = intl.formatMessage(
    { id: 'common.nSelected', defaultMessage: '{count} selected' },
    { count: value.length }
  );

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-300 mb-2"
      >
        {label}
        {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
      </label>

      {/* Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2" role="list">
          {value.map(v => (
            <span
              key={v}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border ${theme.tagBg} ${theme.tagText} ${theme.tagBorder}`}
              role="listitem"
            >
              {getLabel(v)}
              <button
                type="button"
                onClick={() => removeTag(v)}
                className="hover:bg-white/10 rounded-lg p-1 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
                aria-label={intl.formatMessage(
                  { id: 'common.removeItem', defaultMessage: 'Remove {item}' },
                  { item: getLabel(v) }
                )}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen ? activeDescendant : undefined}
        aria-required={required}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={`
          w-full px-4 py-3.5 min-h-[48px]
          bg-white/5 border-2 rounded-2xl
          text-left text-base font-medium
          transition-all duration-200
          flex items-center justify-between gap-2
          ${hasError ? 'border-red-500/60' : value.length > 0 ? 'border-white/20 bg-white/10' : 'border-white/10'}
          ${isOpen ? `ring-2 ${theme.focusRing} border-white/30 bg-white/10` : 'hover:bg-white/10 hover:border-white/20'}
        `}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        <span className={value.length > 0 ? 'text-gray-400 text-sm' : 'text-gray-500'}>
          {value.length > 0 ? selectedCountText : placeholder}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-gray-900 border border-white/10 rounded-2xl shadow-xl shadow-black/30 overflow-hidden"
          >
            <div className="p-2 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setHighlightedIndex(0); }}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-9 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 min-h-[44px]"
                  placeholder="..."
                  aria-label="Search"
                  aria-controls={listboxId}
                  aria-activedescendant={activeDescendant}
                />
              </div>
            </div>

            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-multiselectable="true"
              className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">—</div>
              ) : (
                filtered.map((option, idx) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      id={`${id}-option-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={-1}
                      className={`
                        px-4 py-3 text-sm cursor-pointer flex items-center gap-3
                        transition-colors min-h-[44px]
                        ${isSelected ? `${theme.tagBg} ${theme.tagText} font-semibold` : 'text-gray-300'}
                        ${idx === highlightedIndex ? 'bg-white/10' : 'hover:bg-white/5'}
                      `}
                      onClick={() => toggleOption(option.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20 border-white/40' : 'border-white/20'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-sm bg-white" />}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DarkMultiSelect;
