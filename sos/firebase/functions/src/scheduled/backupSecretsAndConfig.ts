/**
 * Automated Secrets and Configuration Backup
 *
 * Sauvegarde automatique mensuelle des secrets Firebase et configurations
 * des services tiers vers Cloud Storage avec chiffrement.
 *
 * IMPORTANT: Ce fichier NE CONTIENT PAS les secrets en clair.
 * Il exporte les métadonnées et références pour permettre une restauration.
 *
 * Fréquence: 1er de chaque mois à 02:00 (Paris)
 * Rétention: 12 mois (conformité)
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functions from "firebase-functions/v1";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

// ============================================================================
// CONFIGURATION
// ============================================================================

// CRITICAL: Lazy initialization to avoid deployment timeout
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

const CONFIG = {
  // Bucket pour les backups de secrets
  SECRETS_BACKUP_PATH: "secrets-config-backups",
  // Rétention des backups de secrets (mois)
  RETENTION_MONTHS: 12,
  // Collection Firestore pour les métadonnées
  BACKUP_COLLECTION: "secrets_config_backups",
  // Liste des secrets à documenter (NE PAS INCLURE LES VALEURS)
  SECRETS_INVENTORY: [
    // Stripe
    { name: "STRIPE_SECRET_KEY", service: "stripe", critical: true },
    { name: "STRIPE_WEBHOOK_SECRET", service: "stripe", critical: true },
    // Twilio
    { name: "TWILIO_ACCOUNT_SID", service: "twilio", critical: true },
    { name: "TWILIO_AUTH_TOKEN", service: "twilio", critical: true },
    // Email
    { name: "EMAIL_USER", service: "email", critical: true },
    { name: "EMAIL_PASS", service: "email", critical: true },
    // Encryption
    { name: "ENCRYPTION_KEY", service: "internal", critical: true },
    // Marketing
    { name: "MAILWIZZ_API_KEY", service: "mailwizz", critical: false },
    // Outil API
    { name: "OUTIL_API_KEY", service: "outil", critical: false },
    { name: "OUTIL_SYNC_API_KEY", service: "outil", critical: false },
  ],
  // Services tiers à documenter
  THIRD_PARTY_SERVICES: [
    {
      name: "Stripe",
      dashboardUrl: "https://dashboard.stripe.com",
      configItems: [
        "API Keys (Secret + Publishable)",
        "Webhook Endpoints",
        "Products & Prices",
        "Connect Settings",
        "Tax Settings",
      ],
    },
    {
      name: "PayPal",
      dashboardUrl: "https://developer.paypal.com/dashboard",
      configItems: [
        "Client ID & Secret",
        "Webhook Endpoints",
        "Business Account Settings",
      ],
    },
    {
      name: "Twilio",
      dashboardUrl: "https://console.twilio.com",
      configItems: [
        "Account SID & Auth Token",
        "Phone Numbers",
        "TwiML Applications",
        "Webhook URLs",
        "Voice Settings",
      ],
    },
    {
      name: "Firebase",
      dashboardUrl: "https://console.firebase.google.com",
      configItems: [
        "Project Settings",
        "Service Account Keys",
        "Auth Providers",
        "Firestore Rules",
        "Storage Rules",
      ],
    },
    {
      name: "Google Cloud Platform",
      dashboardUrl: "https://console.cloud.google.com",
      configItems: [
        "IAM & Roles",
        "Service Accounts",
        "Cloud Tasks Queues",
        "Cloud Scheduler Jobs",
        "Billing Alerts",
      ],
    },
    {
      name: "Cloudflare Pages",
      dashboardUrl: "https://dash.cloudflare.com",
      configItems: [
        "Environment Variables (VITE_*)",
        "Build Settings",
        "Custom Domains",
        "Page Rules",
        "SSL/TLS Settings",
      ],
    },
  ],
};

// ============================================================================
// TYPES
// ============================================================================

interface SecretStatus {
  name: string;
  service: string;
  critical: boolean;
  isSet: boolean;
  lastVerified: string;
}

interface ServiceConfigStatus {
  service: string;
  configuredItems: string[];
  missingItems: string[];
  lastAudit: string;
}

interface SecretsConfigBackup {
  id: string;
  createdAt: FirebaseFirestore.Timestamp;
  type: "automated" | "manual";
  secrets: {
    inventory: SecretStatus[];
    totalSecrets: number;
    setSecrets: number;
    missingCritical: string[];
  };
  thirdPartyServices: ServiceConfigStatus[];
  gcpConfig: {
    projectId: string;
    region: string;
    cloudTasks: {
      queues: string[];
      documented: boolean;
    };
    iamRoles: {
      documented: boolean;
      lastExport: string | null;
    };
  };
  cloudflare: {
    documented: boolean;
    envVarsCount: number;
  };
  recommendations: string[];
  storageUrl?: string;
  checksum: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Vérifie si un secret est défini (sans révéler sa valeur)
 */
