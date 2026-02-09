/**
 * Initialize Affiliate Config - Script d'initialisation
 *
 * Fonction callable admin pour initialiser le document affiliate_config
 * avec les valeurs par défaut. Ne s'exécute qu'une seule fois (vérifie si existe déjà).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";
import { AffiliateConfig } from "./types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Configuration par défaut du système d'affiliation
 *
 * CONFIGURATION SIMPLIFIÉE :
 * - 10$ fixe par appel (premier et récurrents)
 * - Pas de commission à l'inscription
 * - Pas de commission sur les abonnements
 * - Pas de bonus prestataire
 *
 * Retrait :
 * - Seuil minimum: 30$
 * - Période de rétention: 24h (anti-fraude)
 */
const DEFAULT_AFFILIATE_CONFIG: Omit<AffiliateConfig, "updatedAt" | "updatedBy" | "rateHistory"> = {
  id: "current",
  isSystemActive: true,
  withdrawalsEnabled: true,
  newAffiliatesEnabled: true,

  // Taux par défaut (gelés pour chaque affilié à son inscription)
  defaultRates: {
    signupBonus: 0, // Pas de bonus inscription
    callCommissionRate: 0, // Pas de pourcentage
    callFixedBonus: 1000, // 10€ fixe par appel
    subscriptionRate: 0, // Pas de commission abonnement
    subscriptionFixedBonus: 0,
    providerValidationBonus: 0, // Pas de bonus prestataire
  },

  // Règles de commission par type d'action
  commissionRules: {
    // Inscription d'un filleul - DÉSACTIVÉ
    referral_signup: {
      enabled: false,
      type: "fixed",
      fixedAmount: 0, // 0€
      percentageRate: 0,
      baseAmount: null,
      conditions: {
        requireEmailVerification: true,
        minAccountAgeDays: 0,
        onlyFirstTime: true,
      },
      description: "Pas de commission à l'inscription",
    },

    // Premier appel du filleul - 10$ FIXE
    referral_first_call: {
      enabled: true,
      type: "fixed",
      fixedAmount: 1000, // 10$ (en cents)
      percentageRate: 0,
      baseAmount: null,
      applyTo: "connection_fee",
      conditions: {
        minCallDuration: 120, // 2 minutes minimum
        providerTypes: ["lawyer", "expat"],
      },
      description: "10$ par appel",
    },

    // Appels récurrents du filleul - 10$ FIXE
    referral_recurring_call: {
      enabled: true,
      type: "fixed",
      fixedAmount: 1000, // 10$ (en cents)
      percentageRate: 0,
      baseAmount: null,
      applyTo: "connection_fee",
      conditions: {
        minCallDuration: 120,
        providerTypes: ["lawyer", "expat"],
        maxCallsPerMonth: 0, // illimité
        lifetimeLimit: 0, // illimité
      },
      description: "10$ par appel",
    },

    // Premier abonnement du filleul - DÉSACTIVÉ
    referral_subscription: {
      enabled: false,
      type: "percentage",
      fixedAmount: 0,
      percentageRate: 0, // 0%
      baseAmount: null,
      applyTo: "first_month",
      conditions: {
        planTypes: ["solo", "multi", "enterprise"],
        onlyFirstSubscription: true,
      },
      description: "Pas de commission sur les abonnements",
    },

    // Renouvellement d'abonnement - DÉSACTIVÉ
    referral_subscription_renewal: {
      enabled: false,
      type: "percentage",
      fixedAmount: 0,
      percentageRate: 0, // 0%
      baseAmount: null,
      applyTo: "total_amount",
      conditions: {
        maxMonths: 12,
      },
      description: "Pas de commission sur les renouvellements",
    },

    // Bonus si le filleul est un prestataire - DÉSACTIVÉ
    referral_provider_validated: {
      enabled: false,
      type: "fixed",
      fixedAmount: 0, // 0€
      percentageRate: 0,
      baseAmount: null,
      conditions: {
        requireKYCComplete: true,
        requireFirstCall: false,
      },
      description: "Pas de bonus prestataire",
    },
  },

  // Paramètres de retrait (tirelire)
  withdrawal: {
    minimumAmount: 3000, // 30€ minimum pour retirer
    holdPeriodHours: 24, // Commissions bloquées 24h avant d'être disponibles
    maxWithdrawalsPerMonth: 0, // illimité
    maxAmountPerMonth: 0, // illimité
  },

  // Attribution des parrainages
  attribution: {
    windowDays: 30, // Cookie valide 30 jours
    model: "first_click", // Premier affilié qui a partagé le lien
  },

  // Protection anti-fraude
  antiFraud: {
    requireEmailVerification: true,
    minAccountAgeDays: 0,
    maxReferralsPerDay: 50,
    blockSameIPReferrals: true,
    blockedEmailDomains: [
      "tempmail.com",
      "throwaway.email",
      "guerrillamail.com",
      "10minutemail.com",
      "mailinator.com",
      "yopmail.com",
      "fakeinbox.com",
      "trashmail.com",
    ],
    maxSignupsPerIPPerHour: 10,
    autoFlagThreshold: 5,
  },

  version: 1,
};

