/**
 * Centralized validation utilities for email, phone, and IBAN.
 * Uses libphonenumber-js for phone validation (already installed).
 * IBAN uses MOD-97 checksum per ISO 13616.
 */

import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

// ============================================================================
// EMAIL
// ============================================================================

/**
 * Validate email address.
 * Uses the same proven regex pattern as AuthContext + RFC 5321 length check.
 */
export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// PHONE
// ============================================================================

/**
 * Validate phone number using libphonenumber-js.
 * Supports international format (+33...) and national format with country hint.
 *
 * @param phone - Phone number string
 * @param countryCode - Optional ISO 3166-1 alpha-2 country code (e.g., 'FR', 'US')
 * @returns true if valid
 */
export function validatePhone(phone: string, countryCode?: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 8) return false;

  try {
    return isValidPhoneNumber(cleaned, countryCode as Parameters<typeof isValidPhoneNumber>[1]);
  } catch {
    // Fallback for edge cases where libphonenumber-js can't parse
    const digits = cleaned.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }
}

/**
 * Parse and format a phone number to E.164 format.
 * Returns null if invalid.
 */
export function formatPhoneE164(phone: string, countryCode?: string): string | null {
  try {
    const parsed = parsePhoneNumber(phone, countryCode as Parameters<typeof parsePhoneNumber>[1]);
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164');
    }
  } catch {
    // ignore
  }
  return null;
}

// ============================================================================
// IBAN
// ============================================================================

/**
 * Validate IBAN with full MOD-97 checksum (ISO 13616).
 * Same algorithm as backend bankDetailsEncryption.ts.
 */
export function validateIBAN(iban: string): boolean {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  // Length check: 15-34 chars
  if (cleaned.length < 15 || cleaned.length > 34) return false;

  // Country code: first 2 chars must be letters
  if (!/^[A-Z]{2}/.test(cleaned)) return false;

  // Check digits: chars 3-4 must be digits
  if (!/^[A-Z]{2}[0-9]{2}/.test(cleaned)) return false;

  // MOD-97 checksum validation
  return isValidIBANChecksum(cleaned);
}

function isValidIBANChecksum(iban: string): boolean {
  // Move first 4 chars to end
  const rearranged = iban.substring(4) + iban.substring(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    if (/[A-Z]/.test(char)) {
      numericString += (char.charCodeAt(0) - 55).toString();
    } else {
      numericString += char;
    }
  }

  // MOD 97 calculation with chunking for large numbers
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = remainder.toString() + numericString.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  return remainder === 1;
}
