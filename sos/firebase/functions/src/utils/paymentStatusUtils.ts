/**
 * paymentStatusUtils.ts
 *
 * P2-2 FIX: Utilitaires pour normaliser la nomenclature des statuts de paiement.
 *
 * Problème: Le code utilise parfois "succeeded" (Stripe) et parfois "captured" (escrow).
 * Solution: Fonctions utilitaires pour vérifier les statuts de manière cohérente.
 */

/**
 * Statuts indiquant qu'un paiement est finalisé avec succès
 */
export const PAYMENT_COMPLETED_STATUSES = ["succeeded", "captured"] as const;
export type PaymentCompletedStatus = typeof PAYMENT_COMPLETED_STATUSES[number];

/**
 * Statuts indiquant qu'un paiement est en attente de capture (escrow)
 */
export const PAYMENT_PENDING_CAPTURE_STATUSES = ["requires_capture", "authorized"] as const;
export type PaymentPendingCaptureStatus = typeof PAYMENT_PENDING_CAPTURE_STATUSES[number];

/**
 * Statuts indiquant qu'un paiement a échoué
 */
export const PAYMENT_FAILED_STATUSES = ["failed", "cancelled", "expired"] as const;
export type PaymentFailedStatus = typeof PAYMENT_FAILED_STATUSES[number];

/**
 * Statuts indiquant qu'un paiement a été remboursé
 */
export const PAYMENT_REFUNDED_STATUSES = ["refunded", "partially_refunded"] as const;
export type PaymentRefundedStatus = typeof PAYMENT_REFUNDED_STATUSES[number];

/**
 * Vérifie si un paiement est finalisé (succeeded OU captured)
 */
export function isPaymentCompleted(status: string | null | undefined): boolean {
  if (!status) return false;
  return PAYMENT_COMPLETED_STATUSES.includes(status as PaymentCompletedStatus);
}

/**
 * Vérifie si un paiement est en attente de capture (escrow)
 */
export function isPaymentPendingCapture(status: string | null | undefined): boolean {
  if (!status) return false;
  return PAYMENT_PENDING_CAPTURE_STATUSES.includes(status as PaymentPendingCaptureStatus);
}

/**
 * Vérifie si un paiement a échoué
 */
export function isPaymentFailed(status: string | null | undefined): boolean {
  if (!status) return false;
  return PAYMENT_FAILED_STATUSES.includes(status as PaymentFailedStatus);
}

/**
 * Vérifie si un paiement a été remboursé
 */
export function isPaymentRefunded(status: string | null | undefined): boolean {
  if (!status) return false;
  return PAYMENT_REFUNDED_STATUSES.includes(status as PaymentRefundedStatus);
}

/**
 * Normalise un statut Stripe vers notre nomenclature interne
 * "succeeded" -> "captured" (pour cohérence avec le mode escrow)
 */
export function normalizePaymentStatus(stripeStatus: string): string {
  // On utilise "captured" comme statut canonique pour les paiements finalisés
  // car c'est plus explicite dans un contexte d'escrow
  if (stripeStatus === "succeeded") {
    return "captured";
  }
  return stripeStatus;
}

/**
 * Retourne le statut canonique pour un paiement finalisé
 */
export const CANONICAL_COMPLETED_STATUS = "captured" as const;
