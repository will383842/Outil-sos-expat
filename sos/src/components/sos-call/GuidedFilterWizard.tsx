import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  ChevronRight,
  ChevronLeft,
  Scale,
  Globe,
  HelpCircle,
  Search,
  Check,
} from "lucide-react";

// ========================================
// Types
// ========================================
interface GuidedFilterWizardProps {
  isOpen: boolean;
  onComplete: (filters: {
    country: string;
    languages: string[]; // Changed to array for multi-select
    type: "all" | "lawyer" | "expat";
  }) => void;
  countryOptions: { code: string; label: string }[];
  languageOptions: { code: string; label: string }[];
}

// ========================================
// Constants
// ========================================

// Normalize text by removing accents for search (é→e, ù→u, etc.)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[œ]/g, "oe")
    .replace(/[æ]/g, "ae")
    .replace(/[ß]/g, "ss");
};

// Priority country codes (in order): France, USA, Germany, UK, Russia, Spain, Italy, Canada, etc.
const PRIORITY_COUNTRY_CODES = [
  "fr", "us", "de", "gb", "ru", "es", "it", "ca", "be", "ch", "pt", "nl", "au", "br", "ma", "dz", "tn"
];

// Priority languages codes (in order)
const PRIORITY_LANGUAGE_CODES = ["fr", "en", "de", "ru", "zh", "es", "pt", "ar", "hi"];

// Flag mappings for languages (ISO 639-1 language code -> ISO 3166-1 country code)
const LANGUAGE_FLAG_MAP: Record<string, string> = {
  // Top 20 world languages
  zh: "CN", en: "GB", hi: "IN", es: "ES", fr: "FR", ar: "SA", bn: "BD", pt: "PT",
  ru: "RU", ja: "JP", pa: "IN", de: "DE", jv: "ID", ko: "KR", vi: "VN", tr: "TR",
  it: "IT", th: "TH", pl: "PL", uk: "UA",
  // European languages
  nl: "NL", sv: "SE", no: "NO", da: "DK", fi: "FI", cs: "CZ", sk: "SK", hu: "HU",
  ro: "RO", bg: "BG", hr: "HR", sr: "RS", sl: "SI", el: "GR", ca: "ES", eu: "ES",
  ga: "IE", cy: "GB", is: "IS", et: "EE", lv: "LV", lt: "LT", sq: "AL", mk: "MK", mt: "MT",
  // Asian languages
  ur: "PK", ta: "IN", te: "IN", mr: "IN", gu: "IN", kn: "IN", ml: "IN", si: "LK",
  ne: "NP", id: "ID", ms: "MY", tl: "PH", my: "MM", km: "KH", lo: "LA", mn: "MN",
  ka: "GE", hy: "AM", az: "AZ", kk: "KZ", uz: "UZ", tg: "TJ", ky: "KG", tk: "TM",
  ps: "AF", fa: "IR", he: "IL",
  // African languages
  sw: "KE", am: "ET", ha: "NG", yo: "NG", ig: "NG", zu: "ZA", xh: "ZA", af: "ZA",
  so: "SO", rw: "RW",
  // Other
  eo: "EU",
};

// Country flag component
const CountryFlag: React.FC<{ code: string; name?: string }> = ({ code, name }) => {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={name ? `Drapeau ${name}` : `Flag of ${code.toUpperCase()}`}
      className="w-6 h-4 object-cover rounded-sm flex-shrink-0 pointer-events-none"
      draggable={false}
    />
  );
};

