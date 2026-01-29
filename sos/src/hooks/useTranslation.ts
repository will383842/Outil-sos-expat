/**
 * useTranslation Hook
 *
 * Wrapper around react-intl's useIntl to provide a simpler t() function API.
 * This makes components cleaner and easier to read.
 */

import { useIntl } from "react-intl";

export function useTranslation() {
  const intl = useIntl();

  /**
   * Translate a message by ID
   * @param id - The message ID from translations
   * @param values - Optional interpolation values
   * @param defaultMessage - Optional fallback message
   */
  const t = (id: string, values?: Record<string, string | number>, defaultMessage?: string): string => {
    return intl.formatMessage(
      { id, defaultMessage: defaultMessage || id },
      values
    );
  };

  return { t, intl, locale: intl.locale };
}

export default useTranslation;
