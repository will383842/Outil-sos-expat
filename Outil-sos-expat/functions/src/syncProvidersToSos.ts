/**
 * =============================================================================
 * SYNC PROVIDERS TO SOS-EXPAT (REVERSE SYNC)
 * =============================================================================
 *
 * Ce trigger synchronise automatiquement les modifications de providers
 * vers la collection `sos_profiles` dans le projet SOS.
 *
 * ARCHITECTURE:
 * - Outil (outils-sos-expat): providers/{uid}
 * - SOS (sos-urgently-ac307): sos_profiles/{uid}
 *
 * Champs synchronisés (admin actions):
 * - forcedAIAccess: Bypass admin pour l'accès IA
 * - hasActiveSubscription: Statut d'abonnement actif
 * - subscriptionStatus: Statut détaillé de l'abonnement
 * - aiCallsUsed: Compteur d'utilisation IA (info only)
 * - aiCallsLimit: Limite de quota IA
 * - freeTrialUntil: Date de fin de période d'essai
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

// Secret pour l'authentification avec SOS
const SOS_SYNC_API_KEY = defineSecret("SOS_SYNC_API_KEY");

// URL de l'endpoint syncFromOutil dans SOS
const SOS_SYNC_ENDPOINT = "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/syncFromOutil";

// =============================================================================
// TYPES
// =============================================================================

interface ProviderData {
  forcedAIAccess?: boolean;
  hasActiveSubscription?: boolean;
  subscriptionStatus?: string;
  aiCallsUsed?: number;
  aiCallsLimit?: number;
  freeTrialUntil?: FirebaseFirestore.Timestamp;
  // Métadonnées
  sosProfileId?: string;
  source?: string;
}

interface SyncPayload {
  id: string;
  action: "update" | "delete";
  forcedAIAccess?: boolean;
  hasActiveSubscription?: boolean;
  subscriptionStatus?: string;
  aiCallsUsed?: number;
  aiCallsLimit?: number;
  freeTrialUntil?: string;
  updatedBy?: string;
  source: string;
}

// Champs qui déclenchent une synchronisation vers SOS
const SYNC_FIELDS = [
  "forcedAIAccess",
  "hasActiveSubscription",
  "subscriptionStatus",
  "aiCallsLimit",
  "freeTrialUntil",
  // Note: aiCallsUsed n'est pas inclus car il change trop fréquemment
];

/**
 * Vérifie si des champs importants ont changé
 */
function hasRelevantChanges(
  before: ProviderData | undefined,
  after: ProviderData
): boolean {
  if (!before) return false;

  return SYNC_FIELDS.some(field => {
    const beforeValue = before[field as keyof ProviderData];
    const afterValue = after[field as keyof ProviderData];
    return JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
  });
}

/**
 * Envoie les données au endpoint syncFromOutil de SOS
 */
async function syncToSos(payload: SyncPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = SOS_SYNC_API_KEY.value();

    if (!apiKey) {
      logger.warn("[syncProvidersToSos] SOS_SYNC_API_KEY non configuré");
      return { ok: false, error: "API key not configured" };
    }

    const response = await fetch(SOS_SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[syncProvidersToSos] Erreur sync:", response.status, errorText);
      return { ok: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    logger.info("[syncProvidersToSos] Sync réussie:", payload.id, result);
    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("[syncProvidersToSos] Exception:", errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/**
 * Transforme les données provider en payload pour SOS
 */
function transformToSyncPayload(
  uid: string,
  data: ProviderData,
  action: "update" | "delete" = "update"
): SyncPayload {
  const payload: SyncPayload = {
    id: uid,
    action,
    source: "outil-sos-expat",
  };

  // Copier les champs pertinents
  if (data.forcedAIAccess !== undefined) {
    payload.forcedAIAccess = data.forcedAIAccess;
  }
  if (data.hasActiveSubscription !== undefined) {
    payload.hasActiveSubscription = data.hasActiveSubscription;
  }
  if (data.subscriptionStatus !== undefined) {
    payload.subscriptionStatus = data.subscriptionStatus;
  }
  if (data.aiCallsLimit !== undefined) {
    payload.aiCallsLimit = data.aiCallsLimit;
  }
  if (data.freeTrialUntil) {
    // Convertir Timestamp en ISO string
    const date = data.freeTrialUntil.toDate?.() || new Date(data.freeTrialUntil as unknown as string);
    payload.freeTrialUntil = date.toISOString();
  }

  return payload;
}

/**
 * Trigger: providers/{uid} - onUpdate
 * Synchronise les modifications importantes vers SOS
 */
export const onProviderUpdated = onDocumentUpdated(
  {
    document: "providers/{uid}",
    region: "europe-west1",
    secrets: [SOS_SYNC_API_KEY],
  },
  async (event) => {
    const uid = event.params.uid;
    const beforeData = event.data?.before?.data() as ProviderData | undefined;
    const afterData = event.data?.after?.data() as ProviderData | undefined;

    if (!afterData) {
      logger.warn("[onProviderUpdated] Pas de données after pour:", uid);
      return;
    }

    // Vérifier si le provider a un sosProfileId (lié à SOS)
    // Si non, pas besoin de synchroniser
    if (!afterData.sosProfileId && afterData.source !== "sos-expat") {
      logger.debug("[onProviderUpdated] Provider non lié à SOS, skip sync:", uid);
      return;
    }

    // Vérifier si des champs importants ont changé
    if (!hasRelevantChanges(beforeData, afterData)) {
      logger.debug("[onProviderUpdated] Pas de changements pertinents pour:", uid);
      return;
    }

    // Construire et envoyer le payload
    const payload = transformToSyncPayload(uid, afterData, "update");
    const result = await syncToSos(payload);

    if (!result.ok) {
      logger.error("[onProviderUpdated] Échec sync pour:", uid, result.error);
      // TODO: Ajouter à une queue de retry si critique
    }
  }
);
