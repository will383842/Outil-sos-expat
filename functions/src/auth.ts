/**
 * =============================================================================
 * AUTH - Gestion de l'authentification et création d'utilisateurs
 * =============================================================================
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import type { Request, Response } from "express";
import {
  applySecurityChecks,
  getTrustedClientIp,
  hashPII,
} from "./security";

// Secret pour protéger les endpoints admin
const ADMIN_API_KEY = defineSecret("ADMIN_API_KEY");

try { admin.app(); } catch { admin.initializeApp(); }

// Liste des emails auto-admin depuis variable d'environnement Firebase
// Configuration: firebase functions:config:set admin.emails="email1@example.com,email2@example.com"
// Ou via Secret Manager pour plus de sécurité
const getAutoAdminEmails = (): string[] => {
  const envEmails = process.env.AUTO_ADMIN_EMAILS || "";
  return envEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
};

// CORS restrictif
const CORS_ORIGINS = [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "https://admin.sos-expat.com",
  "https://app.sos-expat.com",
];

/**
 * Crée un document Firestore users/{uid} à la création d'un compte Auth.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user): Promise<void> => {
  const db = admin.firestore();
  const email = user.email?.toLowerCase() || "";

  const ref = db.collection("users").doc(user.uid);
  const snap = await ref.get();

  if (snap.exists) {
    return;
  }

  const autoAdminEmails = getAutoAdminEmails();
  const isAutoAdmin = autoAdminEmails.includes(email);
  const role = isAutoAdmin ? "admin" : "user";

  await ref.set({
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    phoneNumber: user.phoneNumber ?? null,
    provider: user.providerData?.[0]?.providerId ?? null,
    role,
    status: "active",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (isAutoAdmin) {
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    // Log avec email hashé pour la sécurité
    logger.info("[onUserCreate] Admin auto-configuré", {
      emailHash: hashPII(email),
    });
  }
});

/**
 * Initialise le premier admin ou met à jour un utilisateur existant
 * Protégé par ADMIN_API_KEY
 */
export const initAdmin = onRequest(
  {
    cors: CORS_ORIGINS,
    region: "europe-west1",
    secrets: [ADMIN_API_KEY],
    timeoutSeconds: 30,
  },
  async (req: Request, res: Response): Promise<void> => {
    // Security checks
    if (!applySecurityChecks(req, res)) {
      return;
    }

    // Vérification méthode
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method Not Allowed" });
      return;
    }

    // Vérification API key obligatoire
    const apiKey = req.header("x-api-key");
    if (!apiKey || apiKey !== ADMIN_API_KEY.value()) {
      logger.warn("[initAdmin] Tentative d'accès non autorisée", {
        ip: getTrustedClientIp(req),
      });
      res.status(401).json({ ok: false, error: "Unauthorized" });
      return;
    }

    try {
      const db = admin.firestore();
      const results: Array<{ email: string; status: string; uid?: string }> = [];

      const emailsToProcess = req.body?.email
        ? [req.body.email.toLowerCase()]
        : getAutoAdminEmails();

      for (const email of emailsToProcess) {
        try {
          let userRecord;
          try {
            userRecord = await admin.auth().getUserByEmail(email);
          } catch {
            results.push({ email, status: "not_found" });
            continue;
          }

          const uid = userRecord.uid;
          await admin.auth().setCustomUserClaims(uid, { role: "admin" });

          const userRef = db.collection("users").doc(uid);
          const userSnap = await userRef.get();

          if (userSnap.exists) {
            await userRef.update({
              role: "admin",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            await userRef.set({
              uid,
              email,
              displayName: userRecord.displayName ?? null,
              role: "admin",
              status: "active",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }

          results.push({ email, status: "success", uid });
          logger.info("[initAdmin] Admin créé/mis à jour", {
            emailHash: hashPII(email),
            uid: hashPII(uid),
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          results.push({ email, status: `error: ${errorMessage}` });
        }
      }

      res.json({ ok: true, results });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[initAdmin] Erreur", { error: errorMessage });
      res.status(500).json({ ok: false, error: errorMessage });
    }
  }
);