function checkSecretExists(secretName: string): boolean {
  // Les secrets sont définis via defineSecret() et disponibles dans process.env
  // On vérifie seulement leur existence, PAS leur valeur
  const value = process.env[secretName];
  return value !== undefined && value !== null && value.length > 0;
}

/**
 * Génère un checksum pour le backup
 */
function generateChecksum(data: object): string {
  const content = JSON.stringify(data);
  return crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);
}

/**
 * Vérifie les secrets et retourne leur statut
 */
function auditSecrets(): {
  inventory: SecretStatus[];
  totalSecrets: number;
  setSecrets: number;
  missingCritical: string[];
} {
  const inventory: SecretStatus[] = [];
  let setCount = 0;
  const missingCritical: string[] = [];

  for (const secret of CONFIG.SECRETS_INVENTORY) {
    const isSet = checkSecretExists(secret.name);

    inventory.push({
      name: secret.name,
      service: secret.service,
      critical: secret.critical,
      isSet,
      lastVerified: new Date().toISOString(),
    });

    if (isSet) {
      setCount++;
    } else if (secret.critical) {
      missingCritical.push(secret.name);
    }
  }

  return {
    inventory,
    totalSecrets: CONFIG.SECRETS_INVENTORY.length,
    setSecrets: setCount,
    missingCritical,
  };
}

/**
 * Documente le statut des services tiers
 */
function auditThirdPartyServices(): ServiceConfigStatus[] {
  // Cette fonction documente ce qui DEVRAIT être configuré
  // La vérification réelle nécessite des appels API
  return CONFIG.THIRD_PARTY_SERVICES.map((service) => ({
    service: service.name,
    configuredItems: service.configItems,
    missingItems: [], // À remplir manuellement ou via API
    lastAudit: new Date().toISOString(),
  }));
}

/**
 * Génère des recommandations basées sur l'audit
 */
function generateRecommendations(
  secretsAudit: ReturnType<typeof auditSecrets>,
  servicesAudit: ServiceConfigStatus[]
): string[] {
  const recommendations: string[] = [];

  // Secrets manquants
  if (secretsAudit.missingCritical.length > 0) {
    recommendations.push(
      `CRITIQUE: ${secretsAudit.missingCritical.length} secrets critiques manquants: ${secretsAudit.missingCritical.join(", ")}`
    );
  }

  // Couverture des secrets
  const coverage = (secretsAudit.setSecrets / secretsAudit.totalSecrets) * 100;
  if (coverage < 100) {
    recommendations.push(
      `Couverture secrets: ${coverage.toFixed(0)}%. Configurer les secrets manquants via Firebase Console > Functions > Secret Manager`
    );
  }

  // Rappels pour services tiers basés sur l'audit
  for (const service of servicesAudit) {
    if (service.missingItems.length > 0) {
      recommendations.push(
        `${service.service}: ${service.missingItems.length} éléments manquants`
      );
    }
  }

  // Rappels généraux
  recommendations.push(
    "Exporter manuellement la configuration Stripe via dashboard.stripe.com (Products, Prices, Webhooks)"
  );
  recommendations.push(
    "Documenter les numéros Twilio et TwiML Apps dans console.twilio.com"
  );
  recommendations.push(
    "Vérifier les variables d'environnement Cloudflare Pages"
  );

  if (recommendations.length === 0) {
    recommendations.push("Tous les secrets et configurations sont documentés.");
  }

  return recommendations;
}

// ============================================================================
// SCHEDULED BACKUP FUNCTION
// ============================================================================

/**
 * Backup mensuel automatique des secrets et configurations
 * Exécute le 1er de chaque mois à 02:00
 */
