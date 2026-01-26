/**
 * Bank Details Encryption
 *
 * Encrypts/decrypts sensitive bank details for affiliate payouts.
 * Uses the existing AES-256-GCM encryption from the project.
 */

import { logger } from "firebase-functions/v2";
import { encrypt, decrypt, isEncrypted } from "../../utils/encryption";
import { BankDetails } from "../types";

/**
 * Fields that should be encrypted in bank details
 */
const SENSITIVE_FIELDS: (keyof BankDetails)[] = [
  "accountHolderName",
  "iban",
  "sortCode",
  "accountNumber",
  "routingNumber",
  "bic",
];

/**
 * Encrypt all sensitive fields in bank details
 */
export function encryptBankDetails(
  bankDetails: BankDetails
): BankDetails {
  const encrypted: BankDetails = { ...bankDetails };

  for (const field of SENSITIVE_FIELDS) {
    const value = encrypted[field];
    if (value && typeof value === "string" && !isEncrypted(value)) {
      try {
        (encrypted[field] as string) = encrypt(value);
      } catch (error) {
        logger.error(`[BankDetailsEncryption] Failed to encrypt field: ${field}`, {
          error,
        });
        throw new Error(`Failed to encrypt bank details: ${field}`);
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt all sensitive fields in bank details
 */
export function decryptBankDetails(
  bankDetails: BankDetails
): BankDetails {
  const decrypted: BankDetails = { ...bankDetails };

  for (const field of SENSITIVE_FIELDS) {
    const value = decrypted[field];
    if (value && typeof value === "string" && isEncrypted(value)) {
      try {
        (decrypted[field] as string) = decrypt(value);
      } catch (error) {
        logger.error(`[BankDetailsEncryption] Failed to decrypt field: ${field}`, {
          error,
        });
        throw new Error(`Failed to decrypt bank details: ${field}`);
      }
    }
  }

  return decrypted;
}

/**
 * Create a masked version of bank account for display
 * e.g., "FR76 **** **** **** **** **** 123"
 */
export function maskBankAccount(
  bankDetails: BankDetails
): string {
  try {
    // Decrypt if needed
    const details = decryptBankDetails(bankDetails);

    switch (details.accountType) {
      case "iban":
        return maskIBAN(details.iban || "");

      case "sort_code":
        return maskSortCode(details.sortCode || "", details.accountNumber || "");

      case "aba":
        return maskABA(details.routingNumber || "", details.accountNumber || "");

      default:
        return "****";
    }
  } catch (error) {
    logger.warn("[BankDetailsEncryption] Failed to mask account", { error });
    return "****-****";
  }
}

/**
 * Mask IBAN (show country code and last 4 digits)
 * FR76 1234 5678 9012 3456 7890 123 -> FR76 **** **** **** **** **** 123
 */
function maskIBAN(iban: string): string {
  if (!iban || iban.length < 8) return "****";

  const cleaned = iban.replace(/\s/g, "");
  const countryCode = cleaned.substring(0, 4);
  const lastDigits = cleaned.substring(cleaned.length - 3);

  return `${countryCode} ${"**** ".repeat(5)}${lastDigits}`;
}

/**
 * Mask UK Sort Code + Account Number
 * 12-34-56 / 12345678 -> **-**-56 / ****5678
 */
function maskSortCode(sortCode: string, accountNumber: string): string {
  const maskedSort = sortCode.length >= 6
    ? `**-**-${sortCode.substring(sortCode.length - 2)}`
    : "**-**-**";

  const maskedAccount = accountNumber.length >= 4
    ? `****${accountNumber.substring(accountNumber.length - 4)}`
    : "********";

  return `${maskedSort} / ${maskedAccount}`;
}

/**
 * Mask US ABA Routing + Account Number
 * 123456789 / 1234567890 -> *****6789 / ******7890
 */
function maskABA(routingNumber: string, accountNumber: string): string {
  const maskedRouting = routingNumber.length >= 4
    ? `*****${routingNumber.substring(routingNumber.length - 4)}`
    : "*********";

  const maskedAccount = accountNumber.length >= 4
    ? `${"*".repeat(accountNumber.length - 4)}${accountNumber.substring(accountNumber.length - 4)}`
    : "**********";

  return `${maskedRouting} / ${maskedAccount}`;
}

/**
 * Validate IBAN format
 */
export function validateIBAN(iban: string): { valid: boolean; error?: string } {
  if (!iban) {
    return { valid: false, error: "IBAN is required" };
  }

  const cleaned = iban.replace(/\s/g, "").toUpperCase();

  // Basic format check
  if (cleaned.length < 15 || cleaned.length > 34) {
    return { valid: false, error: "IBAN must be between 15 and 34 characters" };
  }

  // Check country code (first 2 chars are letters)
  if (!/^[A-Z]{2}/.test(cleaned)) {
    return { valid: false, error: "IBAN must start with a 2-letter country code" };
  }

  // Check check digits (chars 3-4 are digits)
  if (!/^[A-Z]{2}[0-9]{2}/.test(cleaned)) {
    return { valid: false, error: "Invalid IBAN check digits" };
  }

  // MOD-97 validation
  if (!isValidIBANChecksum(cleaned)) {
    return { valid: false, error: "Invalid IBAN checksum" };
  }

  return { valid: true };
}

/**
 * IBAN MOD-97 checksum validation
 */
function isValidIBANChecksum(iban: string): boolean {
  // Move first 4 chars to end
  const rearranged = iban.substring(4) + iban.substring(0, 4);

  // Convert letters to numbers (A=10, B=11, etc.)
  let numericString = "";
  for (const char of rearranged) {
    if (/[A-Z]/.test(char)) {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else {
      numericString += char;
    }
  }

  // MOD 97 calculation (handle large numbers by processing in chunks)
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = remainder.toString() + numericString.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  return remainder === 1;
}

/**
 * Validate UK Sort Code format
 */
export function validateSortCode(sortCode: string): { valid: boolean; error?: string } {
  if (!sortCode) {
    return { valid: false, error: "Sort code is required" };
  }

  const cleaned = sortCode.replace(/[-\s]/g, "");

  if (!/^[0-9]{6}$/.test(cleaned)) {
    return { valid: false, error: "Sort code must be 6 digits" };
  }

  return { valid: true };
}

/**
 * Validate UK Account Number format
 */
export function validateUKAccountNumber(accountNumber: string): { valid: boolean; error?: string } {
  if (!accountNumber) {
    return { valid: false, error: "Account number is required" };
  }

  const cleaned = accountNumber.replace(/\s/g, "");

  if (!/^[0-9]{8}$/.test(cleaned)) {
    return { valid: false, error: "UK account number must be 8 digits" };
  }

  return { valid: true };
}

/**
 * Validate US ABA Routing Number format
 */
export function validateABARouting(routingNumber: string): { valid: boolean; error?: string } {
  if (!routingNumber) {
    return { valid: false, error: "Routing number is required" };
  }

  const cleaned = routingNumber.replace(/\s/g, "");

  if (!/^[0-9]{9}$/.test(cleaned)) {
    return { valid: false, error: "ABA routing number must be 9 digits" };
  }

  // ABA checksum validation
  const digits = cleaned.split("").map(Number);
  const checksum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8]);

  if (checksum % 10 !== 0) {
    return { valid: false, error: "Invalid ABA routing number checksum" };
  }

  return { valid: true };
}

/**
 * Validate US Account Number format
 */
export function validateUSAccountNumber(accountNumber: string): { valid: boolean; error?: string } {
  if (!accountNumber) {
    return { valid: false, error: "Account number is required" };
  }

  const cleaned = accountNumber.replace(/\s/g, "");

  if (!/^[0-9]{4,17}$/.test(cleaned)) {
    return { valid: false, error: "US account number must be 4-17 digits" };
  }

  return { valid: true };
}

/**
 * Validate bank details based on account type
 */
export function validateBankDetails(
  bankDetails: Partial<BankDetails>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!bankDetails.accountType) {
    errors.push("Account type is required");
  }

  if (!bankDetails.accountHolderName) {
    errors.push("Account holder name is required");
  }

  if (!bankDetails.country) {
    errors.push("Country is required");
  }

  if (!bankDetails.currency) {
    errors.push("Currency is required");
  }

  // Type-specific validation
  switch (bankDetails.accountType) {
    case "iban":
      if (bankDetails.iban) {
        const ibanResult = validateIBAN(bankDetails.iban);
        if (!ibanResult.valid) {
          errors.push(ibanResult.error!);
        }
      } else {
        errors.push("IBAN is required for this account type");
      }
      break;

    case "sort_code":
      if (bankDetails.sortCode) {
        const sortResult = validateSortCode(bankDetails.sortCode);
        if (!sortResult.valid) {
          errors.push(sortResult.error!);
        }
      } else {
        errors.push("Sort code is required for UK accounts");
      }

      if (bankDetails.accountNumber) {
        const accResult = validateUKAccountNumber(bankDetails.accountNumber);
        if (!accResult.valid) {
          errors.push(accResult.error!);
        }
      } else {
        errors.push("Account number is required for UK accounts");
      }
      break;

    case "aba":
      if (bankDetails.routingNumber) {
        const routingResult = validateABARouting(bankDetails.routingNumber);
        if (!routingResult.valid) {
          errors.push(routingResult.error!);
        }
      } else {
        errors.push("Routing number is required for US accounts");
      }

      if (bankDetails.accountNumber) {
        const accResult = validateUSAccountNumber(bankDetails.accountNumber);
        if (!accResult.valid) {
          errors.push(accResult.error!);
        }
      } else {
        errors.push("Account number is required for US accounts");
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
