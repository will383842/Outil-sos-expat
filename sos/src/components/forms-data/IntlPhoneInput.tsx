import React, { useCallback, useMemo } from "react";
import PhoneInput, { CountryData } from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { parsePhoneNumberFromString } from "libphonenumber-js";

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
}

const normalizeCountry = (country?: string): string => {
  if (!country) return "fr";
  return country.toLowerCase();
};

/**
 * Composant de saisie téléphonique international
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
}) => {
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