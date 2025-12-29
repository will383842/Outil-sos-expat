/**
 * =============================================================================
 * AUDIT LOG — Système de journalisation des actions
 * Trace toutes les actions importantes pour la conformité et le debugging
 * =============================================================================
 */

import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";

// =============================================================================
// TYPES
// =============================================================================

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.role_change"
  | "provider.create"
  | "provider.update"
  | "provider.delete"
  | "provider.access_grant"
  | "provider.access_revoke"
  | "booking.create"
  | "booking.update"
  | "booking.status_change"
  | "booking.delete"
  | "country.create"
  | "country.update"
  | "country.delete"
  | "ai.response_generated"
  | "ai.settings_change"
  | "settings.update"
  | "export.data"
  | "admin.action";

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditLogEntry {
  id?: string;
  action: AuditAction;
  severity: AuditSeverity;
  userId: string;
  userEmail: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

// =============================================================================
// FONCTIONS
// =============================================================================

/**
 * Enregistre une entrée dans le journal d'audit
 */
export async function logAuditEntry({
  action,
  severity = "info",
  targetId,
  targetType,
  details,
}: {
  action: AuditAction;
  severity?: AuditSeverity;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn("[AuditLog] Tentative de log sans utilisateur connecté");
      return null;
    }

    const entry: Omit<AuditLogEntry, "id"> = {
      action,
      severity,
      userId: user.uid,
      userEmail: user.email || "unknown",
      targetId,
      targetType,
      details,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      timestamp: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "audit_logs"), entry);
    return docRef.id;
  } catch (error) {
    console.error("[AuditLog] Erreur lors de l'enregistrement:", error);
    return null;
  }
}

/**
 * Raccourcis pour les actions courantes
 */
export const auditLog = {
  // Utilisateurs
  login: () => logAuditEntry({ action: "user.login", severity: "info" }),
  logout: () => logAuditEntry({ action: "user.logout", severity: "info" }),
  roleChange: (targetId: string, details: Record<string, unknown>) =>
    logAuditEntry({
      action: "user.role_change",
      severity: "warning",
      targetId,
      targetType: "user",
      details,
    }),

  // Prestataires
  providerCreate: (providerId: string, details: Record<string, unknown>) =>
    logAuditEntry({
      action: "provider.create",
      severity: "info",
      targetId: providerId,
      targetType: "provider",
      details,
    }),
  providerUpdate: (providerId: string, details: Record<string, unknown>) =>
    logAuditEntry({
      action: "provider.update",
      severity: "info",
      targetId: providerId,
      targetType: "provider",
      details,
    }),
  providerDelete: (providerId: string) =>
    logAuditEntry({
      action: "provider.delete",
      severity: "critical",
      targetId: providerId,
      targetType: "provider",
    }),
  accessGrant: (providerId: string) =>
    logAuditEntry({
      action: "provider.access_grant",
      severity: "warning",
      targetId: providerId,
      targetType: "provider",
    }),
  accessRevoke: (providerId: string) =>
    logAuditEntry({
      action: "provider.access_revoke",
      severity: "warning",
      targetId: providerId,
      targetType: "provider",
    }),

  // Dossiers
  bookingCreate: (bookingId: string, details?: Record<string, unknown>) =>
    logAuditEntry({
      action: "booking.create",
      severity: "info",
      targetId: bookingId,
      targetType: "booking",
      details,
    }),
  bookingUpdate: (bookingId: string, details: Record<string, unknown>) =>
    logAuditEntry({
      action: "booking.update",
      severity: "info",
      targetId: bookingId,
      targetType: "booking",
      details,
    }),
  bookingStatusChange: (bookingId: string, oldStatus: string, newStatus: string) =>
    logAuditEntry({
      action: "booking.status_change",
      severity: "info",
      targetId: bookingId,
      targetType: "booking",
      details: { oldStatus, newStatus },
    }),
  bookingDelete: (bookingId: string) =>
    logAuditEntry({
      action: "booking.delete",
      severity: "critical",
      targetId: bookingId,
      targetType: "booking",
    }),

  // IA
  aiResponse: (bookingId: string, details?: Record<string, unknown>) =>
    logAuditEntry({
      action: "ai.response_generated",
      severity: "info",
      targetId: bookingId,
      targetType: "booking",
      details,
    }),
  aiSettingsChange: (details: Record<string, unknown>) =>
    logAuditEntry({
      action: "ai.settings_change",
      severity: "warning",
      targetType: "settings",
      details,
    }),

  // Paramètres
  settingsUpdate: (details: Record<string, unknown>) =>
    logAuditEntry({
      action: "settings.update",
      severity: "warning",
      targetType: "settings",
      details,
    }),

  // Export
  dataExport: (exportType: string, count: number) =>
    logAuditEntry({
      action: "export.data",
      severity: "info",
      details: { exportType, count },
    }),

  // Action admin générique
  adminAction: (description: string, details?: Record<string, unknown>) =>
    logAuditEntry({
      action: "admin.action",
      severity: "info",
      details: { description, ...details },
    }),
};

export default auditLog;
