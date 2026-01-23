/**
 * =============================================================================
 * SOS EXPAT - Cloud Functions Entry Point
 * =============================================================================
 *
 * Point d'entrée principal pour toutes les Cloud Functions.
 * Centralise les exports et la configuration.
 *
 * MODULES:
 * - ai.ts          : Système IA hybride (GPT-4o + Perplexity)
 * - subscription.ts: Gestion des abonnements
 * - auth.ts        : Authentification et création utilisateurs
 * - admin.ts       : Opérations administratives
 * - rateLimiter.ts : Protection contre les abus
 * - validation.ts  : Schémas de validation Zod
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import type { Request, Response } from "express";

// Sentry monitoring
import { initSentry, captureError, flushSentry } from "./sentry";

// Validation
import {
  IngestBookingSchema,
  UpdateBookingStatusSchema,
  formatZodErrors,
  sanitizeMetadata,
  sanitizeString,
  ValidationError,
} from "./validation";

// Rate Limiting
import {
  checkRateLimit,
  getRateLimitHeaders,
  cleanupOldBuckets,
} from "./rateLimiter";

// Subscriptions
import {
  checkUserAccess,
  expireOverdueSubscriptions,
} from "./subscription";

// Security
import {
  applySecurityChecks,
  getTrustedClientIp,
  hashPII,
  createSecureLogContext,
} from "./security";

// =============================================================================
// INITIALISATION
// =============================================================================

try {
  admin.app();
} catch {
  admin.initializeApp();
}

const SOS_PLATFORM_API_KEY = defineSecret("SOS_PLATFORM_API_KEY");

// =============================================================================
// RE-EXPORTS DES MODULES
// =============================================================================

// Auth & Admin
export { setRole } from "./admin";
export { onUserCreate, initAdmin } from "./auth";
export { backfillUsers } from "./backfill";


// AI
export { aiOnBookingCreated, aiOnProviderMessage, aiChat, aiChatStream } from "./ai";

// Subscriptions
export { syncSubscription, checkSubscription } from "./subscription";

// Provider Sync
export { syncProvider, syncProvidersBulk } from "./syncProvider";

// Reverse Sync: Providers to SOS
export { onProviderUpdated } from "./syncProvidersToSos";

// Scheduled Tasks (P0.3: Audit + Cleanup)
export {
  cleanupOldConversations,
  weeklyForcedAccessAudit,
  cleanupStuckMessages,
  archiveExpiredConversations,
} from "./scheduled";

// Multi-Provider Dashboard
export {
  validateDashboardPassword,
  getMultiDashboardData,
  onBookingRequestCreatedGenerateAi,
} from "./multiDashboard";

// =============================================================================
// WEBHOOK: INGEST BOOKING (avec validation et rate limiting)
// =============================================================================

/**
 * POST /ingestBooking
 *
 * Reçoit les demandes depuis SOS-Expat.com (Laravel)
 * Crée un booking complet dans Firestore avec validation stricte.
 *
 * Headers requis:
 *   x-api-key: <SOS_PLATFORM_API_KEY>
 *
 * Body: voir IngestBookingSchema dans validation.ts
 */
// CORS whitelist stricte pour la production
const ALLOWED_ORIGINS = [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "https://admin.sos-expat.com",
  "https://app.sos-expat.com",
  "https://ulixai.com",
  "https://www.ulixai.com",
];

// En développement, autoriser localhost
const CORS_CONFIG = process.env.NODE_ENV === "production"
  ? ALLOWED_ORIGINS
  : [...ALLOWED_ORIGINS, /^http:\/\/localhost(:\d+)?$/];

