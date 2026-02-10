// Centralized error mapping for registration forms
// Maps Firebase/Stripe error strings to i18n keys

import type { IntlShape } from 'react-intl';

export const getRegistrationErrorMessage = (
  err: unknown,
  intl: IntlShape,
  i18nPrefix: 'registerLawyer' | 'registerExpat',
  countryName?: string,
  countryCode?: string
): string => {
  const generic = intl.formatMessage({ id: `${i18nPrefix}.errors.generic` });

  if (!(err instanceof Error)) return generic;

  const msg = err.message;

  if (msg.includes('email-already-in-use') || msg.includes('already')) {
    return intl.formatMessage({ id: `${i18nPrefix}.errors.emailAlreadyInUse` });
  }
  if (msg.includes('email-linked-to-google') || msg.includes('Google')) {
    return intl.formatMessage({ id: `${i18nPrefix}.errors.emailLinkedToGoogle` });
  }
  if (msg.includes('weak-password') || msg.includes('6 caractères')) {
    return intl.formatMessage({ id: `${i18nPrefix}.errors.weakPassword` });
  }
  if (msg.includes('invalid-email') || msg.includes('email invalide')) {
    return intl.formatMessage({ id: `${i18nPrefix}.errors.invalidEmail` });
  }
  if (msg.includes('network') || msg.includes('réseau')) {
    return intl.formatMessage({ id: `${i18nPrefix}.errors.network` });
  }
  if (msg.includes('timeout') || msg.includes('délai')) {
    return intl.formatMessage({ id: `${i18nPrefix}.errors.timeout` });
  }
  if (msg.includes('permissions') || msg.includes('permission')) {
    return intl.formatMessage({ id: `${i18nPrefix}.errors.permissions` });
  }
  if (msg.includes('not currently supported by Stripe') || msg.includes('not supported')) {
    if (countryName && countryCode) {
      return `Le pays "${countryName}" (${countryCode}) n'est pas encore supporté par notre système de paiement. Votre compte a été créé mais vous devrez contacter le support pour activer les paiements.`;
    }
    return intl.formatMessage({ id: `${i18nPrefix}.errors.stripeUnsupported` });
  }
  if (msg.includes('Stripe') || msg.includes('stripe')) {
    return intl.formatMessage({ id: `${i18nPrefix}.errors.stripe` });
  }
  if (msg.length > 10 && msg.length < 200) {
    return msg;
  }

  return generic;
};
