/**
 * =============================================================================
 * GENERATE OUTIL TOKEN - SSO pour l'accès à l'Outil IA
 * =============================================================================
 *
 * Cette fonction génère un Custom Token Firebase pour permettre au prestataire
 * de se connecter automatiquement à l'Outil IA sans avoir à se reconnecter.
 *
 * Flux:
 * 1. Le prestataire clique sur "Assistant IA" dans SOS
 * 2. SOS appelle cette fonction avec l'UID du prestataire
 * 3. La fonction vérifie l'abonnement et génère un Custom Token
 * 4. SOS ouvre l'Outil avec le token: /auth?token=xxx
 * 5. L'Outil utilise signInWithCustomToken() pour connecter l'utilisateur
 *
 * =============================================================================
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Génère un Custom Token pour l'accès SSO à l'Outil IA
 *
 * @param uid - L'UID de l'utilisateur Firebase
 * @returns Le Custom Token pour l'authentification SSO
 */
export const generateOutilToken = onCall(
  {
    region: "europe-west1",
    cors: true,
    // Use the App Engine default service account which has Firestore access
    serviceAccount: "sos-urgently-ac307@appspot.gserviceaccount.com",
  },
  async (request) => {
    console.log("[generateOutilToken] Function called");

    // Initialize Firebase Admin inside function context
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    const db = admin.firestore();
    const auth = admin.auth();

    console.log("[generateOutilToken] Firebase Admin initialized");

    // 1. Vérifier que l'utilisateur est authentifié
    if (!request.auth) {
      console.log("[generateOutilToken] No auth context");
      throw new HttpsError(
        "unauthenticated",
        "Vous devez être connecté pour accéder à l'Outil IA"
      );
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;
    console.log("[generateOutilToken] User:", { uid, email });

    try {
      // 2. Vérifier que l'utilisateur est un prestataire
      console.log("[generateOutilToken] Checking if user is provider...");
      const isUserProvider = await isProvider(db, uid);
      console.log("[generateOutilToken] isProvider result:", isUserProvider);

      if (!isUserProvider) {
        throw new HttpsError(
          "permission-denied",
          "Vous n'êtes pas enregistré comme prestataire"
        );
      }

      // 3. Vérifier l'accès admin forcé (bypass complet si activé)
      console.log("[generateOutilToken] Checking forced access...");
      const { hasForcedAccess, freeTrialUntil } = await checkForcedAccess(db, uid);
      console.log("[generateOutilToken] Forced access:", { hasForcedAccess, freeTrialUntil });

      // Si accès forcé par admin, générer directement le token (bypass tout)
      if (hasForcedAccess) {
        console.log("[generateOutilToken] User has forced access, generating token...");
        const customClaims = {
          provider: true,
          subscriptionTier: "unlimited",
          subscriptionStatus: "active",
          forcedAccess: true,
          email: email,
          tokenGeneratedAt: Date.now(),
        };

        console.log("[generateOutilToken] Creating custom token with claims:", customClaims);
        const customToken = await auth.createCustomToken(uid, customClaims);
        console.log("[generateOutilToken] Token created successfully");

        // Logger l'accès
        await db.collection("ssoLogs").add({
          userId: uid,
          email: email,
          action: "generate_outil_token",
          timestamp: new Date(),
          success: true,
          subscriptionTier: "forced_access",
          accessType: "admin_forced",
        });

        return {
          success: true,
          token: customToken,
          expiresIn: 3600,
        };
      }

      // Si essai gratuit manuel (freeTrialUntil), accorder l'accès
      if (freeTrialUntil) {
        console.log("[generateOutilToken] User has free trial until:", freeTrialUntil);
        const customClaims = {
          provider: true,
          subscriptionTier: "trial",
          subscriptionStatus: "trialing",
          freeTrialUntil: freeTrialUntil.toISOString(),
          email: email,
          tokenGeneratedAt: Date.now(),
        };

        const customToken = await auth.createCustomToken(uid, customClaims);

        // Logger l'accès
        await db.collection("ssoLogs").add({
          userId: uid,
          email: email,
          action: "generate_outil_token",
          timestamp: new Date(),
          success: true,
          subscriptionTier: "manual_trial",
          accessType: "free_trial_until",
          trialEndsAt: freeTrialUntil,
        });

        return {
          success: true,
          token: customToken,
          expiresIn: 3600,
        };
      }

      // 4. Vérifier l'abonnement standard (vérifie tous les formats d'ID possibles)
      console.log("[generateOutilToken] Checking subscription...");
      const subscription = await getSubscription(db, uid);
      console.log("[generateOutilToken] Subscription:", subscription);

      // Vérifier si l'abonnement est actif ou en période d'essai
      let hasActiveSubscription = false;

      if (subscription) {
        // Statuts qui donnent accès
        if (subscription.status === "active" ||
            subscription.status === "trialing" ||
            subscription.status === "past_due") {
          hasActiveSubscription = true;
        }

        // Vérifier si en période d'essai gratuit (avec les deux noms de champ possibles)
        const trialEnd = subscription.trialEndsAt || subscription.trialEnd;
        if (trialEnd) {
          const trialEndDate = trialEnd.toDate ? trialEnd.toDate() : new Date(trialEnd);
          if (trialEndDate > new Date()) {
            hasActiveSubscription = true;
          }
        }
      }

      console.log("[generateOutilToken] hasActiveSubscription:", hasActiveSubscription);

      if (!hasActiveSubscription) {
        throw new HttpsError(
          "permission-denied",
          "Votre abonnement n'est pas actif. Veuillez souscrire à un plan."
        );
      }

      // 5. Vérifier le quota IA
      const now = new Date();

      // Essayer les deux collections possibles: aiUsage et ai_usage
      let usageDoc = await db.collection("aiUsage").doc(uid).get();
      if (!usageDoc.exists) {
        usageDoc = await db.collection("ai_usage").doc(uid).get();
      }

      const usage = usageDoc.data();

      // Calculer l'utilisation actuelle (supporte les deux formats)
      let currentUsage = 0;

      if (usage) {
        // Format 1: monthlyUsage (objet avec clés YYYY-MM)
        if (usage.monthlyUsage) {
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          currentUsage = usage.monthlyUsage[monthKey] || 0;
        }
        // Format 2: currentPeriodCalls (nombre direct)
        else if (typeof usage.currentPeriodCalls === "number") {
          currentUsage = usage.currentPeriodCalls;
        }
        // Format 3: pour les essais, utiliser trialCallsUsed
        else if (subscription?.status === "trialing" && typeof usage.trialCallsUsed === "number") {
          currentUsage = usage.trialCallsUsed;
        }
      }

      // Récupérer la limite du plan
      const planLimits: Record<string, number> = {
        trial: 10,    // Essai gratuit
        basic: 50,
        standard: 150,
        pro: 500,
        unlimited: -1, // Illimité
      };

      // À ce stade, subscription n'est pas null car hasActiveSubscription l'a vérifié
      const subscriptionData = subscription!;
      const tier = subscriptionData.tier || (subscriptionData.status === "trialing" ? "trial" : "basic");
      const limit = planLimits[tier] ?? 50;

      console.log("[generateOutilToken] Quota check:", { currentUsage, limit, tier });

      if (limit !== -1 && currentUsage >= limit) {
        throw new HttpsError(
          "resource-exhausted",
          "Vous avez atteint votre quota mensuel d'appels IA"
        );
      }

      // 6. Générer le Custom Token avec des claims personnalisés
      const customClaims = {
        provider: true,
        subscriptionTier: tier,
        subscriptionStatus: subscriptionData.status,
        email: email,
        // Ajouter un timestamp pour invalider les vieux tokens
        tokenGeneratedAt: Date.now(),
      };

      console.log("[generateOutilToken] Creating custom token...");
      const customToken = await auth.createCustomToken(uid, customClaims);
      console.log("[generateOutilToken] Token created successfully");

      // 7. Logger l'accès pour le monitoring
      await db.collection("ssoLogs").add({
        userId: uid,
        email: email,
        action: "generate_outil_token",
        timestamp: new Date(),
        success: true,
        subscriptionTier: tier,
      });

      return {
        success: true,
        token: customToken,
        expiresIn: 3600, // Le token expire après 1 heure
      };

    } catch (error: any) {
      console.error("[generateOutilToken] ERROR:", error);
      console.error("[generateOutilToken] Error name:", error?.name);
      console.error("[generateOutilToken] Error message:", error?.message);
      console.error("[generateOutilToken] Error stack:", error?.stack);

      // Logger l'erreur
      try {
        await db.collection("ssoLogs").add({
          userId: uid,
          email: email,
          action: "generate_outil_token",
          timestamp: new Date(),
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          errorStack: error?.stack,
        });
      } catch (logError) {
        console.error("[generateOutilToken] Failed to log error:", logError);
      }

      // Re-throw si c'est déjà une HttpsError
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("Erreur lors de la génération du token SSO:", error);
      throw new HttpsError(
        "internal",
        "Erreur lors de la génération du token d'accès"
      );
    }
  }
);

/**
 * Vérifie si l'utilisateur est un prestataire (avocat ou expatrié aidant)
 */
async function isProvider(db: FirebaseFirestore.Firestore, uid: string): Promise<boolean> {
  // 1. Vérifier dans la collection users avec le rôle provider/lawyer
  const userDoc = await db.collection("users").doc(uid).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    const role = userData?.role;
    if (role === "provider" || role === "lawyer" || role === "expat_aidant" ||
        role === "admin" || role === "superadmin") {
      return true;
    }
  }

  // 2. Vérifier dans la collection providers (legacy)
  const providerQuery = await db
    .collection("providers")
    .where("userId", "==", uid)
    .limit(1)
    .get();

  if (!providerQuery.empty) {
    return true;
  }

  // 3. Vérifier avec l'UID directement comme ID de document
  const directProviderDoc = await db.collection("providers").doc(uid).get();
  return directProviderDoc.exists;
}

