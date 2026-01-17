/**
 * =============================================================================
 * SOS EXPAT — Utilitaire Toast Notifications
 * =============================================================================
 *
 * Messages clairs et user-friendly pour toutes les notifications.
 * Utilise react-hot-toast pour l'affichage.
 */

import toast from "react-hot-toast";

// =============================================================================
// TYPES
// =============================================================================

type ToastType = "success" | "error" | "loading" | "info";

interface ToastOptions {
  duration?: number;
  id?: string;
}

// =============================================================================
// MESSAGES PRÉ-DÉFINIS
// =============================================================================

const MESSAGES = {
  // Authentification
  AUTH_SUCCESS: "Connexion réussie",
  AUTH_ERROR: "Impossible de vous connecter. Veuillez réessayer.",
  AUTH_EXPIRED: "Votre session a expiré. Veuillez vous reconnecter.",
  LOGOUT_SUCCESS: "Vous êtes déconnecté",

  // Abonnement
  SUBSCRIPTION_REQUIRED: "Un abonnement actif est requis pour accéder à cette fonctionnalité.",
  SUBSCRIPTION_EXPIRED: "Votre abonnement a expiré. Renouvelez-le pour continuer.",
  QUOTA_EXCEEDED: "Votre quota d'appels IA est épuisé pour ce mois.",

  // IA
  AI_LOADING: "L'assistant IA réfléchit...",
  AI_SUCCESS: "Réponse générée",
  AI_ERROR: "L'assistant IA n'a pas pu répondre. Veuillez réessayer.",
  AI_TIMEOUT: "La requête a pris trop de temps. Veuillez réessayer.",
  AI_UNAVAILABLE: "L'assistant IA est temporairement indisponible.",

  // Données
  SAVE_SUCCESS: "Modifications enregistrées",
  SAVE_ERROR: "Impossible d'enregistrer. Veuillez réessayer.",
  DELETE_SUCCESS: "Suppression effectuée",
  DELETE_ERROR: "Impossible de supprimer. Veuillez réessayer.",
  LOAD_ERROR: "Impossible de charger les données. Veuillez rafraîchir la page.",

  // Réseau
  NETWORK_ERROR: "Problème de connexion. Vérifiez votre réseau.",
  OFFLINE: "Vous êtes hors ligne. Certaines fonctionnalités sont limitées.",
  ONLINE: "Connexion rétablie",

  // Formulaires
  VALIDATION_ERROR: "Veuillez corriger les erreurs dans le formulaire.",
  REQUIRED_FIELDS: "Veuillez remplir tous les champs obligatoires.",

  // Permissions
  PERMISSION_DENIED: "Vous n'avez pas les permissions nécessaires.",
  ACCESS_DENIED: "Accès refusé à cette ressource.",

  // Général
  COPIED: "Copié dans le presse-papiers",
  UNKNOWN_ERROR: "Une erreur est survenue. Veuillez réessayer.",
} as const;

// =============================================================================
// FONCTIONS
// =============================================================================

/**
 * Affiche un toast de succès
 */
export function showSuccess(message: string, options?: ToastOptions) {
  return toast.success(message, {
    duration: options?.duration || 3000,
    id: options?.id,
  });
}

/**
 * Affiche un toast d'erreur
 */
export function showError(message: string, options?: ToastOptions) {
  return toast.error(message, {
    duration: options?.duration || 5000,
    id: options?.id,
  });
}

/**
 * Affiche un toast de chargement
 */
export function showLoading(message: string, options?: ToastOptions) {
  return toast.loading(message, {
    id: options?.id,
  });
}

/**
 * Affiche un toast d'information
 */
export function showInfo(message: string, options?: ToastOptions) {
  return toast(message, {
    duration: options?.duration || 4000,
    id: options?.id,
    icon: "ℹ️",
  });
}

/**
 * Dismiss un toast par ID
 */
export function dismissToast(id: string) {
  toast.dismiss(id);
}

/**
 * Dismiss tous les toasts
 */
export function dismissAllToasts() {
  toast.dismiss();
}

// =============================================================================
// RACCOURCIS POUR MESSAGES PRÉ-DÉFINIS
// =============================================================================

export const notify = {
  // Auth
  authSuccess: () => showSuccess(MESSAGES.AUTH_SUCCESS),
  authError: () => showError(MESSAGES.AUTH_ERROR),
  authExpired: () => showError(MESSAGES.AUTH_EXPIRED),
  logoutSuccess: () => showSuccess(MESSAGES.LOGOUT_SUCCESS),

  // Subscription
  subscriptionRequired: () => showError(MESSAGES.SUBSCRIPTION_REQUIRED),
  subscriptionExpired: () => showError(MESSAGES.SUBSCRIPTION_EXPIRED),
  quotaExceeded: () => showError(MESSAGES.QUOTA_EXCEEDED),

  // AI
  aiLoading: (id?: string) => showLoading(MESSAGES.AI_LOADING, { id }),
  aiSuccess: () => showSuccess(MESSAGES.AI_SUCCESS),
  aiError: () => showError(MESSAGES.AI_ERROR),
  aiTimeout: () => showError(MESSAGES.AI_TIMEOUT),
  aiUnavailable: () => showError(MESSAGES.AI_UNAVAILABLE),

  // Data
  saveSuccess: () => showSuccess(MESSAGES.SAVE_SUCCESS),
  saveError: () => showError(MESSAGES.SAVE_ERROR),
  deleteSuccess: () => showSuccess(MESSAGES.DELETE_SUCCESS),
  deleteError: () => showError(MESSAGES.DELETE_ERROR),
  loadError: () => showError(MESSAGES.LOAD_ERROR),

  // Network
  networkError: () => showError(MESSAGES.NETWORK_ERROR),
  offline: () => showInfo(MESSAGES.OFFLINE),
  online: () => showSuccess(MESSAGES.ONLINE),

  // Forms
  validationError: () => showError(MESSAGES.VALIDATION_ERROR),
  requiredFields: () => showError(MESSAGES.REQUIRED_FIELDS),

  // Permissions
  permissionDenied: () => showError(MESSAGES.PERMISSION_DENIED),
  accessDenied: () => showError(MESSAGES.ACCESS_DENIED),

  // General
  copied: () => showSuccess(MESSAGES.COPIED),
  unknownError: () => showError(MESSAGES.UNKNOWN_ERROR),
};

// =============================================================================
// HELPER: PROMISE TOAST
// =============================================================================

/**
 * Affiche un toast pendant qu'une promesse s'exécute
 * Affiche succès ou erreur automatiquement selon le résultat
 */
export function promiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  return toast.promise(promise, messages);
}

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

export default {
  success: showSuccess,
  error: showError,
  loading: showLoading,
  info: showInfo,
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
  notify,
  promise: promiseToast,
};
