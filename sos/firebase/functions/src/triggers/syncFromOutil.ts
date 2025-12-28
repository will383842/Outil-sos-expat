/**
 * =============================================================================
 * SYNC FROM OUTIL-SOS-EXPAT
 * =============================================================================
 *
 * Endpoint HTTP pour recevoir les mises à jour de providers depuis Outil-sos-expat.
 * Cela permet de synchroniser les changements faits par l'admin dans Outil
 * vers la collection sos_profiles dans SOS.
 *
 * ARCHITECTURE:
 * - Outil (outils-sos-expat): providers/{uid} -> HTTP POST -> SOS
 * - SOS (sos-urgently-ac307): sos_profiles/{uid}
 *
 * Champs synchronisés:
 * - forcedAIAccess: Bypass admin pour l'accès IA
 * - hasActiveSubscription: Statut d'abonnement actif
 * - subscriptionStatus: Statut détaillé de l'abonnement
 * - aiCallsUsed: Compteur d'utilisation IA (info only)
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import type { Request, Response } from "express";

// Initialisation Firebase Admin (si pas déjà fait)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Secret pour l'authentification depuis Outil-sos-expat
const SOS_SYNC_API_KEY = defineSecret("SOS_SYNC_API_KEY");

// =============================================================================
// TYPES
// =============================================================================

interface SyncFromOutilPayload {
  id: string; // Firebase UID (provider ID)
  action?: "update" | "delete";
  // Champs pouvant être mis à jour depuis Outil
  forcedAIAccess?: boolean;
  hasActiveSubscription?: boolean;
  subscriptionStatus?: string;
  aiCallsUsed?: number;
  aiCallsLimit?: number;
  freeTrialUntil?: string; // ISO date string
  // Métadonnées
  updatedBy?: string; // Admin UID who made the change
  source?: string;
}

// CORS - Accepter les requêtes depuis les Cloud Functions de Outil
const CORS_ORIGINS = [
  "https://europe-west1-outils-sos-expat.cloudfunctions.net",
];

// =============================================================================
// SYNC FROM OUTIL ENDPOINT
// =============================================================================

/**
 * Endpoint HTTP pour recevoir les mises à jour de providers depuis Outil.
 *
 * POST /syncFromOutil
 * Headers:
 *   - x-api-key: SOS_SYNC_API_KEY
 * Body:
 *   - id: string (Firebase UID)
 *   - action: "update" | "delete"
 *   - forcedAIAccess?: boolean
 *   - hasActiveSubscription?: boolean
 *   - subscriptionStatus?: string
 */
export const syncFromOutil = onRequest(
  {
    region: "europe-west1",
    cors: CORS_ORIGINS,
    secrets: [SOS_SYNC_API_KEY],
    timeoutSeconds: 30,
  },
  async (req: Request, res: Response): Promise<void> => {
    // Vérifier la méthode
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    // Vérifier l'API Key
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== SOS_SYNC_API_KEY.value()) {
      logger.warn("[syncFromOutil] Tentative non autorisée", {
        ip: req.ip || req.headers["x-forwarded-for"],
      });
      res.status(401).json({ ok: false, error: "Invalid API key" });
      return;
    }

    const data = req.body as SyncFromOutilPayload;

    // Validation du payload
    if (!data.id) {
      res.status(400).json({ ok: false, error: "Missing provider id" });
      return;
    }

    const providerId = String(data.id);
    const action = data.action || "update";

    try {
      const sosProfileRef = db.collection("sos_profiles").doc(providerId);
      const sosProfileDoc = await sosProfileRef.get();

      // Vérifier que le profil existe
      if (!sosProfileDoc.exists) {
        logger.warn("[syncFromOutil] Profil SOS non trouvé", { providerId });
        res.status(404).json({ ok: false, error: "SOS profile not found" });
        return;
      }

      if (action === "delete") {
        // Soft delete - désactiver le profil
        await sosProfileRef.update({
          isActive: false,
          deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
          deactivatedReason: "sync_from_outil",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info("[syncFromOutil] Profil désactivé", { providerId });
        res.status(200).json({ ok: true, message: "Profile deactivated", providerId });
        return;
      }

      // Construire les données à mettre à jour
      const updateData: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSyncFromOutil: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Mapper les champs de Outil vers SOS
      if (data.forcedAIAccess !== undefined) {
        updateData.forcedAIAccess = data.forcedAIAccess;
      }
      if (data.hasActiveSubscription !== undefined) {
        updateData.hasActiveSubscription = data.hasActiveSubscription;
      }
      if (data.subscriptionStatus !== undefined) {
        updateData.subscriptionStatus = data.subscriptionStatus;
      }
      if (data.aiCallsUsed !== undefined) {
        updateData.aiCallsUsed = data.aiCallsUsed;
      }
      if (data.aiCallsLimit !== undefined) {
        updateData.aiCallsLimit = data.aiCallsLimit;
      }
      if (data.freeTrialUntil !== undefined) {
        updateData.freeTrialUntil = new Date(data.freeTrialUntil);
      }
      if (data.updatedBy) {
        updateData.lastSyncUpdatedBy = data.updatedBy;
      }

      // Mettre à jour le profil SOS
      await sosProfileRef.update(updateData);

      logger.info("[syncFromOutil] Profil synchronisé", {
        providerId,
        fieldsUpdated: Object.keys(updateData).filter(k => k !== "updatedAt" && k !== "lastSyncFromOutil")
      });

      res.status(200).json({
        ok: true,
        message: "Profile synchronized",
        providerId,
        fieldsUpdated: Object.keys(updateData).length - 2 // Exclude metadata fields
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[syncFromOutil] Erreur", { providerId, error: errorMessage });
      res.status(500).json({ ok: false, error: errorMessage });
    }
  }
);
