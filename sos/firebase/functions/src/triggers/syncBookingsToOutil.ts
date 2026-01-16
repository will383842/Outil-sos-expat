/**
 * =============================================================================
 * SYNC BOOKING REQUESTS TO OUTIL-SOS-EXPAT
 * =============================================================================
 *
 * Ce trigger synchronise automatiquement les booking_requests vers Outil-sos-expat
 * pour déclencher le système IA.
 *
 * ARCHITECTURE:
 * - SOS (sos-urgently-ac307): booking_requests/{id}
 * - Outil (outils-sos-expat): bookings/{id} → déclenche aiOnBookingCreated
 *
 * FLOW:
 * 1. Client crée un booking dans SOS
 * 2. Ce trigger envoie les données à Outil via webhook
 * 3. Outil crée le booking dans sa collection
 * 4. aiOnBookingCreated génère la première réponse IA
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

// Secret pour l'authentification avec Outil-sos-expat
const OUTIL_SYNC_API_KEY = defineSecret("OUTIL_SYNC_API_KEY");

// URL de l'endpoint ingestBooking dans Outil-sos-expat
const OUTIL_INGEST_ENDPOINT = "https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking";

interface BookingRequestData {
  // Client info
  clientId?: string;
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientNationality?: string;
  clientCurrentCountry?: string;
  clientLanguages?: string[];
  clientLanguagesDetails?: Array<{ code: string; name: string }>;

  // Booking info
  title?: string;
  description?: string;
  serviceType?: string;
  status?: string;
  price?: number;
  duration?: number;

  // Provider info
  providerId?: string;
  providerName?: string;
  providerType?: string;
  providerCountry?: string;
  providerEmail?: string;
  providerPhone?: string;
  providerLanguages?: string[];
  providerSpecialties?: string[];

  // Metadata
  createdAt?: FirebaseFirestore.Timestamp;
}

interface OutilBookingPayload {
  // Client
  clientFirstName?: string;
  clientLastName?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];

  // Request
  title?: string;
  description?: string;
  serviceType?: string;
  priority?: string;
  category?: string;

  // Provider
  providerId: string;
  providerType?: string;
  providerName?: string;
  providerCountry?: string;

  // Metadata
  source: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transforme les données booking_requests en payload pour Outil
 * Exporté pour usage potentiel dans d'autres modules
 */
export function transformToOutilPayload(
  docId: string,
  data: BookingRequestData
): OutilBookingPayload {
  return {
    // Client info
    clientFirstName: data.clientFirstName || undefined,
    clientLastName: data.clientLastName || undefined,
    clientName: data.clientName ||
      (data.clientFirstName && data.clientLastName
        ? `${data.clientFirstName} ${data.clientLastName}`.trim()
        : undefined),
    clientPhone: data.clientPhone || undefined,
    clientWhatsapp: data.clientWhatsapp || undefined,
    clientCurrentCountry: data.clientCurrentCountry || undefined,
    clientNationality: data.clientNationality || undefined,
    clientLanguages: data.clientLanguages ||
      (data.clientLanguagesDetails?.map(l => l.code) ?? undefined),

    // Request details
    title: data.title || undefined,
    description: data.description || undefined,
    serviceType: data.serviceType || undefined,
    priority: "normal", // Default priority

    // Provider info
    providerId: data.providerId || "",
    providerType: data.providerType as "lawyer" | "expat" | undefined,
    providerName: data.providerName || undefined,
    providerCountry: data.providerCountry || undefined,

    // Source tracking
    source: "sos-expat-app",
    externalId: docId,
    metadata: {
      clientId: data.clientId,
      sosBookingId: docId,
      providerEmail: data.providerEmail,
      providerPhone: data.providerPhone,
      providerLanguages: data.providerLanguages,
      providerSpecialties: data.providerSpecialties,
      originalServiceType: data.serviceType,
      createdAt: data.createdAt?.toDate?.()?.toISOString(),
    },
  };
}

/**
 * Envoie les données au endpoint ingestBooking de Outil-sos-expat
 */
