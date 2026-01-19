import { describe, it, expect } from 'vitest'
import { toE164, smartNormalizePhone, isValidPhone, getNationalNumber, getCountryFromPhone } from '../../utils/phone'

describe('toE164 - Conversion numéros de téléphone (legacy)', () => {
  describe('Numéros français valides', () => {
    it('devrait convertir un numéro français avec indicatif', () => {
      const result = toE164('+33612345678')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait convertir un numéro français sans indicatif', () => {
      const result = toE164('0612345678', 'FR')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait convertir un numéro avec espaces', () => {
      const result = toE164('+33 6 12 34 56 78')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait gérer les numéros fixes français', () => {
      const result = toE164('0145678901', 'FR')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33145678901')
    })
  })

  describe('Numéros belges valides', () => {
    it('devrait convertir un numéro belge avec indicatif', () => {
      const result = toE164('+32475123456')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+32475123456')
    })

    it('devrait convertir un numéro belge sans indicatif', () => {
      const result = toE164('0475123456', 'BE')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+32475123456')
    })
  })

  describe('Numéros suisses valides', () => {
    it('devrait convertir un numéro suisse', () => {
      const result = toE164('+41791234567')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+41791234567')
    })

    it('devrait convertir un numéro suisse sans indicatif', () => {
      const result = toE164('0791234567', 'CH')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+41791234567')
    })
  })

  describe('Autres pays supportés', () => {
    it('devrait convertir un numéro espagnol', () => {
      const result = toE164('+34612345678')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+34612345678')
    })

    it('devrait convertir un numéro allemand', () => {
      const result = toE164('+491512345678')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+491512345678')
    })

    it('devrait convertir un numéro britannique', () => {
      const result = toE164('+447911123456')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+447911123456')
    })

    it('devrait convertir un numéro marocain', () => {
      const result = toE164('+212612345678')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+212612345678')
    })
  })

  describe('Numéros invalides', () => {
    it('devrait rejeter une entrée vide', () => {
      const result = toE164('')

      expect(result.ok).toBe(false)
      expect(result.e164).toBeNull()
      expect(result.reason).toBe('empty')
    })

    it('devrait rejeter une entrée avec espaces uniquement', () => {
      const result = toE164('   ')

      expect(result.ok).toBe(false)
      expect(result.reason).toBe('empty')
    })

    it('devrait rejeter un numéro trop court', () => {
      const result = toE164('0612')

      expect(result.ok).toBe(false)
      expect(result.e164).toBeNull()
    })

    it('devrait rejeter un numéro avec lettres', () => {
      const result = toE164('06ABCD1234')

      expect(result.ok).toBe(false)
      expect(result.e164).toBeNull()
    })

    it('devrait rejeter un format invalide', () => {
      const result = toE164('1234567890')  // Pas de contexte pays

      expect(result.ok).toBe(false)
      expect(result.e164).toBeNull()
    })
  })

  describe('Cas edge', () => {
    it('devrait gérer null/undefined gracieusement', () => {
      // @ts-expect-error - Test de robustesse
      const result = toE164(null)

      expect(result.ok).toBe(false)
      expect(result.reason).toBe('empty')
    })

    it('devrait supprimer les espaces avant/après', () => {
      const result = toE164('  +33612345678  ')

      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })
  })
})

// ============================================================================
// NOUVEAUX TESTS POUR smartNormalizePhone - TOUS LES FORMATS DU MONDE
// ============================================================================

