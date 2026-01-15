/**
 * =============================================================================
 * GENERATE OUTIL TOKEN - SSO pour l'accès à l'Outil IA
 * =============================================================================
 *
 * Cette fonction génère un Custom Token Firebase pour permettre au prestataire
 * de se connecter automatiquement à l'Outil IA sans avoir à se reconnecter.
 *
 * IMPORTANT: Le token DOIT être signé par le service account de l'OUTIL project
 * (outils-sos-expat), pas celui de SOS, sinon signInWithCustomToken() échouera.
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
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

// Lazy initialization to avoid issues during deployment analysis
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// Secret contenant le JSON du service account de l'Outil project
// IMPORTANT: Créer ce secret avec la clé JSON du service account outils-sos-expat
const OUTIL_SERVICE_ACCOUNT = defineSecret("OUTIL_SERVICE_ACCOUNT_KEY");

// Instance Firebase Admin pour l'Outil project (pour générer les custom tokens)
let outilApp: admin.app.App | null = null;

/**
 * Initialise ou récupère l'instance Firebase Admin pour l'Outil project
 * Note: Cette fonction ne doit être appelée qu'au runtime, pas pendant l'analyse de déploiement
 */
function getOutilApp(): admin.app.App {
  if (IS_DEPLOYMENT_ANALYSIS) {
    throw new Error("Cannot initialize Outil app during deployment analysis");
  }

  if (!outilApp) {
    const serviceAccountJson = OUTIL_SERVICE_ACCOUNT.value();
    if (!serviceAccountJson) {
      throw new Error("OUTIL_SERVICE_ACCOUNT_KEY secret not configured");
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      outilApp = admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId: "outils-sos-expat",
        },
        "outil-sso" // Nom unique pour cette app
      );
      console.log("[generateOutilToken] Outil Firebase Admin initialized");
    } catch (e) {
      console.error("[generateOutilToken] Failed to parse service account JSON:", e);
      throw new Error("Invalid OUTIL_SERVICE_ACCOUNT_KEY configuration");
    }
  }
  return outilApp;
}

function getOutilAuth(): admin.auth.Auth {
  return admin.auth(getOutilApp());
}

function getOutilFirestore(): FirebaseFirestore.Firestore {
  return admin.firestore(getOutilApp());
}

/**
 * Synchronise les linkedProviderIds et providers vers l'Outil IA Firestore
 * C'est nécessaire pour que le provider switcher fonctionne dans l'Outil IA
 */