/**
 * Fonction callable pour initialiser la configuration d'affiliation
 * Réservée aux administrateurs - ne s'exécute que si le document n'existe pas
 */
export const initializeAffiliateConfig = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    ensureInitialized();

    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise");
    }

    // Vérifier le rôle admin
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === "admin";
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Réservé aux administrateurs");
    }

    const db = getFirestore();
    const configRef = db.collection("affiliate_config").doc("current");

    try {
      // Vérifier si le document existe déjà
      const existingDoc = await configRef.get();

      if (existingDoc.exists) {
        logger.info("[initializeAffiliateConfig] Config already exists, skipping initialization");
        return {
          success: true,
          message: "La configuration existe déjà",
          alreadyExists: true,
          config: existingDoc.data(),
        };
      }

      // Créer le document avec les valeurs par défaut
      const configToSave = {
        ...DEFAULT_AFFILIATE_CONFIG,
        updatedAt: Timestamp.now(),
        updatedBy: request.auth.uid,
        rateHistory: [], // Empty history for new config
      };

      await configRef.set(configToSave);

      logger.info("[initializeAffiliateConfig] Config initialized successfully", {
        adminId: request.auth.uid,
        adminEmail: request.auth.token.email,
      });

      return {
        success: true,
        message: "Configuration d'affiliation initialisée avec succès",
        alreadyExists: false,
        config: configToSave,
      };
    } catch (error) {
      logger.error("[initializeAffiliateConfig] Error:", error);
      throw new HttpsError("internal", "Erreur lors de l'initialisation de la configuration");
    }
  }
);

/**
 * Fonction callable pour réinitialiser la configuration aux valeurs par défaut
 * ATTENTION: Écrase la configuration existante !
 */
export const resetAffiliateConfigToDefaults = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request) => {
    ensureInitialized();

    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentification requise");
    }

    // Vérifier le rôle admin
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === "admin";
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Réservé aux administrateurs");
    }

    const db = getFirestore();
    const configRef = db.collection("affiliate_config").doc("current");

    try {
      // Sauvegarder l'ancienne config dans l'historique
      const existingDoc = await configRef.get();
      const existingConfig = existingDoc.exists ? existingDoc.data() : null;

      // Créer le document avec les valeurs par défaut
      const configToSave = {
        ...DEFAULT_AFFILIATE_CONFIG,
        updatedAt: Timestamp.now(),
        updatedBy: request.auth.uid,
        version: existingConfig ? (existingConfig.version || 0) + 1 : 1,
        rateHistory: [
          ...(existingConfig?.rateHistory || []),
          {
            changedAt: Timestamp.now(),
            changedBy: request.auth.uid,
            changedByEmail: request.auth.token.email || "unknown",
            previousRates: existingConfig?.defaultRates || {},
            newRates: DEFAULT_AFFILIATE_CONFIG.defaultRates,
            reason: "Réinitialisation aux valeurs par défaut",
          },
        ],
      };

      await configRef.set(configToSave);

      logger.info("[resetAffiliateConfigToDefaults] Config reset successfully", {
        adminId: request.auth.uid,
        adminEmail: request.auth.token.email,
      });

      return {
        success: true,
        message: "Configuration réinitialisée aux valeurs par défaut",
        config: configToSave,
      };
    } catch (error) {
      logger.error("[resetAffiliateConfigToDefaults] Error:", error);
      throw new HttpsError("internal", "Erreur lors de la réinitialisation");
    }
  }
);
