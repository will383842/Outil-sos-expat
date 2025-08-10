import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import type { Request, Response } from "express";

// Initialize the Admin SDK once
try {
  admin.app();
} catch {
  admin.initializeApp();
}

const SOS_PLATFORM_API_KEY = defineSecret("SOS_PLATFORM_API_KEY");

// Re-export cloud functions from other modules (keep the extensionless import in TS)
export { setRole } from "./admin.js";
export { onUserCreate } from "./auth.js";
export { backfillUsers } from "./backfill.js";

/**
 * Example HTTPS function using v2 onRequest.
 * Allows CORS from sos-expat domains and localhost, protected by x-api-key header.
 */
export const ingestBooking = onRequest(
  {
    cors: [/sos-expat.*$/i, /localhost(:\d+)?$/i],
    secrets: [SOS_PLATFORM_API_KEY],
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const apiKey = req.header("x-api-key");
      if (!apiKey || apiKey !== SOS_PLATFORM_API_KEY.value()) {
        res.status(401).send("Unauthorized");
        return;
      }

      // Your ingestion logic here. For safety we just echo minimal fields.
      const payload = req.body ?? {};
      // e.g., write to Firestore
      const db = admin.firestore();
      const ref = db.collection("ingestBookings").doc();
      await ref.set({
        payload,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ ok: true, id: ref.id });
      return;
    } catch (err) {
      console.error("[ingestBooking] error:", err);
      res.status(500).json({ ok: false, error: (err as Error).message });
      return;
    }
  }
);

