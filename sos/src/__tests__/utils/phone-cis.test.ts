import { describe, it, expect } from 'vitest'
import { smartNormalizePhone } from '../../utils/phone'

describe('smartNormalizePhone - Russia and CIS Countries Extended', () => {

  describe('Russia (RU, +7, trunk 8)', () => {
    it('should normalize with trunk 8', () => {
      expect(smartNormalizePhone('89161234567', 'RU').e164).toBe('+79161234567')
    })
    it('should normalize international +7', () => {
      expect(smartNormalizePhone('+79161234567', 'RU').e164).toBe('+79161234567')
    })
    it('should normalize without trunk', () => {
      expect(smartNormalizePhone('9161234567', 'RU').e164).toBe('+79161234567')
    })
    it('should normalize with spaces', () => {
      expect(smartNormalizePhone('8 916 123 45 67', 'RU').e164).toBe('+79161234567')
    })
  })

  describe('Kazakhstan (KZ, +7, trunk 8)', () => {
    it('should normalize with trunk 8', () => {
      expect(smartNormalizePhone('87001234567', 'KZ').e164).toBe('+77001234567')
    })
    it('should normalize international +7', () => {
      expect(smartNormalizePhone('+77001234567', 'KZ').e164).toBe('+77001234567')
    })
    it('should normalize without trunk', () => {
      expect(smartNormalizePhone('7001234567', 'KZ').e164).toBe('+77001234567')
    })
  })

  describe('Ukraine (UA, +380, trunk 0)', () => {
    it('should normalize with trunk 0', () => {
      expect(smartNormalizePhone('0501234567', 'UA').e164).toBe('+380501234567')
    })
    it('should normalize international +380', () => {
      expect(smartNormalizePhone('+380501234567', 'UA').e164).toBe('+380501234567')
    })
    it('should normalize without trunk', () => {
      expect(smartNormalizePhone('501234567', 'UA').e164).toBe('+380501234567')
    })
  })

  describe('Belarus (BY, +375, trunk 0 or 8)', () => {
    it('should normalize with trunk 0', () => {
      expect(smartNormalizePhone('0291234567', 'BY').e164).toBe('+375291234567')
    })
    it('should normalize with trunk 8', () => {
      expect(smartNormalizePhone('8291234567', 'BY').e164).toBe('+375291234567')
    })
    it('should normalize international +375', () => {
      expect(smartNormalizePhone('+375291234567', 'BY').e164).toBe('+375291234567')
    })
  })

  describe('Uzbekistan (UZ, +998)', () => {
    // Note: libphonenumber-js does NOT recognize trunk prefixes for Uzbekistan
    // National numbers are 9 digits without trunk prefix
    it('should normalize national number (no trunk)', () => {
      expect(smartNormalizePhone('901234567', 'UZ').e164).toBe('+998901234567')
    })
    it('should normalize international +998', () => {
      expect(smartNormalizePhone('+998901234567', 'UZ').e164).toBe('+998901234567')
    })
    // These will fail because libphonenumber-js doesn't support trunk prefixes for UZ
    it('should reject invalid format with trunk 0', () => {
      expect(smartNormalizePhone('0901234567', 'UZ').ok).toBe(false)
    })
    it('should reject invalid format with trunk 8', () => {
      expect(smartNormalizePhone('8901234567', 'UZ').ok).toBe(false)
    })
  })

  describe('Georgia (GE, +995, trunk 0)', () => {
    it('should normalize with trunk 0', () => {
      expect(smartNormalizePhone('0551234567', 'GE').e164).toBe('+995551234567')
    })
    it('should normalize international +995', () => {
      expect(smartNormalizePhone('+995551234567', 'GE').e164).toBe('+995551234567')
    })
  })

  describe('Armenia (AM, +374, trunk 0)', () => {
    it('should normalize with trunk 0', () => {
      expect(smartNormalizePhone('091234567', 'AM').e164).toBe('+37491234567')
    })
    it('should normalize international +374', () => {
      expect(smartNormalizePhone('+37491234567', 'AM').e164).toBe('+37491234567')
    })
  })

  describe('Azerbaijan (AZ, +994, trunk 0)', () => {
    it('should normalize with trunk 0', () => {
      expect(smartNormalizePhone('0501234567', 'AZ').e164).toBe('+994501234567')
    })
    it('should normalize international +994', () => {
      expect(smartNormalizePhone('+994501234567', 'AZ').e164).toBe('+994501234567')
    })
  })

  describe('Moldova (MD, +373, trunk 0)', () => {
    it('should normalize with trunk 0', () => {
      expect(smartNormalizePhone('069123456', 'MD').e164).toBe('+37369123456')
    })
    it('should normalize international +373', () => {
      expect(smartNormalizePhone('+37369123456', 'MD').e164).toBe('+37369123456')
    })
  })

  describe('Kyrgyzstan (KG, +996, trunk 0)', () => {
    it('should normalize with trunk 0', () => {
      expect(smartNormalizePhone('0555123456', 'KG').e164).toBe('+996555123456')
    })
    it('should normalize international +996', () => {
      expect(smartNormalizePhone('+996555123456', 'KG').e164).toBe('+996555123456')
    })
  })

  describe('Tajikistan (TJ, +992)', () => {
    // Note: libphonenumber-js does NOT recognize trunk prefixes for Tajikistan
    // National numbers are 9 digits without trunk prefix
    it('should normalize national number (no trunk)', () => {
      expect(smartNormalizePhone('901234567', 'TJ').e164).toBe('+992901234567')
    })
    it('should normalize international +992', () => {
      expect(smartNormalizePhone('+992901234567', 'TJ').e164).toBe('+992901234567')
    })
    // These will fail because libphonenumber-js doesn't support trunk prefixes for TJ
    it('should reject invalid format with trunk 0', () => {
      expect(smartNormalizePhone('0901234567', 'TJ').ok).toBe(false)
    })
    it('should reject invalid format with trunk 8', () => {
      expect(smartNormalizePhone('8901234567', 'TJ').ok).toBe(false)
    })
  })

  describe('Turkmenistan (TM, +993, trunk 8)', () => {
    it('should normalize with trunk 8', () => {
      expect(smartNormalizePhone('861234567', 'TM').e164).toBe('+99361234567')
    })
    it('should normalize international +993', () => {
      expect(smartNormalizePhone('+99361234567', 'TM').e164).toBe('+99361234567')
    })
    it('should normalize without trunk', () => {
      expect(smartNormalizePhone('61234567', 'TM').e164).toBe('+99361234567')
    })
  })

})