/**
 * Vérifie si l'utilisateur a un accès admin forcé (gratuit sans abonnement)
 */
async function checkForcedAccess(db: FirebaseFirestore.Firestore, uid: string): Promise<{ hasForcedAccess: boolean; freeTrialUntil: Date | null }> {
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    return { hasForcedAccess: false, freeTrialUntil: null };
  }

  const userData = userDoc.data();

  // Vérifier l'accès admin forcé
  if (userData?.forcedAIAccess === true) {
    return { hasForcedAccess: true, freeTrialUntil: null };
  }

  // Vérifier l'essai gratuit manuel (freeTrialUntil)
  if (userData?.freeTrialUntil) {
    const trialDate = userData.freeTrialUntil.toDate
      ? userData.freeTrialUntil.toDate()
      : new Date(userData.freeTrialUntil);

    if (trialDate > new Date()) {
      return { hasForcedAccess: false, freeTrialUntil: trialDate };
    }
  }

  return { hasForcedAccess: false, freeTrialUntil: null };
}

/**
 * Récupère l'abonnement de l'utilisateur (vérifie les deux formats d'ID)
 */
async function getSubscription(db: FirebaseFirestore.Firestore, uid: string): Promise<FirebaseFirestore.DocumentData | null> {
  // 1. Essayer avec l'UID directement
  const subDoc1 = await db.collection("subscriptions").doc(uid).get();
  if (subDoc1.exists) {
    return subDoc1.data() || null;
  }

  // 2. Essayer avec le format sub_{uid}
  const subDoc2 = await db.collection("subscriptions").doc(`sub_${uid}`).get();
  if (subDoc2.exists) {
    return subDoc2.data() || null;
  }

  // 3. Vérifier le statut d'abonnement sur le document user
  const userDoc = await db.collection("users").doc(uid).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    if (userData?.subscriptionStatus) {
      return {
        status: userData.subscriptionStatus,
        tier: userData.tier || userData.planName || "basic",
        trialEndsAt: userData.subscriptionExpiresAt || userData.trialEndsAt,
      };
    }
  }

  return null;
}
