import { describe, it, expect } from 'vitest'
import { validateAmounts, type AmountSet } from '../../utils/amountValidator'

describe('validateAmounts', () => {
  describe('Cas valides', () => {
    it('devrait valider un paiement avocat standard (49 EUR)', () => {
      const amounts: AmountSet = {
        total: 49,
        commission: 19,
        provider: 30
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('devrait valider un paiement expatrié standard (19 EUR)', () => {
      const amounts: AmountSet = {
        total: 19,
        commission: 9,
        provider: 10
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('devrait valider le montant minimum (0.50 EUR)', () => {
      const amounts: AmountSet = {
        total: 0.50,
        commission: 0.10,
        provider: 0.40
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(true)
    })

    it('devrait valider le montant maximum (500 EUR)', () => {
      const amounts: AmountSet = {
        total: 500,
        commission: 100,
        provider: 400
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(true)
    })
  })

  describe('Cas invalides - Cohérence des montants', () => {
    it('devrait rejeter si total != commission + provider', () => {
      const amounts: AmountSet = {
        total: 50,
        commission: 19,
        provider: 30  // 19 + 30 = 49, pas 50
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Total incohérent: 50 ≠ 49')
    })

    it('devrait accepter une tolérance de 0.01 EUR', () => {
      const amounts: AmountSet = {
        total: 49.01,
        commission: 19,
        provider: 30
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(true)
    })
  })

  describe('Cas invalides - Limites de montants', () => {
    it('devrait rejeter un montant inférieur à 0.50 EUR', () => {
      const amounts: AmountSet = {
        total: 0.49,
        commission: 0.10,
        provider: 0.39
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Montant minimum: 0.50 EUR')
    })

    it('devrait rejeter un montant supérieur à 500 EUR', () => {
      const amounts: AmountSet = {
        total: 501,
        commission: 100,
        provider: 401
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Montant maximum: 500 EUR')
    })
  })

  describe('Cas invalides - Commission', () => {
    it('devrait rejeter une commission négative', () => {
      const amounts: AmountSet = {
        total: 50,
        commission: -10,
        provider: 60
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Commission ne peut pas être négative')
    })

    it('devrait rejeter une commission >= total', () => {
      const amounts: AmountSet = {
        total: 50,
        commission: 50,
        provider: 0
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Commission ne peut pas être supérieure ou égale au total')
    })

    it('devrait rejeter une commission > total', () => {
      const amounts: AmountSet = {
        total: 50,
        commission: 60,
        provider: -10
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Commission ne peut pas être supérieure ou égale au total')
    })
  })

  describe('Cas invalides - Montant prestataire', () => {
    it('devrait rejeter un montant prestataire négatif', () => {
      const amounts: AmountSet = {
        total: 50,
        commission: 60,
        provider: -10
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Montant prestataire ne peut pas être négatif')
    })
  })

  describe('Erreurs multiples', () => {
    it('devrait retourner toutes les erreurs en une fois', () => {
      const amounts: AmountSet = {
        total: 0.10,        // < 0.50
        commission: -5,     // négatif
        provider: -10       // négatif
      }

      const result = validateAmounts(amounts)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })
})
