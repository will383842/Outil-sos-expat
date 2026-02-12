/**
 * Cloud Function callable pour s'assurer qu'un document utilisateur existe
 * avec les champs requis pour le dashboard multi-prestataire
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

interface EnsureUserDocumentRequest {
  userId?: string; // Optionnel, par défaut = l'utilisateur appelant
}

interface EnsureUserDocumentResponse {
  success: boolean;
  created: boolean;
  updated: boolean;
  userId: string;
  data?: {
    role?: string;
    linkedProviderIds?: string[];
  };
  error?: string;
}

export const ensureUserDocument = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<EnsureUserDocumentResponse> => {
    const db = getFirestore();
    const data = request.data as EnsureUserDocumentRequest;

    // Vérifier que l'utilisateur est authentifié
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "L'utilisateur doit être authentifié"
      );
    }

    // Par défaut, utiliser l'UID de l'utilisateur appelant
    const userId = data.userId || request.auth.uid;

    // Seul un admin peut vérifier le document d'un autre utilisateur
    if (userId !== request.auth.uid) {
      const callerDoc = await db.collection("users").doc(request.auth.uid).get();
      const callerRole = callerDoc.data()?.role;
      if (callerRole !== "admin") {
        throw new HttpsError(
          "permission-denied",
          "Seul un admin peut vérifier le document d'un autre utilisateur"
        );
      }
    }

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      let created = false;
      let updated = false;

      if (!userDoc.exists) {
        // Le document n'existe pas, le créer avec des valeurs par défaut
        const authUser = await getAuth().getUser(userId);

        await userRef.set({
          email: authUser.email || "",
          displayName: authUser.displayName || authUser.email?.split("@")[0] || "",
          role: "agency_manager", // Par défaut
          linkedProviderIds: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        created = true;

        logger.info(`Document utilisateur créé pour ${userId}`);

        return {
          success: true,
          created: true,
          updated: false,
          userId,
          data: {
            role: "agency_manager",
            linkedProviderIds: [],
          },
        };
      }

      // Le document existe, vérifier les champs requis
      const userData = userDoc.data()!;
      const updates: Record<string, any> = {};

      if (!userData.role) {
        updates.role = "agency_manager";
        updated = true;
      }

      if (!userData.linkedProviderIds || !Array.isArray(userData.linkedProviderIds)) {
        updates.linkedProviderIds = [];
        updated = true;
      }

      if (updated) {
        updates.updatedAt = FieldValue.serverTimestamp();
        await userRef.update(updates);
        logger.info(`Document utilisateur mis à jour pour ${userId}`, updates);
      }

      return {
        success: true,
        created,
        updated,
        userId,
        data: {
          role: updates.role || userData.role,
          linkedProviderIds: updates.linkedProviderIds || userData.linkedProviderIds,
        },
      };
    } catch (error) {
      logger.error("Erreur lors de la vérification du document utilisateur", error);
      return {
        success: false,
        created: false,
        updated: false,
        userId,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }
);
