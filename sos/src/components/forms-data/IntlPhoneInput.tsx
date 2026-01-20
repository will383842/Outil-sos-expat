import React, { useCallback, useMemo, useRef } from "react";
import PhoneInput, { CountryData } from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { phoneCodesData } from "@/data/phone-codes";
import { Locale, getDetectedBrowserLanguage } from "./shared";
import { smartNormalizePhone } from "@/utils/phone";

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

  // Track current selected country (pour la normalisation)
  const currentCountryRef = useRef<string>(defaultCountry);

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

  // Gestion du changement de valeur avec normalisation intelligente
  const handleChange = useCallback(
    (inputValue: string, country: CountryData) => {
      // Mettre à jour le pays courant
      if (country?.countryCode) {
        currentCountryRef.current = country.countryCode;
      }

      if (!inputValue) {
        onChange("");
        return;
      }

      // ✅ FIX: Supprimer automatiquement le trunk prefix (0) pour les pays qui l'utilisent
      // Quand l'utilisateur tape "0700000000" avec FR sélectionné, react-phone-input-2 envoie "330700000000"
      // On doit supprimer le 0 pour avoir "33700000000" → "+33700000000"
      // Cela permet à l'utilisateur de taper son numéro naturellement avec le 0
      let cleanedInput = inputValue;
      const dialCode = country?.dialCode || '';

      if (dialCode && inputValue.startsWith(dialCode)) {
        const nationalPart = inputValue.slice(dialCode.length);

        // Liste des pays avec trunk prefix "0" (la plupart des pays européens, etc.)
        // Ces pays utilisent un 0 devant le numéro national qui doit être supprimé en format international
        const countriesWithTrunkPrefix0 = [
          'fr', 'gb', 'de', 'it', 'be', 'ch', 'at', 'nl', 'pt', 'pl', 'cz', 'hu', 'ro', 'bg',
          'gr', 'se', 'no', 'dk', 'fi', 'ie', 'lu', 'sk', 'si', 'hr', 'lt', 'lv', 'ee',
          'ma', 'dz', 'tn', 'eg', 'za', 'ng', 'ke', 'au', 'nz', 'jp', 'kr', 'in', 'id',
          'my', 'th', 'vn', 'ph', 'tr', 'il', 'ae', 'sa', 'qa', 'kw', 'bh', 'om'
        ];

        const countryCode = (country?.countryCode || '').toLowerCase();

        // Si le pays utilise un trunk prefix 0 ET que le numéro national commence par 0
        if (countriesWithTrunkPrefix0.includes(countryCode) && nationalPart.startsWith('0')) {
          // Supprimer le 0 initial
          cleanedInput = dialCode + nationalPart.slice(1);
          console.log('[IntlPhoneInput] Trunk prefix "0" supprimé:', {
            before: inputValue,
            after: cleanedInput,
            country: countryCode,
          });
        }
      }

      // Ajouter le + et passer la valeur
      let valueWithPlus = `+${cleanedInput}`;

      // ✅ P0 FIX: Détecter et corriger le format "00" (ex: 0033612345678 → +33612345678)
      // react-phone-input-2 ne gère pas bien ce format
      if (inputValue.startsWith('00') && inputValue.length > 4) {
        valueWithPlus = '+' + inputValue.slice(2);
        console.log('[IntlPhoneInput] Format "00" détecté, conversion:', {
          before: inputValue,
          after: valueWithPlus,
        });
      }

      // ✅ P0 FIX: Normaliser en temps réel UNIQUEMENT pour les cas problématiques
      // Pour ne pas gêner l'utilisateur qui veut modifier manuellement
      const digitsOnly = inputValue.replace(/\D/g, '');
      const shouldNormalize =
        digitsOnly.length >= 10 &&  // Numéro semble complet (10+ chiffres)
        !valueWithPlus.startsWith('+1') &&  // Pas déjà au format international standard
        (
          inputValue.startsWith('00') ||  // Format "00" à corriger
          !inputValue.startsWith('+')  // Format national à convertir
        );

      if (shouldNormalize) {
        // Essayer de détecter automatiquement le pays depuis le numéro
        let detectedCountry = country?.countryCode?.toUpperCase() || 'FR';
        try {
          const parsed = parsePhoneNumberFromString(valueWithPlus);
          if (parsed?.country) {
            detectedCountry = parsed.country;
            // Mettre à jour le ref pour le blur
            currentCountryRef.current = parsed.country.toLowerCase();
          }
        } catch {
          // Ignorer les erreurs de parsing
        }

        const result = smartNormalizePhone(valueWithPlus, detectedCountry as never);

        // ✅ Si la normalisation réussit ET que le résultat est différent, normaliser
        // ⚠️ Si elle échoue, laisser passer (l'user peut vouloir un format spécifique)
        if (result.ok && result.e164 && result.e164 !== valueWithPlus) {
          console.log('[IntlPhoneInput] Normalisation en temps réel:', {
            input: inputValue,
            country: detectedCountry,
            output: result.e164,
          });
          onChange(result.e164);
          return;
        }
      }

      // Par défaut, laisser passer la valeur saisie (ne pas bloquer l'utilisateur)
      // La validation RHF + normalisation au blur s'en chargeront
      onChange(valueWithPlus);
    },
    [onChange]
  );

  // Normalisation au blur - filet de sécurité final
  // Gère tous les formats : 0612345678, 06 12 34 56 78, +33612345678, 0033612345678, etc.
  const handleBlur = useCallback(() => {
    if (value) {
      const country = currentCountryRef.current.toUpperCase();

      console.log('[IntlPhoneInput] Blur - Normalisation:', {
        input: value,
        country,
      });

      const result = smartNormalizePhone(value, country as never);

      if (result.ok && result.e164) {
        // ✅ Mettre à jour TOUJOURS si on a un E.164 valide
        // (même si c'est identique, pour s'assurer que le state est cohérent)
        if (result.e164 !== value) {
          console.log('[IntlPhoneInput] Blur - Normalisation appliquée:', {
            before: value,
            after: result.e164,
          });
          onChange(result.e164);
        } else {
          console.log('[IntlPhoneInput] Blur - Déjà normalisé:', result.e164);
        }
      } else {
        console.warn('[IntlPhoneInput] Blur - Normalisation échouée:', {
          input: value,
          reason: result.reason,
        });
      }
    }

    // Appeler le onBlur externe si présent
    onBlur?.();
  }, [value, onChange, onBlur]);

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
        // ✅ Permet de taper des numéros plus longs (pour gérer le trunk prefix 0)
        // Sans cette option, react-phone-input-2 bloque la saisie à la longueur standard du pays
        enableLongNumbers
        // ✅ Utilise les données de phone-codes.ts pour les noms de pays localisés
        localization={localization}
        // ✅ Pays prioritaires en haut de la liste
        preferredCountries={PREFERRED_COUNTRIES}
        inputProps={{
          name,
          id,
          autoComplete: "tel",
          onKeyDown: handleKeyDown,
          onBlur: handleBlur,
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