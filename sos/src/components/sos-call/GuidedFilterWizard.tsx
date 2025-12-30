import React, { useState, useCallback, useMemo, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  MapPin,
  Globe,
  Users,
  ChevronRight,
  ChevronLeft,
  Scale,
  HelpCircle,
  Search,
  Check,
} from "lucide-react";
import { getSortedCountries, type LanguageKey } from "../../data/countries";
import { languagesData, getLanguageLabel, type SupportedLocale } from "../../data/languages-spoken";

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
const getCountryLanguageKey = (locale: string): LanguageKey => {
  const mapping: Record<string, LanguageKey> = {
    fr: "nameFr",
    en: "nameEn",
    es: "nameEs",
    de: "nameDe",
    pt: "namePt",
    ru: "nameRu",
    hi: "nameFr",
    ch: "nameZh",
    zh: "nameZh",
    ar: "nameAr",
  };
  return mapping[locale.toLowerCase()] || "nameEn";
};

// Popular countries with flags
const POPULAR_COUNTRIES = [
  { code: "FR", flag: "FR" },
  { code: "US", flag: "US" },
  { code: "ES", flag: "ES" },
  { code: "DE", flag: "DE" },
  { code: "GB", flag: "GB" },
  { code: "CA", flag: "CA" },
  { code: "IT", flag: "IT" },
  { code: "BR", flag: "BR" },
  { code: "PT", flag: "PT" },
  { code: "CH", flag: "CH" },
  { code: "BE", flag: "BE" },
  { code: "MA", flag: "MA" },
];

// Popular languages with flags
const POPULAR_LANGUAGES = [
  { code: "fr", flag: "FR", label: "Français" },
  { code: "en", flag: "GB", label: "English" },
  { code: "es", flag: "ES", label: "Español" },
  { code: "de", flag: "DE", label: "Deutsch" },
  { code: "pt", flag: "PT", label: "Português" },
  { code: "ru", flag: "RU", label: "Русский" },
  { code: "zh", flag: "CN", label: "中文" },
  { code: "ar", flag: "SA", label: "العربية" },
  { code: "hi", flag: "IN", label: "हिंदी" },
];

// Country flag component
const CountryFlag: React.FC<{ code: string; size?: "sm" | "md" | "lg" }> = ({
  code,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-5 h-4",
    md: "w-8 h-6",
    lg: "w-10 h-8",
  };
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt=""
      className={`${sizeClasses[size]} object-cover rounded shadow-sm`}
      loading="lazy"
    />
  );
};

