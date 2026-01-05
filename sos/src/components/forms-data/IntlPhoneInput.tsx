import React, { useCallback, useMemo } from "react";
import PhoneInput, { CountryData } from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { phoneCodesData } from "@/data/phone-codes";
import { Locale, getDetectedBrowserLanguage } from "./shared";

interface IntlPhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  defaultCountry?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  inputProps?: Record<string, unknown>;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  /** Locale for country names (fr, en, es, de, pt, ru, ch, hi, ar) */
  locale?: Locale;
}

// Map locale to phoneCodesData field
const localeToField: Record<Locale, keyof typeof phoneCodesData[0]> = {
  fr: 'fr',
  en: 'en',
  es: 'es',
  de: 'de',
  pt: 'pt',
  ru: 'ru',
  ch: 'zh',
  hi: 'hi',
  ar: 'ar',
};

// Build localization object from phoneCodesData
const buildLocalization = (locale: Locale): Record<string, string> => {
  const field = localeToField[locale] || 'en';
  const localization: Record<string, string> = {};

  phoneCodesData.forEach((country) => {
    if (!country.disabled) {
      // react-phone-input-2 uses lowercase country codes
      localization[country.code.toLowerCase()] = country[field] as string;
    }
  });

  return localization;
};

// Preferred countries (most common)
const PREFERRED_COUNTRIES = ['fr', 'us', 'gb', 'de', 'es', 'it', 'be', 'ch', 'ca', 'au'];

const normalizeCountry = (country?: string): string => {
  if (!country) return "fr";
  return country.toLowerCase();
};

/**
 * Composant de saisie téléphonique international
 * Utilise les données de phone-codes.ts pour la localisation des noms de pays
 * Utilise UNIQUEMENT le CSS externe pour le styling (pas de styles inline)
 */
const IntlPhoneInput: React.FC<IntlPhoneInputProps> = ({
  value,
  onChange,
  onBlur,
  defaultCountry = "fr",
  placeholder,
  className = "",
  disabled = false,
  name,
  id,
  inputProps: externalInputProps,
  "aria-required": ariaRequired,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  locale,
}) => {
  // Detect current locale
  const currentLocale: Locale = useMemo(() => locale || getDetectedBrowserLanguage(), [locale]);

  // Build localization object based on current locale
  const localization = useMemo(() => buildLocalization(currentLocale), [currentLocale]);

  // Formater la valeur (retirer le +)
  const formattedValue = useMemo(
    () => (value ? value.replace(/^\+/, "") : ""),
    [value]
  );

  // Gestion des touches clavier
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Bloquer les espaces
      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        return;
      }

      // Gestion du Backspace
      if (event.key === "Backspace") {
        const currentValue = value || "";
        const digitsOnly = currentValue.replace(/[^\d]/g, "");
        
        if (!digitsOnly) {
          event.preventDefault();
          onChange("");
          return;
        }

        const parsed = parsePhoneNumberFromString(currentValue);
        const codeLength = parsed?.countryCallingCode?.length ?? 0;
        
        if (codeLength && digitsOnly.length <= codeLength) {
          event.preventDefault();
          onChange("");
        }
      }
    },
    [onChange, value]
  );

  // Gestion du changement de valeur
  const handleChange = useCallback(
    (inputValue: string, _country: CountryData) => {
      onChange(inputValue ? `+${inputValue}` : "");
    },
    [onChange]
  );

  return (
    <div className={`intl-phone-input ${className}`}>
      <PhoneInput
        country={normalizeCountry(defaultCountry)}
        value={formattedValue}
        onChange={handleChange}
        enableSearch
        disableSearchIcon
        countryCodeEditable={false}
        specialLabel=""
        placeholder={placeholder}
        disabled={disabled}
        // ✅ Utilise les données de phone-codes.ts pour les noms de pays localisés
        localization={localization}
        // ✅ Pays prioritaires en haut de la liste
        preferredCountries={PREFERRED_COUNTRIES}
        inputProps={{
          name,
          id,
          autoComplete: "tel",
          onKeyDown: handleKeyDown,
          onBlur,
          "aria-required": ariaRequired,
          "aria-invalid": ariaInvalid,
          "aria-describedby": ariaDescribedBy,
          ...externalInputProps,
        }}
        // ✅ Utilise uniquement les classes CSS (pas de styles inline)
        containerClass="react-tel-input"
        inputClass="form-control"
        buttonClass="flag-dropdown"
        dropdownClass="country-list"
      />
    </div>
  );
};

export default IntlPhoneInput;