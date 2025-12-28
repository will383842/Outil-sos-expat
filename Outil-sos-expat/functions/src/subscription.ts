/**
 * =============================================================================
 * SUBSCRIPTION MANAGEMENT - Gestion des abonnements SOS Expat
 * =============================================================================
 *
 * Ce module gère la synchronisation des abonnements depuis Laravel/Stripe
 * et la vérification du statut d'abonnement pour l'accès aux fonctionnalités.
 *
 * WORKFLOW:
 * 1. Laravel reçoit les webhooks Stripe (payment_intent.succeeded, etc.)
 * 2. Laravel appelle notre webhook /syncSubscription avec les données
 * 3. On met à jour Firestore avec le statut d'abonnement
 * 4. Les règles Firestore + Cloud Functions vérifient le statut
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { z } from "zod";
import type { Request, Response } from "express";
import {
  applySecurityChecks,
  setSecurityHeaders,
  getTrustedClientIp,
  hashPII,
} from "./security";

// Initialize Admin SDK
try { admin.app(); } catch { admin.initializeApp(); }

// CORS restrictif
const CORS_ORIGINS = [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "https://admin.sos-expat.com",
  "https://app.sos-expat.com",
];

const SOS_PLATFORM_API_KEY = defineSecret("SOS_PLATFORM_API_KEY");

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

// Statuts d'abonnement possibles
export type SubscriptionStatus =
  | "active"        // Abonnement actif et payé
  | "trialing"      // Période d'essai
  | "past_due"      // Paiement en retard (grâce)
  | "canceled"      // Annulé par l'utilisateur
  | "unpaid"        // Impayé définitif
  | "expired"       // Expiré
  | "paused";       // Mis en pause

// Schéma Zod pour validation du webhook
const SubscriptionWebhookSchema = z.object({
  // Identifiants
  userId: z.string().min(1, "userId requis"),
  email: z.string().email("Email invalide"),

  // Abonnement
  subscriptionId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),

  // Statut
  status: z.enum([
    "active", "trialing", "past_due",
    "canceled", "unpaid", "expired", "paused"
  ]),

  // Plan
  planId: z.string().optional(),
  planName: z.string().optional(),
  priceAmount: z.number().optional(), // En centimes
  priceCurrency: z.string().default("USD"),

  // Dates
  currentPeriodStart: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
  canceledAt: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),

  // Métadonnées
  metadata: z.record(z.any()).optional(),
});

type SubscriptionWebhookPayload = z.infer<typeof SubscriptionWebhookSchema>;

// Document Firestore pour l'abonnement
interface SubscriptionDocument {
  userId: string;
  email: string;
  status: SubscriptionStatus;

  // Identifiants externes
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  laravelSubscriptionId?: string;

  // Plan
  planId?: string;
  planName?: string;
  priceAmount?: number;
  priceCurrency: string;

  // Périodes
  currentPeriodStart?: admin.firestore.Timestamp;
  currentPeriodEnd?: admin.firestore.Timestamp;
  canceledAt?: admin.firestore.Timestamp;
  cancelAtPeriodEnd: boolean;

  // Historique
  statusHistory: Array<{
    status: SubscriptionStatus;
    changedAt: admin.firestore.Timestamp;
    reason?: string;
  }>;

  // Timestamps
  createdAt: admin.firestore.Timestamp | admin.firestore.FieldValue;
  updatedAt: admin.firestore.Timestamp | admin.firestore.FieldValue;
}

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Vérifie si un statut d'abonnement permet l'accès aux fonctionnalités
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return ["active", "trialing", "past_due"].includes(status);
}

/**
 * Parse une date ISO en Timestamp Firestore
 */
function parseDate(dateStr: string | undefined): admin.firestore.Timestamp | undefined {
  if (!dateStr) return undefined;
  try {
    return admin.firestore.Timestamp.fromDate(new Date(dateStr));
  } catch {
    return undefined;
  }
}

/**
 * Récupère le statut d'abonnement d'un utilisateur
 */
export async function getUserSubscriptionStatus(userId: string): Promise<{
  hasAccess: boolean;
  status: SubscriptionStatus | null;
  expiresAt: Date | null;
}> {
  const db = admin.firestore();

  // Vérifier d'abord dans la collection users
  const userDoc = await db.collection("users").doc(userId).get();
  if (userDoc.exists) {
    const userData = userDoc.data();

    // Les admins ont toujours accès
    if (userData?.role === "admin" || userData?.role === "superadmin") {
      return { hasAccess: true, status: "active", expiresAt: null };
    }

    // Vérifier le statut d'abonnement stocké sur l'utilisateur
    if (userData?.subscriptionStatus) {
      const status = userData.subscriptionStatus as SubscriptionStatus;
      const expiresAt = userData.subscriptionExpiresAt?.toDate() || null;
      return {
        hasAccess: isSubscriptionActive(status),
        status,
        expiresAt,
      };
    }
  }

  // Vérifier dans la collection subscriptions
  const subQuery = await db
    .collection("subscriptions")
    .where("userId", "==", userId)
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get();

  if (!subQuery.empty) {
    const subData = subQuery.docs[0].data() as SubscriptionDocument;
    return {
      hasAccess: isSubscriptionActive(subData.status),
      status: subData.status,
      expiresAt: subData.currentPeriodEnd?.toDate() || null,
    };
  }

  return { hasAccess: false, status: null, expiresAt: null };
}

