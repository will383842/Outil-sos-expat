/**
 * =============================================================================
 * SOS EXPAT — Utilitaires pour le service IA
 * =============================================================================
 *
 * Fonctions utilitaires communes pour tous les services IA.
 */

import * as admin from "firebase-admin";
import { AI_CONFIG } from "../core/config";

// =============================================================================
// GESTION DES RETRIES (délégué à retry.ts)
// =============================================================================

// Réexporter depuis le module retry pour compatibilité
export {
  sleep,
  withRetry,
  withExponentialBackoff,
  classifyError,
  calculateBackoffDelay,
  type RetryableError,
  type RetryOptions
} from "./retry";

// =============================================================================
// NORMALISATION DES PAYS
// =============================================================================

const COUNTRY_MAP: Record<string, string> = {
  // Asie du Sud-Est
  "thailand": "Thaïlande",
  "thailande": "Thaïlande",
  "vietnam": "Vietnam",
  "cambodia": "Cambodge",
  "cambodge": "Cambodge",
  "indonesia": "Indonésie",
  "indonesie": "Indonésie",
  "malaysia": "Malaisie",
  "malaisie": "Malaisie",
  "singapore": "Singapour",
  "singapour": "Singapour",
  "philippines": "Philippines",
  "myanmar": "Myanmar",
  "laos": "Laos",

  // Asie de l'Est
  "japan": "Japon",
  "japon": "Japon",
  "china": "Chine",
  "chine": "Chine",
  "korea": "Corée du Sud",
  "south korea": "Corée du Sud",
  "coree": "Corée du Sud",
  "taiwan": "Taïwan",
  "hong kong": "Hong Kong",

  // Asie du Sud
  "india": "Inde",
  "inde": "Inde",
  "sri lanka": "Sri Lanka",
  "nepal": "Népal",

  // Océanie
  "australia": "Australie",
  "australie": "Australie",
  "new zealand": "Nouvelle-Zélande",

  // Amérique du Nord
  "usa": "États-Unis",
  "united states": "États-Unis",
  "etats-unis": "États-Unis",
  "canada": "Canada",
  "mexico": "Mexique",
  "mexique": "Mexique",

  // Europe
  "uk": "Royaume-Uni",
  "united kingdom": "Royaume-Uni",
  "royaume-uni": "Royaume-Uni",
  "france": "France",
  "spain": "Espagne",
  "espagne": "Espagne",
  "germany": "Allemagne",
  "allemagne": "Allemagne",
  "italy": "Italie",
  "italie": "Italie",
  "portugal": "Portugal",
  "switzerland": "Suisse",
  "suisse": "Suisse",
  "belgium": "Belgique",
  "belgique": "Belgique",
  "netherlands": "Pays-Bas",

  // Moyen-Orient
  "dubai": "Émirats Arabes Unis",
  "uae": "Émirats Arabes Unis",
  "emirats": "Émirats Arabes Unis",
  "qatar": "Qatar",
  "saudi arabia": "Arabie Saoudite",
  "israel": "Israël",
  "turkey": "Turquie",
  "turquie": "Turquie",

  // Afrique
  "morocco": "Maroc",
  "maroc": "Maroc",
  "tunisia": "Tunisie",
  "tunisie": "Tunisie",
  "senegal": "Sénégal",
  "ivory coast": "Côte d'Ivoire",
  "south africa": "Afrique du Sud",

  // Amérique du Sud
  "brazil": "Brésil",
  "bresil": "Brésil",
  "argentina": "Argentine",
  "chile": "Chili",
  "colombia": "Colombie",
  "peru": "Pérou"
};

export function normalizeCountry(country: string | undefined): string {
  if (!country) return "";
  const lower = country.toLowerCase().trim();
  return COUNTRY_MAP[lower] || country;
}

// =============================================================================
// VÉRIFICATION ABONNEMENT
// =============================================================================