// ========================================
// Step Progress Bar
// ========================================
const StepProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <React.Fragment key={stepNum}>
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                transition-all duration-300
                ${isCompleted
                  ? "bg-green-500 text-white"
                  : isActive
                    ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30"
                    : "bg-white/10 text-gray-400"
                }
              `}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
            </div>
            {stepNum < totalSteps && (
              <div
                className={`
                  w-12 h-1 rounded-full transition-all duration-300
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
  onNext: () => void;
}> = ({ selectedCountry, onSelect, countryOptions, onNext }) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCountries, setShowAllCountries] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countryOptions;
    const query = searchQuery.toLowerCase();
    return countryOptions.filter((c) => c.label.toLowerCase().includes(query));
  }, [countryOptions, searchQuery]);

  const popularCountriesWithLabels = useMemo(() => {
    return POPULAR_COUNTRIES.map((pc) => {
      const found = countryOptions.find((c) => c.code === pc.code);
      return found ? { ...pc, label: found.label } : null;
    }).filter(Boolean) as { code: string; flag: string; label: string }[];
  }, [countryOptions]);

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-2xl flex items-center justify-center">
          <MapPin className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          <FormattedMessage id="wizard.step1.title" />
        </h2>
        <p className="text-gray-400 text-sm">
          <FormattedMessage id="wizard.step1.subtitle" />
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowAllCountries(true);
          }}
          placeholder={intl.formatMessage({ id: "wizard.search.country" })}
          className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 transition-all text-base"
        />
      </div>

      {/* Popular Countries Grid or Search Results */}
      <div className="flex-1 overflow-y-auto">
        {!showAllCountries && !searchQuery ? (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              <FormattedMessage id="wizard.popular.countries" />
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {popularCountriesWithLabels.map((country) => (
                <button
                  key={country.code}
                  onClick={() => onSelect(country.code)}
                  className={`
                    flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200
                    touch-manipulation min-h-[64px]
                    ${selectedCountry === country.code
                      ? "bg-red-500/20 border-red-500 text-white"
                      : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 active:scale-95"
                    }
                  `}
                >
                  <CountryFlag code={country.flag} size="md" />
                  <span className="font-medium text-sm truncate">{country.label}</span>
                  {selectedCountry === country.code && (
                    <Check className="w-5 h-5 text-red-400 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAllCountries(true)}
              className="w-full py-3 text-center text-red-400 font-medium hover:text-red-300 transition-colors"
            >
              <FormattedMessage id="wizard.show.all.countries" /> →
            </button>
          </>
        ) : (
          <div className="space-y-2">
            {filteredCountries.slice(0, 20).map((country) => (
              <button
                key={country.code}
                onClick={() => onSelect(country.code)}
                className={`
                  w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200
                  touch-manipulation
                  ${selectedCountry === country.code
                    ? "bg-red-500/20 border-red-500 text-white"
                    : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 active:scale-95"
                  }
                `}
              >
                <CountryFlag code={country.code} size="md" />
                <span className="font-medium">{country.label}</span>
                {selectedCountry === country.code && (
                  <Check className="w-5 h-5 text-red-400 ml-auto" />
                )}
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                <FormattedMessage id="wizard.no.results" />
              </p>
            )}
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button
          onClick={onNext}
          disabled={!selectedCountry || selectedCountry === "all"}
          className={`
            w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2
            transition-all duration-200 touch-manipulation
            ${selectedCountry && selectedCountry !== "all"
              ? "bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 active:scale-[0.98]"
              : "bg-white/10 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          <FormattedMessage id="action.next" />
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ========================================
// Language Step Component
// ========================================
const LanguageStep: React.FC<{
  selectedLanguage: string;
  onSelect: (code: string) => void;
  languageOptions: { code: string; label: string }[];
  onNext: () => void;
  onBack: () => void;
}> = ({ selectedLanguage, onSelect, languageOptions, onNext, onBack }) => {
  const intl = useIntl();

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-2xl flex items-center justify-center">
          <Globe className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          <FormattedMessage id="wizard.step2.title" />
        </h2>
        <p className="text-gray-400 text-sm">
          <FormattedMessage id="wizard.step2.subtitle" />
        </p>
      </div>

      {/* Languages Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-3">
          {POPULAR_LANGUAGES.map((lang) => {
            const option = languageOptions.find(
              (l) => l.code.toLowerCase() === lang.code.toLowerCase()
            );
            const label = option?.label || lang.label;

            return (
              <button
                key={lang.code}
                onClick={() => onSelect(lang.code)}
                className={`
                  flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200
                  touch-manipulation min-h-[72px]
                  ${selectedLanguage === lang.code
                    ? "bg-blue-500/20 border-blue-500 text-white"
                    : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 active:scale-[0.98]"
                  }
                `}
              >
                <CountryFlag code={lang.flag} size="lg" />
                <span className="font-semibold text-lg">{label}</span>
                {selectedLanguage === lang.code && (
                  <Check className="w-6 h-6 text-blue-400 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5" />
          <FormattedMessage id="action.back" />
        </button>
        <button
          onClick={onNext}
          disabled={!selectedLanguage || selectedLanguage === "all"}
          className={`
            flex-1 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2
            transition-all duration-200 touch-manipulation
            ${selectedLanguage && selectedLanguage !== "all"
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 active:scale-[0.98]"
              : "bg-white/10 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          <FormattedMessage id="action.next" />
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ========================================
// Type Step Component
// ========================================
const TypeStep: React.FC<{
  selectedType: "all" | "lawyer" | "expat";
  onSelect: (type: "all" | "lawyer" | "expat") => void;
  onComplete: () => void;
  onBack: () => void;
}> = ({ selectedType, onSelect, onComplete, onBack }) => {
  const intl = useIntl();

  const typeOptions = [
    {
      value: "lawyer" as const,
      icon: Scale,
      color: "from-slate-500 to-slate-700",
      bgColor: "bg-slate-500/20",
      borderColor: "border-slate-500",
      textColor: "text-slate-400",
    },
    {
      value: "expat" as const,
      icon: Globe,
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-500/20",
      borderColor: "border-emerald-500",
      textColor: "text-emerald-400",
    },
    {
      value: "all" as const,
      icon: HelpCircle,
      color: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500",
      textColor: "text-purple-400",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-2xl flex items-center justify-center">
          <Users className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          <FormattedMessage id="wizard.step3.title" />
        </h2>
        <p className="text-gray-400 text-sm">
          <FormattedMessage id="wizard.step3.subtitle" />
        </p>
      </div>

      {/* Type Options */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {typeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedType === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                }}
                className={`
                  w-full p-6 rounded-3xl border-2 transition-all duration-200
                  touch-manipulation text-left
                  ${isSelected
                    ? `${option.bgColor} ${option.borderColor}`
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                  }
                  active:scale-[0.98]
                `}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`
                      w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
                      ${isSelected ? `bg-gradient-to-br ${option.color}` : "bg-white/10"}
                    `}
                  >
                    <Icon className={`w-7 h-7 ${isSelected ? "text-white" : "text-gray-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-bold mb-1 ${isSelected ? "text-white" : "text-gray-200"}`}>
                      <FormattedMessage id={`wizard.step3.${option.value}`} />
                    </h3>
                    <p className={`text-sm ${isSelected ? option.textColor : "text-gray-400"}`}>
                      <FormattedMessage id={`wizard.step3.${option.value}.desc`} />
                    </p>
                  </div>
                  {isSelected && (
                    <Check className={`w-6 h-6 ${option.textColor} flex-shrink-0`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-all touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5" />
          <FormattedMessage id="action.back" />
        </button>
        <button
          onClick={onComplete}
          className="flex-1 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all touch-manipulation active:scale-[0.98]"
        >
          <FormattedMessage id="wizard.seeResults" />
          <ChevronRight className="w-5 h-5" />
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
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-6 pb-4">
        <StepProgressBar currentStep={step} totalSteps={3} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-4 pb-4">
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

      {/* Safe area padding for mobile */}
      <div className="flex-shrink-0 h-safe-area-inset-bottom" />
    </div>
  );
};

export default GuidedFilterWizard;
