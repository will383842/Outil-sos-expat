/**
 * paymentStatusUtils.ts
 *
 * P2-2 FIX: Utilitaires pour normaliser la nomenclature des statuts de paiement.
 *
 * Problème: Le code utilise parfois "succeeded" (Stripe) et parfois "captured" (escrow).
 * Solution: Fonctions utilitaires pour vérifier les statuts de manière cohérente.
 *
 * P2-1 FIX: Documentation complète de tous les statuts utilisés dans le système.
 *
 * =============================================================================
 * DOCUMENTATION DES STATUTS DE PAIEMENT
 * =============================================================================
 *
 * STATUTS STRIPE → FIRESTORE:
 * - payment_intent.succeeded → "captured" (normalisé) ou "succeeded"
 * - payment_intent.requires_capture → "requires_capture"
 * - payment_intent.canceled → "cancelled"
 * - charge.failed → "failed"
 * - charge.refunded → "refunded"
 *
 * STATUTS PAYPAL → FIRESTORE:
 * - CHECKOUT.ORDER.APPROVED → "APPROVED" (paypal_orders collection)
 * - PAYMENT.CAPTURE.COMPLETED → "captured"
 * - PAYMENT.CAPTURE.REFUNDED → "refunded"
 *
 * STATUTS INTERNES (call_sessions):
 * - "pending" → Paiement en attente de confirmation
 * - "processing" → Paiement en cours de traitement
 * - "payment_captured" → Paiement capturé avec succès
 * - "no_answer" → Appel non répondu (remboursement possible)
 *
 * STATUTS PAYOUT:
 * - "pending" → Payout en attente
 * - "awaiting_payout" → En attente de versement
 * - "sent" → Payout envoyé
 * - "completed" → Payout confirmé
 * - "failed" → Payout échoué
 * =============================================================================
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
 * P2-1 FIX: Statuts de traitement intermédiaire
 */
export const PAYMENT_PROCESSING_STATUSES = ["pending", "processing"] as const;
export type PaymentProcessingStatus = typeof PAYMENT_PROCESSING_STATUSES[number];

/**
 * P2-1 FIX: Statuts spécifiques aux sessions d'appel
 */
export const CALL_SESSION_PAYMENT_STATUSES = [
  "payment_pending",
  "payment_captured",
  "payment_failed",
  "no_answer",
] as const;
export type CallSessionPaymentStatus = typeof CALL_SESSION_PAYMENT_STATUSES[number];

/**
 * P2-1 FIX: Statuts de payout
 */
export const PAYOUT_STATUSES = [
  "pending",
  "awaiting_payout",
  "sent",
  "completed",
  "failed",
  "not_applicable",
] as const;
export type PayoutStatus = typeof PAYOUT_STATUSES[number];

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
