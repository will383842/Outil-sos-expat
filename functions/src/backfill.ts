import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import type { Request, Response } from "express";

const ADMIN_API_KEY = defineSecret("ADMIN_API_KEY");

try { admin.app(); } catch { admin.initializeApp(); }

export const backfillUsers = onRequest(
  { secrets: [ADMIN_API_KEY] },
  async (req: Request, res: Response): Promise<void> => {
    if (req.header("x-api-key") !== ADMIN_API_KEY.value()) {
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const db = admin.firestore();
      let token: string | undefined = undefined;
      let created = 0;

      do {
        const page = await admin.auth().listUsers(1000, token);
        for (const u of page.users) {
          const ref = db.collection("users").doc(u.uid);
          const snap = await ref.get();
          if (!snap.exists) {
            await ref.set({
              uid: u.uid,
              email: u.email ?? null,
              displayName: u.displayName ?? null,
              photoURL: u.photoURL ?? null,
              phoneNumber: u.phoneNumber ?? null,
              provider: u.providerData?.[0]?.providerId ?? null,
              role: "user",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            created++;
          }
        }
        token = page.pageToken ?? undefined;
      } while (token);

      res.json({ ok: true, created });
      return;
    } catch (e) {
      console.error("[backfillUsers] error:", e);
      res.status(500).json({ ok: false, error: (e as Error).message });
      return;
    }
  }
);