/**
 * Vérifie si un utilisateur a accès (pour les Cloud Functions)
 */
export async function checkUserAccess(userId: string): Promise<boolean> {
  const { hasAccess } = await getUserSubscriptionStatus(userId);
  return hasAccess;
}

// =============================================================================
// WEBHOOK: Synchronisation des abonnements depuis Laravel
// =============================================================================

/**
 * POST /syncSubscription
 *
 * Reçoit les mises à jour d'abonnement depuis Laravel (après webhook Stripe)
 *
 * Headers requis:
 *   x-api-key: <SOS_PLATFORM_API_KEY>
 *
 * Body (JSON):
 *   {
 *     userId: string,
 *     email: string,
 *     status: "active" | "canceled" | "past_due" | ...
 *     stripeSubscriptionId?: string,
 *     currentPeriodEnd?: string (ISO date),
 *     ...
 *   }
 */
export const syncSubscription = onRequest(
  {
    region: "europe-west1",
    cors: CORS_ORIGINS,
    secrets: [SOS_PLATFORM_API_KEY],
    timeoutSeconds: 30,
  },
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Security checks
      if (!applySecurityChecks(req, res)) {
        return;
      }

      // Vérification méthode
      if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method Not Allowed" });
        return;
      }

      // Vérification API Key
      const apiKey = req.header("x-api-key");
      if (!apiKey || apiKey !== SOS_PLATFORM_API_KEY.value()) {
        logger.warn("[syncSubscription] Tentative non autorisée", {
          ip: getTrustedClientIp(req),
          userAgent: req.header("user-agent")?.substring(0, 100),
        });
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      // Validation du payload
      const validation = SubscriptionWebhookSchema.safeParse(req.body);
      if (!validation.success) {
        logger.warn("[syncSubscription] Payload invalide", {
          errors: validation.error.flatten(),
        });
        res.status(400).json({
          ok: false,
          error: "Invalid payload",
          details: validation.error.flatten(),
        });
        return;
      }

      const payload = validation.data;
      const db = admin.firestore();

      // Trouver ou créer l'utilisateur par email
      let userId = payload.userId;
      let userRef = db.collection("users").doc(userId);
      let userSnap = await userRef.get();

      // Si l'userId fourni n'existe pas, chercher par email
      if (!userSnap.exists) {
        const userByEmail = await db
          .collection("users")
          .where("email", "==", payload.email.toLowerCase())
          .limit(1)
          .get();

        if (!userByEmail.empty) {
          userId = userByEmail.docs[0].id;
          userRef = db.collection("users").doc(userId);
          userSnap = userByEmail.docs[0];
        }
      }

      // Préparer les données d'abonnement
      const subscriptionData: Partial<SubscriptionDocument> = {
        userId,
        email: payload.email.toLowerCase(),
        status: payload.status,
        stripeCustomerId: payload.stripeCustomerId,
        stripeSubscriptionId: payload.stripeSubscriptionId,
        laravelSubscriptionId: payload.subscriptionId,
        planId: payload.planId,
        planName: payload.planName,
        priceAmount: payload.priceAmount,
        priceCurrency: payload.priceCurrency,
        currentPeriodStart: parseDate(payload.currentPeriodStart),
        currentPeriodEnd: parseDate(payload.currentPeriodEnd),
        canceledAt: parseDate(payload.canceledAt),
        cancelAtPeriodEnd: payload.cancelAtPeriodEnd || false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Transaction pour mise à jour atomique
      await db.runTransaction(async (tx) => {
        // 1. Mettre à jour ou créer l'abonnement
        const subRef = db.collection("subscriptions").doc(`sub_${userId}`);
        const existingSub = await tx.get(subRef);

        if (existingSub.exists) {
          const existingData = existingSub.data() as SubscriptionDocument;

          // Ajouter à l'historique si le statut change
          const statusHistory = existingData.statusHistory || [];
          if (existingData.status !== payload.status) {
            statusHistory.push({
              status: payload.status,
              changedAt: admin.firestore.Timestamp.now(),
              reason: payload.metadata?.reason || "Mise à jour depuis Laravel",
            });
          }

          tx.update(subRef, {
            ...subscriptionData,
            statusHistory,
          });
        } else {
          tx.set(subRef, {
            ...subscriptionData,
            statusHistory: [{
              status: payload.status,
              changedAt: admin.firestore.Timestamp.now(),
              reason: "Création initiale",
            }],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // 2. Mettre à jour l'utilisateur avec le statut d'abonnement
        if (userSnap.exists) {
          tx.update(userRef, {
            subscriptionStatus: payload.status,
            subscriptionId: `sub_${userId}`,
            subscriptionExpiresAt: parseDate(payload.currentPeriodEnd),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Créer un document utilisateur minimal
          tx.set(userRef, {
            uid: userId,
            email: payload.email.toLowerCase(),
            role: "provider",
            status: "active",
            subscriptionStatus: payload.status,
            subscriptionId: `sub_${userId}`,
            subscriptionExpiresAt: parseDate(payload.currentPeriodEnd),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      });

      // Log de succès
      logger.info("[syncSubscription] Abonnement synchronisé", {
        userId,
        email: payload.email,
        status: payload.status,
        processingTimeMs: Date.now() - startTime,
      });

      // Réponse
      res.status(200).json({
        ok: true,
        message: "Subscription synchronized",
        data: {
          userId,
          status: payload.status,
          hasAccess: isSubscriptionActive(payload.status),
          expiresAt: payload.currentPeriodEnd,
        },
        processingTimeMs: Date.now() - startTime,
      });

    } catch (error) {
      logger.error("[syncSubscription] Erreur", error);
      res.status(500).json({
        ok: false,
        error: (error as Error).message,
        processingTimeMs: Date.now() - startTime,
      });
    }
  }
);

// =============================================================================
// WEBHOOK: Vérification du statut d'abonnement
// =============================================================================

/**
 * GET /checkSubscription?userId=xxx
 * ou
 * GET /checkSubscription?email=xxx
 *
 * Vérifie le statut d'abonnement d'un utilisateur
 *
 * Headers requis:
 *   x-api-key: <SOS_PLATFORM_API_KEY>
 */
export const checkSubscription = onRequest(
  {
    region: "europe-west1",
    cors: CORS_ORIGINS,
    secrets: [SOS_PLATFORM_API_KEY],
    timeoutSeconds: 30,
  },
  async (req: Request, res: Response): Promise<void> => {
    // Security headers (skip content-type check for GET)
    setSecurityHeaders(res);

    try {
      // Vérification méthode
      if (req.method !== "GET") {
        res.status(405).json({ ok: false, error: "Method Not Allowed" });
        return;
      }

      // Vérification API Key
      const apiKey = req.header("x-api-key");
      if (!apiKey || apiKey !== SOS_PLATFORM_API_KEY.value()) {
        logger.warn("[checkSubscription] Tentative non autorisée", {
          ip: getTrustedClientIp(req),
        });
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      const { userId, email } = req.query;
      const db = admin.firestore();
      let targetUserId: string | null = null;

      // Trouver l'utilisateur
      if (userId && typeof userId === "string") {
        targetUserId = userId;
      } else if (email && typeof email === "string") {
        const userQuery = await db
          .collection("users")
          .where("email", "==", email.toLowerCase())
          .limit(1)
          .get();

        if (!userQuery.empty) {
          targetUserId = userQuery.docs[0].id;
        }
      }

      if (!targetUserId) {
        res.status(404).json({
          ok: false,
          error: "User not found",
          hasAccess: false,
        });
        return;
      }

      // Vérifier le statut
      const { hasAccess, status, expiresAt } = await getUserSubscriptionStatus(targetUserId);

      res.status(200).json({
        ok: true,
        userId: targetUserId,
        hasAccess,
        status,
        expiresAt: expiresAt?.toISOString() || null,
      });

    } catch (error) {
      logger.error("[checkSubscription] Erreur", error);
      res.status(500).json({
        ok: false,
        error: (error as Error).message,
      });
    }
  }
);

// =============================================================================
// FONCTION: Expirer les abonnements dépassés (à appeler via scheduled function)
// =============================================================================

/**
 * Expire les abonnements dont la période est terminée
 * À appeler quotidiennement via Cloud Scheduler
 */
export async function expireOverdueSubscriptions(): Promise<{
  processed: number;
  expired: number;
}> {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  // Trouver les abonnements actifs dont la période est terminée
  const overdueQuery = await db
    .collection("subscriptions")
    .where("status", "in", ["active", "past_due"])
    .where("currentPeriodEnd", "<", now)
    .get();

  let expired = 0;

  for (const doc of overdueQuery.docs) {
    const subData = doc.data() as SubscriptionDocument;

    // Ne pas expirer si annulation à la fin de la période (géré par Stripe)
    if (subData.cancelAtPeriodEnd) {
      continue;
    }

    // Marquer comme expiré
    await db.runTransaction(async (tx) => {
      const statusHistory = subData.statusHistory || [];
      statusHistory.push({
        status: "expired",
        changedAt: admin.firestore.Timestamp.now(),
        reason: "Période expirée sans renouvellement",
      });

      tx.update(doc.ref, {
        status: "expired",
        statusHistory,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mettre à jour l'utilisateur aussi
      const userRef = db.collection("users").doc(subData.userId);
      tx.update(userRef, {
        subscriptionStatus: "expired",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    expired++;
    logger.info("[expireOverdueSubscriptions] Abonnement expiré", {
      userId: hashPII(subData.userId),
      emailHash: hashPII(subData.email),
    });
  }

  return {
    processed: overdueQuery.size,
    expired,
  };
}
