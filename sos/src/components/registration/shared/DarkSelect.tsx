import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ThemeTokens } from './theme';

export interface SelectOption {
  value: string;
  label: string;
}

interface DarkSelectProps {
  theme: ThemeTokens;
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  id?: string;
  searchable?: boolean;
}

const DarkSelect: React.FC<DarkSelectProps> = ({
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
  id = 'select',
  searchable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hasError = !!(error && touched);
  const selectedLabel = options.find(o => o.value === value)?.label || '';
  const listboxId = `${id}-listbox`;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const activeDescendant = highlightedIndex >= 0 && filtered[highlightedIndex]
    ? `${id}-option-${highlightedIndex}`
    : undefined;

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
  }, [onChange]);

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

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Scroll highlighted item into view
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
          handleSelect(filtered[highlightedIndex].value);
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
  }, [isOpen, filtered, highlightedIndex, handleSelect]);

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-300 mb-2"
      >
        {label}
        {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
      </label>

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
          ${hasError ? 'border-red-500/60' : value ? 'border-white/20 bg-white/10' : 'border-white/10'}
          ${isOpen ? `ring-2 ${theme.focusRing} border-white/30 bg-white/10` : 'hover:bg-white/10 hover:border-white/20'}
        `}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {selectedLabel || placeholder}
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
            {searchable && (
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
            )}

            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
            >
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">—</div>
              ) : (
                filtered.map((option, idx) => (
                  <div
                    key={option.value}
                    id={`${id}-option-${idx}`}
                    role="option"
                    aria-selected={option.value === value}
                    tabIndex={-1}
                    className={`
                      px-4 py-3 text-sm cursor-pointer flex items-center justify-between
                      transition-colors min-h-[44px]
                      ${option.value === value ? `${theme.tagBg} ${theme.tagText} font-semibold` : 'text-gray-300'}
                      ${idx === highlightedIndex ? 'bg-white/10' : 'hover:bg-white/5'}
                    `}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    <span>{option.label}</span>
                    {option.value === value && <Check className="w-4 h-4" aria-hidden="true" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DarkSelect;
