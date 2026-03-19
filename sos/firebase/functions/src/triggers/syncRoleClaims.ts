/**
 * =============================================================================
 * SYNC ROLE CLAIMS - SYNCHRONISE LE RÔLE FIRESTORE AVEC LES CUSTOM CLAIMS
 * =============================================================================
 *
 * Ce trigger est CRITIQUE pour le bon fonctionnement de l'authentification.
 *
 * PROBLÈME RÉSOLU:
 * - Les Firestore Rules utilisent `request.auth.token.role` pour vérifier les permissions
 * - Mais les Custom Claims n'étaient définis que pour les admins
 * - Les lawyers/expats/clients n'avaient pas leurs claims définis
 * - Résultat: les vérifications de rôle échouaient silencieusement
 *
 * SOLUTION:
 * - onCreate: Définir les custom claims quand un utilisateur est créé
 * - onUpdate: Synchroniser les claims quand le rôle change
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

interface UserData {
  role?: "client" | "lawyer" | "expat" | "admin" | "chatter" | "influencer" | "blogger" | "groupAdmin" | "partner";
  email?: string;
}

/**
 * Trigger: users/{uid} - onCreate
 * Définit les Custom Claims Firebase quand un utilisateur est créé
 */
export async function handleSyncClaimsCreated(event: any) {
    const uid = event.params.uid || event.params.userId;
    const data = event.data?.data() as UserData | undefined;

    if (!data) {
      console.warn("[syncRoleClaims] Pas de données pour:", uid);
      return;
    }

    const role = data.role;
    if (!role) {
      console.log("[syncRoleClaims] Pas de rôle défini pour:", uid);
      return;
    }

    // Vérifier que le rôle est valide
    const validRoles = ["client", "lawyer", "expat", "admin", "chatter", "influencer", "blogger", "groupAdmin", "partner"];
    if (!validRoles.includes(role)) {
      console.warn(`[syncRoleClaims] Rôle invalide: ${role} pour: ${uid}`);
      return;
    }

    // P1 FIX: Retry avec backoff pour setCustomUserClaims
    // Si Firebase Auth est momentanément indisponible, l'absence de claims
    // bloque l'utilisateur (Firestore rules rejettent les requêtes sans token.role)
    const MAX_CLAIMS_RETRIES = 3;
    let lastClaimsError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_CLAIMS_RETRIES; attempt++) {
      try {
        await admin.auth().setCustomUserClaims(uid, { role });
        console.log(`[syncRoleClaims] ✅ Custom Claims créés: role=${role} pour: ${uid} (tentative ${attempt})`);
        lastClaimsError = null;

        // Log d'audit
        await admin.firestore().collection("auth_claims_logs").add({
          userId: uid,
          action: "created",
          role: role,
          attempt,
          trigger: "onUserCreatedSyncClaims",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        break; // Succès, sortir de la boucle
      } catch (error) {
        lastClaimsError = error instanceof Error ? error : new Error(String(error));
        console.error(`[syncRoleClaims] ❌ Erreur création claims pour ${uid} (tentative ${attempt}/${MAX_CLAIMS_RETRIES}):`, error);

        if (attempt < MAX_CLAIMS_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
          console.log(`[syncRoleClaims] 🔄 Retry dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Log d'erreur si toutes les tentatives ont échoué
    if (lastClaimsError) {
      console.error(`[syncRoleClaims] ❌ Échec définitif après ${MAX_CLAIMS_RETRIES} tentatives pour ${uid}`);
      await admin.firestore().collection("auth_claims_logs").add({
        userId: uid,
        action: "create_failed",
        role: role,
        error: lastClaimsError.message,
        attempts: MAX_CLAIMS_RETRIES,
        trigger: "onUserCreatedSyncClaims",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
}

export const onUserCreatedSyncClaims = onDocumentCreated(
  {
    document: "users/{uid}",
    region: "europe-west3",
    cpu: 0.083,
  },
  handleSyncClaimsCreated
);

/**
 * Trigger: users/{uid} - onUpdate
 * Synchronise les Custom Claims quand le rôle change
 */
export async function handleSyncClaimsUpdated(event: any) {
    const uid = event.params.uid || event.params.userId;
    const beforeData = event.data?.before.data() as UserData | undefined;
    const afterData = event.data?.after.data() as UserData | undefined;

    if (!beforeData || !afterData) {
      console.warn("[syncRoleClaims] Données manquantes pour:", uid);
      return;
    }

    const oldRole = beforeData.role;
    const newRole = afterData.role;

    // Si le rôle n'a pas changé, ne rien faire
    if (oldRole === newRole) {
      return;
    }

    console.log(`[syncRoleClaims] Changement de rôle détecté: ${oldRole} → ${newRole} pour: ${uid}`);

    if (!newRole) {
      console.warn(`[syncRoleClaims] Nouveau rôle vide pour: ${uid}`);
      return;
    }

    // Vérifier que le nouveau rôle est valide
    const validRoles = ["client", "lawyer", "expat", "admin", "chatter", "influencer", "blogger", "groupAdmin", "partner"];
    if (!validRoles.includes(newRole)) {
      console.warn(`[syncRoleClaims] Rôle invalide: ${newRole} pour: ${uid}`);
      return;
    }

    try {
      // Mettre à jour les custom claims
      await admin.auth().setCustomUserClaims(uid, { role: newRole });
      // Révoquer les tokens pour forcer le client à récupérer les nouveaux claims
      await admin.auth().revokeRefreshTokens(uid);
      console.log(`[syncRoleClaims] ✅ Custom Claims mis à jour + tokens révoqués: role=${newRole} pour: ${uid}`);

      // Log d'audit
      await admin.firestore().collection("auth_claims_logs").add({
        userId: uid,
        action: "updated",
        oldRole: oldRole || "none",
        newRole: newRole,
        trigger: "onUserUpdatedSyncClaims",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notifier l'utilisateur qu'il doit se reconnecter pour que les changements prennent effet
      await admin.firestore().collection("notifications").add({
        userId: uid,
        type: "role_changed",
        title: "Votre rôle a été modifié",
        message: `Votre rôle a été changé de ${oldRole || 'non défini'} à ${newRole}. Veuillez vous reconnecter pour que les changements prennent effet.`,
        titleTranslations: {
          fr: "Votre rôle a été modifié", en: "Your role has been changed", es: "Su rol ha sido modificado",
          de: "Ihre Rolle wurde geändert", pt: "Seu papel foi alterado", ru: "Ваша роль изменена",
          hi: "आपकी भूमिका बदल दी गई है", zh: "您的角色已更改", ar: "تم تغيير دورك",
        },
        messageTranslations: {
          fr: `Votre rôle a été changé de ${oldRole || 'non défini'} à ${newRole}. Veuillez vous reconnecter pour que les changements prennent effet.`,
          en: `Your role was changed from ${oldRole || 'undefined'} to ${newRole}. Please log in again for changes to take effect.`,
          es: `Su rol fue cambiado de ${oldRole || 'no definido'} a ${newRole}. Vuelva a iniciar sesión para que los cambios surtan efecto.`,
          de: `Ihre Rolle wurde von ${oldRole || 'nicht definiert'} auf ${newRole} geändert. Bitte melden Sie sich erneut an.`,
          pt: `Seu papel foi alterado de ${oldRole || 'não definido'} para ${newRole}. Faça login novamente para que as alterações tenham efeito.`,
          ru: `Ваша роль изменена с ${oldRole || 'не определена'} на ${newRole}. Войдите заново для применения изменений.`,
          hi: `आपकी भूमिका ${oldRole || 'अपरिभाषित'} से ${newRole} में बदल दी गई। कृपया दोबारा लॉगिन करें।`,
          zh: `您的角色已从 ${oldRole || '未定义'} 更改为 ${newRole}。请重新登录以使更改生效。`,
          ar: `تم تغيير دورك من ${oldRole || 'غير محدد'} إلى ${newRole}. يرجى تسجيل الدخول مرة أخرى لتفعيل التغييرات.`,
        },
        data: {
          oldRole: oldRole || "none",
          newRole: newRole,
          requiresRelogin: true,
        },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error(`[syncRoleClaims] ❌ Erreur mise à jour claims pour ${uid}:`, error);

      // Log d'erreur
      await admin.firestore().collection("auth_claims_logs").add({
        userId: uid,
        action: "update_failed",
        oldRole: oldRole || "none",
        newRole: newRole,
        error: error instanceof Error ? error.message : "Unknown error",
        trigger: "onUserUpdatedSyncClaims",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
}

export const onUserUpdatedSyncClaims = onDocumentUpdated(
  {
    document: "users/{uid}",
    region: "europe-west3",
    cpu: 0.083,
  },
  handleSyncClaimsUpdated
);
