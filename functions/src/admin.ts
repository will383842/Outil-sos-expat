import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import type { Request, Response } from "express";

const ADMIN_API_KEY = defineSecret("ADMIN_API_KEY");

// Initialize Admin SDK once
try {
  admin.app();
} catch {
  admin.initializeApp();
}

/**
 * POST /setRole
 * Headers: x-api-key: <ADMIN_API_KEY>
 * Body: { uid: string, role: "admin" | "agent" | "provider" }
 */
export const setRole = onRequest({ secrets: [ADMIN_API_KEY] }, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const apiKey = req.header("x-api-key");
    if (!apiKey || apiKey !== ADMIN_API_KEY.value()) {
      res.status(401).send("Unauthorized");
      return;
    }

    const { uid, role } = (req.body ?? {}) as { uid?: string; role?: string };
    const allowed = new Set(["admin", "agent", "provider"]);
    if (!uid || !role || !allowed.has(role)) {
      res.status(400).json({ ok: false, error: "Body must include { uid, role: 'admin'|'agent'|'provider' }" });
      return;
    }

    await admin.auth().setCustomUserClaims(uid, { role });

    res.status(200).json({ ok: true, uid, role });
    return;
  } catch (err) {
    console.error("[setRole] error:", err);
    res.status(500).json({ ok: false, error: (err as Error).message });
    return;
  }
});

