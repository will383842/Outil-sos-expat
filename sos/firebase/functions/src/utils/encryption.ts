/**
 * Encryption utilities for sensitive data (phone numbers, etc.)
 * Uses AES-256-GCM for authenticated encryption
 *
 * IMPORTANT: Store ENCRYPTION_KEY in Firebase secrets/environment variables
 * Generate with: openssl rand -base64 32
 */

import * as crypto from 'crypto';
import { logger } from 'firebase-functions';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const KEY_LENGTH = 32; // 256 bits

// Prefix to identify encrypted values
const ENCRYPTED_PREFIX = 'enc:';

// ============================================================================
// KEY MANAGEMENT
// ============================================================================

let encryptionKey: Buffer | null = null;

/**
 * Get the encryption key from environment
 * The key should be a base64-encoded 32-byte string
 */
function getEncryptionKey(): Buffer {
  if (encryptionKey) {
    return encryptionKey;
  }

  const keyString = process.env.ENCRYPTION_KEY;

  if (!keyString) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }

  try {
    encryptionKey = Buffer.from(keyString, 'base64');

    if (encryptionKey.length !== KEY_LENGTH) {
      throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${encryptionKey.length}`);
    }

    return encryptionKey;
  } catch (error) {
    throw new Error('Failed to parse ENCRYPTION_KEY: must be a valid base64-encoded 32-byte string');
  }
}

// ============================================================================
// CORE ENCRYPTION/DECRYPTION
// ============================================================================

/**
 * Encrypt a string value
 * Returns: "enc:<iv_base64>:<authTag_base64>:<ciphertext_base64>"
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.startsWith(ENCRYPTED_PREFIX)) {
    return plaintext; // Already encrypted or empty
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: enc:<iv>:<tag>:<ciphertext>
  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * Expects format: "enc:<iv_base64>:<authTag_base64>:<ciphertext_base64>"
 */
export function decrypt(encryptedValue: string): string {
  if (!encryptedValue || !encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
    return encryptedValue; // Not encrypted or empty
  }

  try {
    const key = getEncryptionKey();

    // Remove prefix and split parts
    const parts = encryptedValue.slice(ENCRYPTED_PREFIX.length).split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }

    const [ivBase64, tagBase64, ciphertext] = parts;

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(tagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('[Encryption] Decryption failed:', error);
    throw new Error('Failed to decrypt value');
  }
}

// ============================================================================
// PHONE NUMBER SPECIFIC FUNCTIONS
// ============================================================================

/**
 * Encrypt a phone number
 */
export function encryptPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;

  // Normalize phone number (remove spaces, keep + and digits)
  const normalized = phoneNumber.replace(/[^\d+]/g, '');

  return encrypt(normalized);
}

/**
 * Decrypt a phone number
 */
export function decryptPhoneNumber(encryptedPhone: string): string {
  if (!encryptedPhone) return encryptedPhone;

  return decrypt(encryptedPhone);
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(ENCRYPTED_PREFIX) ?? false;
}

/**
 * Mask a phone number for display (shows last 4 digits)
 * e.g., "+33612345678" -> "+33******5678"
 */
export function maskPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';

  // If encrypted, decrypt first
  const decrypted = isEncrypted(phoneNumber) ? decrypt(phoneNumber) : phoneNumber;

  if (decrypted.length <= 4) return '****';

  const prefix = decrypted.slice(0, decrypted.length > 6 ? 3 : 1);
  const suffix = decrypted.slice(-4);
  const maskLength = decrypted.length - prefix.length - suffix.length;

  return `${prefix}${'*'.repeat(maskLength)}${suffix}`;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Encrypt multiple fields in an object
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    const value = result[field];
    if (typeof value === 'string') {
      (result[field] as unknown) = encrypt(value);
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in an object
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (typeof value === 'string' && isEncrypted(value)) {
      (result[field] as unknown) = decrypt(value);
    }
  }

  return result;
}

// ============================================================================
// KEY ROTATION SUPPORT
// ============================================================================

/**
 * Re-encrypt a value with a new key
 * Used during key rotation
 */
export function reEncrypt(encryptedValue: string, newKeyBase64: string): string {
  // Decrypt with current key
  const plaintext = decrypt(encryptedValue);

  // Temporarily use new key
  const originalKey = encryptionKey;
  encryptionKey = Buffer.from(newKeyBase64, 'base64');

  try {
    // Encrypt with new key
    const newEncrypted = encrypt(plaintext);
    return newEncrypted;
  } finally {
    // Restore original key
    encryptionKey = originalKey;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that encryption is properly configured
 */
export function validateEncryptionConfig(): { valid: boolean; error?: string } {
  try {
    getEncryptionKey();

    // Test encryption/decryption roundtrip
    const testValue = 'test_' + Date.now();
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testValue) {
      return { valid: false, error: 'Encryption roundtrip failed' };
    }

    return { valid: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return { valid: false, error: err.message };
  }
}
