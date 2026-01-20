/**
 * =============================================================================
 * SYNC USER EMAIL TO SOS_PROFILES
 * =============================================================================
 *
 * Ce trigger synchronise automatiquement les changements d'email de la collection
 * `users` vers la collection `sos_profiles` pour les prestataires (lawyer/expat).
 *
 * PROBLÈME RÉSOLU:
 * Quand un utilisateur modifie son email dans ProfileEdit.tsx:
 * 1. Firebase Auth est mis à jour
 * 2. users/{uid} est mis à jour
 * 3. sos_profiles/{uid} DOIT être mis à jour automatiquement
 *
 * Sans ce trigger, sos_profiles pouvait avoir un email obsolète.
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface UserData {
  email?: string;
  emailLower?: string;
  role?: string;
  type?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  photoURL?: string;
  // Flag pour éviter les boucles infinies
  lastEmailSyncAt?: admin.firestore.Timestamp;
}

/**
 * Trigger: users/{uid} - onUpdate
 * Synchronise l'email vers sos_profiles quand il change
 */
export const onUserEmailUpdated = onDocumentUpdated(
  {
    document: "users/{uid}",
    region: "europe-west1",
  },
  async (event) => {
    const uid = event.params.uid;
    const beforeData = event.data?.before?.data() as UserData | undefined;
    const afterData = event.data?.after?.data() as UserData | undefined;

    if (!afterData || !beforeData) {
      console.warn("[syncUserEmail] Données manquantes pour:", uid);
      return;
    }

    // Vérifier si l'email a changé
    const beforeEmail = beforeData.email?.toLowerCase();
    const afterEmail = afterData.email?.toLowerCase();

    if (beforeEmail === afterEmail) {
      // Email n'a pas changé, rien à faire
      return;
    }

    console.log(`[syncUserEmail] Email changé pour ${uid}: ${beforeEmail} -> ${afterEmail}`);

    // Vérifier si l'utilisateur est un prestataire (lawyer/expat)
    const role = afterData.role || afterData.type;
    if (role !== "lawyer" && role !== "expat") {
      console.log("[syncUserEmail] Utilisateur non prestataire, pas de sync sos_profiles:", uid);
      return;
    }

    // Vérifier si le document sos_profiles existe
    const sosProfileRef = db.collection("sos_profiles").doc(uid);
    const sosProfileSnap = await sosProfileRef.get();

    if (!sosProfileSnap.exists) {
      console.log("[syncUserEmail] Pas de sos_profiles pour:", uid);
      return;
    }

    // Mettre à jour l'email dans sos_profiles
    try {
      await sosProfileRef.update({
        email: afterEmail,
        emailLower: afterEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Flag pour traçabilité
        lastEmailSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        lastEmailSyncFrom: "users",
      });

      console.log(`[syncUserEmail] Email synchronisé vers sos_profiles pour: ${uid}`);

      // Synchroniser aussi les autres champs de profil si présents
      const additionalUpdates: Record<string, unknown> = {};

      if (afterData.firstName && afterData.firstName !== beforeData.firstName) {
        additionalUpdates.firstName = afterData.firstName;
      }
      if (afterData.lastName && afterData.lastName !== beforeData.lastName) {
        additionalUpdates.lastName = afterData.lastName;
      }
      if (afterData.fullName && afterData.fullName !== beforeData.fullName) {
        additionalUpdates.fullName = afterData.fullName;
        additionalUpdates.name = afterData.fullName;
      }
      if (afterData.phone && afterData.phone !== beforeData.phone) {
        additionalUpdates.phone = afterData.phone;
        additionalUpdates.phoneNumber = afterData.phone;
      }
      if (afterData.photoURL && afterData.photoURL !== beforeData.photoURL) {
        additionalUpdates.photoURL = afterData.photoURL;
        additionalUpdates.profilePhoto = afterData.photoURL;
        additionalUpdates.avatar = afterData.photoURL;
      }

      if (Object.keys(additionalUpdates).length > 0) {
        await sosProfileRef.update(additionalUpdates);
        console.log(`[syncUserEmail] Champs additionnels synchronisés:`, Object.keys(additionalUpdates));
      }

    } catch (error) {
      console.error(`[syncUserEmail] Erreur sync sos_profiles pour ${uid}:`, error);
      // En cas d'erreur, on ne throw pas pour ne pas faire échouer le trigger
      // Le prochain changement déclenchera une nouvelle tentative
    }
  }
);