export async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) return false;

    const userData = userDoc.data();

    // Vérifier les différentes conditions d'accès
    if (userData?.hasActiveSubscription === true) return true;
    if (userData?.subscriptionStatus === "active") return true;
    if (userData?.subscriptionStatus === "trialing") return true;
    if (userData?.role === "admin") return true;
    if (userData?.role === "superadmin") return true;

    return false;
  } catch {
    return false;
  }
}

// =============================================================================
// VÉRIFICATION ACCÈS IA POUR PROVIDER (BLOQUANT P0)
// =============================================================================

export interface ProviderAIAccessResult {
  hasAccess: boolean;
  reason?: string;
  quotaRemaining?: number;
  quotaLimit?: number;
}

// =============================================================================
// VÉRIFICATION COMBINÉE ACCÈS + QUOTA (OPTIMISATION PERFORMANCE)
// =============================================================================

/**
 * Résultat combiné de la vérification d'accès et de quota.
 * UNE SEULE lecture Firestore au lieu de deux.
 */
export interface ProviderAIStatusResult {
  // Accès
  hasAccess: boolean;
  accessReason?: string;
  // Quota
  hasQuota: boolean;
  quotaUsed: number;
  quotaLimit: number;
  quotaRemaining: number;
  // Données provider (bonus pour éviter re-lectures)
  providerData?: Record<string, unknown>;
}

/**
 * Vérifie accès IA ET quota en UNE SEULE lecture Firestore.
 *
 * PERFORMANCE: Économise ~100-200ms par appel IA en évitant la double lecture.
 *
 * @param providerId - ID du provider à vérifier
 * @returns Résultat combiné avec accès et quota
 */
export async function checkProviderAIStatus(providerId: string): Promise<ProviderAIStatusResult> {
  try {
    const db = admin.firestore();

    // 🔥 UNE SEULE lecture Firestore
    const providerDoc = await db.collection("providers").doc(providerId).get();

    if (!providerDoc.exists) {
      return {
        hasAccess: false,
        accessReason: "provider_not_found",
        hasQuota: false,
        quotaUsed: 0,
        quotaLimit: 0,
        quotaRemaining: 0,
      };
    }

    const provider = providerDoc.data();
    if (!provider) {
      return {
        hasAccess: false,
        accessReason: "provider_data_empty",
        hasQuota: false,
        quotaUsed: 0,
        quotaLimit: 0,
        quotaRemaining: 0,
      };
    }

    // =====================================================
    // VÉRIFICATION ACCÈS
    // =====================================================
    let hasAccess = false;
    let accessReason = "no_active_subscription";

    // 1. Bypass admin: forcedAIAccess
    if (provider.forcedAIAccess === true) {
      hasAccess = true;
      accessReason = "forced_access";
    }
    // 2. Période d'essai gratuite
    else if (provider.freeTrialUntil) {
      const trialEnd = provider.freeTrialUntil.toDate?.() || new Date(provider.freeTrialUntil);
      if (trialEnd > new Date()) {
        hasAccess = true;
        accessReason = "free_trial";
      }
    }
    // 3. Vérifier le statut d'abonnement
    if (!hasAccess) {
      const subscriptionStatus = provider.subscriptionStatus || provider.subscription?.status;
      if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
        hasAccess = true;
        accessReason = "subscription_active";
      }
    }
    // 4. Flag legacy hasActiveSubscription
    if (!hasAccess && provider.hasActiveSubscription === true) {
      hasAccess = true;
      accessReason = "subscription_active";
    }

    // 5. Si toujours pas d'accès, vérifier sous-collection (rare)
    if (!hasAccess) {
      const subscriptionsSnap = await db
        .collection("providers")
        .doc(providerId)
        .collection("subscriptions")
        .where("status", "in", ["active", "trialing"])
        .limit(1)
        .get();

      if (!subscriptionsSnap.empty) {
        hasAccess = true;
        accessReason = "subscription_active";
      }
    }

    // =====================================================
    // VÉRIFICATION QUOTA
    // =====================================================
    let hasQuota = true;
    const quotaUsed = provider.aiCallsUsed || 0;
    let quotaLimit = provider.aiCallsLimit || AI_CONFIG.DEFAULT_QUOTA_LIMIT || 100;

    // Quota illimité pour forcedAIAccess
    if (provider.forcedAIAccess === true) {
      quotaLimit = -1; // -1 = illimité
    } else if (quotaUsed >= quotaLimit) {
      hasQuota = false;
    }

    const quotaRemaining = quotaLimit === -1 ? -1 : Math.max(0, quotaLimit - quotaUsed);

    // Mettre en cache le résultat du quota
    if (hasQuota || !hasAccess) {
      const cacheResult: QuotaCheckResult = {
        hasQuota,
        used: quotaUsed,
        limit: quotaLimit,
        remaining: quotaRemaining,
        reason: hasQuota ? undefined : "quota_exceeded"
      };
      quotaCache.set(providerId, { result: cacheResult, expiresAt: Date.now() + QUOTA_CACHE_TTL_MS });
    }

    return {
      hasAccess,
      accessReason,
      hasQuota,
      quotaUsed,
      quotaLimit,
      quotaRemaining,
      providerData: provider as Record<string, unknown>,
    };

  } catch (error) {
    console.error("[checkProviderAIStatus] Erreur:", error);
    return {
      hasAccess: false,
      accessReason: "error_checking_status",
      hasQuota: false,
      quotaUsed: 0,
      quotaLimit: 0,
      quotaRemaining: 0,
    };
  }
}