async function syncLinkedProvidersToOutil(
  sosDb: FirebaseFirestore.Firestore,
  callerUid: string,
  callerEmail: string | undefined
): Promise<void> {
  try {
    const outilDb = getOutilFirestore();

    // 1. Récupérer les linkedProviderIds depuis SOS
    const callerDoc = await sosDb.collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();
    const linkedProviderIds: string[] = callerData?.linkedProviderIds || [];

    // Ajouter l'UID de l'appelant s'il n'est pas déjà dans la liste
    if (!linkedProviderIds.includes(callerUid)) {
      linkedProviderIds.push(callerUid);
    }

    if (linkedProviderIds.length === 0) {
      console.log("[syncLinkedProvidersToOutil] No linked providers to sync");
      return;
    }

    console.log("[syncLinkedProvidersToOutil] Syncing providers:", linkedProviderIds);

    // 2. Récupérer les données des providers depuis SOS (sos_profiles ou users)
    const providersToSync: Array<{
      id: string;
      name: string;
      email: string;
      type: string;
      country?: string;
      active: boolean;
    }> = [];

    for (const providerId of linkedProviderIds) {
      // Essayer sos_profiles d'abord
      let providerDoc = await sosDb.collection("sos_profiles").doc(providerId).get();
      let providerData = providerDoc.data();

      if (!providerData) {
        // Essayer users
        providerDoc = await sosDb.collection("users").doc(providerId).get();
        providerData = providerDoc.data();
      }

      if (providerData) {
        providersToSync.push({
          id: providerId,
          name: providerData.fullName || providerData.displayName || providerData.name || "Sans nom",
          email: providerData.email || "",
          type: providerData.providerType || providerData.type || "lawyer",
          country: providerData.country,
          active: providerData.isActive !== false && providerData.active !== false,
        });
      }
    }

    console.log("[syncLinkedProvidersToOutil] Found providers to sync:", providersToSync.length);

    // 3. Écrire dans Firestore de l'Outil IA
    const batch = outilDb.batch();

    // 3a. Créer/mettre à jour le document users dans l'Outil
    const outilUserRef = outilDb.collection("users").doc(callerUid);
    batch.set(outilUserRef, {
      linkedProviderIds: linkedProviderIds,
      activeProviderId: linkedProviderIds[0],
      email: callerEmail?.toLowerCase() || "",
      role: "provider",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "sso-sync",
    }, { merge: true });

    // 3b. Créer/mettre à jour les providers dans l'Outil
    for (const provider of providersToSync) {
      const outilProviderRef = outilDb.collection("providers").doc(provider.id);
      batch.set(outilProviderRef, {
        name: provider.name,
        email: provider.email,
        type: provider.type,
        country: provider.country || null,
        active: provider.active,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "sso-sync",
      }, { merge: true });
    }

    await batch.commit();
    console.log("[syncLinkedProvidersToOutil] Successfully synced to Outil IA");
  } catch (error) {
    // Ne pas bloquer le SSO si la sync échoue
    console.error("[syncLinkedProvidersToOutil] Error (non-blocking):", error);
  }
}

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
    // CRITICAL: Include the Outil service account secret
    secrets: [OUTIL_SERVICE_ACCOUNT],
  },
  async (request) => {
    console.log("[generateOutilToken] Function called");

    // Initialize Firebase Admin for SOS (Firestore access)
    ensureInitialized();
    const db = admin.firestore();

    // Get the Outil Auth instance for creating cross-project tokens
    const outilAuth = getOutilAuth();

    console.log("[generateOutilToken] Firebase Admin initialized");

    // 1. Vérifier que l'utilisateur est authentifié
    if (!request.auth) {
      console.log("[generateOutilToken] No auth context");
      throw new HttpsError(
        "unauthenticated",
        "Vous devez être connecté pour accéder à l'Outil IA"
      );
    }

    const callerUid = request.auth.uid;
    const callerEmail = request.auth.token.email;

    // Support pour le switch de prestataire (multi-provider)
    const { asProviderId } = request.data || {};

    // Déterminer l'UID cible (soit le prestataire lié, soit l'utilisateur connecté)
    let targetUid = callerUid;
    let targetEmail = callerEmail;
    let isActingAsProvider = false;

    // Si asProviderId est fourni, vérifier que l'utilisateur a le droit d'agir en tant que ce prestataire
    if (asProviderId && asProviderId !== callerUid) {
      console.log("[generateOutilToken] Acting as provider:", asProviderId);

      // Vérifier que le prestataire cible est lié à l'utilisateur connecté
      const callerDoc = await db.collection("users").doc(callerUid).get();
      const callerData = callerDoc.data();
      const linkedProviderIds: string[] = callerData?.linkedProviderIds || [];

      if (!linkedProviderIds.includes(asProviderId)) {
        console.warn(`[generateOutilToken] SECURITY: User ${callerUid} tried to act as unlinked provider ${asProviderId}`);
        throw new HttpsError(
          "permission-denied",
          "Vous n'êtes pas autorisé à accéder à ce prestataire"
        );
      }

      // Récupérer les informations du prestataire cible
      const targetProviderDoc = await db.collection("sos_profiles").doc(asProviderId).get();
      if (!targetProviderDoc.exists) {
        // Essayer dans users si pas dans sos_profiles
        const targetUserDoc = await db.collection("users").doc(asProviderId).get();
        if (!targetUserDoc.exists) {
          throw new HttpsError(
            "not-found",
            "Le prestataire cible n'existe pas"
          );
        }
        targetEmail = targetUserDoc.data()?.email || callerEmail;
      } else {
        targetEmail = targetProviderDoc.data()?.email || callerEmail;
      }

      targetUid = asProviderId;
      isActingAsProvider = true;
      console.log(`[generateOutilToken] Validated: ${callerEmail} acting as provider ${targetUid} (${targetEmail})`);
    }

    // Variables de compatibilité pour le reste du code
    const uid = targetUid;
    const email = targetEmail;
    console.log("[generateOutilToken] User:", { callerUid, callerEmail, targetUid: uid, targetEmail: email, isActingAsProvider });

    try {
      // SYNC: Synchroniser les linkedProviderIds vers l'Outil IA (non-bloquant)
      // Cela permet au provider switcher de fonctionner dans l'Outil IA
      // Note: On ne await pas pour ne pas bloquer le SSO si la sync échoue
      console.log("[generateOutilToken] Starting non-blocking sync to Outil IA...");
      syncLinkedProvidersToOutil(db, callerUid, callerEmail).catch((err) => {
        console.error("[generateOutilToken] Non-blocking sync failed:", err);
      });

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
      // Vérifier sur: target, caller, ET tous les providers liés
      console.log("[generateOutilToken] Checking forced access...");
      let { hasForcedAccess, freeTrialUntil } = await checkForcedAccess(db, uid);

      // Si pas d'accès forcé sur le target, vérifier aussi sur le caller
      if (!hasForcedAccess && !freeTrialUntil && callerUid !== uid) {
        console.log("[generateOutilToken] Checking forced access on caller account...");
        const callerAccess = await checkForcedAccess(db, callerUid);
        if (callerAccess.hasForcedAccess) {
          hasForcedAccess = true;
          console.log("[generateOutilToken] Caller has forced access, granting to target provider");
        } else if (callerAccess.freeTrialUntil) {
          freeTrialUntil = callerAccess.freeTrialUntil;
          console.log("[generateOutilToken] Caller has free trial, applying to target provider");
        }
      }

      // Si toujours pas d'accès, vérifier sur les linkedProviderIds du caller
      // Car l'admin peut avoir activé forcedAIAccess sur un provider lié, pas sur le compte principal
      if (!hasForcedAccess && !freeTrialUntil) {
        const callerDoc = await db.collection("users").doc(callerUid).get();
        const callerData = callerDoc.data();
        const linkedProviderIds: string[] = callerData?.linkedProviderIds || [];

        console.log("[generateOutilToken] Checking forced access on linked providers:", linkedProviderIds);

        for (const linkedId of linkedProviderIds) {
          if (linkedId === callerUid || linkedId === uid) continue; // Déjà vérifié
          const linkedAccess = await checkForcedAccess(db, linkedId);
          if (linkedAccess.hasForcedAccess) {
            hasForcedAccess = true;
            console.log("[generateOutilToken] Linked provider has forced access:", linkedId);
            break;
          } else if (linkedAccess.freeTrialUntil && !freeTrialUntil) {
            freeTrialUntil = linkedAccess.freeTrialUntil;
            console.log("[generateOutilToken] Linked provider has free trial:", linkedId);
          }
        }
      }

      console.log("[generateOutilToken] Final forced access:", { hasForcedAccess, freeTrialUntil });

      // Si accès forcé par admin, générer directement le token (bypass tout)
      if (hasForcedAccess) {
        console.log("[generateOutilToken] User has forced access, generating token...");
        const customClaims: Record<string, any> = {
          provider: true,
          subscriptionTier: "unlimited",
          subscriptionStatus: "active",
          forcedAccess: true,
          email: email,
          tokenGeneratedAt: Date.now(),
        };

        // Ajouter les infos de switch si applicable
        if (isActingAsProvider) {
          customClaims.actingAsProvider = true;
          customClaims.originalUserId = callerUid;
          customClaims.originalUserEmail = callerEmail;
        }

        console.log("[generateOutilToken] Creating custom token with claims:", customClaims);
        const customToken = await outilAuth.createCustomToken(uid, customClaims);
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
          // Info de switch si applicable
          ...(isActingAsProvider && {
            actingAsProvider: true,
            originalUserId: callerUid,
            originalUserEmail: callerEmail,
          }),
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
        const customClaims: Record<string, any> = {
          provider: true,
          subscriptionTier: "trial",
          subscriptionStatus: "trialing",
          freeTrialUntil: freeTrialUntil.toISOString(),
          email: email,
          tokenGeneratedAt: Date.now(),
        };

        // Ajouter les infos de switch si applicable
        if (isActingAsProvider) {
          customClaims.actingAsProvider = true;
          customClaims.originalUserId = callerUid;
          customClaims.originalUserEmail = callerEmail;
        }

        const customToken = await outilAuth.createCustomToken(uid, customClaims);

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
          // Info de switch si applicable
          ...(isActingAsProvider && {
            actingAsProvider: true,
            originalUserId: callerUid,
            originalUserEmail: callerEmail,
          }),
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
      const customClaims: Record<string, any> = {
        provider: true,
        subscriptionTier: tier,
        subscriptionStatus: subscriptionData.status,
        email: email,
        // Ajouter un timestamp pour invalider les vieux tokens
        tokenGeneratedAt: Date.now(),
      };

      // Ajouter les infos de switch si applicable
      if (isActingAsProvider) {
        customClaims.actingAsProvider = true;
        customClaims.originalUserId = callerUid;
        customClaims.originalUserEmail = callerEmail;
      }

      console.log("[generateOutilToken] Creating custom token...");
      const customToken = await outilAuth.createCustomToken(uid, customClaims);
      console.log("[generateOutilToken] Token created successfully");

      // 7. Logger l'accès pour le monitoring
      await db.collection("ssoLogs").add({
        userId: uid,
        email: email,
        action: "generate_outil_token",
        timestamp: new Date(),
        success: true,
        subscriptionTier: tier,
        // Info de switch si applicable
        ...(isActingAsProvider && {
          actingAsProvider: true,
          originalUserId: callerUid,
          originalUserEmail: callerEmail,
        }),
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
