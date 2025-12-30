import React, { useState, useCallback, useMemo, useEffect } from "react";
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
    language: string;
    type: "all" | "lawyer" | "expat";
  }) => void;
  countryOptions: { code: string; label: string }[];
  languageOptions: { code: string; label: string }[];
}

// ========================================
// Helper Functions
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

// Priority languages codes (in order)
const PRIORITY_LANGUAGE_CODES = ["fr", "en", "de", "ru", "zh", "es", "pt", "ar", "hi"];

// Flag mappings for languages
const LANGUAGE_FLAG_MAP: Record<string, string> = {
  fr: "FR", en: "GB", de: "DE", ru: "RU", zh: "CN", es: "ES", pt: "PT", ar: "SA", hi: "IN",
  it: "IT", nl: "NL", pl: "PL", tr: "TR", ja: "JP", ko: "KR",
  vi: "VN", th: "TH", id: "ID", ms: "MY", sv: "SE", no: "NO",
  da: "DK", fi: "FI", cs: "CZ", el: "GR", hu: "HU", ro: "RO",
  uk: "UA", he: "IL", fa: "IR", bn: "BD", ta: "IN", te: "IN",
  ur: "PK", sw: "KE", af: "ZA", tl: "PH",
};

// Country flag component
const CountryFlag: React.FC<{ code: string; size?: "sm" | "md" }> = ({
  code,
  size = "sm",
}) => {
  const sizeClasses = {
    sm: "w-5 h-4",
    md: "w-6 h-5",
  };
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt=""
      className={`${sizeClasses[size]} object-cover rounded`}
      loading="lazy"
    />
  );
};