/**
 * Vérifie si un provider a accès à l'IA.
 *
 * Conditions d'accès (dans l'ordre):
 * 1. forcedAIAccess === true (bypass admin)
 * 2. freeTrialUntil > now (période d'essai)
 * 3. subscription.status === "active" ou "trialing"
 * 4. hasActiveSubscription === true
 *
 * @param providerId - ID du provider à vérifier
 * @returns Résultat avec hasAccess et raison si refusé
 */
export async function checkProviderAIAccess(providerId: string): Promise<ProviderAIAccessResult> {
  try {
    const db = admin.firestore();
    const providerDoc = await db.collection("providers").doc(providerId).get();

    if (!providerDoc.exists) {
      return {
        hasAccess: false,
        reason: "provider_not_found"
      };
    }

    const provider = providerDoc.data();
    if (!provider) {
      return {
        hasAccess: false,
        reason: "provider_data_empty"
      };
    }

    // 1. Bypass admin: forcedAIAccess
    if (provider.forcedAIAccess === true) {
      return { hasAccess: true, reason: "forced_access" };
    }

    // 2. Période d'essai gratuite
    if (provider.freeTrialUntil) {
      const trialEnd = provider.freeTrialUntil.toDate?.() || new Date(provider.freeTrialUntil);
      if (trialEnd > new Date()) {
        return { hasAccess: true, reason: "free_trial" };
      }
    }

    // 3. Vérifier le statut d'abonnement (plusieurs formats possibles)
    const subscriptionStatus = provider.subscriptionStatus || provider.subscription?.status;
    if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
      return { hasAccess: true, reason: "subscription_active" };
    }

    // 4. Flag legacy hasActiveSubscription
    if (provider.hasActiveSubscription === true) {
      return { hasAccess: true, reason: "subscription_active" };
    }

    // 5. Vérifier dans la sous-collection subscriptions (si existe)
    const subscriptionsSnap = await db
      .collection("providers")
      .doc(providerId)
      .collection("subscriptions")
      .where("status", "in", ["active", "trialing"])
      .limit(1)
      .get();

    if (!subscriptionsSnap.empty) {
      return { hasAccess: true, reason: "subscription_active" };
    }

    // Aucune condition remplie
    return {
      hasAccess: false,
      reason: "no_active_subscription"
    };

  } catch (error) {
    // En cas d'erreur, on refuse l'accès par sécurité mais on log
    console.error("[checkProviderAIAccess] Erreur:", error);
    return {
      hasAccess: false,
      reason: "error_checking_access"
    };
  }
}

