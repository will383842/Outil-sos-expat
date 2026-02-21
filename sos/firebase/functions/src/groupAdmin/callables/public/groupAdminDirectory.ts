/**
 * Public Callable: GroupAdmin Directory
 *
 * Returns the public list of visible GroupAdmins.
 * No authentication required.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import { GroupAdmin, GroupAdminConfig } from "../../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ---- Input / Output types ----

interface GetGroupAdminDirectoryInput {
  country?: string;
  language?: string;
  groupType?: string;
  page?: number;
  limit?: number;
}

export interface PublicGroupAdmin {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  groupName: string;
  groupType: string;
  groupSize: string;
  groupCountry: string;
  groupLanguage: string;
  groupUrl: string;
  groupDescription?: string;
  isGroupVerified: boolean;
  country: string;
  language: string;
}

interface GetGroupAdminDirectoryResponse {
  groupAdmins: PublicGroupAdmin[];
  total: number;
  isPageVisible: boolean;
}

/**
 * getGroupAdminDirectory
 *
 * Public callable — no auth required.
 * Returns visible, active GroupAdmins from the directory.
 * Respects the `isGroupAdminListingPageVisible` flag from group_admin_config/current.
 */
export const getGroupAdminDirectory = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetGroupAdminDirectoryResponse> => {
    ensureInitialized();

    const db = getFirestore();
    const input = (request.data || {}) as GetGroupAdminDirectoryInput;
    const limit = Math.min(input.limit || 20, 100);
    const page = Math.max(input.page || 1, 1);
    const offset = (page - 1) * limit;

    try {
      // 1. Check if the listing page is globally enabled
      const configDoc = await db.collection("group_admin_config").doc("current").get();
      let isPageVisible = true;

      if (configDoc.exists) {
        const config = configDoc.data() as GroupAdminConfig;
        if (config.isGroupAdminListingPageVisible === false) {
          isPageVisible = false;
        }
      }

      if (!isPageVisible) {
        return {
          groupAdmins: [],
          total: 0,
          isPageVisible: false,
        };
      }

      // 2. Query visible + active group admins
      const query = db
        .collection("group_admins")
        .where("isVisible", "==", true)
        .where("status", "==", "active")
        .orderBy("createdAt", "desc");

      const snapshot = await query.get();

      // 3. Map to public shape
      let allGroupAdmins: PublicGroupAdmin[] = snapshot.docs.map((doc) => {
        const data = doc.data() as GroupAdmin;
        const ga: PublicGroupAdmin = {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          groupName: data.groupName,
          groupType: data.groupType,
          groupSize: data.groupSize,
          groupCountry: data.groupCountry,
          groupLanguage: data.groupLanguage,
          groupUrl: data.groupUrl,
          isGroupVerified: data.isGroupVerified,
          country: data.country,
          language: data.language,
        };
        if (data.photoUrl) ga.photoUrl = data.photoUrl;
        if (data.groupDescription) ga.groupDescription = data.groupDescription;
        return ga;
      });

      // 4. Client-side filters (avoid Firestore composite indexes)
      if (input.country) {
        allGroupAdmins = allGroupAdmins.filter(
          (ga) => ga.groupCountry === input.country || ga.country === input.country
        );
      }
      if (input.language) {
        allGroupAdmins = allGroupAdmins.filter(
          (ga) => ga.groupLanguage === input.language || ga.language === input.language
        );
      }
      if (input.groupType) {
        allGroupAdmins = allGroupAdmins.filter((ga) => ga.groupType === input.groupType);
      }

      const total = allGroupAdmins.length;

      // 5. Pagination (client-side to avoid composite index)
      const paginated = allGroupAdmins.slice(offset, offset + limit);

      return {
        groupAdmins: paginated,
        total,
        isPageVisible: true,
      };
    } catch (error) {
      logger.error("[getGroupAdminDirectory] Error", { error });
      throw new HttpsError("internal", "Failed to fetch GroupAdmin directory");
    }
  }
);
