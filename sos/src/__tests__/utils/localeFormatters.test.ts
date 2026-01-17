import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the language detection module
vi.mock('../../../multilingual-system/core/country-manager/languageDetection', () => ({
  getCachedGeoData: vi.fn(() => null),
  detectCountryFromTimezone: vi.fn(() => null),
}))

import { formatDate, formatTime, formatDateTime, formatNumber, formatCurrency } from '../../utils/localeFormatters'

describe('localeFormatters', () => {
  describe('formatDate', () => {
    const testDate = new Date('2024-03-15T14:30:00')

    it('devrait formater une date au format français', () => {
      const result = formatDate(testDate, { language: 'fr', countryCode: 'FR' })
      expect(result).toBe('15/03/2024')
    })

    it('devrait formater une date au format américain', () => {
      const result = formatDate(testDate, { language: 'en', countryCode: 'US' })
      expect(result).toBe('03/15/2024')
    })

    it('devrait formater une date au format allemand', () => {
      const result = formatDate(testDate, { language: 'de', countryCode: 'DE' })
      expect(result).toBe('15.03.2024')
    })

    it('devrait gérer une date nulle', () => {
      const result = formatDate(null)
      expect(result).toBe('—')
    })

    it('devrait gérer une date undefined', () => {
      const result = formatDate(undefined)
      expect(result).toBe('—')
    })

    it('devrait gérer une date invalide', () => {
      const result = formatDate('invalid-date')
      expect(result).toBe('—')
    })

    it('devrait accepter un timestamp en millisecondes', () => {
      const timestamp = testDate.getTime()
      const result = formatDate(timestamp, { language: 'fr', countryCode: 'FR' })
      expect(result).toBe('15/03/2024')
    })

    it('devrait accepter un objet Firestore Timestamp', () => {
      const firestoreTimestamp = { toDate: () => testDate }
      const result = formatDate(firestoreTimestamp, { language: 'fr', countryCode: 'FR' })
      expect(result).toBe('15/03/2024')
    })

    it('devrait accepter un objet avec seconds', () => {
      const secondsObj = { seconds: Math.floor(testDate.getTime() / 1000) }
      const result = formatDate(secondsObj, { language: 'fr', countryCode: 'FR' })
      expect(result).toBe('15/03/2024')
    })
  })

  describe('formatTime', () => {
    const testDate = new Date('2024-03-15T14:30:45')

    it('devrait formater une heure au format 24h pour la France', () => {
      const result = formatTime(testDate, { countryCode: 'FR', language: 'fr' })
      expect(result).toBe('14:30')
    })

    it('devrait formater une heure au format 12h pour les USA', () => {
      const result = formatTime(testDate, { countryCode: 'US', language: 'en' })
      expect(result).toMatch(/2:30\sPM/i)
    })

    it('devrait inclure les secondes si demandé', () => {
      const result = formatTime(testDate, { countryCode: 'FR', language: 'fr', includeSeconds: true })
      expect(result).toBe('14:30:45')
    })

    it('devrait gérer une date nulle', () => {
      const result = formatTime(null)
      expect(result).toBe('—')
    })
  })

  describe('formatDateTime', () => {
    const testDate = new Date('2024-03-15T14:30:00')

    it('devrait formater date et heure ensemble (FR)', () => {
      const result = formatDateTime(testDate, { language: 'fr', countryCode: 'FR' })
      expect(result).toBe('15/03/2024 14:30')
    })

    it('devrait formater date et heure ensemble (US)', () => {
      const result = formatDateTime(testDate, { language: 'en', countryCode: 'US' })
      expect(result).toMatch(/03\/15\/2024 2:30\sPM/i)
    })
  })

  describe('formatNumber', () => {
    it('devrait formater un nombre au format français', () => {
      const result = formatNumber(1234567.89, { language: 'fr', countryCode: 'FR' })
      // En français: 1 234 567,89 (espace insécable)
      expect(result).toMatch(/1.*234.*567/)
    })

    it('devrait formater un nombre au format américain', () => {
      const result = formatNumber(1234567.89, { language: 'en', countryCode: 'US' })
      expect(result).toBe('1,234,567.89')
    })

    it('devrait formater un nombre au format allemand', () => {
      const result = formatNumber(1234567.89, { language: 'de', countryCode: 'DE' })
      // En allemand: 1.234.567,89
      expect(result).toMatch(/1\.234\.567,89/)
    })

    it('devrait respecter minimumFractionDigits', () => {
      const result = formatNumber(1234, {
        language: 'en',
        countryCode: 'US',
        minimumFractionDigits: 2
      })
      expect(result).toBe('1,234.00')
    })

    it('devrait respecter maximumFractionDigits', () => {
      const result = formatNumber(1234.5678, {
        language: 'en',
        countryCode: 'US',
        maximumFractionDigits: 2
      })
      expect(result).toBe('1,234.57')
    })
  })

  describe('formatCurrency', () => {
    it('devrait formater une devise en EUR pour la France', () => {
      const result = formatCurrency(1234.56, 'EUR', { language: 'fr', countryCode: 'FR' })
      // Format FR: 1 234,56 €
      expect(result).toMatch(/1.*234.*56.*€/)
    })

    it('devrait formater une devise en USD pour les USA', () => {
      const result = formatCurrency(1234.56, 'USD', { language: 'en', countryCode: 'US' })
      expect(result).toBe('$1,234.56')
    })

    it('devrait utiliser EUR par défaut', () => {
      const result = formatCurrency(100)
      expect(result).toMatch(/100.*€|€.*100/)
    })

    it('devrait respecter les décimales personnalisées', () => {
      const result = formatCurrency(1234, 'EUR', {
        language: 'en',
        countryCode: 'US',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
      expect(result).toMatch(/€.*1,234|1,234.*€/)
    })
  })
})
