/**
 * =============================================================================
 * CONSTANTS - Constantes partagées de l'application
 * =============================================================================
 */

import {
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Scale,
  Globe,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export type BookingStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type BookingPriority = "urgent" | "high" | "medium" | "low";
export type ProviderType = "lawyer" | "expat";

export interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
  dotColor: string;
}

export interface PriorityConfig {
  label: string;
  color: string;
  icon: string;
}

export interface ProviderTypeConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

// =============================================================================
// STATUS CONFIG - Configuration des statuts de dossiers
// =============================================================================

export const STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  pending: {
    label: "En attente",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
    dotColor: "bg-amber-500",
  },
  in_progress: {
    label: "En cours",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Phone,
    dotColor: "bg-blue-500",
  },
  completed: {
    label: "Terminé",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    dotColor: "bg-green-500",
  },
  cancelled: {
    label: "Annulé",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: XCircle,
    dotColor: "bg-gray-500",
  },
};

// Variante pour les alertes (AlertCircle au lieu de XCircle pour cancelled)
export const STATUS_CONFIG_ALT: Record<BookingStatus, StatusConfig> = {
  ...STATUS_CONFIG,
  cancelled: {
    ...STATUS_CONFIG.cancelled,
    icon: AlertCircle,
  },
};

// =============================================================================
// PRIORITY CONFIG - Configuration des priorités
// =============================================================================

export const PRIORITY_CONFIG: Record<BookingPriority, PriorityConfig> = {
  urgent: { label: "Urgent", color: "bg-red-100 text-red-800", icon: "🚨" },
  high: { label: "Haute", color: "bg-orange-100 text-orange-800", icon: "⚡" },
  medium: { label: "Moyenne", color: "bg-blue-100 text-blue-800", icon: "📋" },
  low: { label: "Basse", color: "bg-gray-100 text-gray-700", icon: "📝" },
};

// =============================================================================
// PROVIDER TYPES - Configuration des types de prestataires
// =============================================================================

export const PROVIDER_TYPE_CONFIG: Record<ProviderType, ProviderTypeConfig> = {
  lawyer: {
    label: "Avocat",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
    icon: Scale,
  },
  expat: {
    label: "Expert expatrié",
    color: "text-green-800",
    bgColor: "bg-green-100",
    icon: Globe,
  },
};

// =============================================================================
// PAGINATION
// =============================================================================

export const DEFAULT_PAGE_SIZE = 50;

// =============================================================================
// ROLES
// =============================================================================

export const ALLOWED_ROLES = [
  "lawyer",
  "expat",
  "avocat",
  "expat_aidant",
  "admin",
  "superadmin",
  "provider",
] as const;

export type AllowedRole = (typeof ALLOWED_ROLES)[number];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Récupère la config d'un statut de manière type-safe
 */
export function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status as BookingStatus] ?? STATUS_CONFIG.pending;
}

/**
 * Récupère la config d'une priorité de manière type-safe
 */
export function getPriorityConfig(priority: string): PriorityConfig {
  return PRIORITY_CONFIG[priority as BookingPriority] ?? PRIORITY_CONFIG.medium;
}

/**
 * Récupère la config d'un type de prestataire de manière type-safe
 */
export function getProviderTypeConfig(type: string): ProviderTypeConfig {
  return PROVIDER_TYPE_CONFIG[type as ProviderType] ?? PROVIDER_TYPE_CONFIG.lawyer;
}

/**
 * Vérifie si un statut est valide
 */
export function isValidStatus(status: string): status is BookingStatus {
  return status in STATUS_CONFIG;
}

/**
 * Vérifie si une priorité est valide
 */
export function isValidPriority(priority: string): priority is BookingPriority {
  return priority in PRIORITY_CONFIG;
}
