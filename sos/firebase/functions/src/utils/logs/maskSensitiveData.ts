/**
 * maskSensitiveData.ts
 *
 * P0-8 FIX: Utilitaires pour masquer les données sensibles dans les logs.
 *
 * RGPD Compliance:
 * - Masquer les emails: john.doe@gmail.com → jo***@gmail.com
 * - Masquer les montants: 45.00 → [AMOUNT]
 * - Masquer les téléphones: +33612345678 → +336***678
 * - Masquer les tokens/secrets partiellement
 *
 * Usage:
 * import { maskEmail, maskAmount, maskPhone, maskSensitive } from './utils/logs/maskSensitiveData';
 * console.log(`Email sent to ${maskEmail(email)}`);
 */

/**
 * Masque une adresse email
 * Exemple: john.doe@gmail.com → jo***@gmail.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "[NO_EMAIL]";

  const parts = email.split("@");
  if (parts.length !== 2) return "[INVALID_EMAIL]";

  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0] || "*"}***@${domain}`;
  }

  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * Masque un montant pour les logs
 * Option: afficher une plage approximative ou masquer complètement
 */
export function maskAmount(amount: number | null | undefined, showRange: boolean = false): string {
  if (amount === null || amount === undefined) return "[NO_AMOUNT]";

  if (!showRange) {
    return "[AMOUNT]";
  }

  // Afficher une plage pour le debugging sans révéler le montant exact
  if (amount < 10) return "[0-10]";
  if (amount < 50) return "[10-50]";
  if (amount < 100) return "[50-100]";
  if (amount < 500) return "[100-500]";
  return "[500+]";
}

/**
 * Masque un numéro de téléphone
 * Exemple: +33612345678 → +336***678
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "[NO_PHONE]";

  const cleaned = phone.replace(/\s/g, "");

  if (cleaned.length < 6) return "[PHONE]";

  // Garder le préfixe et les 3 derniers chiffres
  const prefix = cleaned.substring(0, 4);
  const suffix = cleaned.substring(cleaned.length - 3);

  return `${prefix}***${suffix}`;
}

/**
 * Masque un ID utilisateur (garder les premiers caractères pour le debugging)
 * Exemple: abc123def456 → abc1***
 */
export function maskUserId(userId: string | null | undefined): string {
  if (!userId) return "[NO_USER]";

  if (userId.length <= 4) return `${userId[0] || "*"}***`;

  return `${userId.substring(0, 4)}***`;
}

/**
 * Masque un token/secret (garder juste le début pour identifier le type)
 * Exemple: sk_live_abc123... → sk_live_***
 */
export function maskToken(token: string | null | undefined): string {
  if (!token) return "[NO_TOKEN]";

  // Identifier les préfixes connus
  const knownPrefixes = ["sk_live_", "sk_test_", "whsec_", "Bearer ", "Basic "];

  for (const prefix of knownPrefixes) {
    if (token.startsWith(prefix)) {
      return `${prefix}***`;
    }
  }

  // Garder les 4 premiers caractères
  if (token.length <= 4) return "***";

  return `${token.substring(0, 4)}***`;
}

/**
 * Masque un objet contenant des données sensibles
 * Retourne une version safe pour les logs
 */
export function maskSensitiveObject<T extends Record<string, any>>(
  obj: T,
  sensitiveFields: string[] = ["email", "phone", "amount", "token", "secret", "password"]
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveFields.some((field) => lowerKey.includes(field))) {
      if (lowerKey.includes("email")) {
        result[key] = maskEmail(value);
      } else if (lowerKey.includes("phone")) {
        result[key] = maskPhone(value);
      } else if (lowerKey.includes("amount") || lowerKey.includes("price")) {
        result[key] = maskAmount(value, true);
      } else {
        result[key] = "[REDACTED]";
      }
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Récursif pour les objets imbriqués
      result[key] = maskSensitiveObject(value, sensitiveFields);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Créer un logger safe qui masque automatiquement les données sensibles
 */
export function createSafeLogger(prefix: string) {
  return {
    info: (message: string, data?: Record<string, any>) => {
      const safeData = data ? maskSensitiveObject(data) : undefined;
      if (safeData) {
        console.log(`${prefix} ${message}`, safeData);
      } else {
        console.log(`${prefix} ${message}`);
      }
    },
    warn: (message: string, data?: Record<string, any>) => {
      const safeData = data ? maskSensitiveObject(data) : undefined;
      if (safeData) {
        console.warn(`${prefix} ${message}`, safeData);
      } else {
        console.warn(`${prefix} ${message}`);
      }
    },
    error: (message: string, error?: Error | Record<string, any>) => {
      if (error instanceof Error) {
        console.error(`${prefix} ${message}`, error.message);
      } else if (error) {
        const safeData = maskSensitiveObject(error);
        console.error(`${prefix} ${message}`, safeData);
      } else {
        console.error(`${prefix} ${message}`);
      }
    },
  };
}

/**
 * Exporter toutes les fonctions pour un import simplifié
 */
export const mask = {
  email: maskEmail,
  amount: maskAmount,
  phone: maskPhone,
  userId: maskUserId,
  token: maskToken,
  object: maskSensitiveObject,
};
