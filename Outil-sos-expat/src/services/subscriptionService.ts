/**
 * =============================================================================
 * SUBSCRIPTION SERVICE - Gestion des abonnements côté client
 * =============================================================================
 *
 * Service pour gérer les vérifications d'abonnement et l'accès aux fonctionnalités.
 *
 * =============================================================================
 */

import { db, auth } from "../lib/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
} from "firebase/firestore";
import i18n from "../i18n";

// =============================================================================
// TYPES
// =============================================================================

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "expired"
  | "paused"
  | null;

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  hasAccess: boolean;
  expiresAt: Date | null;
  planName: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  cancelAtPeriodEnd: boolean;
  daysRemaining: number | null;
}

export interface UserRole {
  role: "admin" | "superadmin" | "provider" | "agent" | "user";
  isAdmin: boolean;
  isProvider: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
}

// =============================================================================
// CONSTANTES
// =============================================================================

const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due"];

// =============================================================================
// FONCTIONS PRINCIPALES
// =============================================================================

/**
 * Vérifie si un statut d'abonnement donne accès aux fonctionnalités
 */
export function isStatusActive(status: SubscriptionStatus): boolean {
  return status !== null && ACTIVE_STATUSES.includes(status);
}

/**
 * Récupère les informations d'abonnement d'un utilisateur
 */
export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
  // 1. Vérifier d'abord dans le document utilisateur
  const userDoc = await getDoc(doc(db, "users", userId));

  if (userDoc.exists()) {
    const userData = userDoc.data();

    // Les admins ont toujours accès
    if (userData?.role === "admin" || userData?.role === "superadmin") {
      return {
        status: "active",
        hasAccess: true,
        expiresAt: null,
        planName: "Admin",
        priceAmount: null,
        priceCurrency: "USD",
        cancelAtPeriodEnd: false,
        daysRemaining: null,
      };
    }

    // Récupérer le statut d'abonnement stocké sur l'utilisateur
    if (userData?.subscriptionStatus) {
      const expiresAt = userData.subscriptionExpiresAt?.toDate() || null;
      const daysRemaining = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        status: userData.subscriptionStatus as SubscriptionStatus,
        hasAccess: isStatusActive(userData.subscriptionStatus as SubscriptionStatus),
        expiresAt,
        planName: userData.planName || null,
        priceAmount: userData.priceAmount || null,
        priceCurrency: userData.priceCurrency || "USD",
        cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
        daysRemaining,
      };
    }
  }

  // 2. Vérifier dans la collection subscriptions
  const subQuery = query(
    collection(db, "subscriptions"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc"),
    limit(1)
  );

  // Note: Cette requête nécessite un index Firestore
  try {
    const { getDocs } = await import("firebase/firestore");
    const subSnapshot = await getDocs(subQuery);

    if (!subSnapshot.empty) {
      const subData = subSnapshot.docs[0].data();
      const expiresAt = subData.currentPeriodEnd?.toDate() || null;
      const daysRemaining = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        status: subData.status as SubscriptionStatus,
        hasAccess: isStatusActive(subData.status as SubscriptionStatus),
        expiresAt,
        planName: subData.planName || null,
        priceAmount: subData.priceAmount || null,
        priceCurrency: subData.priceCurrency || "USD",
        cancelAtPeriodEnd: subData.cancelAtPeriodEnd || false,
        daysRemaining,
      };
    }
  } catch (error) {
    console.error("[getSubscriptionInfo] Erreur requête subscriptions:", error);
  }

  // 3. Pas d'abonnement trouvé
  return {
    status: null,
    hasAccess: false,
    expiresAt: null,
    planName: null,
    priceAmount: null,
    priceCurrency: "USD",
    cancelAtPeriodEnd: false,
    daysRemaining: null,
  };
}

/**
 * Écoute les changements d'abonnement en temps réel
 */