// =============================================================================
// SYSTÈME DE QUOTAS IA (BLOQUANT P0)
// =============================================================================

export interface QuotaCheckResult {
  hasQuota: boolean;
  used: number;
  limit: number;
  remaining: number;
  reason?: string;
}

// =============================================================================
// CACHE QUOTAS IN-MEMORY - Réduit les lectures Firestore
// =============================================================================

interface CachedQuota {
  result: QuotaCheckResult;
  expiresAt: number;
}

const quotaCache = new Map<string, CachedQuota>();
// TTL réduit à 1 minute pour limiter la désynchronisation entre instances Cloud Functions
const QUOTA_CACHE_TTL_MS = 1 * 60 * 1000; // 1 minute (était 5 min)

/**
 * Invalide le cache quota pour un provider (appelé après incrémentation)
 */
export function invalidateQuotaCache(providerId: string): void {
  quotaCache.delete(providerId);
}

/**
 * Vérifie si un provider a encore du quota IA disponible.
 * Utilise un cache in-memory pour réduire les lectures Firestore.
 *
 * @param providerId - ID du provider
 * @returns Résultat avec hasQuota et détails du quota
 */
export async function checkAiQuota(providerId: string): Promise<QuotaCheckResult> {
  // Vérifier le cache
  const cached = quotaCache.get(providerId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }
  try {
    const db = admin.firestore();
    const providerDoc = await db.collection("providers").doc(providerId).get();

    if (!providerDoc.exists) {
      return {
        hasQuota: false,
        used: 0,
        limit: 0,
        remaining: 0,
        reason: "provider_not_found"
      };
    }

    const provider = providerDoc.data();
    if (!provider) {
      return {
        hasQuota: false,
        used: 0,
        limit: 0,
        remaining: 0,
        reason: "provider_data_empty"
      };
    }

    // Bypass admin: quota illimité si forcedAIAccess
    if (provider.forcedAIAccess === true) {
      return {
        hasQuota: true,
        used: provider.aiCallsUsed || 0,
        limit: -1, // -1 = illimité
        remaining: -1
      };
    }

    // Récupérer les valeurs de quota
    const used = provider.aiCallsUsed || 0;
    const limit = provider.aiCallsLimit || AI_CONFIG.DEFAULT_QUOTA_LIMIT || 100;
    const remaining = Math.max(0, limit - used);

    // Vérifier si quota épuisé
    if (used >= limit) {
      const result: QuotaCheckResult = {
        hasQuota: false,
        used,
        limit,
        remaining: 0,
        reason: "quota_exceeded"
      };
      // Mettre en cache même les quotas épuisés
      quotaCache.set(providerId, { result, expiresAt: Date.now() + QUOTA_CACHE_TTL_MS });
      return result;
    }

    const result: QuotaCheckResult = {
      hasQuota: true,
      used,
      limit,
      remaining
    };
    // Mettre en cache le résultat
    quotaCache.set(providerId, { result, expiresAt: Date.now() + QUOTA_CACHE_TTL_MS });
    return result;

  } catch (error) {
    console.error("[checkAiQuota] Erreur:", error);
    // Ne pas mettre en cache les erreurs
    return {
      hasQuota: false,
      used: 0,
      limit: 0,
      remaining: 0,
      reason: "error_checking_quota"
    };
  }
}

/**
 * Incrémente le compteur d'utilisation IA pour un provider.
 * Utilise une transaction atomique pour éviter les race conditions.
 *
 * @param providerId - ID du provider
 * @param increment - Nombre d'appels à ajouter (défaut: 1)
 * @returns true si succès, false sinon
 */