// ========================================
// Step Progress Bar (compact)
// ========================================
const StepProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <React.Fragment key={stepNum}>
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                transition-all duration-300
                ${isCompleted
                  ? "bg-green-500 text-white"
                  : isActive
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-gray-400"
                }
              `}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
            </div>
            {stepNum < totalSteps && (
              <div
                className={`
                  w-8 h-0.5 rounded-full transition-all duration-300
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
// Country Step Component (compact)
// ========================================
const CountryStep: React.FC<{
  selectedCountry: string;
  onSelect: (code: string) => void;
  countryOptions: { code: string; label: string }[];
  onNext: () => void;
}> = ({ selectedCountry, onSelect, countryOptions, onNext }) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryOptions;
    const normalizedQuery = normalizeText(searchQuery);
    return countryOptions.filter((c) =>
      normalizeText(c.label).includes(normalizedQuery)
    );
  }, [countryOptions, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <h2 className="text-lg font-bold text-white text-center mb-3">
        <FormattedMessage id="wizard.step1.title" />
      </h2>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={intl.formatMessage({ id: "wizard.search.country" })}
          className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 text-sm"
        />
      </div>

      {/* Countries List */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-2 gap-2">
          {filteredCountries.map((country) => (
            <button
              key={country.code}
              onClick={() => onSelect(country.code)}
              className={`
                flex items-center gap-2 p-2.5 rounded-xl border transition-all
                touch-manipulation text-left
                ${selectedCountry === country.code
                  ? "bg-red-500/20 border-red-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-200 active:scale-95"
                }
              `}
            >
              <CountryFlag code={country.code} size="sm" />
              <span className="text-xs font-medium truncate flex-1">{country.label}</span>
              {selectedCountry === country.code && (
                <Check className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        {filteredCountries.length === 0 && (
          <p className="text-center text-gray-400 py-4 text-sm">
            <FormattedMessage id="wizard.no.results" />
          </p>
        )}
      </div>

      {/* Next Button */}
      <div className="pt-3 border-t border-white/10 mt-3">
        <button
          onClick={onNext}
          disabled={!selectedCountry}
          className={`
            w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2
            transition-all touch-manipulation
            ${selectedCountry
              ? "bg-gradient-to-r from-red-500 to-orange-500 text-white active:scale-[0.98]"
              : "bg-white/10 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          <FormattedMessage id="action.next" />
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ========================================
// Language Step Component (compact)
// ========================================
const LanguageStep: React.FC<{
  selectedLanguage: string;
  onSelect: (code: string) => void;
  languageOptions: { code: string; label: string }[];
  onNext: () => void;
  onBack: () => void;
}> = ({ selectedLanguage, onSelect, languageOptions, onNext, onBack }) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");

  // Sort languages: priority first, then alphabetically (including priority ones)
  const sortedLanguages = useMemo(() => {
    const priorityLangs: { code: string; label: string }[] = [];
    const otherLangs: { code: string; label: string }[] = [];

    // Separate priority and other languages
    languageOptions.forEach((lang) => {
      if (PRIORITY_LANGUAGE_CODES.includes(lang.code.toLowerCase())) {
        priorityLangs.push(lang);
      } else {
        otherLangs.push(lang);
      }
    });

    // Sort priority by their order in PRIORITY_LANGUAGE_CODES
    priorityLangs.sort((a, b) => {
      const indexA = PRIORITY_LANGUAGE_CODES.indexOf(a.code.toLowerCase());
      const indexB = PRIORITY_LANGUAGE_CODES.indexOf(b.code.toLowerCase());
      return indexA - indexB;
    });

    // Sort others alphabetically
    otherLangs.sort((a, b) => a.label.localeCompare(b.label));

    return [...priorityLangs, ...otherLangs];
  }, [languageOptions]);

  // Filter languages with accent-insensitive search
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

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <h2 className="text-lg font-bold text-white text-center mb-3">
        <FormattedMessage id="wizard.step2.title" />
      </h2>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={intl.formatMessage({ id: "wizard.search.language" })}
          className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
        />
      </div>

      {/* Languages List */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-2 gap-2">
          {filteredLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              className={`
                flex items-center gap-2 p-2.5 rounded-xl border transition-all
                touch-manipulation text-left
                ${selectedLanguage === lang.code
                  ? "bg-blue-500/20 border-blue-500 text-white"
                  : "bg-white/5 border-white/10 text-gray-200 active:scale-95"
                }
              `}
            >
              <CountryFlag code={getFlagForLanguage(lang.code)} size="sm" />
              <span className="text-xs font-medium truncate flex-1">{lang.label}</span>
              {selectedLanguage === lang.code && (
                <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        {filteredLanguages.length === 0 && (
          <p className="text-center text-gray-400 py-4 text-sm">
            <FormattedMessage id="wizard.no.results" />
          </p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="pt-3 border-t border-white/10 mt-3 flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 bg-white/10 text-white active:scale-[0.98] touch-manipulation"
        >
          <ChevronLeft className="w-4 h-4" />
          <FormattedMessage id="action.back" />
        </button>
        <button
          onClick={onNext}
          disabled={!selectedLanguage}
          className={`
            flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1
            transition-all touch-manipulation
            ${selectedLanguage
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white active:scale-[0.98]"
              : "bg-white/10 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          <FormattedMessage id="action.next" />
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ========================================
// Type Step Component (compact - fits without scroll)
// ========================================
const TypeStep: React.FC<{
  selectedType: "all" | "lawyer" | "expat";
  onSelect: (type: "all" | "lawyer" | "expat") => void;
  onComplete: () => void;
  onBack: () => void;
}> = ({ selectedType, onSelect, onComplete, onBack }) => {
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
    <div className="flex flex-col h-full">
      {/* Title */}
      <h2 className="text-lg font-bold text-white text-center mb-4">
        <FormattedMessage id="wizard.step3.title" />
      </h2>

      {/* Type Options */}
      <div className="flex-1 space-y-3">
        {typeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`
                w-full p-4 rounded-2xl border-2 transition-all
                touch-manipulation text-left flex items-center gap-3
                ${isSelected
                  ? `${option.bgColor} ${option.borderColor}`
                  : "bg-white/5 border-white/10"
                }
                active:scale-[0.98]
              `}
            >
              <div
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${isSelected ? option.iconBg : "bg-white/10"}
                `}
              >
                <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-gray-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-bold ${isSelected ? "text-white" : "text-gray-200"}`}>
                  <FormattedMessage id={`wizard.step3.${option.value}`} />
                </h3>
                <p className="text-xs text-gray-400">
                  <FormattedMessage id={`wizard.step3.${option.value}.desc`} />
                </p>
              </div>
              {isSelected && (
                <Check className="w-5 h-5 text-white flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="pt-3 border-t border-white/10 mt-3 flex gap-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 bg-white/10 text-white active:scale-[0.98] touch-manipulation"
        >
          <ChevronLeft className="w-4 h-4" />
          <FormattedMessage id="action.back" />
        </button>
        <button
          onClick={onComplete}
          className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white active:scale-[0.98] touch-manipulation"
        >
          <FormattedMessage id="wizard.seeResults" />
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
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
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"all" | "lawyer" | "expat">("all");

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
      setSelectedLanguage("");
      setSelectedType("all");
    }
  }, [isOpen]);

  const handleComplete = useCallback(() => {
    onComplete({
      country: selectedCountry,
      language: selectedLanguage,
      type: selectedType,
    });
  }, [onComplete, selectedCountry, selectedLanguage, selectedType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-[56px] lg:top-[80px] bottom-0 z-40 bg-gray-950 flex flex-col">
      {/* Progress Bar - with safe padding from header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <StepProgressBar currentStep={step} totalSteps={3} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col min-h-0">
        {step === 1 && (
          <CountryStep
            selectedCountry={selectedCountry}
            onSelect={setSelectedCountry}
            countryOptions={countryOptions}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <LanguageStep
            selectedLanguage={selectedLanguage}
            onSelect={setSelectedLanguage}
            languageOptions={languageOptions}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <TypeStep
            selectedType={selectedType}
            onSelect={setSelectedType}
            onComplete={handleComplete}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
};

export default GuidedFilterWizard;