export function subscribeToSubscription(
  userId: string,
  callback: (info: SubscriptionInfo) => void
): Unsubscribe {
  // Écouter le document utilisateur
  const userRef = doc(db, "users", userId);

  return onSnapshot(userRef, async (snapshot) => {
    if (!snapshot.exists()) {
      callback({
        status: null,
        hasAccess: false,
        expiresAt: null,
        planName: null,
        priceAmount: null,
        priceCurrency: "USD",
        cancelAtPeriodEnd: false,
        daysRemaining: null,
      });
      return;
    }

    const userData = snapshot.data();

    // Les admins ont toujours accès
    if (userData?.role === "admin" || userData?.role === "superadmin") {
      callback({
        status: "active",
        hasAccess: true,
        expiresAt: null,
        planName: "Admin",
        priceAmount: null,
        priceCurrency: "USD",
        cancelAtPeriodEnd: false,
        daysRemaining: null,
      });
      return;
    }

    const expiresAt = userData?.subscriptionExpiresAt?.toDate() || null;
    const daysRemaining = expiresAt
      ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    callback({
      status: (userData?.subscriptionStatus as SubscriptionStatus) || null,
      hasAccess: isStatusActive((userData?.subscriptionStatus as SubscriptionStatus) || null),
      expiresAt,
      planName: userData?.planName || null,
      priceAmount: userData?.priceAmount || null,
      priceCurrency: userData?.priceCurrency || "USD",
      cancelAtPeriodEnd: userData?.cancelAtPeriodEnd || false,
      daysRemaining,
    });
  });
}

/**
 * Récupère le rôle et les permissions d'un utilisateur
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const userDoc = await getDoc(doc(db, "users", userId));

  if (!userDoc.exists()) {
    return {
      role: "user",
      isAdmin: false,
      isProvider: false,
      isSuperAdmin: false,
      permissions: [],
    };
  }

  const userData = userDoc.data();
  const role = (userData?.role || "user") as UserRole["role"];

  return {
    role,
    isAdmin: role === "admin" || role === "superadmin",
    isProvider: role === "provider" || role === "admin" || role === "superadmin",
    isSuperAdmin: role === "superadmin",
    permissions: userData?.permissions || [],
  };
}

/**
 * Vérifie si l'utilisateur actuel a accès
 */
export async function checkCurrentUserAccess(): Promise<{
  hasAccess: boolean;
  reason: string;
}> {
  const user = auth.currentUser;

  if (!user) {
    return { hasAccess: false, reason: "not_authenticated" };
  }

  // Récupérer les infos d'abonnement
  const subscriptionInfo = await getSubscriptionInfo(user.uid);

  if (!subscriptionInfo.hasAccess) {
    if (subscriptionInfo.status === "expired") {
      return { hasAccess: false, reason: "subscription_expired" };
    }
    if (subscriptionInfo.status === "canceled") {
      return { hasAccess: false, reason: "subscription_canceled" };
    }
    if (subscriptionInfo.status === "unpaid") {
      return { hasAccess: false, reason: "payment_failed" };
    }
    return { hasAccess: false, reason: "no_subscription" };
  }

  return { hasAccess: true, reason: "ok" };
}

// =============================================================================
// MESSAGES D'ERREUR - CLÉS I18N
// =============================================================================

/**
 * Mapping des raisons d'erreur vers les clés de traduction i18n
 */
const SUBSCRIPTION_ERROR_KEYS: Record<string, string> = {
  not_authenticated: "subscriptionErrors.notAuthenticated",
  subscription_expired: "subscriptionErrors.subscriptionExpired",
  subscription_canceled: "subscriptionErrors.subscriptionCanceled",
  payment_failed: "subscriptionErrors.paymentFailed",
  no_subscription: "subscriptionErrors.noSubscription",
  ok: "subscriptionErrors.accessGranted",
};

/**
 * Obtient le message d'erreur localisé via i18n
 * Supporte les 9 langues: fr, en, de, ru, zh, es, pt, ar, hi
 */
export function getSubscriptionErrorMessage(reason: string): string {
  const key = SUBSCRIPTION_ERROR_KEYS[reason] || SUBSCRIPTION_ERROR_KEYS.no_subscription;
  return i18n.t(key, { ns: "common" });
}