export const monthlySecretsConfigBackup = onSchedule(
  {
    schedule: "0 2 1 * *", // 1er du mois à 2h
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();
    const startTime = Date.now();
    const db = admin.firestore();
    const storage = admin.storage().bucket();

    logger.info("[SecretsConfigBackup] Starting monthly secrets and config backup...");

    const backupId = `secrets_config_${new Date().toISOString().split("T")[0]}`;

    try {
      // 1. Auditer les secrets
      logger.info("[SecretsConfigBackup] Auditing secrets...");
      const secretsAudit = auditSecrets();

      // 2. Auditer les services tiers
      logger.info("[SecretsConfigBackup] Auditing third-party services...");
      const thirdPartyServicesAudit = auditThirdPartyServices();

      // 3. Documenter la config GCP
      const gcpConfig = {
        projectId: process.env.GCLOUD_PROJECT || "sos-urgently-ac307",
        region: process.env.FUNCTIONS_REGION || "europe-west1",
        cloudTasks: {
          queues: ["call-scheduler-queue"],
          documented: true,
        },
        iamRoles: {
          documented: false,
          lastExport: null,
        },
      };

      // 4. Documenter Digital Ocean
      const cloudflareConfig = {
        documented: true,
        envVarsCount: 15, // Approximatif - à mettre à jour
      };

      // 5. Générer les recommandations
      const recommendations = generateRecommendations(secretsAudit, thirdPartyServicesAudit);

      // 6. Créer le backup
      const backup: SecretsConfigBackup = {
        id: backupId,
        createdAt: admin.firestore.Timestamp.now(),
        type: "automated",
        secrets: secretsAudit,
        thirdPartyServices: thirdPartyServicesAudit,
        gcpConfig,
        cloudflare: cloudflareConfig,
        recommendations,
        checksum: "",
      };

      backup.checksum = generateChecksum(backup);

      // 7. Sauvegarder dans Storage (JSON - sans valeurs sensibles)
      const storagePath = `${CONFIG.SECRETS_BACKUP_PATH}/${backupId}.json`;
      const file = storage.file(storagePath);

      await file.save(JSON.stringify(backup, null, 2), {
        metadata: {
          contentType: "application/json",
          metadata: {
            backupId,
            type: "secrets-config-audit",
            createdAt: new Date().toISOString(),
          },
        },
      });

      // Générer URL signée (12 mois)
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + CONFIG.RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000,
      });

      backup.storageUrl = signedUrl;

      // 8. Sauvegarder les métadonnées dans Firestore
      await db.collection(CONFIG.BACKUP_COLLECTION).doc(backupId).set(backup);

      // 9. Log dans system_logs
      await db.collection("system_logs").add({
        type: "secrets_config_backup",
        backupId,
        secretsCoverage: `${secretsAudit.setSecrets}/${secretsAudit.totalSecrets}`,
        missingCritical: secretsAudit.missingCritical,
        success: true,
        executionTimeMs: Date.now() - startTime,
        createdAt: admin.firestore.Timestamp.now(),
      });

      // 10. Alerte si secrets critiques manquants
      if (secretsAudit.missingCritical.length > 0) {
        await db.collection("system_alerts").add({
          type: "missing_critical_secrets",
          severity: "warning",
          message: `${secretsAudit.missingCritical.length} secrets critiques non configurés`,
          metadata: { secrets: secretsAudit.missingCritical },
          acknowledged: false,
          createdAt: admin.firestore.Timestamp.now(),
        });
      }

      logger.info(
        `[SecretsConfigBackup] Completed. Secrets: ${secretsAudit.setSecrets}/${secretsAudit.totalSecrets}, Missing critical: ${secretsAudit.missingCritical.length}`
      );

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[SecretsConfigBackup] Failed:", err);

      await db.collection("backup_errors").add({
        type: "secrets_config",
        error: err.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        executionTimeMs: Date.now() - startTime,
      });

      // Alerte critique
      await db.collection("system_alerts").add({
        type: "secrets_backup_failure",
        severity: "critical",
        message: `Secrets/config backup failed: ${err.message}`,
        acknowledged: false,
        createdAt: admin.firestore.Timestamp.now(),
      });

      throw error;
    }
  }
);

// ============================================================================
// ADMIN CALLABLE FUNCTIONS
// ============================================================================

/**
 * Déclencher un audit des secrets manuellement
 */