async function syncToOutil(
  payload: OutilBookingPayload
): Promise<{ ok: boolean; bookingId?: string; error?: string }> {
  try {
    // P0 FIX: Trim secret value to remove trailing CRLF
    const apiKey = OUTIL_SYNC_API_KEY.value().trim();

    if (!apiKey) {
      logger.warn("[syncBookingsToOutil] OUTIL_SYNC_API_KEY non configuré");
      return { ok: false, error: "API key not configured" };
    }

    logger.info("[syncBookingsToOutil] Envoi vers Outil:", {
      externalId: payload.externalId,
      providerId: payload.providerId,
      clientName: payload.clientName,
    });

    const response = await fetch(OUTIL_INGEST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[syncBookingsToOutil] Erreur sync:", {
        status: response.status,
        error: errorText,
        payload,
      });
      return { ok: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json() as { bookingId?: string };
    logger.info("[syncBookingsToOutil] Sync réussie:", {
      externalId: payload.externalId,
      outilBookingId: result.bookingId,
    });

    return { ok: true, bookingId: result.bookingId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("[syncBookingsToOutil] Exception:", {
      error: errorMessage,
      payload,
    });
    return { ok: false, error: errorMessage };
  }
}

/**
 * Trigger: booking_requests/{bookingId} - onCreate
 *
 * ⚠️ DÉSACTIVÉ - Le sync vers Outil se fait maintenant APRÈS paiement validé
 * via syncCallSessionToOutil() dans sendPaymentNotifications() (index.ts)
 *
 * L'ancien comportement synchronisait AVANT paiement, ce qui était incorrect
 * car l'IA ne devrait travailler que sur des bookings payés.
 */
export const onBookingRequestCreated = onDocumentCreated(
  {
    document: "booking_requests/{bookingId}",
    region: "europe-west1",
    secrets: [OUTIL_SYNC_API_KEY],
  },
  async (event) => {
    const bookingId = event.params.bookingId;

    // P0 FIX: Désactivé - le sync se fait après paiement dans sendPaymentNotifications()
    logger.info("[onBookingRequestCreated] DISABLED - Sync now happens after payment validation", {
      bookingId,
      note: "Use syncCallSessionToOutil() in sendPaymentNotifications() instead",
    });
    return;

    // ========== ANCIEN CODE DÉSACTIVÉ ==========
    // const data = event.data?.data() as BookingRequestData | undefined;
    //
    // if (!data) {
    //   logger.warn("[onBookingRequestCreated] Pas de données pour:", bookingId);
    //   return;
    // }
    //
    // // Vérifier que le providerId existe
    // if (!data.providerId) {
    //   logger.warn("[onBookingRequestCreated] Pas de providerId pour:", bookingId);
    //   return;
    // }
    //
    // // Vérifier le status (ne synchroniser que les pending)
    // if (data.status !== "pending") {
    //   logger.info("[onBookingRequestCreated] Status non-pending ignoré:", {
    //     bookingId,
    //     status: data.status,
    //   });
    //   return;
    // }
    //
    // // Transformer et envoyer à Outil
    // const payload = transformToOutilPayload(bookingId, data);
    // const result = await syncToOutil(payload);
    //
    // if (!result.ok) {
    //   logger.error("[onBookingRequestCreated] Échec sync pour:", bookingId, result.error);
    //   await addToRetryQueue(bookingId, payload, result.error || "Unknown error");
    // } else {
    //   logger.info("[onBookingRequestCreated] Booking synchronisé:", {
    //     sosBookingId: bookingId,
    //     outilBookingId: result.bookingId,
    //   });
    // }
  }
);

// =============================================================================
// P0-4 FIX: RETRY MECHANISM FOR FAILED SYNCS
// =============================================================================

const MAX_RETRIES = 3;
const RETRY_COLLECTION = "outil_sync_retry_queue";

/**
 * Ajoute un booking échoué à la queue de retry
 * Exporté pour usage potentiel dans d'autres modules
 */
export async function addToRetryQueue(
  bookingId: string,
  payload: OutilBookingPayload,
  error: string
): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection(RETRY_COLLECTION).doc(bookingId).set({
      bookingId,
      payload,
      error,
      retryCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      nextRetryAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    });
    logger.info("[addToRetryQueue] Booking ajouté à la queue de retry:", bookingId);
  } catch (err) {
    logger.error("[addToRetryQueue] Erreur:", err);
  }
}

/**
 * Fonction planifiée pour réessayer les syncs échouées
 * S'exécute toutes les 30 minutes (2025-01-16: réduit de 10 à 30 min pour économies)
 */
export const retryOutilSync = onSchedule(
  {
    schedule: "every 30 minutes",
    region: "europe-west1",
    secrets: [OUTIL_SYNC_API_KEY],
    timeoutSeconds: 120,
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Récupérer les bookings en attente de retry
    const pendingRetries = await db
      .collection(RETRY_COLLECTION)
      .where("status", "==", "pending")
      .where("retryCount", "<", MAX_RETRIES)
      .where("nextRetryAt", "<=", now)
      .limit(10)
      .get();

    if (pendingRetries.empty) {
      logger.info("[retryOutilSync] Pas de retry en attente");
      return;
    }

    logger.info("[retryOutilSync] Traitement de", pendingRetries.size, "retries");

    for (const doc of pendingRetries.docs) {
      const data = doc.data();
      const bookingId = data.bookingId;
      const payload = data.payload as OutilBookingPayload;
      const retryCount = data.retryCount || 0;

      logger.info("[retryOutilSync] Retry #" + (retryCount + 1) + " pour:", bookingId);

      const result = await syncToOutil(payload);

      if (result.ok) {
        // Succès: marquer comme terminé
        await doc.ref.update({
          status: "completed",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          outilBookingId: result.bookingId,
        });
        logger.info("[retryOutilSync] ✅ Retry réussi pour:", bookingId);
      } else {
        const newRetryCount = retryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          // Max retries atteint: marquer comme échoué définitivement
          await doc.ref.update({
            status: "failed",
            failedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastError: result.error,
            retryCount: newRetryCount,
          });
          logger.error("[retryOutilSync] ❌ Max retries atteint pour:", bookingId);
        } else {
          // Planifier le prochain retry avec backoff exponentiel
          const backoffMinutes = Math.pow(2, newRetryCount) * 5; // 5, 10, 20 minutes
          const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await doc.ref.update({
            retryCount: newRetryCount,
            nextRetryAt: admin.firestore.Timestamp.fromDate(nextRetryAt),
            lastError: result.error,
          });
          logger.warn("[retryOutilSync] Retry planifié dans", backoffMinutes, "min pour:", bookingId);
        }
      }
    }
  }
);
