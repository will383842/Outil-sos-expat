// firebase/functions/src/utils/paymentSync.ts
/**
 * P1-13 FIX: Synchronisation atomique call_sessions.payment <-> payments/paypal_orders collection
 *
 * Problème: Double source of truth entre:
 * - call_sessions.payment.* (embedded document)
 * - payments/{paymentId} (Stripe payments)
 * - paypal_orders/{orderId} (PayPal payments)
 *
 * Solution: Toujours mettre à jour les deux via transaction Firestore.
 * La fonction syncPaymentStatus vérifie d'abord payments, puis paypal_orders.
 */

import * as admin from "firebase-admin";

type Firestore = admin.firestore.Firestore;
type FieldValue = admin.firestore.FieldValue;
type DocumentSnapshot = admin.firestore.DocumentSnapshot;
type DocumentReference = admin.firestore.DocumentReference;

export interface PaymentStatusUpdate {
  status?: string;
  capturedAt?: FieldValue | Date;
  refundedAt?: FieldValue | Date;
  voidedAt?: FieldValue | Date;
  refundAmount?: number;
  refundReason?: string;
  transferId?: string;
  transferStatus?: string;
  transferAmount?: number;
  transferCurrency?: string;
  transferDestination?: string;
  transferCreatedAt?: FieldValue | Date;
  transferFailedAt?: FieldValue | Date;
  transferError?: string;
  payoutTriggered?: boolean;
  payoutId?: string;
  payoutRetryCount?: number;
  requires3DSecure?: boolean;
  serviceDelivered?: boolean;
  refundBlocked?: boolean;
  [key: string]: unknown;
}

/**
 * Met à jour atomiquement le paiement dans les deux collections.
 *
 * @param db - Firestore instance
 * @param paymentId - ID du paiement (= PaymentIntent ID pour Stripe, ou PayPal order ID)
 * @param callSessionId - ID de la session d'appel (optionnel si inconnu)
 * @param updates - Champs à mettre à jour
 * @returns Promise<void>
 *
 * @example
 * await syncPaymentStatus(db, 'pi_xxx', 'sess_123', {
 *   status: 'captured',
 *   capturedAt: admin.firestore.FieldValue.serverTimestamp()
 * });
 */
export async function syncPaymentStatus(
  db: Firestore,
  paymentId: string,
  callSessionId: string | null,
  updates: PaymentStatusUpdate,
  extraSessionUpdates?: Record<string, unknown>
): Promise<void> {
  // Préfixer les clés pour call_sessions.payment.*
  const callSessionUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    callSessionUpdates[`payment.${key}`] = value;
  }

  // Ajouter le FK si pas déjà présent
  callSessionUpdates["paymentId"] = paymentId;

  // Merge extra root-level updates (e.g. isPaid, metadata.updatedAt)
  if (extraSessionUpdates) {
    Object.assign(callSessionUpdates, extraSessionUpdates);
  }

  await db.runTransaction(async (transaction) => {
    // P0 FIX: ALL reads MUST happen BEFORE any writes in Firestore transactions

    // === STEP 1: ALL READS FIRST ===
    // Check payments collection first (Stripe)
    const paymentRef = db.collection("payments").doc(paymentId);
    const paymentDoc = await transaction.get(paymentRef);

    // P0 FIX: Also check paypal_orders collection for PayPal payments
    const paypalOrderRef = db.collection("paypal_orders").doc(paymentId);
    const paypalOrderDoc = await transaction.get(paypalOrderRef);

    let sessionDoc: DocumentSnapshot | null = null;
    let sessionRef: DocumentReference | null = null;

    if (callSessionId) {
      sessionRef = db.collection("call_sessions").doc(callSessionId);
      sessionDoc = await transaction.get(sessionRef);
    }

    // === STEP 2: ALL WRITES AFTER ===
    // Update whichever payment collection contains the document
    if (paymentDoc.exists) {
      // Stripe payment - update payments collection
      transaction.update(paymentRef, {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (paypalOrderDoc.exists) {
      // PayPal payment - update paypal_orders collection
      transaction.update(paypalOrderRef, {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Neither collection has this payment - log warning
      console.warn(
        `[syncPaymentStatus] Payment ${paymentId} not found in payments or paypal_orders collections. ` +
        `Only call_sessions will be updated if callSessionId is provided.`
      );
    }

    if (callSessionId && sessionRef && sessionDoc?.exists) {
      transaction.update(sessionRef, {
        ...callSessionUpdates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (!callSessionId) {
      // Chercher la session via paymentId/intentId
      // Note: On ne peut pas faire de query dans une transaction,
      // donc on log un warning. Le callSessionId devrait toujours être fourni.
      console.warn(
        `[syncPaymentStatus] callSessionId non fourni pour payment ${paymentId}. ` +
        `call_sessions.payment.* ne sera pas mis à jour.`
      );
    }
  });
}

/**
 * Trouve le callSessionId à partir d'un paymentId.
 * Utile quand on ne connaît que le paymentId (ex: webhooks Stripe).
 *
 * @param db - Firestore instance
 * @param paymentId - ID du paiement
 * @returns callSessionId ou null
 */
export async function findCallSessionByPaymentId(
  db: Firestore,
  paymentId: string
): Promise<string | null> {
  // Chercher par paymentId FK (nouveau)
  let query = await db.collection("call_sessions")
    .where("paymentId", "==", paymentId)
    .limit(1)
    .get();

  if (!query.empty) {
    return query.docs[0].id;
  }

  // Fallback: chercher par payment.intentId (legacy)
  query = await db.collection("call_sessions")
    .where("payment.intentId", "==", paymentId)
    .limit(1)
    .get();

  if (!query.empty) {
    return query.docs[0].id;
  }

  return null;
}

/**
 * Helper pour mettre à jour le statut de capture.
 */
export async function syncPaymentCaptured(
  db: Firestore,
  paymentId: string,
  callSessionId: string | null,
  additionalData?: Partial<PaymentStatusUpdate>
): Promise<void> {
  await syncPaymentStatus(db, paymentId, callSessionId, {
    status: "captured",
    capturedAt: admin.firestore.FieldValue.serverTimestamp(),
    serviceDelivered: true,
    refundBlocked: true,
    ...additionalData,
  });
}

/**
 * Helper pour mettre à jour le statut de remboursement.
 */
export async function syncPaymentRefunded(
  db: Firestore,
  paymentId: string,
  callSessionId: string | null,
  refundAmount: number,
  refundReason: string
): Promise<void> {
  await syncPaymentStatus(db, paymentId, callSessionId, {
    status: "refunded",
    refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    refundAmount,
    refundReason,
  });
}

/**
 * Helper pour mettre à jour le statut d'annulation (void) d'une autorisation PayPal.
 */
export async function syncPaymentVoided(
  db: Firestore,
  paymentId: string,
  callSessionId: string | null,
  voidReason: string
): Promise<void> {
  await syncPaymentStatus(db, paymentId, callSessionId, {
    status: "voided",
    voidedAt: admin.firestore.FieldValue.serverTimestamp(),
    refundReason: voidReason,
  });
}

/**
 * Helper pour mettre à jour le statut de transfert.
 */
export async function syncPaymentTransfer(
  db: Firestore,
  paymentId: string,
  callSessionId: string | null,
  transferData: {
    transferId: string;
    transferStatus: string;
    transferAmount: number;
    transferCurrency: string;
    transferDestination: string;
  }
): Promise<void> {
  await syncPaymentStatus(db, paymentId, callSessionId, {
    ...transferData,
    transferCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