describe('smartNormalizePhone - Normalisation intelligente mondiale', () => {

  describe('🇫🇷 France - Tous les formats possibles', () => {
    it('devrait normaliser un numéro national avec 0', () => {
      const result = smartNormalizePhone('0612345678', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
      expect(result.country).toBe('FR')
    })

    it('devrait normaliser un numéro national sans 0', () => {
      const result = smartNormalizePhone('612345678', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait normaliser un numéro avec espaces', () => {
      const result = smartNormalizePhone('06 12 34 56 78', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait normaliser un numéro avec tirets', () => {
      const result = smartNormalizePhone('06-12-34-56-78', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait normaliser un numéro avec points', () => {
      const result = smartNormalizePhone('06.12.34.56.78', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait normaliser un numéro avec +33', () => {
      const result = smartNormalizePhone('+33612345678', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait normaliser un numéro avec +33 et espaces', () => {
      const result = smartNormalizePhone('+33 6 12 34 56 78', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait normaliser un numéro avec 0033', () => {
      const result = smartNormalizePhone('0033612345678', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait normaliser un numéro collé sans +', () => {
      const result = smartNormalizePhone('33612345678', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait normaliser un numéro fixe français', () => {
      const result = smartNormalizePhone('0145678901', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33145678901')
    })
  })

  describe('🇬🇧 Royaume-Uni - Trunk prefix 0', () => {
    it('devrait normaliser un mobile UK avec 0', () => {
      const result = smartNormalizePhone('07400123456', 'GB')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+447400123456')
      expect(result.country).toBe('GB')
    })

    it('devrait normaliser un numéro UK avec +44', () => {
      const result = smartNormalizePhone('+442079460958', 'GB')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+442079460958')
    })

    it('devrait normaliser un numéro UK avec 0044', () => {
      const result = smartNormalizePhone('00442079460958', 'GB')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+442079460958')
    })
  })

  describe('🇩🇪 Allemagne - Trunk prefix 0', () => {
    it('devrait normaliser un mobile allemand avec 0', () => {
      const result = smartNormalizePhone('01512345678', 'DE')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+491512345678')
      expect(result.country).toBe('DE')
    })

    it('devrait normaliser un fixe allemand (Berlin)', () => {
      const result = smartNormalizePhone('03012345678', 'DE')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+493012345678')
    })
  })

  describe('🇮🇹 Italie - Trunk prefix 0 CONSERVÉ', () => {
    it('devrait normaliser un fixe italien avec 0 conservé', () => {
      const result = smartNormalizePhone('0212345678', 'IT')
      expect(result.ok).toBe(true)
      // En Italie, le 0 fait partie du numéro national !
      expect(result.e164).toBe('+390212345678')
    })

    it('devrait normaliser un mobile italien (pas de 0)', () => {
      const result = smartNormalizePhone('3491234567', 'IT')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+393491234567')
      expect(result.country).toBe('IT')
    })
  })

  describe('🇪🇸 Espagne - Pas de trunk prefix', () => {
    it('devrait normaliser un numéro espagnol', () => {
      const result = smartNormalizePhone('612345678', 'ES')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+34612345678')
      expect(result.country).toBe('ES')
    })

    it('devrait normaliser un numéro espagnol avec +34', () => {
      const result = smartNormalizePhone('+34612345678', 'ES')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+34612345678')
    })
  })

  describe('🇺🇸 États-Unis - Pas de trunk prefix', () => {
    it('devrait normaliser un numéro américain', () => {
      const result = smartNormalizePhone('2125551234', 'US')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+12125551234')
      expect(result.country).toBe('US')
    })

    it('devrait normaliser un numéro américain avec +1', () => {
      const result = smartNormalizePhone('+12125551234', 'US')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+12125551234')
    })

    it('devrait normaliser un numéro américain formaté', () => {
      const result = smartNormalizePhone('(212) 555-1234', 'US')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+12125551234')
    })
  })

  describe('🇷🇺 Russie - Trunk prefix 8 (pas 0!)', () => {
    it('devrait normaliser un numéro russe avec 8', () => {
      const result = smartNormalizePhone('89121234567', 'RU')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+79121234567')
      expect(result.country).toBe('RU')
    })

    it('devrait normaliser un numéro russe avec +7', () => {
      const result = smartNormalizePhone('+79121234567', 'RU')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+79121234567')
    })
  })

  describe('🇧🇪 Belgique - Trunk prefix 0', () => {
    it('devrait normaliser un mobile belge avec 0', () => {
      const result = smartNormalizePhone('0475123456', 'BE')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+32475123456')
      expect(result.country).toBe('BE')
    })
  })

  describe('🇨🇭 Suisse - Trunk prefix 0', () => {
    it('devrait normaliser un mobile suisse avec 0', () => {
      const result = smartNormalizePhone('0791234567', 'CH')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+41791234567')
      expect(result.country).toBe('CH')
    })
  })

  describe('🇲🇦 Maroc - Trunk prefix 0', () => {
    it('devrait normaliser un mobile marocain avec 0', () => {
      const result = smartNormalizePhone('0612345678', 'MA')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+212612345678')
      expect(result.country).toBe('MA')
    })

    it('devrait normaliser un numéro marocain avec +212', () => {
      const result = smartNormalizePhone('+212612345678', 'MA')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+212612345678')
    })
  })

  describe('🇨🇳 Chine', () => {
    it('devrait normaliser un mobile chinois', () => {
      const result = smartNormalizePhone('13812345678', 'CN')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+8613812345678')
      expect(result.country).toBe('CN')
    })
  })

  describe('🇯🇵 Japon - Trunk prefix 0', () => {
    it('devrait normaliser un mobile japonais avec 0', () => {
      const result = smartNormalizePhone('09012345678', 'JP')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+819012345678')
      expect(result.country).toBe('JP')
    })
  })

  describe('🇮🇳 Inde - Trunk prefix 0', () => {
    it('devrait normaliser un mobile indien avec 0', () => {
      const result = smartNormalizePhone('09812345678', 'IN')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+919812345678')
      expect(result.country).toBe('IN')
    })
  })

  describe('🇦🇺 Australie - Trunk prefix 0', () => {
    it('devrait normaliser un mobile australien avec 0', () => {
      const result = smartNormalizePhone('0412345678', 'AU')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+61412345678')
      expect(result.country).toBe('AU')
    })
  })

  describe('🇧🇷 Brésil', () => {
    it('devrait normaliser un mobile brésilien', () => {
      const result = smartNormalizePhone('11912345678', 'BR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+5511912345678')
      expect(result.country).toBe('BR')
    })
  })

  describe('🇦🇪 Émirats Arabes Unis - Trunk prefix 0', () => {
    it('devrait normaliser un mobile émirati avec 0', () => {
      const result = smartNormalizePhone('0501234567', 'AE')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+971501234567')
      expect(result.country).toBe('AE')
    })
  })

  describe('🇳🇬 Nigeria - Trunk prefix 0', () => {
    it('devrait normaliser un mobile nigérian avec 0', () => {
      const result = smartNormalizePhone('08012345678', 'NG')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+2348012345678')
      expect(result.country).toBe('NG')
    })
  })

  describe('🇿🇦 Afrique du Sud - Trunk prefix 0', () => {
    it('devrait normaliser un mobile sud-africain avec 0', () => {
      const result = smartNormalizePhone('0821234567', 'ZA')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+27821234567')
      expect(result.country).toBe('ZA')
    })
  })

  describe('🇸🇬 Singapour - Pas de trunk prefix', () => {
    it('devrait normaliser un mobile singapourien', () => {
      const result = smartNormalizePhone('91234567', 'SG')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+6591234567')
      expect(result.country).toBe('SG')
    })
  })

  describe('🇭🇰 Hong Kong - Pas de trunk prefix', () => {
    it('devrait normaliser un mobile hongkongais', () => {
      const result = smartNormalizePhone('91234567', 'HK')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+85291234567')
      expect(result.country).toBe('HK')
    })
  })

  describe('Auto-détection du pays', () => {
    it('devrait auto-détecter la France depuis +33', () => {
      const result = smartNormalizePhone('+33612345678', 'US') // Pays sélectionné = US
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
      expect(result.country).toBe('FR') // Auto-détecté !
    })

    it('devrait auto-détecter les UK depuis +44', () => {
      const result = smartNormalizePhone('+442079460958', 'FR')
      expect(result.ok).toBe(true)
      expect(result.country).toBe('GB')
    })

    it('devrait auto-détecter la Russie depuis +7', () => {
      const result = smartNormalizePhone('+79121234567', 'FR')
      expect(result.ok).toBe(true)
      expect(result.country).toBe('RU')
    })
  })

  describe('Format 00 (international européen)', () => {
    it('devrait convertir 0033 → +33', () => {
      const result = smartNormalizePhone('0033612345678', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+33612345678')
    })

    it('devrait convertir 0044 → +44', () => {
      const result = smartNormalizePhone('00442079460958', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+442079460958')
      expect(result.country).toBe('GB')
    })

    it('devrait convertir 001 → +1', () => {
      const result = smartNormalizePhone('0012125551234', 'FR')
      expect(result.ok).toBe(true)
      expect(result.e164).toBe('+12125551234')
    })
  })

  describe('Cas invalides', () => {
    it('devrait rejeter une entrée vide', () => {
      const result = smartNormalizePhone('', 'FR')
      expect(result.ok).toBe(false)
      expect(result.reason).toBe('empty')
    })

    it('devrait rejeter un numéro trop court', () => {
      const result = smartNormalizePhone('0612', 'FR')
      expect(result.ok).toBe(false)
    })

    it('devrait rejeter un numéro avec lettres', () => {
      const result = smartNormalizePhone('06ABCD1234', 'FR')
      expect(result.ok).toBe(false)
    })
  })
})

// ============================================================================
// TESTS POUR LES FONCTIONS UTILITAIRES
// ============================================================================

describe('isValidPhone - Validation rapide', () => {
  it('devrait valider un numéro français correct', () => {
    expect(isValidPhone('+33612345678')).toBe(true)
  })

  it('devrait valider un numéro américain correct', () => {
    expect(isValidPhone('+12125551234')).toBe(true)
  })

  it('devrait rejeter un numéro invalide', () => {
    expect(isValidPhone('invalid')).toBe(false)
  })

  it('devrait rejeter une entrée vide', () => {
    expect(isValidPhone('')).toBe(false)
  })
})

describe('getNationalNumber - Extraction numéro national', () => {
  it('devrait extraire le numéro national français', () => {
    expect(getNationalNumber('+33612345678')).toBe('612345678')
  })

  it('devrait extraire le numéro national américain', () => {
    expect(getNationalNumber('+12125551234')).toBe('2125551234')
  })

  it('devrait retourner null pour une entrée invalide', () => {
    expect(getNationalNumber('invalid')).toBeNull()
  })
})

describe('getCountryFromPhone - Extraction code pays', () => {
  it('devrait extraire FR depuis +33', () => {
    expect(getCountryFromPhone('+33612345678')).toBe('FR')
  })

  it('devrait extraire US depuis +1', () => {
    expect(getCountryFromPhone('+12125551234')).toBe('US')
  })

  it('devrait extraire GB depuis +44', () => {
    expect(getCountryFromPhone('+442079460958')).toBe('GB')
  })

  it('devrait retourner null pour une entrée invalide', () => {
    expect(getCountryFromPhone('invalid')).toBeNull()
  })
})