// ========================================
// Step Progress Bar (Fixed at top)
// ========================================
const StepProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <React.Fragment key={stepNum}>
            <div
              className={`
                w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg
                transition-all duration-300 shadow-lg
                ${isCompleted
                  ? "bg-green-500 text-white"
                  : isActive
                    ? "bg-red-500 text-white ring-4 ring-red-500/30"
                    : "bg-white/10 text-gray-400"
                }
              `}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
            </div>
            {stepNum < totalSteps && (
              <div
                className={`
                  w-10 h-1 rounded-full transition-all duration-300
                  ${isCompleted ? "bg-green-500" : "bg-white/10"}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ========================================
// Country Step Component
// ========================================
const CountryStep: React.FC<{
  selectedCountry: string;
  onSelect: (code: string) => void;
  countryOptions: { code: string; label: string }[];
}> = ({ selectedCountry, onSelect, countryOptions }) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Track whether a touch gesture involved scrolling (to distinguish taps from scrolls)
  const didScrollRef = useRef(false);

  // Sort countries: priority first, then alphabetically
  const sortedCountries = useMemo(() => {
    const priorityCountries: { code: string; label: string }[] = [];
    const otherCountries: { code: string; label: string }[] = [];

    countryOptions.forEach((country) => {
      if (PRIORITY_COUNTRY_CODES.includes(country.code.toLowerCase())) {
        priorityCountries.push(country);
      } else {
        otherCountries.push(country);
      }
    });

    priorityCountries.sort((a, b) => {
      const indexA = PRIORITY_COUNTRY_CODES.indexOf(a.code.toLowerCase());
      const indexB = PRIORITY_COUNTRY_CODES.indexOf(b.code.toLowerCase());
      return indexA - indexB;
    });

    otherCountries.sort((a, b) => a.label.localeCompare(b.label));

    return [...priorityCountries, ...otherCountries];
  }, [countryOptions]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return sortedCountries;
    const normalizedQuery = normalizeText(searchQuery);
    return sortedCountries.filter((c) =>
      normalizeText(c.label).includes(normalizedQuery)
    );
  }, [sortedCountries, searchQuery]);

  const handleTouchEnd = useCallback((code: string, e: React.TouchEvent) => {
    if (!didScrollRef.current) {
      e.preventDefault(); // prevent delayed click (300ms) from firing a duplicate
      onSelect(code);
    }
  }, [onSelect]);

  return (
    <>
      {/* Title */}
      <h2 className="text-xl font-bold text-white text-center mb-4">
        <FormattedMessage id="wizard.step1.title" />
      </h2>

      {/* Search */}
      <div className="relative mb-4" role="search">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={intl.formatMessage({ id: "wizard.search.country" })}
          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 text-base touch-manipulation"
        />
      </div>

      {/* Countries Grid - Scrollable */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain touch-manipulation"
        onTouchStart={() => { didScrollRef.current = false; }}
        onTouchMove={() => { didScrollRef.current = true; }}
      >
        <div className="grid grid-cols-2 gap-2 pb-2">
          {filteredCountries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => onSelect(country.code)}
              onTouchEnd={(e) => handleTouchEnd(country.code, e)}
              className={`
                flex items-center gap-2.5 p-3 rounded-xl border-2
                text-left min-h-[52px] select-none cursor-pointer touch-manipulation
                ${selectedCountry === country.code
                  ? "bg-red-500/20 border-red-500 text-white"
                  : "bg-white/5 border-transparent text-gray-200 active:bg-white/15"
                }
              `}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <CountryFlag code={country.code} />
              <span className="text-sm font-medium truncate flex-1 pointer-events-none">{country.label}</span>
              {selectedCountry === country.code && (
                <Check className="w-4 h-4 text-red-400 flex-shrink-0 pointer-events-none" />
              )}
            </button>
          ))}
        </div>
        {filteredCountries.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-base">
            <FormattedMessage id="wizard.no.results" />
          </p>
        )}
      </div>
    </>
  );
};

// ========================================
// Language Step Component (Multi-Select)
// ========================================
const LanguageStep: React.FC<{
  selectedLanguages: string[];
  onToggle: (code: string) => void;
  languageOptions: { code: string; label: string }[];
}> = ({ selectedLanguages, onToggle, languageOptions }) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const didScrollRef = useRef(false);

  // Sort languages: priority first, then alphabetically
  const sortedLanguages = useMemo(() => {
    const priorityLangs: { code: string; label: string }[] = [];
    const otherLangs: { code: string; label: string }[] = [];

    languageOptions.forEach((lang) => {
      if (PRIORITY_LANGUAGE_CODES.includes(lang.code.toLowerCase())) {
        priorityLangs.push(lang);
      } else {
        otherLangs.push(lang);
      }
    });

    priorityLangs.sort((a, b) => {
      const indexA = PRIORITY_LANGUAGE_CODES.indexOf(a.code.toLowerCase());
      const indexB = PRIORITY_LANGUAGE_CODES.indexOf(b.code.toLowerCase());
      return indexA - indexB;
    });

    otherLangs.sort((a, b) => a.label.localeCompare(b.label));

    return [...priorityLangs, ...otherLangs];
  }, [languageOptions]);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return sortedLanguages;
    const normalizedQuery = normalizeText(searchQuery);
    return sortedLanguages.filter((l) =>
      normalizeText(l.label).includes(normalizedQuery)
    );
  }, [sortedLanguages, searchQuery]);

  const getFlagForLanguage = (code: string): string => {
    return LANGUAGE_FLAG_MAP[code.toLowerCase()] || "UN";
  };

  const handleTouchEnd = useCallback((code: string, e: React.TouchEvent) => {
    if (!didScrollRef.current) {
      e.preventDefault();
      onToggle(code);
    }
  }, [onToggle]);

  return (
    <>
      {/* Title with selection count */}
      <h2 className="text-xl font-bold text-white text-center mb-1">
        <FormattedMessage id="wizard.step2.title" />
      </h2>
      {selectedLanguages.length > 0 && (
        <p className="text-center text-blue-400 text-sm mb-3">
          {selectedLanguages.length} <FormattedMessage id="wizard.languages.selected" />
        </p>
      )}
      {selectedLanguages.length === 0 && (
        <p className="text-center text-gray-500 text-sm mb-3">
          <FormattedMessage id="wizard.languages.multiSelect" />
        </p>
      )}

      {/* Search */}
      <div className="relative mb-4" role="search">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={intl.formatMessage({ id: "wizard.search.language" })}
          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 text-base touch-manipulation"
        />
      </div>

      {/* Languages Grid - Scrollable */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain touch-manipulation"
        onTouchStart={() => { didScrollRef.current = false; }}
        onTouchMove={() => { didScrollRef.current = true; }}
      >
        <div className="grid grid-cols-2 gap-2 pb-2">
          {filteredLanguages.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => onToggle(lang.code)}
                onTouchEnd={(e) => handleTouchEnd(lang.code, e)}
                className={`
                  flex items-center gap-2.5 p-3 rounded-xl border-2
                  text-left min-h-[52px] select-none cursor-pointer touch-manipulation
                  ${isSelected
                    ? "bg-blue-500/20 border-blue-500 text-white"
                    : "bg-white/5 border-transparent text-gray-200 active:bg-white/10"
                  }
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <CountryFlag code={getFlagForLanguage(lang.code)} />
                <span className="text-sm font-medium truncate flex-1 pointer-events-none">{lang.label}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
        {filteredLanguages.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-base">
            <FormattedMessage id="wizard.no.results" />
          </p>
        )}
      </div>
    </>
  );
};

