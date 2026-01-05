/**
 * =============================================================================
 * SYNC ACCESS TO OUTIL - P0 FIX
 * =============================================================================
 *
 * Ce trigger synchronise les champs d'acces IA manuels (admin console)
 * depuis SOS vers Outil-sos-expat.
 *
 * BUG CORRIGE:
 * - Admin definit forcedAIAccess=true dans users/{uid} sur SOS
 * - Mais Outil lit providers/{uid}.forcedAIAccess (qui n'existait pas)
 * - Ce trigger synchronise automatiquement ces champs vers Outil
 *
 * CHAMPS SYNCHRONISES:
 * - forcedAIAccess: boolean (acces gratuit force par admin)
 * - freeTrialUntil: Timestamp (essai gratuit limite dans le temps)
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

// Secret pour l'authentification avec Outil-sos-expat
const OUTIL_SYNC_API_KEY = defineSecret("OUTIL_SYNC_API_KEY");

// URL de l'endpoint syncProvider dans Outil-sos-expat (Cloud Run v2)
const OUTIL_SYNC_ENDPOINT = "https://syncprovider-r47sd2uiqa-ew.a.run.app";

interface UserAccessData {
  forcedAIAccess?: boolean;
  freeTrialUntil?: FirebaseFirestore.Timestamp | null;
  role?: string;
  email?: string;
}

interface SyncAccessPayload {
  id: string;
  action: "upsert";
  forcedAIAccess?: boolean;
  freeTrialUntil?: string | null;
}

/**
 * Envoie les champs d'acces au endpoint syncProvider de Outil-sos-expat
 */
async function syncAccessToOutil(
  payload: SyncAccessPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = OUTIL_SYNC_API_KEY.value();

    if (!apiKey) {
      logger.warn("[syncAccessToOutil] OUTIL_SYNC_API_KEY non configure");
      return { ok: false, error: "API key not configured" };
    }

    logger.info("[syncAccessToOutil] Envoi vers Outil:", {
      uid: payload.id,
      forcedAIAccess: payload.forcedAIAccess,
      freeTrialUntil: payload.freeTrialUntil,
    });

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
      logger.error("[syncAccessToOutil] Erreur sync:", {
        status: response.status,
        error: errorText,
        uid: payload.id,
      });
      return { ok: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    await response.json(); // Consume response body
    logger.info("[syncAccessToOutil] Sync reussie:", payload.id);
    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("[syncAccessToOutil] Exception:", {
      error: errorMessage,
      uid: payload.id,
    });
    return { ok: false, error: errorMessage };
  }
}

/**
 * Trigger: users/{uid} - onUpdate
 * Synchronise les champs d'acces IA vers Outil-sos-expat
 *
 * Declenche uniquement quand:
 * - forcedAIAccess change
 * - freeTrialUntil change
 */
export const onUserAccessUpdated = onDocumentUpdated(
  {
    document: "users/{uid}",
    region: "europe-west1",
    secrets: [OUTIL_SYNC_API_KEY],
  },
  async (event) => {
    const uid = event.params.uid;
    const beforeData = event.data?.before?.data() as UserAccessData | undefined;
    const afterData = event.data?.after?.data() as UserAccessData | undefined;

    if (!afterData) {
      logger.warn("[onUserAccessUpdated] Pas de donnees after pour:", uid);
      return;
    }

    // Verifier si seuls les champs d'acces IA ont change
    const beforeForcedAccess = beforeData?.forcedAIAccess;
    const afterForcedAccess = afterData.forcedAIAccess;

    const beforeFreeTrial = beforeData?.freeTrialUntil?.toMillis?.() ?? null;
    const afterFreeTrial = afterData.freeTrialUntil?.toMillis?.() ?? null;

    const forcedAccessChanged = beforeForcedAccess !== afterForcedAccess;
    const freeTrialChanged = beforeFreeTrial !== afterFreeTrial;

    if (!forcedAccessChanged && !freeTrialChanged) {
      // Pas de changement sur les champs d'acces IA - ignorer
      return;
    }

    // Ne synchroniser que les prestataires (lawyer, expat, provider)
    const role = afterData.role;
    const isProvider = role === "lawyer" || role === "expat" || role === "provider" || role === "expat_aidant";

    if (!isProvider) {
      logger.debug("[onUserAccessUpdated] Role non prestataire:", role, "pour:", uid);
      return;
    }

    logger.info("[onUserAccessUpdated] Changement d'acces detecte:", {
      uid,
      role,
      forcedAccessChanged,
      freeTrialChanged,
      forcedAIAccess: afterForcedAccess,
      freeTrialUntil: afterFreeTrial,
    });

    // Construire le payload
    const payload: SyncAccessPayload = {
      id: uid,
      action: "upsert",
    };

    // Toujours envoyer les deux champs pour garder la coherence
    if (afterForcedAccess !== undefined) {
      payload.forcedAIAccess = afterForcedAccess;
    }

    if (afterData.freeTrialUntil) {
      payload.freeTrialUntil = afterData.freeTrialUntil.toDate().toISOString();
    } else {
      payload.freeTrialUntil = null;
    }

    // Envoyer vers Outil
    const result = await syncAccessToOutil(payload);

    if (!result.ok) {
      logger.error("[onUserAccessUpdated] Echec sync pour:", uid, result.error);
      // TODO: Ajouter a une queue de retry si necessaire
    } else {
      logger.info("[onUserAccessUpdated] Acces synchronise vers Outil:", uid);
    }
  }
);
