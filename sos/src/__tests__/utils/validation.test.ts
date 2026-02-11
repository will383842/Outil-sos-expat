/**
 * Unit tests for centralized validation utilities.
 *
 * Covers: validateEmail, validatePhone, formatPhoneE164, validateIBAN
 */
import { describe, it, expect } from 'vitest'
import { validateEmail, validatePhone, formatPhoneE164, validateIBAN } from '../../utils/validation'

// ============================================================================
// validateEmail
// ============================================================================

describe('validateEmail', () => {
  it('should accept valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true)
    expect(validateEmail('a@b.co')).toBe(true)
  })

  it('should reject empty or missing input', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail(null as unknown as string)).toBe(false)
    expect(validateEmail(undefined as unknown as string)).toBe(false)
  })

  it('should reject emails without @', () => {
    expect(validateEmail('userexample.com')).toBe(false)
  })

  it('should reject emails without domain extension', () => {
    expect(validateEmail('user@')).toBe(false)
    expect(validateEmail('user@domain')).toBe(false)
  })

  it('should reject emails with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false)
    expect(validateEmail('user@ example.com')).toBe(false)
  })

  it('should reject emails exceeding RFC 5321 max length (254)', () => {
    const longLocal = 'a'.repeat(245)
    expect(validateEmail(`${longLocal}@example.com`)).toBe(false)
  })

  it('should accept emails at the RFC 5321 length boundary', () => {
    // 254 total chars: local + @ + domain
    const local = 'a'.repeat(241) // 241 + 1(@) + 12(example.com) = 254
    expect(validateEmail(`${local}@example.com`)).toBe(true)
  })
})

// ============================================================================
// validatePhone
// ============================================================================

describe('validatePhone', () => {
  it('should accept valid international phone numbers', () => {
    expect(validatePhone('+33612345678')).toBe(true)     // France
    expect(validatePhone('+14155552671')).toBe(true)     // US
    expect(validatePhone('+221771234567')).toBe(true)    // Senegal
  })

  it('should accept valid national numbers with country hint', () => {
    expect(validatePhone('0612345678', 'FR')).toBe(true)
    expect(validatePhone('4155552671', 'US')).toBe(true)
  })

  it('should reject empty or too-short numbers', () => {
    expect(validatePhone('')).toBe(false)
    expect(validatePhone('123')).toBe(false)
    expect(validatePhone('+33')).toBe(false)
  })

  it('should reject null/undefined', () => {
    expect(validatePhone(null as unknown as string)).toBe(false)
    expect(validatePhone(undefined as unknown as string)).toBe(false)
  })

  it('should handle numbers with spaces', () => {
    expect(validatePhone('+33 6 12 34 56 78')).toBe(true)
  })

  it('should reject obviously invalid numbers', () => {
    expect(validatePhone('+00000000000')).toBe(false)
  })
})

// ============================================================================
// formatPhoneE164
// ============================================================================

describe('formatPhoneE164', () => {
  it('should format valid international numbers to E.164', () => {
    expect(formatPhoneE164('+33612345678')).toBe('+33612345678')
    expect(formatPhoneE164('+1 415 555 2671')).toBe('+14155552671')
  })

  it('should format national numbers with country hint', () => {
    expect(formatPhoneE164('0612345678', 'FR')).toBe('+33612345678')
  })

  it('should return null for invalid numbers', () => {
    expect(formatPhoneE164('')).toBeNull()
    expect(formatPhoneE164('abc')).toBeNull()
    expect(formatPhoneE164('123')).toBeNull()
  })
})

// ============================================================================
// validateIBAN
// ============================================================================

describe('validateIBAN', () => {
  // Known valid IBANs (public test IBANs)
  it('should accept valid IBANs', () => {
    expect(validateIBAN('GB29 NWBK 6016 1331 9268 19')).toBe(true) // UK
    expect(validateIBAN('DE89370400440532013000')).toBe(true)       // Germany
    expect(validateIBAN('FR7630006000011234567890189')).toBe(true)  // France
  })

  it('should accept IBANs with spaces (auto-cleaned)', () => {
    expect(validateIBAN('GB29 NWBK 6016 1331 9268 19')).toBe(true)
  })

  it('should be case-insensitive', () => {
    expect(validateIBAN('gb29nwbk60161331926819')).toBe(true)
  })

  it('should reject empty or missing input', () => {
    expect(validateIBAN('')).toBe(false)
    expect(validateIBAN(null as unknown as string)).toBe(false)
    expect(validateIBAN(undefined as unknown as string)).toBe(false)
  })

  it('should reject IBANs that are too short', () => {
    expect(validateIBAN('GB29NWBK6016')).toBe(false)
  })

  it('should reject IBANs that are too long', () => {
    expect(validateIBAN('GB29NWBK601613319268191234567890EXTRA')).toBe(false)
  })

  it('should reject IBANs without country code', () => {
    expect(validateIBAN('1234567890123456')).toBe(false)
  })

  it('should reject IBANs with invalid check digits (MOD-97 fail)', () => {
    // Change one digit from a valid IBAN to make checksum fail
    expect(validateIBAN('DE89370400440532013001')).toBe(false)
    expect(validateIBAN('GB29NWBK60161331926820')).toBe(false)
  })

  it('should reject IBANs where chars 3-4 are not digits', () => {
    expect(validateIBAN('GBXXNWBK60161331926819')).toBe(false)
  })
})
