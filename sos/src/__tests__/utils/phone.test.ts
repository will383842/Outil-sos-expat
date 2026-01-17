import { describe, it, expect } from 'vitest'
import { toE164 } from '../../utils/phone'

describe('toE164 - Conversion numéros de téléphone', () => {
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
