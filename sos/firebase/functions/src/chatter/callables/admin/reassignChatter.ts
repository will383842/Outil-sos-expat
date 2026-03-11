/**
 * Admin Reassign Chatter
 *
 * Allows admins to:
 * 1. Change a chatter's parent (recruitedBy) → recalculates entire downstream N2 chain
 * 2. Change a chatter's captain (captainId) → updates captain assignment
 * 3. Both at once
 *
 * When recruitedBy changes:
 * - Update the chatter's recruitedBy field
 * - Recalculate the chatter's parrainNiveau2Id (= new parent's recruitedBy)
 * - Update all direct children of the chatter: their parrainNiveau2Id = chatter's NEW recruitedBy
 *   (because child.parrainNiveau2Id = child's parent's recruitedBy)
 * - Adjust referral counts on old/new parents and N2s
 *
 * When captainId changes:
 * - Update captainId, captainAssignedAt, captainAssignedBy on the chatter
 * - If newCaptainId is null/empty, remove captain assignment (FieldValue.delete())
 * - Verify new captain exists and has role: "captainChatter"
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { chatterAdminConfig } from "../../../lib/functionConfigs";
import { Chatter } from "../../types";

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized() {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

async function verifyAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  const uid = request.auth.uid;
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin" || role === "superadmin") {
    return uid;
  }
  const db = getDb();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || !["admin", "superadmin"].includes(userDoc.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  return uid;
}

interface ReassignChatterInput {
  chatterId: string;
  newRecruitedBy?: string | null; // New parent chatter ID, null to remove parent
  newCaptainId?: string | null; // New captain ID, null to remove captain
  reason?: string; // Reason for the reassignment
}

export const adminReassignChatter = onCall(
  { ...chatterAdminConfig, timeoutSeconds: 60 },
  async (request) => {
    const adminUid = await verifyAdmin(request);

    const data = request.data as ReassignChatterInput;
    const { chatterId, newRecruitedBy, newCaptainId, reason } = data;

    if (!chatterId) {
      throw new HttpsError("invalid-argument", "chatterId is required");
    }

    if (typeof newRecruitedBy === 'string' && newRecruitedBy.trim() === '') {
      throw new HttpsError("invalid-argument", "newRecruitedBy cannot be an empty string. Use null to remove parent.");
    }
    if (typeof newCaptainId === 'string' && newCaptainId.trim() === '') {
      throw new HttpsError("invalid-argument", "newCaptainId cannot be an empty string. Use null to remove captain.");
    }

    if (newRecruitedBy === undefined && newCaptainId === undefined) {
      throw new HttpsError("invalid-argument", "At least one of newRecruitedBy or newCaptainId must be provided");
    }

    const db = getDb();
    const chatterRef = db.collection("chatters").doc(chatterId);
    const chatterDoc = await chatterRef.get();

    if (!chatterDoc.exists) {
      throw new HttpsError("not-found", "Chatter not found");
    }

    const chatter = chatterDoc.data() as Chatter;
    const changes: Record<string, unknown> = { updatedAt: Timestamp.now() };
    const auditDetails: Record<string, unknown> = {};

    // === 1. CHANGE PARENT (recruitedBy) ===
    if (newRecruitedBy !== undefined) {
      const previousRecruitedBy = chatter.recruitedBy || null;

      // Prevent self-referral
      if (newRecruitedBy === chatterId) {
        throw new HttpsError("invalid-argument", "Cannot assign chatter as its own parent");
      }

      // Prevent circular reference: check if newRecruitedBy is a descendant of chatterId
      if (newRecruitedBy) {
        let current = newRecruitedBy;
        const visited = new Set<string>([chatterId]);
        for (let depth = 0; depth < 10; depth++) {
          if (visited.has(current)) {
            throw new HttpsError(
              "invalid-argument",
              "Circular reference detected: the new parent is a descendant of this chatter"
            );
          }
          visited.add(current);
          const parentDoc = await db.collection("chatters").doc(current).get();
          if (!parentDoc.exists) break;
          const parentData = parentDoc.data() as Chatter;
          if (!parentData.recruitedBy) break;
          current = parentData.recruitedBy;
        }

        // Verify new parent exists
        const newParentDoc = await db.collection("chatters").doc(newRecruitedBy).get();
        if (!newParentDoc.exists) {
          throw new HttpsError("not-found", "New parent chatter not found");
        }
        const newParent = newParentDoc.data() as Chatter;

        changes.recruitedBy = newRecruitedBy;
        // Recalculate parrainNiveau2Id = new parent's recruitedBy
        changes.parrainNiveau2Id = newParent.recruitedBy || null;
      } else {
        // Remove parent
        changes.recruitedBy = null;
        changes.parrainNiveau2Id = null;
      }

      auditDetails.previousRecruitedBy = previousRecruitedBy;
      auditDetails.newRecruitedBy = newRecruitedBy || null;

      // Update all direct children: their parrainNiveau2Id = this chatter's NEW recruitedBy
      const childrenQuery = await db
        .collection("chatters")
        .where("recruitedBy", "==", chatterId)
        .get();

      if (!childrenQuery.empty) {
        const newN2ForChildren = newRecruitedBy || null;
        const childDocs = childrenQuery.docs;

        // Batch updates in chunks of 500 (Firestore limit)
        for (let i = 0; i < childDocs.length; i += 500) {
          const batch = db.batch();
          const chunk = childDocs.slice(i, i + 500);
          for (const childDoc of chunk) {
            batch.update(childDoc.ref, {
              parrainNiveau2Id: newN2ForChildren,
              updatedAt: Timestamp.now(),
            });
          }
          await batch.commit();
        }

        auditDetails.childrenUpdated = childDocs.length;
      }

      // Update old parent's referral counts (decrement)
      if (previousRecruitedBy) {
        const oldParentRef = db.collection("chatters").doc(previousRecruitedBy);
        const oldParentDoc = await oldParentRef.get();
        if (oldParentDoc.exists) {
          const oldParent = oldParentDoc.data() as Chatter;
          const updates: Record<string, unknown> = {
            totalRecruits: FieldValue.increment(-1),
            updatedAt: Timestamp.now(),
          };
          if ((oldParent.qualifiedReferralsCount || 0) > 0) {
            updates.qualifiedReferralsCount = FieldValue.increment(-1);
          }
          await oldParentRef.update(updates);
        }
      }

      // Update new parent's referral counts (increment)
      if (newRecruitedBy) {
        await db.collection("chatters").doc(newRecruitedBy).update({
          totalRecruits: FieldValue.increment(1),
          qualifiedReferralsCount: FieldValue.increment(1),
          updatedAt: Timestamp.now(),
        });
      }

      // Update old N2's referralsN2Count (decrement)
      const oldN2 = chatter.parrainNiveau2Id;
      if (oldN2) {
        const oldN2Ref = db.collection("chatters").doc(oldN2);
        const oldN2Doc = await oldN2Ref.get();
        if (oldN2Doc.exists) {
          const n2Data = oldN2Doc.data() as Chatter;
          if ((n2Data.referralsN2Count || 0) > 0) {
            await oldN2Ref.update({
              referralsN2Count: FieldValue.increment(-1),
              updatedAt: Timestamp.now(),
            });
          }
        }
      }

      // Update new N2's referralsN2Count (increment)
      const newN2 = changes.parrainNiveau2Id as string | null;
      if (newN2) {
        await db.collection("chatters").doc(newN2).update({
          referralsN2Count: FieldValue.increment(1),
          updatedAt: Timestamp.now(),
        });
      }
    }

    // === 2. CHANGE CAPTAIN ===
    if (newCaptainId !== undefined) {
      const previousCaptainId = chatter.captainId || null;

      if (newCaptainId === chatterId) {
        throw new HttpsError("invalid-argument", "Cannot assign chatter as its own captain");
      }

      if (newCaptainId) {
        // Verify new captain exists and is a captain
        const captainDoc = await db.collection("chatters").doc(newCaptainId).get();
        if (!captainDoc.exists) {
          throw new HttpsError("not-found", "Captain chatter not found");
        }
        const captain = captainDoc.data() as Chatter;
        if (captain.role !== "captainChatter") {
          throw new HttpsError(
            "failed-precondition",
            "Target chatter is not a captain. Promote them first."
          );
        }

        changes.captainId = newCaptainId;
        changes.captainAssignedAt = Timestamp.now();
        changes.captainAssignedBy = adminUid;
      } else {
        // Remove captain assignment
        changes.captainId = FieldValue.delete();
        changes.captainAssignedAt = FieldValue.delete();
        changes.captainAssignedBy = FieldValue.delete();
      }

      auditDetails.previousCaptainId = previousCaptainId;
      auditDetails.newCaptainId = newCaptainId || null;
    }

    // === 3. APPLY CHANGES ===
    await chatterRef.update(changes);

    // === 4. AUDIT LOG ===
    await db.collection("admin_audit_logs").add({
      action: "chatter_reassigned",
      targetId: chatterId,
      targetType: "chatter",
      performedBy: adminUid,
      timestamp: Timestamp.now(),
      details: {
        ...auditDetails,
        reason: reason || "No reason provided",
        chatterName: `${chatter.firstName || ""} ${chatter.lastName || ""}`.trim(),
      },
    });

    // === 5. NOTIFICATION ===
    db.collection("chatter_notifications").add({
      chatterId,
      type: "hierarchy_changed",
      title: "Mise à jour de votre équipe",
      titleTranslations: {
        fr: "Mise à jour de votre équipe",
        en: "Team Update",
        es: "Actualización de equipo",
        de: "Team-Update",
        pt: "Atualização de equipa",
        ru: "Обновление команды",
        hi: "टीम अपडेट",
        zh: "团队更新",
        ar: "تحديث الفريق",
      },
      message:
        "Votre position dans la hiérarchie a été mise à jour par l'administration.",
      messageTranslations: {
        fr: "Votre position dans la hiérarchie a été mise à jour par l'administration.",
        en: "Your position in the hierarchy has been updated by the administration.",
        es: "Su posición en la jerarquía ha sido actualizada por la administración.",
        de: "Ihre Position in der Hierarchie wurde von der Verwaltung aktualisiert.",
        pt: "A sua posição na hierarquia foi atualizada pela administração.",
        ru: "Ваша позиция в иерархии была обновлена администрацией.",
        hi: "पदानुक्रम में आपकी स्थिति प्रशासन द्वारा अपडेट की गई है।",
        zh: "您在层级中的位置已被管理层更新。",
        ar: "تم تحديث موقعك في التسلسل الهرمي من قبل الإدارة.",
      },
      isRead: false,
      createdAt: Timestamp.now(),
    }).catch((err) => {
      logger.warn("[adminReassignChatter] Failed to create notification", { error: err });
    });

    logger.info("[adminReassignChatter] Chatter reassigned", {
      chatterId,
      adminUid,
      ...auditDetails,
    });

    return {
      success: true,
      message: "Chatter reassigned successfully",
      details: auditDetails,
    };
  }
);
