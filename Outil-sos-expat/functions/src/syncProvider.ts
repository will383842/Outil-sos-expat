/**
 * =============================================================================
 * SYNC PROVIDER - Synchronisation des prestataires depuis Laravel
 * =============================================================================
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import type { Request, Response } from "express";
import {
  applySecurityChecks,
  getTrustedClientIp,
  MAX_PAYLOAD_SIZE_BULK,
} from "./security";

// =============================================================================
// INITIALISATION
// =============================================================================

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Secret pour l'authentification des webhooks de synchronisation providers
const SYNC_PROVIDER_API_KEY = defineSecret("SYNC_PROVIDER_API_KEY");

// =============================================================================
// TYPES
// =============================================================================

interface ProviderData {
  updatedAt: FirebaseFirestore.FieldValue;
  source: string;
  name?: string;
  email?: string;
  phone?: string;
  type?: string;
  country?: string;
  languages?: string[];
  isVerified?: boolean;
  active?: boolean;
  createdAt?: FirebaseFirestore.FieldValue;
  // Nouveaux champs pour sync depuis sos_profiles
  sosProfileId?: string;
  subscriptionStatus?: string;
  hasActiveSubscription?: boolean;
  // Quota IA fields
  aiCallsLimit?: number;
  aiCallsUsed?: number;
  aiQuotaResetAt?: unknown;
}

interface SyncProviderPayload {
  id: string | number;
  action?: "upsert" | "delete";
  name?: string;
  email?: string;
  phone?: string;
  type?: string;
  country?: string;
  languages?: string[];
  isVerified?: boolean;
  isActive?: boolean;
  // Nouveaux champs pour sync depuis sos_profiles
  sosProfileId?: string;
  subscriptionStatus?: string;
  hasActiveSubscription?: boolean;
  // Quota IA fields
  aiCallsLimit?: number;
  aiCallsUsed?: number;
  aiQuotaResetAt?: unknown;
}

// CORS restrictif
const CORS_ORIGINS = [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "https://admin.sos-expat.com",
];

// =============================================================================
// SYNC PROVIDER (single)
// =============================================================================

export const syncProvider = onRequest(
  {
    region: "europe-west1",
    cors: CORS_ORIGINS,
    secrets: [SYNC_PROVIDER_API_KEY],
    timeoutSeconds: 30,
  },
  async (req: Request, res: Response): Promise<void> => {
    // Security checks
    if (!applySecurityChecks(req, res)) {
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== SYNC_PROVIDER_API_KEY.value()) {
      logger.warn("[syncProvider] Tentative non autorisée", {
        ip: getTrustedClientIp(req),
      });
      res.status(401).json({ ok: false, error: "Invalid API key" });
      return;
    }

    const data = req.body as SyncProviderPayload;

    if (!data.id) {
      res.status(400).json({ ok: false, error: "Missing provider id" });
      return;
    }

    const providerId = String(data.id);
    const action = data.action || "upsert";

    try {
      const providerRef = db.collection("providers").doc(providerId);

      if (action === "delete") {
        await providerRef.set(
          { active: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        logger.info("[syncProvider] Provider désactivé", { providerId });
        res.status(200).json({ ok: true, message: "Provider désactivé", providerId });
        return;
      }

      const providerData: ProviderData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "sos-expat",
      };

      if (data.name) providerData.name = data.name;
      if (data.email) providerData.email = data.email.toLowerCase();
      if (data.phone) providerData.phone = data.phone;
      if (data.type) providerData.type = data.type;
      if (data.country) providerData.country = data.country;
      if (data.languages) providerData.languages = data.languages;
      if (data.isVerified !== undefined) providerData.isVerified = data.isVerified;
      if (data.isActive !== undefined) providerData.active = data.isActive;
      // Nouveaux champs pour sync depuis sos_profiles
      if (data.sosProfileId) providerData.sosProfileId = data.sosProfileId;
      if (data.subscriptionStatus) providerData.subscriptionStatus = data.subscriptionStatus;
      if (data.hasActiveSubscription !== undefined) providerData.hasActiveSubscription = data.hasActiveSubscription;
      // Quota IA fields
      if (data.aiCallsLimit !== undefined) providerData.aiCallsLimit = data.aiCallsLimit;
      if (data.aiCallsUsed !== undefined) providerData.aiCallsUsed = data.aiCallsUsed;
      if (data.aiQuotaResetAt !== undefined) providerData.aiQuotaResetAt = data.aiQuotaResetAt;

      const existingDoc = await providerRef.get();
      if (!existingDoc.exists) {
        providerData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        providerData.active = data.isActive !== false;
      }

      await providerRef.set(providerData, { merge: true });

      logger.info("[syncProvider] Provider synchronisé", { providerId });
      res.status(200).json({ ok: true, message: "Provider synchronisé", providerId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[syncProvider] Erreur", { providerId, error: errorMessage });
      res.status(500).json({ ok: false, error: errorMessage });
    }
  }
);

// =============================================================================
// SYNC PROVIDERS BULK
// =============================================================================

export const syncProvidersBulk = onRequest(
  {
    region: "europe-west1",
    cors: CORS_ORIGINS,
    secrets: [SYNC_PROVIDER_API_KEY],
    timeoutSeconds: 60, // Plus long pour bulk
  },
  async (req: Request, res: Response): Promise<void> => {
    // Security checks avec payload plus grand autorisé
    if (!applySecurityChecks(req, res, { maxPayloadSize: MAX_PAYLOAD_SIZE_BULK })) {
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== SYNC_PROVIDER_API_KEY.value()) {
      logger.warn("[syncProvidersBulk] Tentative non autorisée", {
        ip: getTrustedClientIp(req),
      });
      res.status(401).json({ ok: false, error: "Invalid API key" });
      return;
    }

    const { providers } = req.body as { providers?: SyncProviderPayload[] };

    if (!Array.isArray(providers)) {
      res.status(400).json({ ok: false, error: "Missing providers array" });
      return;
    }

    // Limite le nombre de providers par batch
    const MAX_BATCH_SIZE = 500;
    if (providers.length > MAX_BATCH_SIZE) {
      res.status(400).json({
        ok: false,
        error: `Too many providers. Max ${MAX_BATCH_SIZE} per request`,
        received: providers.length,
      });
      return;
    }

    const batch = db.batch();
    let processed = 0;

    for (const provider of providers) {
      if (!provider.id) continue;

      const providerRef = db.collection("providers").doc(String(provider.id));
      const providerData: ProviderData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "sos-expat",
        active: provider.isActive !== false,
      };

      if (provider.name) providerData.name = provider.name;
      if (provider.email) providerData.email = provider.email.toLowerCase();
      if (provider.type) providerData.type = provider.type;
      if (provider.country) providerData.country = provider.country;

      batch.set(providerRef, providerData, { merge: true });
      processed++;
    }

    try {
      await batch.commit();
      logger.info("[syncProvidersBulk] Providers synchronisés", { count: processed });
      res.status(200).json({ ok: true, message: `${processed} providers synchronisés` });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[syncProvidersBulk] Erreur", { error: errorMessage });
      res.status(500).json({ ok: false, error: errorMessage });
    }
  }
);
