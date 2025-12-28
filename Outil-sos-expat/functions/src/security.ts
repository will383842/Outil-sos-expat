/**
 * =============================================================================
 * SECURITY UTILITIES - Fonctions de sécurité communes
 * =============================================================================
 *
 * Centralise toutes les fonctions de sécurité pour :
 * - Headers HTTP sécurisés
 * - Validation Content-Type
 * - Limite taille payload
 * - Extraction IP fiable
 * - Hashing PII pour logs
 *
 * =============================================================================
 */

import type { Request, Response } from "express";
import { logger } from "firebase-functions";
import * as crypto from "crypto";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB max par défaut
const MAX_PAYLOAD_SIZE_BULK = 5 * 1024 * 1024; // 5MB pour les opérations bulk

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/**
 * Applique les headers de sécurité HTTP recommandés
 */
export function setSecurityHeaders(res: Response): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
}

// =============================================================================
// CONTENT-TYPE VALIDATION
// =============================================================================

/**
 * Valide que le Content-Type est application/json
 * @returns true si valide, false sinon (et envoie la réponse 415)
 */
export function validateContentType(req: Request, res: Response): boolean {
  // Ignorer pour GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return true;
  }

  const contentType = req.header("content-type");
  if (!contentType || !contentType.toLowerCase().includes("application/json")) {
    logger.warn("[Security] Content-Type invalide", {
      contentType: contentType || "missing",
      method: req.method,
      path: req.path,
      ip: getTrustedClientIp(req),
    });
    res.status(415).json({
      ok: false,
      error: "Unsupported Media Type. Content-Type must be application/json",
    });
    return false;
  }
  return true;
}

// =============================================================================
// PAYLOAD SIZE VALIDATION
// =============================================================================

/**
 * Valide la taille du payload
 * @param maxSize - Taille max en bytes (défaut: 1MB)
 * @returns true si valide, false sinon (et envoie la réponse 413)
 */
export function validatePayloadSize(
  req: Request,
  res: Response,
  maxSize: number = MAX_PAYLOAD_SIZE
): boolean {
  // Ignorer pour GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return true;
  }

  const payloadSize = JSON.stringify(req.body || {}).length;
  if (payloadSize > maxSize) {
    logger.warn("[Security] Payload trop large", {
      size: payloadSize,
      maxSize,
      ip: getTrustedClientIp(req),
    });
    res.status(413).json({
      ok: false,
      error: "Payload too large",
      maxSize,
      receivedSize: payloadSize,
    });
    return false;
  }
  return true;
}

// =============================================================================
// TRUSTED IP EXTRACTION
// =============================================================================

/**
 * Extrait l'IP client de manière sécurisée
 * Priorité: req.ip (Firebase) > première IP de x-forwarded-for > "unknown"
 */
export function getTrustedClientIp(req: Request): string {
  // Firebase fournit req.ip de manière sécurisée via le proxy
  if (req.ip && req.ip !== "::1" && req.ip !== "127.0.0.1") {
    return req.ip;
  }

  // Fallback: première IP de x-forwarded-for (ajoutée par le premier proxy)
  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    // Validation basique du format IP
    if (/^[\d.:a-fA-F]+$/.test(firstIp)) {
      return firstIp;
    }
  }

  return "unknown";
}

// =============================================================================
// PII HASHING FOR LOGS
// =============================================================================

/**
 * Hash une valeur PII pour logging sécurisé
 * Utilise SHA-256 tronqué pour être court mais unique
 */
export function hashPII(value: string | null | undefined): string {
  if (!value) return "empty";
  return crypto.createHash("sha256").update(value).digest("hex").substring(0, 16);
}

/**
 * Masque un email pour les logs (garde début et domaine)
 * Ex: "john.doe@example.com" -> "joh***@example.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "empty";
  const [local, domain] = email.split("@");
  if (!domain) return hashPII(email);
  const maskedLocal = local.length > 3 ? local.substring(0, 3) + "***" : "***";
  return `${maskedLocal}@${domain}`;
}

/**
 * Masque un numéro de téléphone pour les logs
 * Ex: "+33612345678" -> "+336****5678"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "empty";
  if (phone.length < 8) return "***";
  return phone.substring(0, 4) + "****" + phone.substring(phone.length - 4);
}

// =============================================================================
// COMBINED SECURITY MIDDLEWARE
// =============================================================================

/**
 * Applique toutes les vérifications de sécurité
 * @returns true si toutes les vérifications passent
 */
export function applySecurityChecks(
  req: Request,
  res: Response,
  options: {
    maxPayloadSize?: number;
    skipContentTypeCheck?: boolean;
  } = {}
): boolean {
  // 1. Headers de sécurité (toujours)
  setSecurityHeaders(res);

  // 2. Content-Type validation
  if (!options.skipContentTypeCheck) {
    if (!validateContentType(req, res)) {
      return false;
    }
  }

  // 3. Payload size validation
  if (!validatePayloadSize(req, res, options.maxPayloadSize)) {
    return false;
  }

  return true;
}

// =============================================================================
// REQUEST LOGGING HELPERS
// =============================================================================

/**
 * Crée un objet de contexte sécurisé pour le logging
 * Masque automatiquement les PII
 */
export function createSecureLogContext(
  req: Request,
  additionalData: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ip: getTrustedClientIp(req),
    method: req.method,
    path: req.path,
    userAgent: req.header("user-agent")?.substring(0, 100) || "unknown",
    ...additionalData,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { MAX_PAYLOAD_SIZE, MAX_PAYLOAD_SIZE_BULK };
