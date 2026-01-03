/**
 * truncateId.ts
 *
 * P2-2 FIX: Utilitaire pour tronquer les IDs sensibles dans les logs.
 *
 * Évite d'exposer les IDs complets dans les logs tout en gardant
 * suffisamment d'information pour le débogage.
 *
 * Format: 8 premiers caractères + "..."
 * Exemple: "abc123456789" → "abc12345..."
 */

/**
 * Tronque un ID à 8 caractères + "..."
 * Retourne "[null]" si l'ID est null/undefined
 * Retourne "[empty]" si l'ID est une chaîne vide
 */
export function truncateId(id: string | null | undefined, length: number = 8): string {
  if (id === null || id === undefined) {
    return "[null]";
  }

  const strId = String(id);

  if (strId.length === 0) {
    return "[empty]";
  }

  if (strId.length <= length) {
    return strId;
  }

  return `${strId.substring(0, length)}...`;
}

/**
 * Tronque plusieurs IDs dans un objet
 * Utile pour les logs avec plusieurs champs ID
 */
export function truncateIds<T extends Record<string, unknown>>(
  obj: T,
  idFields: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of idFields) {
    const value = result[field];
    if (typeof value === "string") {
      (result as any)[field] = truncateId(value);
    }
  }

  return result;
}

/**
 * Masque un email pour les logs
 * Format: "a***@domain.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "[null]";

  const parts = email.split("@");
  if (parts.length !== 2) return "[invalid]";

  const localPart = parts[0];
  const domain = parts[1];

  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }

  return `${localPart[0]}***@${domain}`;
}

/**
 * Masque un numéro de téléphone pour les logs
 * Format: "+33***1234"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "[null]";

  const cleaned = phone.replace(/\s/g, "");

  if (cleaned.length < 8) {
    return "***" + cleaned.slice(-4);
  }

  // Garder le préfixe pays et les 4 derniers chiffres
  const countryCode = cleaned.startsWith("+") ? cleaned.slice(0, 3) : "";
  const lastDigits = cleaned.slice(-4);

  return `${countryCode}***${lastDigits}`;
}

/**
 * P2-6 FIX: Masque un montant pour les logs
 * Affiche seulement la plage: "<10€", "10-50€", "50-100€", ">100€"
 */
export function maskAmount(amount: number | null | undefined, currency = "EUR"): string {
  if (amount === null || amount === undefined) return "[null]";
  if (typeof amount !== "number" || isNaN(amount)) return "[invalid]";

  const symbol = currency === "USD" ? "$" : "€";

  if (amount < 10) return `<10${symbol}`;
  if (amount < 50) return `10-50${symbol}`;
  if (amount < 100) return `50-100${symbol}`;
  if (amount < 500) return `100-500${symbol}`;
  return `>500${symbol}`;
}

/**
 * Crée un objet de log sécurisé en masquant automatiquement les champs sensibles
 */
export function safeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const idFields = [
    "userId", "clientId", "providerId", "sessionId", "callSessionId",
    "paymentIntentId", "orderId", "transactionId", "subscriptionId",
    "recordingSid", "conferenceSid", "callSid", "taskId", "uid",
    "stripeAccountId", "merchantId", "payoutId", "refundId"
  ];

  const emailFields = ["email", "clientEmail", "providerEmail", "userEmail"];
  const phoneFields = ["phone", "phoneNumber", "clientPhone", "providerPhone"];
  // P2-6: Champs de montant à masquer
  const amountFields = ["amount", "totalAmount", "providerAmount", "commissionAmount", "refundAmount", "payoutAmount"];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      result[key] = value;
      continue;
    }

    // IDs
    if (idFields.some(f => key.toLowerCase().includes(f.toLowerCase())) && typeof value === "string") {
      result[key] = truncateId(value);
      continue;
    }

    // Emails
    if (emailFields.some(f => key.toLowerCase().includes(f.toLowerCase())) && typeof value === "string") {
      result[key] = maskEmail(value);
      continue;
    }

    // Phones
    if (phoneFields.some(f => key.toLowerCase().includes(f.toLowerCase())) && typeof value === "string") {
      result[key] = maskPhone(value);
      continue;
    }

    // P2-6: Amounts
    if (amountFields.some(f => key.toLowerCase().includes(f.toLowerCase())) && typeof value === "number") {
      const currency = (data.currency as string) || "EUR";
      result[key] = maskAmount(value, currency);
      continue;
    }

    // Nested objects (recursion avec limite de profondeur)
    if (typeof value === "object" && !Array.isArray(value)) {
      result[key] = safeLogData(value as Record<string, unknown>);
      continue;
    }

    result[key] = value;
  }

  return result;
}
