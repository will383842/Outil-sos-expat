/**
 * =============================================================================
 * SYNC SOS_PROFILES TO OUTIL-SOS-EXPAT
 * =============================================================================
 *
 * Ce trigger synchronise automatiquement les sos_profiles vers la collection
 * `providers` dans le projet Outil-sos-expat.
 *
 * ARCHITECTURE:
 * - SOS (sos-urgently-ac307): sos_profiles/{uid}
 * - Outil (outils-sos-expat): providers/{uid}
 *
 * Le document ID est le Firebase UID pour garantir la cohérence.
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";

// Secret pour l'authentification avec Outil-sos-expat
const OUTIL_SYNC_API_KEY = defineSecret("OUTIL_SYNC_API_KEY");

// URL de l'endpoint syncProvider dans Outil-sos-expat
const OUTIL_SYNC_ENDPOINT = "https://europe-west1-outils-sos-expat.cloudfunctions.net/syncProvider";

interface SosProfileData {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  type?: "lawyer" | "expat";
  role?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  currentCountry?: string;
  languages?: string[];
  languagesSpoken?: string[];
  specialties?: string[];
  isActive?: boolean;
  isApproved?: boolean;
  isVerified?: boolean;
  subscriptionStatus?: string;
  hasActiveSubscription?: boolean;
  // Quota IA fields
  aiCallsLimit?: number;
  aiCallsUsed?: number;
  aiQuotaResetAt?: unknown; // Firestore Timestamp
}

interface SyncPayload {
  id: string;
  action: "upsert" | "delete";
  name?: string;
  email?: string;
  phone?: string;
  type?: string;
  country?: string;
  languages?: string[];
  isVerified?: boolean;
  isActive?: boolean;
  subscriptionStatus?: string;
  hasActiveSubscription?: boolean;
  sosProfileId?: string;
  // Quota IA fields
  aiCallsLimit?: number;
  aiCallsUsed?: number;
  aiQuotaResetAt?: unknown;
}

/**
 * Transforme les données sos_profiles en payload pour syncProvider
 */
function transformToSyncPayload(uid: string, data: SosProfileData, action: "upsert" | "delete" = "upsert"): SyncPayload {
  return {
    id: uid, // IMPORTANT: Utiliser le Firebase UID comme ID
    action,
    name: data.fullName || data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim() || undefined,
    email: data.email?.toLowerCase(),
    phone: data.phone || undefined,
    type: data.type || data.role || undefined,
    country: data.country || data.currentCountry || undefined,
    languages: data.languages || data.languagesSpoken || undefined,
    isVerified: data.isVerified || data.isApproved || false,
    isActive: data.isActive !== false,
    subscriptionStatus: data.subscriptionStatus,
    hasActiveSubscription: data.hasActiveSubscription,
    sosProfileId: uid, // Référence explicite au profil SOS
    // Quota IA fields
    aiCallsLimit: data.aiCallsLimit,
    aiCallsUsed: data.aiCallsUsed,
    aiQuotaResetAt: data.aiQuotaResetAt,
  };
}

/**
 * Envoie les données au endpoint syncProvider de Outil-sos-expat
 */