export async function incrementAiUsage(providerId: string, increment: number = 1): Promise<boolean> {
  try {
    const db = admin.firestore();
    const providerRef = db.collection("providers").doc(providerId);

    await db.runTransaction(async (transaction) => {
      const providerDoc = await transaction.get(providerRef);

      if (!providerDoc.exists) {
        throw new Error("Provider not found");
      }

      const provider = providerDoc.data();
      const currentUsage = provider?.aiCallsUsed || 0;
      const newUsage = currentUsage + increment;

      transaction.update(providerRef, {
        aiCallsUsed: newUsage,
        aiLastCallAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Invalider le cache après incrémentation réussie
    invalidateQuotaCache(providerId);

    return true;
  } catch (error) {
    console.error("[incrementAiUsage] Erreur:", error);
    return false;
  }
}

// =============================================================================
// P0 FIX: RÉSERVATION ATOMIQUE DU QUOTA (évite race conditions)
// =============================================================================

export interface QuotaReservationResult {
  reserved: boolean;
  reason?: string;
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Réserve atomiquement 1 crédit de quota IA.
 *
 * P0 FIX: Cette fonction fait le CHECK + INCREMENT en UNE SEULE transaction.
 * Cela évite la race condition où 2 requêtes passent le check simultanément.
 *
 * FLOW:
 * 1. Transaction: lire quota actuel
 * 2. Transaction: si quota disponible, incrémenter
 * 3. Transaction: commit (atomique)
 * 4. Si commit réussit → quota réservé
 * 5. Si commit échoue (race) → Firestore retry automatique
 *
 * @param providerId - ID du provider
 * @returns Résultat avec reserved=true si quota réservé avec succès
 */
export async function reserveAiQuota(providerId: string): Promise<QuotaReservationResult> {
  try {
    const db = admin.firestore();
    const providerRef = db.collection("providers").doc(providerId);

    const result = await db.runTransaction(async (transaction) => {
      const providerDoc = await transaction.get(providerRef);

      if (!providerDoc.exists) {
        return {
          reserved: false,
          reason: "provider_not_found",
          used: 0,
          limit: 0,
          remaining: 0,
        };
      }

      const provider = providerDoc.data();
      if (!provider) {
        return {
          reserved: false,
          reason: "provider_data_empty",
          used: 0,
          limit: 0,
          remaining: 0,
        };
      }

      // Bypass admin: quota illimité si forcedAIAccess
      if (provider.forcedAIAccess === true) {
        // Incrémenter quand même pour les stats, mais toujours autoriser
        const currentUsage = provider.aiCallsUsed || 0;
        transaction.update(providerRef, {
          aiCallsUsed: currentUsage + 1,
          aiLastCallAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
          reserved: true,
          reason: "forced_access",
          used: currentUsage + 1,
          limit: -1, // -1 = illimité
          remaining: -1,
        };
      }

      // Vérifier le quota
      const currentUsage = provider.aiCallsUsed || 0;
      const quotaLimit = provider.aiCallsLimit || AI_CONFIG.DEFAULT_QUOTA_LIMIT || 100;

      if (currentUsage >= quotaLimit) {
        return {
          reserved: false,
          reason: "quota_exceeded",
          used: currentUsage,
          limit: quotaLimit,
          remaining: 0,
        };
      }

      // ATOMIQUE: Incrémenter le quota
      const newUsage = currentUsage + 1;
      transaction.update(providerRef, {
        aiCallsUsed: newUsage,
        aiLastCallAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        reserved: true,
        used: newUsage,
        limit: quotaLimit,
        remaining: Math.max(0, quotaLimit - newUsage),
      };
    });

    // Invalider le cache après modification
    invalidateQuotaCache(providerId);

    return result;
  } catch (error) {
    console.error("[reserveAiQuota] Erreur:", error);
    return {
      reserved: false,
      reason: "error_reserving_quota",
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }
}

/**
 * Libère 1 crédit de quota (en cas d'échec de génération IA).
 *
 * @param providerId - ID du provider
 */
export async function releaseAiQuota(providerId: string): Promise<boolean> {
  try {
    const db = admin.firestore();
    const providerRef = db.collection("providers").doc(providerId);

    await db.runTransaction(async (transaction) => {
      const providerDoc = await transaction.get(providerRef);

      if (!providerDoc.exists) return;

      const provider = providerDoc.data();
      const currentUsage = provider?.aiCallsUsed || 0;

      // Ne pas aller en dessous de 0
      if (currentUsage > 0) {
        transaction.update(providerRef, {
          aiCallsUsed: currentUsage - 1,
        });
      }
    });

    invalidateQuotaCache(providerId);
    return true;
  } catch (error) {
    console.error("[releaseAiQuota] Erreur:", error);
    return false;
  }
}

/**
 * Réinitialise le quota IA d'un provider (pour reset mensuel ou admin).
 *
 * @param providerId - ID du provider
 * @param newLimit - Nouvelle limite (optionnel, garde l'ancienne si non fourni)
 */
export async function resetAiQuota(providerId: string, newLimit?: number): Promise<boolean> {
  try {
    const db = admin.firestore();
    const providerRef = db.collection("providers").doc(providerId);

    const updateData: Record<string, unknown> = {
      aiCallsUsed: 0,
      aiQuotaResetAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (newLimit !== undefined) {
      updateData.aiCallsLimit = newLimit;
    }

    await providerRef.update(updateData);
    return true;
  } catch (error) {
    console.error("[resetAiQuota] Erreur:", error);
    return false;
  }
}

// =============================================================================
// RÉCUPÉRATION DES PARAMÈTRES IA
// =============================================================================

import type { AISettings } from "../core/types";

const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,
  replyOnBookingCreated: true,
  replyOnUserMessage: true,
  model: AI_CONFIG.OPENAI.MODEL,
  perplexityModel: AI_CONFIG.PERPLEXITY.MODEL,
  temperature: AI_CONFIG.OPENAI.TEMPERATURE,
  maxOutputTokens: AI_CONFIG.OPENAI.MAX_TOKENS,
  systemPrompt: "",
  usePerplexityForFactual: true,
  perplexityTemperature: AI_CONFIG.PERPLEXITY.TEMPERATURE,
  useClaudeForLawyers: true
};

export async function getAISettings(): Promise<AISettings> {
  try {
    const db = admin.firestore();
    const settingsDoc = await db.collection("settings").doc("ai").get();

    if (!settingsDoc.exists) {
      return DEFAULT_AI_SETTINGS;
    }

    const data = settingsDoc.data();
    return {
      ...DEFAULT_AI_SETTINGS,
      ...data
    } as AISettings;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

// =============================================================================
// RÉCUPÉRATION PROVIDER TYPE
// =============================================================================

import type { ProviderType } from "../core/types";

export async function getProviderType(providerId: string): Promise<ProviderType> {
  try {
    const db = admin.firestore();
    const providerDoc = await db.collection("providers").doc(providerId).get();

    if (!providerDoc.exists) {
      return "expat"; // Par défaut
    }

    const data = providerDoc.data();
    return data?.providerType === "lawyer" ? "lawyer" : "expat";
  } catch {
    return "expat";
  }
}

// =============================================================================
// RÉCUPÉRATION LANGUE DU PRESTATAIRE
// =============================================================================

/**
 * Récupère la langue préférée du prestataire.
 * Utilise la première langue du tableau `languages` ou "fr" par défaut.
 *
 * @param providerId - ID du provider
 * @returns Code langue (ex: "fr", "en", "de")
 */
export async function getProviderLanguage(providerId: string): Promise<string> {
  try {
    const db = admin.firestore();
    const providerDoc = await db.collection("providers").doc(providerId).get();

    if (!providerDoc.exists) {
      return "fr"; // Français par défaut
    }

    const data = providerDoc.data();

    // Priorité: preferredLanguage > languages[0] > "fr"
    if (data?.preferredLanguage) {
      return data.preferredLanguage;
    }

    if (data?.languages && Array.isArray(data.languages) && data.languages.length > 0) {
      return data.languages[0];
    }

    return "fr";
  } catch {
    return "fr";
  }
}

/**
 * Récupère le type ET la langue du prestataire en une seule lecture.
 * Optimisé pour éviter les double lectures Firestore.
 */
export async function getProviderInfo(providerId: string): Promise<{
  type: ProviderType;
  language: string;
}> {
  try {
    const db = admin.firestore();
    const providerDoc = await db.collection("providers").doc(providerId).get();

    if (!providerDoc.exists) {
      return { type: "expat", language: "fr" };
    }

    const data = providerDoc.data();

    // Type
    const type: ProviderType = data?.providerType === "lawyer" ? "lawyer" : "expat";

    // Langue: preferredLanguage > languages[0] > "fr"
    let language = "fr";
    if (data?.preferredLanguage) {
      language = data.preferredLanguage;
    } else if (data?.languages && Array.isArray(data.languages) && data.languages.length > 0) {
      language = data.languages[0];
    }

    return { type, language };
  } catch {
    return { type: "expat", language: "fr" };
  }
}

// =============================================================================
// SANITIZATION DES ENTRÉES UTILISATEUR
// =============================================================================

/**
 * Sanitize les entrées utilisateur pour prévenir les injections de prompt.
 * Supprime les patterns dangereux qui pourraient manipuler le LLM.
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  let sanitized = input;

  // Supprimer les tentatives d'injection de rôle
  const dangerousPatterns = [
    /\[SYSTEM\]/gi,
    /\[ASSISTANT\]/gi,
    /\[USER\]/gi,
    /---\s*(SYSTEM|INSTRUCTIONS|PROMPT)\s*---/gi,
    /IGNORE\s+(PREVIOUS|ALL)\s+INSTRUCTIONS/gi,
    /DISREGARD\s+(PREVIOUS|ALL)\s+INSTRUCTIONS/gi,
    /OUBLIE\s+(TES|TOUTES\s+TES)\s+INSTRUCTIONS/gi,
    /IGNORE\s+(TES|TOUTES\s+TES)\s+INSTRUCTIONS/gi,
    /YOU\s+ARE\s+NOW/gi,
    /TU\s+ES\s+MAINTENANT/gi,
    /ACT\s+AS\s+(A|AN)/gi,
    /AGIS\s+COMME/gi,
    /PRETEND\s+(TO\s+BE|YOU\s+ARE)/gi,
    /FAIS\s+SEMBLANT/gi
  ];

  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, "[FILTRÉ]");
  }

  // Limiter la longueur pour éviter les attaques par flooding
  const MAX_INPUT_LENGTH = 10000;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH) + "... [tronqué]";
  }

  return sanitized.trim();
}

/**
 * Sanitize un objet BookingData complet
 */
export function sanitizeBookingData(booking: {
  title?: string;
  description?: string;
  clientFirstName?: string;
  clientName?: string;
}): {
  title: string;
  description: string;
  clientFirstName: string;
  clientName: string;
} {
  return {
    title: sanitizeUserInput(booking.title || ""),
    description: sanitizeUserInput(booking.description || ""),
    clientFirstName: sanitizeUserInput(booking.clientFirstName || ""),
    clientName: sanitizeUserInput(booking.clientName || "")
  };
}

// =============================================================================
// RÉCUPÉRATION INTELLIGENTE DE L'HISTORIQUE (conversations longues 30+ min)
// =============================================================================

import type { LLMMessage, ConversationData } from "../core/types";

/**
 * Construit l'historique de conversation intelligent pour les conversations longues.
 *
 * Stratégie:
 * 1. TOUJOURS inclure les premiers messages (contexte booking)
 * 2. Inclure les messages récents
 * 3. Si conversation très longue, ajouter un résumé au milieu
 *
 * Cela garantit que l'IA ne "perd" jamais le contexte initial même après
 * 30+ minutes de conversation.
 */
export async function buildConversationHistory(
  db: admin.firestore.Firestore,
  conversationId: string,
  convoData: ConversationData,
  maxMessages: number = AI_CONFIG.MAX_HISTORY_MESSAGES,
  keepFirstMessages: number = AI_CONFIG.ALWAYS_KEEP_FIRST_MESSAGES
): Promise<LLMMessage[]> {
  const messagesRef = db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages");

  // Compter le nombre total de messages
  const countSnap = await messagesRef.count().get();
  const totalMessages = countSnap.data().count;

  let history: LLMMessage[] = [];

  // Si peu de messages, tout récupérer
  if (totalMessages <= maxMessages) {
    const allMsgsSnap = await messagesRef
      .orderBy("timestamp", "asc")
      .get();

    history = allMsgsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        role: data.role === "assistant" ? "assistant" : "user",
        content: data.content || ""
      } as LLMMessage;
    });
  } else {
    // Conversation longue: premiers messages + résumé + récents

    // 1. Récupérer les PREMIERS messages (contexte booking)
    const firstMsgsSnap = await messagesRef
      .orderBy("timestamp", "asc")
      .limit(keepFirstMessages)
      .get();

    const firstMessages: LLMMessage[] = firstMsgsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        role: data.role === "assistant" ? "assistant" : "user",
        content: data.content || ""
      } as LLMMessage;
    });

    // 2. Récupérer les messages RÉCENTS
    const recentCount = maxMessages - keepFirstMessages - 1; // -1 pour le résumé
    const recentMsgsSnap = await messagesRef
      .orderBy("timestamp", "desc")
      .limit(recentCount)
      .get();

    const recentMessages: LLMMessage[] = recentMsgsSnap.docs
      .reverse() // Remettre dans l'ordre chronologique
      .map(doc => {
        const data = doc.data();
        return {
          role: data.role === "assistant" ? "assistant" : "user",
          content: data.content || ""
        } as LLMMessage;
      });

    // 3. Construire l'historique avec indicateur de troncature
    history = [
      ...firstMessages,
      {
        role: "system" as const,
        content: `[... ${totalMessages - keepFirstMessages - recentCount} messages précédents omis pour la concision. Le contexte de la consultation reste valide. ...]`
      },
      ...recentMessages
    ];
  }

  // 4. Injecter le contexte booking persistant si disponible
  if (convoData.bookingContext) {
    const ctx = convoData.bookingContext;
    const contextReminder = buildContextReminder(ctx);

    // Ajouter un rappel de contexte au début
    if (contextReminder) {
      history.unshift({
        role: "system" as const,
        content: contextReminder
      });
    }
  }

  // 5. Ajouter le résumé de conversation si disponible (pour très longues conversations)
  if (convoData.conversationSummary && totalMessages > AI_CONFIG.SUMMARY_THRESHOLD) {
    history.splice(1, 0, {
      role: "system" as const,
      content: `[RÉSUMÉ DE LA CONVERSATION PRÉCÉDENTE]\n${convoData.conversationSummary}`
    });
  }

  return history;
}

/**
 * Construit un rappel de contexte à partir des données booking
 */
function buildContextReminder(ctx: NonNullable<ConversationData["bookingContext"]>): string {
  const parts: string[] = ["[RAPPEL CONTEXTE CONSULTATION]"];

  if (ctx.clientName) parts.push(`Client: ${ctx.clientName}`);
  if (ctx.country) parts.push(`Pays: ${ctx.country}`);
  if (ctx.nationality) parts.push(`Nationalité: ${ctx.nationality}`);
  if (ctx.title) parts.push(`Sujet: ${ctx.title}`);
  if (ctx.category) parts.push(`Catégorie: ${ctx.category}`);
  if (ctx.urgency) {
    const urgencyLabels: Record<string, string> = {
      low: "Faible", medium: "Moyenne", high: "Haute", critical: "CRITIQUE"
    };
    parts.push(`Urgence: ${urgencyLabels[ctx.urgency] || ctx.urgency}`);
  }

  if (parts.length <= 1) return ""; // Pas de contexte

  return parts.join(" | ");
}
