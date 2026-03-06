/**
 * Admin — Manage Partner Promo Widgets
 *
 * CRUD for partner_promo_widgets collection.
 * Actions: create, update, delete, reorder
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import type { PartnerPromoWidget } from "../../types";

interface ManageWidgetsInput {
  action: "list" | "create" | "update" | "delete" | "reorder";
  widgetId?: string;
  data?: Partial<Omit<PartnerPromoWidget, "id" | "createdAt" | "updatedAt" | "createdBy">>;
  /** For reorder action: array of { id, order } */
  reorderList?: Array<{ id: string; order: number }>;
}

export const adminManagePartnerWidgets = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; widgetId?: string; message: string; widgets?: PartnerPromoWidget[] }> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const adminId = request.auth!.uid;
    const input = request.data as ManageWidgetsInput;

    if (!input?.action) {
      throw new HttpsError("invalid-argument", "action is required");
    }

    try {
      const collection = db.collection("partner_promo_widgets");
      const now = Timestamp.now();

      switch (input.action) {
        // ---- LIST ----
        case "list": {
          const snap = await collection.orderBy("order", "asc").get();
          const widgets = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PartnerPromoWidget[];

          return { success: true, message: `${widgets.length} widgets found`, widgets };
        }

        // ---- CREATE ----
        case "create": {
          if (!input.data?.name || !input.data?.type || !input.data?.htmlTemplate) {
            throw new HttpsError("invalid-argument", "name, type, and htmlTemplate are required");
          }

          const validTypes = ["button", "banner"];
          if (!validTypes.includes(input.data.type!)) {
            throw new HttpsError("invalid-argument", `type must be one of: ${validTypes.join(", ")}`);
          }

          const widgetRef = collection.doc();
          const widget: PartnerPromoWidget = {
            id: widgetRef.id,
            name: input.data.name,
            nameTranslations: input.data.nameTranslations || {},
            description: input.data.description || "",
            descriptionTranslations: input.data.descriptionTranslations || {},
            type: input.data.type as "button" | "banner",
            dimension: input.data.dimension || "responsive",
            customWidth: input.data.customWidth,
            customHeight: input.data.customHeight,
            buttonText: input.data.buttonText || "",
            buttonTextTranslations: input.data.buttonTextTranslations || {},
            imageUrl: input.data.imageUrl || "",
            altText: input.data.altText || "",
            altTextTranslations: input.data.altTextTranslations || {},
            style: input.data.style || {},
            htmlTemplate: input.data.htmlTemplate,
            trackingId: input.data.trackingId || widgetRef.id,
            utmSource: input.data.utmSource || "partner",
            utmMedium: input.data.utmMedium || input.data.type || "banner",
            utmCampaign: input.data.utmCampaign || "widget",
            isActive: input.data.isActive ?? true,
            order: input.data.order ?? 0,
            views: 0,
            clicks: 0,
            conversions: 0,
            createdAt: now,
            updatedAt: now,
            createdBy: adminId,
          };

          await widgetRef.set(widget);

          logger.info("[adminManagePartnerWidgets] Widget created", {
            widgetId: widgetRef.id,
            adminId,
          });

          return { success: true, widgetId: widgetRef.id, message: "Widget created" };
        }

        // ---- UPDATE ----
        case "update": {
          if (!input.widgetId) {
            throw new HttpsError("invalid-argument", "widgetId is required for update");
          }
          if (!input.data || Object.keys(input.data).length === 0) {
            throw new HttpsError("invalid-argument", "data is required for update");
          }

          const widgetRef = collection.doc(input.widgetId);
          const widgetDoc = await widgetRef.get();
          if (!widgetDoc.exists) {
            throw new HttpsError("not-found", "Widget not found");
          }

          // Only allow updating safe fields
          const allowedFields = [
            "name", "nameTranslations", "description", "descriptionTranslations",
            "type", "dimension", "customWidth", "customHeight",
            "buttonText", "buttonTextTranslations",
            "imageUrl", "altText", "altTextTranslations",
            "style", "htmlTemplate",
            "trackingId", "utmSource", "utmMedium", "utmCampaign",
            "isActive", "order",
          ];

          const sanitized: Record<string, unknown> = {};
          for (const field of allowedFields) {
            if ((input.data as Record<string, unknown>)[field] !== undefined) {
              sanitized[field] = (input.data as Record<string, unknown>)[field];
            }
          }

          sanitized.updatedAt = now;

          await widgetRef.update(sanitized);

          logger.info("[adminManagePartnerWidgets] Widget updated", {
            widgetId: input.widgetId,
            updatedFields: Object.keys(sanitized).filter((k) => k !== "updatedAt"),
            adminId,
          });

          return { success: true, widgetId: input.widgetId, message: "Widget updated" };
        }

        // ---- DELETE ----
        case "delete": {
          if (!input.widgetId) {
            throw new HttpsError("invalid-argument", "widgetId is required for delete");
          }

          const widgetRef = collection.doc(input.widgetId);
          const widgetDoc = await widgetRef.get();
          if (!widgetDoc.exists) {
            throw new HttpsError("not-found", "Widget not found");
          }

          await widgetRef.delete();

          logger.info("[adminManagePartnerWidgets] Widget deleted", {
            widgetId: input.widgetId,
            adminId,
          });

          return { success: true, widgetId: input.widgetId, message: "Widget deleted" };
        }

        // ---- REORDER ----
        case "reorder": {
          if (!input.reorderList || !Array.isArray(input.reorderList) || input.reorderList.length === 0) {
            throw new HttpsError("invalid-argument", "reorderList is required for reorder action");
          }

          const batch = db.batch();
          for (const item of input.reorderList) {
            if (!item.id || typeof item.order !== "number") {
              throw new HttpsError("invalid-argument", "Each reorderList item must have id and order");
            }
            batch.update(collection.doc(item.id), {
              order: item.order,
              updatedAt: now,
            });
          }
          await batch.commit();

          logger.info("[adminManagePartnerWidgets] Widgets reordered", {
            count: input.reorderList.length,
            adminId,
          });

          return { success: true, message: `${input.reorderList.length} widgets reordered` };
        }

        default:
          throw new HttpsError("invalid-argument", `Unknown action: ${input.action}`);
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminManagePartnerWidgets] Error", { error });
      throw new HttpsError("internal", "Failed to manage partner widgets");
    }
  }
);