async function syncToOutil(payload: SyncPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = OUTIL_SYNC_API_KEY.value();

    if (!apiKey) {
      console.warn("[syncSosProfilesToOutil] OUTIL_SYNC_API_KEY non configuré");
      return { ok: false, error: "API key not configured" };
    }

    const response = await fetch(OUTIL_SYNC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[syncSosProfilesToOutil] Erreur sync:", response.status, errorText);
      return { ok: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    await response.json(); // Consume response body
    console.log("[syncSosProfilesToOutil] Sync réussie:", payload.id);
    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[syncSosProfilesToOutil] Exception:", errorMessage);
    return { ok: false, error: errorMessage };
  }
}

/**
 * Trigger: sos_profiles/{uid} - onCreate
 * Synchronise automatiquement les nouveaux profils vers Outil-sos-expat
 */
export const onSosProfileCreated = onDocumentCreated(
  {
    document: "sos_profiles/{uid}",
    region: "europe-west1",
    secrets: [OUTIL_SYNC_API_KEY],
  },
  async (event) => {
    const uid = event.params.uid;
    const data = event.data?.data() as SosProfileData | undefined;

    if (!data) {
      console.warn("[onSosProfileCreated] Pas de données pour:", uid);
      return;
    }

    // Ne synchroniser que les lawyer et expat
    const type = data.type || data.role;
    if (type !== "lawyer" && type !== "expat") {
      console.log("[onSosProfileCreated] Type non éligible:", type, "pour:", uid);
      return;
    }

    const payload = transformToSyncPayload(uid, data, "upsert");
    const result = await syncToOutil(payload);

    if (!result.ok) {
      console.error("[onSosProfileCreated] Échec sync pour:", uid, result.error);
      // TODO: Ajouter à une queue de retry
    }
  }
);

/**
 * Trigger: sos_profiles/{uid} - onUpdate
 * Synchronise les mises à jour vers Outil-sos-expat
 *
 * P0 SECURITY: Protection contre boucle infinie SOS <-> Outil
 */
export const onSosProfileUpdated = onDocumentUpdated(
  {
    document: "sos_profiles/{uid}",
    region: "europe-west1",
    secrets: [OUTIL_SYNC_API_KEY],
  },
  async (event) => {
    const uid = event.params.uid;
    const beforeData = event.data?.before?.data() as (SosProfileData & { lastSyncFromOutil?: unknown; updatedAt?: unknown }) | undefined;
    const afterData = event.data?.after?.data() as (SosProfileData & { lastSyncFromOutil?: unknown; updatedAt?: unknown }) | undefined;

    if (!afterData) {
      console.warn("[onSosProfileUpdated] Pas de données after pour:", uid);
      return;
    }

    // ============================================================================
    // P0 SECURITY: PROTECTION BOUCLE INFINIE
    // Si la mise à jour provient de syncFromOutil, NE PAS re-synchroniser vers Outil
    // Cela évite: SOS -> Outil -> SOS -> Outil -> ... (boucle infinie)
    // ============================================================================
    const beforeLastSync = beforeData?.lastSyncFromOutil;
    const afterLastSync = afterData.lastSyncFromOutil;

    // Si lastSyncFromOutil a été mis à jour, c'est une sync provenant de Outil -> ignorer
    if (afterLastSync && beforeLastSync !== afterLastSync) {
      console.log("[onSosProfileUpdated] P0 SECURITY: Ignoring update from Outil sync to prevent infinite loop:", uid);
      return;
    }

    // Protection supplémentaire: si seul updatedAt a changé, ignorer
    const beforeUpdatedAt = JSON.stringify(beforeData?.updatedAt);
    const afterUpdatedAt = JSON.stringify(afterData.updatedAt);
    if (beforeUpdatedAt !== afterUpdatedAt) {
      // Vérifier s'il y a d'autres changements que updatedAt et lastSyncFromOutil
      const otherChanges = Object.keys(afterData).some(key => {
        if (key === 'updatedAt' || key === 'lastSyncFromOutil') return false;
        return JSON.stringify(beforeData?.[key as keyof typeof beforeData]) !== JSON.stringify(afterData[key as keyof typeof afterData]);
      });

      if (!otherChanges) {
        console.log("[onSosProfileUpdated] P0 SECURITY: Only metadata changed, skipping sync:", uid);
        return;
      }
    }

    // Ne synchroniser que les lawyer et expat
    const type = afterData.type || afterData.role;
    if (type !== "lawyer" && type !== "expat") {
      console.log("[onSosProfileUpdated] Type non éligible:", type, "pour:", uid);
      return;
    }

    // Vérifier si des champs importants ont changé pour éviter les syncs inutiles
    const importantFields = [
      "email", "firstName", "lastName", "fullName", "name",
      "phone", "country", "currentCountry", "languages", "languagesSpoken",
      "isActive", "isApproved", "isVerified", "subscriptionStatus", "hasActiveSubscription",
      // Quota IA fields - important pour sync vers Outil IA dashboard
      "aiCallsLimit", "aiCallsUsed", "aiQuotaResetAt"
    ];

    const hasImportantChanges = importantFields.some(field => {
      const before = beforeData?.[field as keyof SosProfileData];
      const after = afterData[field as keyof SosProfileData];
      return JSON.stringify(before) !== JSON.stringify(after);
    });

    if (!hasImportantChanges) {
      console.log("[onSosProfileUpdated] Pas de changements importants pour:", uid);
      return;
    }

    const payload = transformToSyncPayload(uid, afterData, "upsert");
    const result = await syncToOutil(payload);

    if (!result.ok) {
      console.error("[onSosProfileUpdated] Échec sync pour:", uid, result.error);
      // TODO: Ajouter à une queue de retry
    }
  }
);