export const ingestBooking = onRequest(
  {
    region: "europe-west1",
    cors: CORS_CONFIG,
    secrets: [SOS_PLATFORM_API_KEY],
    timeoutSeconds: 60,
    // SCALABILITÉ: Protection contre runaway costs (quota région: 20 max)
    memory: "512MiB",
    maxInstances: 20,
  },
  async (req: Request, res: Response): Promise<void> => {
    initSentry();
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // =========================================================================
      // 1. SECURITY CHECKS (headers, content-type, payload size)
      // =========================================================================
      if (!applySecurityChecks(req, res)) {
        return;
      }

      // =========================================================================
      // 2. VÉRIFICATION MÉTHODE
      // =========================================================================
      if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method Not Allowed" });
        return;
      }

      // =========================================================================
      // 3. VÉRIFICATION API KEY
      // =========================================================================
      const apiKey = req.header("x-api-key");
      // P0 FIX: Trim secret value to remove trailing CRLF that was accidentally included in the secret
      const expectedApiKey = SOS_PLATFORM_API_KEY.value().trim();
      if (!apiKey || apiKey.trim() !== expectedApiKey) {
        logger.warn("[ingestBooking] Tentative non autorisée", createSecureLogContext(req, { requestId }));
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      // =========================================================================
      // 4. RATE LIMITING
      // =========================================================================
      const clientIp = getTrustedClientIp(req);
      const rateLimitResult = await checkRateLimit(clientIp, "WEBHOOK_INGEST");

      // Ajouter les headers de rate limit
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (!rateLimitResult.allowed) {
        logger.warn("[ingestBooking] Rate limit atteint", {
          requestId,
          ip: clientIp,
          resetAt: rateLimitResult.resetAt,
        });
        res.status(429).json({
          ok: false,
          error: "Too Many Requests",
          retryAfter: Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000),
        });
        return;
      }

      // =========================================================================
      // 4. VALIDATION DU PAYLOAD
      // =========================================================================
      const validation = IngestBookingSchema.safeParse(req.body ?? {});

      if (!validation.success) {
        const errors = formatZodErrors(validation.error);
        logger.warn("[ingestBooking] Payload invalide", {
          requestId,
          errors: errors.fields,
        });
        res.status(400).json({
          ok: false,
          error: "Invalid payload",
          details: errors.fields,
        });
        return;
      }

      const payload = validation.data;

      // =========================================================================
      // 5. VÉRIFICATION ABONNEMENT (si userId fourni)
      // =========================================================================
      if (payload.userId) {
        const hasAccess = await checkUserAccess(payload.userId);
        if (!hasAccess) {
          logger.warn("[ingestBooking] Abonnement inactif", {
            requestId,
            userId: payload.userId,
          });
          res.status(403).json({
            ok: false,
            error: "Subscription required",
            code: "SUBSCRIPTION_INACTIVE",
          });
          return;
        }
      }

      // =========================================================================
      // 6. CONSTRUCTION DU BOOKING
      // =========================================================================
      const db = admin.firestore();

      // ============================================================
      // DEBUG: Log incoming payload from SOS
      // ============================================================
      logger.info(`📥 [ingestBooking-${requestId}] PAYLOAD RECEIVED FROM SOS:`, {
        providerId: payload.providerId,
        providerIdType: typeof payload.providerId,
        providerIdLength: payload.providerId?.length || 0,
        providerIdIsEmpty: !payload.providerId,
        providerType: payload.providerType,
        providerName: payload.providerName,
        clientFirstName: payload.clientFirstName,
        clientLastName: payload.clientLastName,
        clientCurrentCountry: payload.clientCurrentCountry,
        title: payload.title,
        source: payload.source,
        externalId: payload.externalId,
        allPayloadKeys: Object.keys(payload),
      });

      // ============================================================
      // P0 FIX: Auto-create/update provider with AI access info
      // ============================================================
      if (payload.providerId) {
        const providerRef = db.collection("providers").doc(payload.providerId);
        const providerCheck = await providerRef.get();

        logger.info(`🔍 [ingestBooking-${requestId}] PROVIDER CHECK IN OUTIL:`, {
          providerId: payload.providerId,
          existsInOutil: providerCheck.exists,
          providerData: providerCheck.exists ? {
            name: providerCheck.data()?.name,
            email: providerCheck.data()?.email,
            forcedAIAccess: providerCheck.data()?.forcedAIAccess,
            subscriptionStatus: providerCheck.data()?.subscriptionStatus,
            hasActiveSubscription: providerCheck.data()?.hasActiveSubscription,
          } : "PROVIDER_NOT_FOUND_IN_OUTIL",
        });

        // P0 FIX: Si le payload contient des infos d'accès IA, créer/mettre à jour le provider
        const hasAccessInfo = payload.forcedAIAccess !== undefined ||
                              payload.subscriptionStatus !== undefined ||
                              payload.hasActiveSubscription !== undefined;

        if (!providerCheck.exists || hasAccessInfo) {
          const providerData: Record<string, unknown> = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "sos-expat-booking-sync",
          };

          // Infos de base
          if (payload.providerName) providerData.name = payload.providerName;
          if (payload.providerEmail) providerData.email = payload.providerEmail;
          if (payload.providerType) providerData.type = payload.providerType;
          if (payload.providerCountry) providerData.country = payload.providerCountry;

          // P0 FIX: Infos d'accès IA - ces champs sont critiques pour aiOnBookingCreated
          if (payload.forcedAIAccess !== undefined) {
            providerData.forcedAIAccess = payload.forcedAIAccess === true;
          }
          if (payload.subscriptionStatus !== undefined) {
            providerData.subscriptionStatus = payload.subscriptionStatus;
          }
          if (payload.hasActiveSubscription !== undefined) {
            providerData.hasActiveSubscription = payload.hasActiveSubscription === true;
          }
          if (payload.freeTrialUntil) {
            providerData.freeTrialUntil = admin.firestore.Timestamp.fromDate(
              new Date(payload.freeTrialUntil)
            );
          }

          // Si nouveau provider, ajouter createdAt et active
          if (!providerCheck.exists) {
            providerData.createdAt = admin.firestore.FieldValue.serverTimestamp();
            providerData.active = true;
            // Quota IA par défaut
            providerData.aiCallsUsed = 0;
            providerData.aiCallsLimit = payload.forcedAIAccess === true ? -1 : 100;
          }

          await providerRef.set(providerData, { merge: true });

          logger.info(`✅ [ingestBooking-${requestId}] PROVIDER AUTO-CREATED/UPDATED:`, {
            providerId: payload.providerId,
            wasNew: !providerCheck.exists,
            forcedAIAccess: providerData.forcedAIAccess,
            subscriptionStatus: providerData.subscriptionStatus,
            hasActiveSubscription: providerData.hasActiveSubscription,
          });
        }
      } else {
        logger.error(`❌ [ingestBooking-${requestId}] NO PROVIDER ID IN PAYLOAD!`, {
          FIX: "SOS n'envoie pas de providerId. Vérifiez que createAndScheduleCallFunction inclut providerId dans outilPayload.",
        });
      }

      const bookingData = {
        // Client
        clientFirstName: payload.clientFirstName,
        clientLastName: payload.clientLastName,
        clientName: `${payload.clientFirstName} ${payload.clientLastName}`.trim() || "Client",
        clientEmail: payload.clientEmail || "",
        clientPhone: payload.clientPhone || "",
        clientWhatsapp: payload.clientWhatsapp || payload.clientPhone || "",
        clientCurrentCountry: payload.clientCurrentCountry,
        clientNationality: payload.clientNationality,
        clientLanguages: payload.clientLanguages,

        // Demande
        title: payload.title,
        description: payload.description,
        serviceType: payload.serviceType,
        priority: payload.priority || payload.urgency,
        category: payload.category || null,

        // Prestataire
        providerId: payload.providerId || null,
        providerType: payload.providerType || null,
        providerName: payload.providerName || null,
        providerCountry: payload.providerCountry || null,

        // Statut
        status: "pending" as const,
        aiProcessed: false,

        // Métadonnées (sanitisées)
        source: payload.source,
        externalId: payload.externalId || null,
        metadata: sanitizeMetadata(payload.metadata),

        // Tracking
        requestId,

        // Timestamps
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // ============================================================
      // DEBUG: Log booking data being saved
      // ============================================================
      logger.info(`💾 [ingestBooking-${requestId}] BOOKING DATA TO SAVE:`, {
        providerId: bookingData.providerId,
        providerType: bookingData.providerType,
        aiProcessed: bookingData.aiProcessed,
        clientName: bookingData.clientName,
        title: bookingData.title,
        NOTE: "aiOnBookingCreated trigger will fire after this save",
      });

      // =========================================================================
      // 7. CRÉATION EN BASE
      // =========================================================================
      const bookingRef = db.collection("bookings").doc();
      await bookingRef.set(bookingData);

      logger.info(`✅ [ingestBooking-${requestId}] BOOKING CREATED IN FIRESTORE`, {
        bookingId: bookingRef.id,
        providerId: bookingData.providerId,
        NOTE: "aiOnBookingCreated trigger should fire now!",
      });

      // =========================================================================
      // 8. LOG AUDIT
      // =========================================================================
      await db.collection("auditLogs").add({
        action: "booking_created",
        resourceType: "booking",
        resourceId: bookingRef.id,
        source: "webhook",
        ip: clientIp,
        payload: {
          clientEmail: payload.clientEmail,
          title: payload.title,
          providerId: payload.providerId,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // =========================================================================
      // 9. RÉPONSE SUCCÈS
      // =========================================================================
      logger.info("[ingestBooking] Booking créé", {
        requestId,
        bookingId: bookingRef.id,
        clientName: bookingData.clientName,
        processingTimeMs: Date.now() - startTime,
      });

      res.status(200).json({
        ok: true,
        id: bookingRef.id,
        requestId,
        message: "Booking créé avec succès",
        booking: {
          id: bookingRef.id,
          clientName: bookingData.clientName,
          status: bookingData.status,
        },
        processingTimeMs: Date.now() - startTime,
      });

    } catch (error) {
      // Gestion des erreurs de validation
      if (error instanceof ValidationError) {
        res.status(400).json({
          ok: false,
          error: error.message,
          details: error.fields,
        });
        return;
      }

      // Capture Sentry
      captureError(error as Error, {
        functionName: "ingestBooking",
        requestId,
      });

      logger.error("[ingestBooking] Erreur interne", {
        requestId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      // Flush Sentry avant réponse
      await flushSentry();

      res.status(500).json({
        ok: false,
        error: "Internal server error",
        requestId,
        processingTimeMs: Date.now() - startTime,
      });
    }
  }
);

// =============================================================================
// SCHEDULED FUNCTIONS
// =============================================================================

/**
 * Nettoyage quotidien des données expirées
 * Exécuté tous les jours à 3h du matin (Europe/Paris)
 */
export const dailyCleanup = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Europe/Paris",
    region: "europe-west1",
    // SCALABILITÉ: Plus de mémoire et temps pour nettoyage
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutes
  },
  async () => {
    initSentry();
    logger.info("[dailyCleanup] Démarrage du nettoyage quotidien");

    try {
      // 1. Nettoyer les buckets de rate limit
      const rateLimitCleanup = await cleanupOldBuckets();
      logger.info("[dailyCleanup] Rate limit buckets nettoyés", rateLimitCleanup);

      // 2. Expirer les abonnements dépassés
      const subscriptionCleanup = await expireOverdueSubscriptions();
      logger.info("[dailyCleanup] Abonnements expirés", subscriptionCleanup);

      // 3. Archiver les anciens logs (optionnel, à implémenter si besoin)
      // await archiveOldLogs();

      logger.info("[dailyCleanup] Nettoyage terminé avec succès");

    } catch (error) {
      captureError(error as Error, { functionName: "dailyCleanup" });
      logger.error("[dailyCleanup] Erreur", error);
      await flushSentry();
    }
  }
);

// =============================================================================
// MONTHLY QUOTA RESET - Réinitialisation mensuelle des quotas IA
// =============================================================================

/**
 * Reset mensuel des quotas IA pour tous les providers
 * Exécuté le 1er de chaque mois à 00:05 (Europe/Paris)
 *
 * Actions:
 * 1. Réinitialise aiCallsUsed à 0 pour tous les providers
 * 2. Met à jour aiQuotaResetAt avec la date du reset
 * 3. Log l'opération pour audit
 */
export const monthlyQuotaReset = onSchedule(
  {
    schedule: "5 0 1 * *", // 1er du mois à 00:05
    timeZone: "Europe/Paris",
    region: "europe-west1",
    // SCALABILITÉ: Plus de mémoire et temps pour reset massif
    memory: "1GiB",
    timeoutSeconds: 540, // 9 minutes (max)
  },
  async () => {
    initSentry();
    logger.info("[monthlyQuotaReset] Démarrage du reset mensuel des quotas IA");

    const db = admin.firestore();
    const startTime = Date.now();

    try {
      // Récupérer tous les providers
      const providersSnapshot = await db.collection("providers").get();

      if (providersSnapshot.empty) {
        logger.info("[monthlyQuotaReset] Aucun provider trouvé");
        return;
      }

      // Reset par batch (max 500 opérations par batch)
      const BATCH_SIZE = 500;
      let totalReset = 0;
      let batch = db.batch();
      let batchCount = 0;

      for (const doc of providersSnapshot.docs) {
        const providerData = doc.data();
        const previousUsage = providerData.aiCallsUsed || 0;

        // Reset le compteur
        batch.update(doc.ref, {
          aiCallsUsed: 0,
          aiCallsUsedPreviousMonth: previousUsage, // Garder l'historique du mois précédent
          aiQuotaResetAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batchCount++;
        totalReset++;

        // Commit le batch si on atteint la limite
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
          logger.info(`[monthlyQuotaReset] Batch intermédiaire: ${totalReset} providers traités`);
        }
      }

      // Commit le dernier batch
      if (batchCount > 0) {
        await batch.commit();
      }

      // Log d'audit
      await db.collection("auditLogs").add({
        action: "monthly_quota_reset",
        resourceType: "providers",
        details: {
          totalProviders: totalReset,
          processingTimeMs: Date.now() - startTime,
          month: new Date().toISOString().slice(0, 7), // YYYY-MM
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("[monthlyQuotaReset] Reset terminé avec succès", {
        totalProviders: totalReset,
        processingTimeMs: Date.now() - startTime,
      });

    } catch (error) {
      captureError(error as Error, { functionName: "monthlyQuotaReset" });
      logger.error("[monthlyQuotaReset] Erreur lors du reset", error);

      // Log l'erreur pour monitoring
      await db.collection("auditLogs").add({
        action: "monthly_quota_reset_error",
        resourceType: "providers",
        error: (error as Error).message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      await flushSentry();
    }
  }
);

// =============================================================================
// WEBHOOK: UPDATE BOOKING STATUS (appelé par sos-expat.com)
// =============================================================================

/**
 * PATCH /updateBookingStatus
 *
 * Met à jour le statut d'un booking depuis sos-expat.com
 * Utilisé principalement pour fermer une conversation après un appel téléphonique.
 *
 * Headers requis:
 *   x-api-key: <SOS_PLATFORM_API_KEY>
 *
 * Body:
 *   - bookingId: string (requis) - ID du booking Firebase
 *   - status: string (requis) - Nouveau statut: "pending" | "in_progress" | "completed" | "cancelled"
 *   - endedAt?: string - Date/heure de fin (ISO 8601)
 *   - duration?: number - Durée de l'appel en secondes
 *   - notes?: string - Notes optionnelles
 *   - cancelReason?: string - Raison d'annulation (si status = cancelled)
 */
export const updateBookingStatus = onRequest(
  {
    region: "europe-west1",
    cors: CORS_CONFIG,
    secrets: [SOS_PLATFORM_API_KEY],
    timeoutSeconds: 60,
    maxInstances: 20,
  },
  async (req: Request, res: Response): Promise<void> => {
    initSentry();
    const startTime = Date.now();
    const requestId = `upd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // =========================================================================
      // 1. SECURITY CHECKS
      // =========================================================================
      if (!applySecurityChecks(req, res)) {
        return;
      }

      // =========================================================================
      // 2. VÉRIFICATION MÉTHODE
      // =========================================================================
      if (req.method !== "PATCH" && req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method Not Allowed. Use PATCH or POST." });
        return;
      }

      // =========================================================================
      // 3. VÉRIFICATION API KEY
      // =========================================================================
      const apiKey = req.header("x-api-key");
      // P0 FIX: Trim secret value to remove trailing CRLF
      const expectedApiKey = SOS_PLATFORM_API_KEY.value().trim();
      if (!apiKey || apiKey.trim() !== expectedApiKey) {
        logger.warn("[updateBookingStatus] Tentative non autorisée", createSecureLogContext(req, { requestId }));
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      // =========================================================================
      // 3. VALIDATION DU PAYLOAD (avec Zod)
      // =========================================================================
      const validation = UpdateBookingStatusSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = formatZodErrors(validation.error);
        logger.warn("[updateBookingStatus] Payload invalide", {
          requestId,
          errors: errors.fields,
        });
        res.status(400).json({
          ok: false,
          error: "Invalid payload",
          details: errors.fields,
        });
        return;
      }

      const { bookingId, status, endedAt, duration, notes, cancelReason } = validation.data;

      // Sanitize les champs texte pour prévenir XSS
      const safeNotes = notes ? sanitizeString(notes) : undefined;
      const safeCancelReason = cancelReason ? sanitizeString(cancelReason) : undefined;

      // =========================================================================
      // 4. VÉRIFICATION EXISTENCE DU BOOKING
      // =========================================================================
      const db = admin.firestore();
      const bookingRef = db.collection("bookings").doc(bookingId);
      const bookingSnap = await bookingRef.get();

      if (!bookingSnap.exists) {
        logger.warn("[updateBookingStatus] Booking non trouvé", { requestId, bookingId });
        res.status(404).json({
          ok: false,
          error: "Booking not found",
          bookingId,
        });
        return;
      }

      const currentData = bookingSnap.data();
      const previousStatus = currentData?.status;

      // =========================================================================
      // 5. CONSTRUCTION DES DONNÉES DE MISE À JOUR
      // =========================================================================
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastStatusChange: {
          from: previousStatus,
          to: status,
          at: admin.firestore.FieldValue.serverTimestamp(),
          source: "sos-expat.com",
        },
      };

      // Si complété, ajouter les infos de fin
      if (status === "completed") {
        updateData.completedAt = endedAt
          ? admin.firestore.Timestamp.fromDate(new Date(endedAt))
          : admin.firestore.FieldValue.serverTimestamp();

        if (typeof duration === "number" && duration > 0) {
          updateData.callDuration = duration;
        }
      }

      // Si annulé, ajouter la raison
      if (status === "cancelled") {
        updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
        if (safeCancelReason) {
          updateData.cancelReason = safeCancelReason;
        }
      }

      // Notes optionnelles (sanitisées)
      if (safeNotes) {
        updateData.externalNotes = safeNotes;
      }

      // =========================================================================
      // 6. MISE À JOUR EN BASE
      // =========================================================================
      await bookingRef.update(updateData);

      // =========================================================================
      // 7. LOG AUDIT
      // =========================================================================
      await db.collection("auditLogs").add({
        action: "booking_status_updated",
        resourceType: "booking",
        resourceId: bookingId,
        previousStatus,
        newStatus: status,
        source: "webhook",
        ip: getTrustedClientIp(req),
        metadata: {
          duration,
          endedAt,
          cancelReason: safeCancelReason,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // =========================================================================
      // 8. RÉPONSE SUCCÈS
      // =========================================================================
      logger.info("[updateBookingStatus] Booking mis à jour", {
        requestId,
        bookingId,
        previousStatus,
        newStatus: status,
        processingTimeMs: Date.now() - startTime,
      });

      res.status(200).json({
        ok: true,
        message: `Booking ${bookingId} mis à jour: ${previousStatus} → ${status}`,
        bookingId,
        previousStatus,
        newStatus: status,
        requestId,
        processingTimeMs: Date.now() - startTime,
      });

    } catch (error) {
      captureError(error as Error, {
        functionName: "updateBookingStatus",
        requestId,
      });

      logger.error("[updateBookingStatus] Erreur interne", {
        requestId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      await flushSentry();

      res.status(500).json({
        ok: false,
        error: "Internal server error",
        requestId,
        processingTimeMs: Date.now() - startTime,
      });
    }
  }
);

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * GET /health
 *
 * Endpoint de health check pour monitoring
 */
export const health = onRequest(
  {
    region: "europe-west1",
    cors: true,
    // Limiter les instances pour endpoint de monitoring
    maxInstances: 10,
  },
  async (req: Request, res: Response): Promise<void> => {
    initSentry();
    const db = admin.firestore();

    try {
      // Vérifier la connexion Firestore
      await db.collection("ops").doc("health").set({
        lastCheck: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        ok: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "5.1.0",
        region: "europe-west1",
      });

    } catch (error) {
      captureError(error as Error, { functionName: "health" });
      logger.error("[health] Health check failed", error);
      await flushSentry();
      // SÉCURITÉ: Ne pas exposer les détails d'erreur en production
      res.status(503).json({
        ok: false,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      });
    }
  }
);
