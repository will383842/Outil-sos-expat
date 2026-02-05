/**
 * =============================================================================
 * ADMIN - Opérations administratives
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import type { Request, Response } from "express";
import {
  applySecurityChecks,
  getTrustedClientIp,
  hashPII,
} from "./security";

const ADMIN_API_KEY = defineSecret("ADMIN_API_KEY");

// Initialize Admin SDK once
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// CORS restrictif
const CORS_ORIGINS = [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "https://admin.sos-expat.com",
  "https://multi.sos-expat.com",
];

// Rôles autorisés
const ALLOWED_ROLES = new Set(["admin", "superadmin", "agent", "provider", "user"]);

/**
 * POST /setRole
 * Headers: x-api-key: <ADMIN_API_KEY>
 * Body: { uid: string, role: "admin" | "superadmin" | "agent" | "provider" | "user" }
 */
export const setRole = onRequest(
  {
    region: "europe-west1",
    cors: CORS_ORIGINS,
    secrets: [ADMIN_API_KEY],
    timeoutSeconds: 30,
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Security checks
      if (!applySecurityChecks(req, res)) {
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Method Not Allowed" });
        return;
      }

      const apiKey = req.header("x-api-key");
      if (!apiKey || apiKey !== ADMIN_API_KEY.value()) {
        logger.warn("[setRole] Tentative non autorisée", {
          ip: getTrustedClientIp(req),
        });
        res.status(401).json({ ok: false, error: "Unauthorized" });
        return;
      }

      const { uid, role } = (req.body ?? {}) as { uid?: string; role?: string };

      if (!uid || typeof uid !== "string" || uid.length < 1) {
        res.status(400).json({ ok: false, error: "uid is required" });
        return;
      }

      if (!role || !ALLOWED_ROLES.has(role)) {
        res.status(400).json({
          ok: false,
          error: `role must be one of: ${Array.from(ALLOWED_ROLES).join(", ")}`,
        });
        return;
      }

      // Mettre à jour les custom claims
      await admin.auth().setCustomUserClaims(uid, { role });

      // Mettre à jour aussi le document Firestore
      const db = admin.firestore();
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        await userRef.update({
          role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Log audit
      await db.collection("auditLogs").add({
        action: "role_changed",
        resourceType: "user",
        resourceId: uid,
        newRole: role,
        changedBy: "api",
        ip: getTrustedClientIp(req),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("[setRole] Rôle mis à jour", {
        uidHash: hashPII(uid),
        role,
      });

      res.status(200).json({ ok: true, uid, role });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[setRole] Erreur", { error: errorMessage });
      res.status(500).json({ ok: false, error: errorMessage });
    }
  }
);