// ========================================
// Type Step Component
// ========================================
const TypeStep: React.FC<{
  selectedType: "all" | "lawyer" | "expat" | null;
  onSelect: (type: "all" | "lawyer" | "expat") => void;
}> = ({ selectedType, onSelect }) => {
  const typeOptions = [
    {
      value: "lawyer" as const,
      icon: Scale,
      bgColor: "bg-slate-500/20",
      borderColor: "border-slate-500",
      iconBg: "bg-slate-500",
    },
    {
      value: "expat" as const,
      icon: Globe,
      bgColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500",
      iconBg: "bg-emerald-500",
    },
    {
      value: "all" as const,
      icon: HelpCircle,
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500",
      iconBg: "bg-purple-500",
    },
  ];

  return (
    <>
      {/* Title */}
      <h2 className="text-xl font-bold text-white text-center mb-6">
        <FormattedMessage id="wizard.step3.title" />
      </h2>

      {/* Type Options - No scroll needed */}
      <div className="flex-1 flex flex-col justify-center space-y-3">
        {typeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`
                w-full p-4 rounded-2xl border-2
                text-left flex items-center gap-4 touch-manipulation
                ${isSelected
                  ? `${option.bgColor} ${option.borderColor}`
                  : "bg-white/5 border-transparent active:bg-white/10"
                }
              `}
            >
              <div
                className={`
                  w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
                  ${isSelected ? option.iconBg : "bg-white/10"}
                `}
              >
                <Icon className={`w-7 h-7 ${isSelected ? "text-white" : "text-gray-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold ${isSelected ? "text-white" : "text-gray-200"}`}>
                  <FormattedMessage id={`wizard.step3.${option.value}`} />
                </h3>
                <p className="text-sm text-gray-400">
                  <FormattedMessage id={`wizard.step3.${option.value}.desc`} />
                </p>
              </div>
              {isSelected && (
                <Check className="w-6 h-6 text-white flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};

// ========================================
// Main Wizard Component
// ========================================
const GuidedFilterWizard: React.FC<GuidedFilterWizardProps> = ({
  isOpen,
  onComplete,
  countryOptions,
  languageOptions,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<"all" | "lawyer" | "expat" | null>(null);

  // Toggle language selection
  const toggleLanguage = useCallback((code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  }, []);

  const handleCountrySelect = useCallback((code: string) => {
    setSelectedCountry(code);
  }, []);

  // Handler for going back to step 1
  const handleBackToStep1 = useCallback(() => {
    setStep(1);
  }, []);


  // Auto-advance: Type selection → Complete wizard
  const handleTypeSelect = useCallback((type: "all" | "lawyer" | "expat") => {
    setSelectedType(type);
    // Auto-complete après un court délai pour feedback visuel
    setTimeout(() => {
      const data = {
        country: selectedCountry,
        languages: selectedLanguages,
        type: type,
      };
      console.log('🟡 [GuidedFilterWizard] handleTypeSelect - auto-complete with data:', data);
      onComplete(data);
    }, 250);
  }, [onComplete, selectedCountry, selectedLanguages]);

  // Prevent body scroll when wizard is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset wizard when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedCountry("");
      setSelectedLanguages([]);
      setSelectedType(null);
    }
  }, [isOpen]);

  const canProceed = useMemo(() => {
    if (step === 1) return !!selectedCountry;
    if (step === 2) return selectedLanguages.length > 0;
    return true;
  }, [step, selectedCountry, selectedLanguages]);

  if (!isOpen) return null;

  // z-50 ensures wizard is above SOSCall mobile header (z-40) but below main header (z-60) and mobile menu (z-55)
  // top uses calc() with safe-area-inset-top for PWA standalone mode (iPhone notch, Android cutout)
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-b from-gray-900 to-gray-950 flex flex-col"
      style={{ top: 'calc(76px + env(safe-area-inset-top, 0px))' }}
    >

      {/* ===== HEADER FIXE : Progress Bar ===== */}
      <div className="flex-shrink-0 px-5 pt-8 pb-5 bg-gray-900/90 backdrop-blur-sm border-b border-white/5">
        <StepProgressBar currentStep={step} totalSteps={3} />
      </div>

      {/* ===== CONTENU SCROLLABLE ===== */}
      <div className="flex-1 overflow-hidden px-5 py-5 flex flex-col min-h-0 max-w-md mx-auto w-full">
        {step === 1 && (
          <CountryStep
            selectedCountry={selectedCountry}
            onSelect={handleCountrySelect}
            countryOptions={countryOptions}
          />
        )}
        {step === 2 && (
          <LanguageStep
            selectedLanguages={selectedLanguages}
            onToggle={toggleLanguage}
            languageOptions={languageOptions}
          />
        )}
        {step === 3 && (
          <TypeStep
            selectedType={selectedType}
            onSelect={handleTypeSelect}
          />
        )}
      </div>

      {/* ===== FOOTER FIXE : Boutons Navigation ===== */}
      <div
        className="flex-shrink-0 px-5 py-4 pb-8 bg-gray-900/95 backdrop-blur-md border-t border-white/10 max-w-md mx-auto w-full"
        style={{ paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 16px) + 16px))' }}
      >
        {step === 1 && (
          // Step 1: Next button only
          <button
            onClick={() => canProceed && setStep(2)}
            disabled={!canProceed}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2
              min-h-[60px] touch-manipulation
              ${canProceed
                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white active:opacity-80 shadow-lg shadow-red-500/30"
                : "bg-white/10 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            <FormattedMessage id="action.next" />
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {step === 2 && (
          // Step 2 (Languages multi-select): Back + Next buttons
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBackToStep1}
              className="flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-white/10 text-white active:bg-white/20 min-h-[60px] select-none cursor-pointer touch-manipulation"
            >
              <ChevronLeft className="w-6 h-6" />
              <FormattedMessage id="action.back" />
            </button>
            <button
              onClick={() => canProceed && setStep(3)}
              disabled={!canProceed}
              className={`
                flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2
                min-h-[60px] touch-manipulation
                ${canProceed
                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-white active:opacity-80 shadow-lg shadow-red-500/30"
                  : "bg-white/10 text-gray-500 cursor-not-allowed"
                }
              `}
            >
              <FormattedMessage id="action.next" />
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {step === 3 && (
          // Step 3 (Type selection): Back button only - selection auto-completes
          <button
            onClick={() => setStep(2)}
            className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-white/10 text-white active:bg-white/20 min-h-[60px] touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6" />
            <FormattedMessage id="action.back" />
          </button>
        )}
      </div>
    </div>
  );
};

export default GuidedFilterWizard;
