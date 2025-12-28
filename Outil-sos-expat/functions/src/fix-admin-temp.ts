/**
 * FONCTION TEMPORAIRE - À SUPPRIMER APRÈS UTILISATION
 * Permet de restaurer les droits admin pour williamsjullin@gmail.com
 */

import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

// Initialize Admin SDK once (standalone - pas de dépendance sur d'autres modules)
let app: App;
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

const TARGET_UID = "MqnoW1EnFifJkFGL3v83VzGsbaf2";
const TARGET_EMAIL = "williamsjullin@gmail.com";
// Clé de sécurité temporaire pour cette opération unique
const TEMP_SECRET = "fix-admin-2024-" + TARGET_UID.substring(0, 8);

/**
 * GET /fixAdminAccess?key=<TEMP_SECRET>
 * Restaure les droits admin pour williamsjullin@gmail.com
 */
export const fixAdminAccess = onRequest(
  {
    region: "europe-west1",
    timeoutSeconds: 30,
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Vérification de sécurité simple
      const key = req.query.key as string;
      if (key !== TEMP_SECRET) {
        res.status(401).json({ ok: false, error: "Unauthorized - wrong key" });
        return;
      }

      const results: string[] = [];
      const auth = getAuth();
      const db = getFirestore();

      // 1. Définir les Custom Claims
      await auth.setCustomUserClaims(TARGET_UID, {
        admin: true,
        role: "superadmin",
      });
      results.push("Custom Claims set: { admin: true, role: 'superadmin' }");

      // 2. Vérifier/Créer le document Firestore
      const userRef = db.collection("users").doc(TARGET_UID);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        // Créer le document
        await userRef.set({
          uid: TARGET_UID,
          email: TARGET_EMAIL,
          displayName: "William Jullin",
          role: "superadmin",
          isAdmin: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push("Firestore document CREATED with admin rights");
      } else {
        // Mettre à jour
        await userRef.update({
          role: "superadmin",
          isAdmin: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push("Firestore document UPDATED with admin rights");
      }

      // 3. Vérification finale
      const updatedUser = await auth.getUser(TARGET_UID);
      const updatedDoc = await userRef.get();
      const docData = updatedDoc.data();

      res.status(200).json({
        ok: true,
        message: "Admin access restored for " + TARGET_EMAIL,
        results,
        verification: {
          customClaims: updatedUser.customClaims,
          firestoreIsAdmin: docData?.isAdmin,
          firestoreRole: docData?.role,
        },
        nextSteps: [
          "1. Déconnectez-vous de l'application admin",
          "2. Reconnectez-vous avec " + TARGET_EMAIL,
          "3. SUPPRIMEZ cette fonction temporaire!",
        ],
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ ok: false, error: errorMessage });
    }
  }
);