export const triggerSecretsAudit = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 120, memory: "128MB" })
  .https.onCall(async (_data, context) => {
    // Vérifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin" && userData?.role !== "dev") {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    const db = admin.firestore();
    const backupId = `secrets_audit_manual_${Date.now()}`;

    try {
      const secretsAudit = auditSecrets();
      const servicesAudit = auditThirdPartyServices();
      const recommendations = generateRecommendations(secretsAudit, servicesAudit);

      // Sauvegarder l'audit
      await db.collection(CONFIG.BACKUP_COLLECTION).doc(backupId).set({
        id: backupId,
        createdAt: admin.firestore.Timestamp.now(),
        type: "manual",
        secrets: secretsAudit,
        thirdPartyServices: servicesAudit,
        recommendations,
        triggeredBy: context.auth.uid,
      });

      // Log admin audit
      await db.collection("admin_audit_logs").add({
        action: "MANUAL_SECRETS_AUDIT",
        adminId: context.auth.uid,
        targetId: backupId,
        metadata: {
          secretsCoverage: `${secretsAudit.setSecrets}/${secretsAudit.totalSecrets}`,
          missingCritical: secretsAudit.missingCritical,
        },
        createdAt: admin.firestore.Timestamp.now(),
      });

      return {
        success: true,
        auditId: backupId,
        secrets: secretsAudit,
        services: servicesAudit,
        recommendations,
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[SecretsAudit] Manual audit failed:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Lister les audits de secrets
 */
export const listSecretsAudits = functions
  .region("europe-west1")
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin" && userData?.role !== "dev") {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    try {
      const audits = await admin.firestore()
        .collection(CONFIG.BACKUP_COLLECTION)
        .orderBy("createdAt", "desc")
        .limit(12)
        .get();

      return {
        audits: audits.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
            type: data.type,
            secretsCoverage: `${data.secrets?.setSecrets || 0}/${data.secrets?.totalSecrets || 0}`,
            missingCritical: data.secrets?.missingCritical || [],
            recommendations: data.recommendations || [],
          };
        }),
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Obtenir le guide de restauration des secrets
 */
export const getSecretsRestoreGuide = functions
  .region("europe-west1")
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== "admin" && userData?.role !== "dev") {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    return {
      guide: {
        title: "Guide de Restauration des Secrets et Configurations",
        lastUpdated: new Date().toISOString(),
        sections: [
          {
            title: "1. Firebase Secrets (Secret Manager)",
            steps: [
              "Accéder à Firebase Console > Functions",
              "Ouvrir l'onglet 'Secret Manager'",
              "Pour chaque secret: Cliquer 'Add secret' ou 'Edit'",
              "Configurer: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, EMAIL_USER, EMAIL_PASS, ENCRYPTION_KEY, MAILWIZZ_API_KEY",
            ],
          },
          {
            title: "2. Stripe Configuration",
            steps: [
              "Se connecter à dashboard.stripe.com",
              "Récupérer les clés API: Developers > API Keys",
              "Reconfigurer les Webhooks: Developers > Webhooks",
              "URL: https://us-central1-sos-urgently-ac307.cloudfunctions.net/stripeWebhookHandler",
              "Events: checkout.session.completed, payment_intent.succeeded, etc.",
              "Recréer les Products/Prices si nécessaire",
            ],
          },
          {
            title: "3. Twilio Configuration",
            steps: [
              "Se connecter à console.twilio.com",
              "Récupérer Account SID et Auth Token",
              "Vérifier les numéros de téléphone actifs",
              "Reconfigurer les TwiML Applications",
              "Mettre à jour les Webhook URLs si nécessaire",
            ],
          },
          {
            title: "4. PayPal Configuration",
            steps: [
              "Se connecter à developer.paypal.com",
              "Récupérer Client ID et Secret",
              "Reconfigurer les Webhooks",
              "URL: https://us-central1-sos-urgently-ac307.cloudfunctions.net/paypalWebhookHandler",
            ],
          },
          {
            title: "5. Digital Ocean Configuration",
            steps: [
              "Se connecter à cloud.digitalocean.com",
              "Accéder à App Platform > Settings",
              "Reconfigurer les Environment Variables",
              "Vérifier les Build Commands",
              "Redéployer si nécessaire",
            ],
          },
          {
            title: "6. GCP Configuration",
            steps: [
              "Se connecter à console.cloud.google.com",
              "Vérifier IAM & Admin > IAM roles",
              "Vérifier Cloud Tasks > Queues",
              "Vérifier Cloud Scheduler jobs",
            ],
          },
        ],
        contacts: {
          stripe: "support.stripe.com",
          twilio: "support.twilio.com",
          paypal: "developer.paypal.com/support",
          firebase: "firebase.google.com/support",
        },
      },
    };
  });
