/**
 * =============================================================================
 * SYNC WHATSAPP INVITE LINKS → FIRESTORE
 * =============================================================================
 *
 * Receives updated WhatsApp invite links (from Baileys/Laravel) and updates
 * the Firestore document `admin_config/whatsapp_groups` so that SOS Expat
 * always serves fresh, valid invite links to new users.
 *
 * ENTRY POINT:
 * syncWhatsAppInviteLinks (onRequest): HTTP webhook called by Baileys
 *    after lock-all or any invite link refresh. Protected by SOS_SYNC_API_KEY.
 *    Body: { links: [{ firestore_group_id, invite_link, name? }] }
 *
 * ARCHITECTURE:
 * Baileys (WhatsApp) → Laravel (MySQL) → Firebase Function → Firestore
 *
 * SAFETY:
 * - If Firestore doc doesn't exist yet → auto-creates from seed data first
 * - Never re-enables a group that was manually disabled by admin
 * - Only updates the `link` field, never touches other group settings
 */

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { SOS_SYNC_API_KEY } from "../lib/secrets";
import { adminConfig } from "../lib/functionConfigs";

// Lazy initialization
let _initialized = false;
function ensureInitialized() {
  if (!_initialized) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

const CONFIG_DOC_PATH = "admin_config/whatsapp_groups";

// =============================================================================
// TYPES
// =============================================================================

interface InviteLinkUpdate {
  firestore_group_id: string;
  invite_link: string;
  name?: string;
}

/** Minimal WhatsApp group structure matching the Firestore schema */
interface FirestoreGroup {
  id: string;
  name: string;
  link: string;
  language: string;
  role: string;
  type: "continent" | "language";
  continentCode?: string;
  enabled: boolean;
  [key: string]: unknown;
}

// =============================================================================
// SEED DATA (hardcoded fallback — same as frontend seedWhatsAppGroups.ts)
// =============================================================================

/**
 * Build the initial config from hardcoded seed data.
 * This is the same data as in the frontend's seedWhatsAppGroups.ts.
 * Used ONLY when the Firestore document doesn't exist yet.
 */
function buildSeedConfig(): {
  groups: FirestoreGroup[];
  defaultGroupIds: Record<string, string>;
} {
  const ROLES = {
    chatter: "Chatter",
    influencer: "Influencer",
    blogger: "Blogger",
    groupAdmin: "Group Admin",
    client: "Client",
    lawyer: "Avocat",
    expat: "Expatrié Aidant",
  };

  const CONTINENTS = [
    { code: "AF", name: "Afrique", emoji: "🌍" },
    { code: "AS", name: "Asie", emoji: "🌏" },
    { code: "EU", name: "Europe", emoji: "🇪🇺" },
    { code: "NA", name: "Amérique du Nord", emoji: "🌎" },
    { code: "SA", name: "Amérique du Sud", emoji: "🌎" },
    { code: "OC", name: "Océanie", emoji: "🌏" },
    { code: "ME", name: "Moyen-Orient", emoji: "🕌" },
  ];

  const LANGUAGES = [
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "pt", name: "Português", flag: "🇧🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "ru", name: "Russkiy", flag: "🇷🇺" },
    { code: "ar", name: "Al-Arabiyya", flag: "🇸🇦" },
    { code: "zh", name: "Zhongwen", flag: "🇨🇳" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
  ];

  const groups: FirestoreGroup[] = [];
  const defaultGroupIds: Record<string, string> = {};

  // Chatters: 14 continent groups (7 continents × FR/EN)
  for (const c of CONTINENTS) {
    for (const lang of [LANGUAGES[0], LANGUAGES[1]]) {
      // FR + EN only
      const id = `chatter_${c.code.toLowerCase()}_${lang.code}`;
      groups.push({
        id,
        name: `Chatter ${c.emoji} ${c.name} ${lang.flag}`,
        link: "",
        language: lang.code,
        role: "chatter",
        type: "continent",
        continentCode: c.code,
        enabled: false,
      });
      // Default: chatter_eu_en
      if (c.code === "EU" && lang.code === "en") {
        defaultGroupIds["chatter"] = id;
      }
    }
  }

  // Other roles: 9 language groups each
  const langRoles = ["influencer", "blogger", "groupAdmin", "client", "lawyer", "expat"] as const;
  for (const roleCode of langRoles) {
    const roleLabel = ROLES[roleCode];
    for (const lang of LANGUAGES) {
      const id = `${roleCode}_lang_${lang.code}`;
      groups.push({
        id,
        name: `${roleLabel} ${lang.name} ${lang.flag}`,
        link: "",
        language: lang.code,
        role: roleCode,
        type: "language",
        enabled: false,
      });
      // Default: the EN group for each role
      if (lang.code === "en") {
        defaultGroupIds[roleCode] = id;
      }
    }
  }

  return { groups, defaultGroupIds };
}

// =============================================================================
// CORE SYNC LOGIC
// =============================================================================

/**
 * Updates invite links in the Firestore whatsapp_groups config document.
 * Only updates the `link` field of groups that match by firestore_group_id.
 * NEVER re-enables a group that was manually disabled (enabled stays untouched).
 * Auto-creates the document from seed data if it doesn't exist yet.
 */
async function syncLinksToFirestore(
  links: InviteLinkUpdate[],
  source: string
): Promise<{ updated: number; notFound: string[]; total: number; created: boolean }> {
  const db = getDb();
  const docRef = db.doc(CONFIG_DOC_PATH);

  let snap = await docRef.get();
  let created = false;

  // --- FAILLE 1 FIX: Auto-create from seed data if doc doesn't exist ---
  if (!snap.exists) {
    logger.warn(
      "[syncInviteLinks] Firestore doc not found — auto-creating from seed data"
    );
    const seedConfig = buildSeedConfig();
    await docRef.set({
      ...seedConfig,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "syncInviteLinks_auto_seed",
    });
    snap = await docRef.get();
    created = true;
    logger.info(
      `[syncInviteLinks] Created Firestore doc with ${seedConfig.groups.length} groups from seed data`
    );
  }

  const config = snap.data() as {
    groups: FirestoreGroup[];
    [key: string]: unknown;
  };

  if (!config.groups || !Array.isArray(config.groups)) {
    logger.error("[syncInviteLinks] Invalid config: groups array missing");
    throw new Error("Invalid Firestore config: groups array missing");
  }

  // Build a quick lookup by Firestore group ID
  const groupIndex = new Map<string, number>();
  config.groups.forEach((g, i) => groupIndex.set(g.id, i));

  let updated = 0;
  const notFound: string[] = [];

  for (const linkUpdate of links) {
    const idx = groupIndex.get(linkUpdate.firestore_group_id);
    if (idx === undefined) {
      notFound.push(linkUpdate.firestore_group_id);
      continue;
    }

    const group = config.groups[idx];
    const currentLink = group.link;
    const newLink = linkUpdate.invite_link;

    // Only update if the link actually changed
    if (currentLink !== newLink) {
      config.groups[idx].link = newLink;

      // --- FAILLE 2 FIX: Only enable if group was disabled DUE TO missing link ---
      // If the group had no link before and now has a valid one, enable it.
      // But if it was already enabled or was manually disabled (had a link but
      // enabled=false), DON'T touch the enabled flag.
      const hadNoLink = !currentLink || currentLink === "";
      const hasValidLink =
        newLink && newLink.startsWith("https://chat.whatsapp.com/");
      if (hadNoLink && hasValidLink) {
        config.groups[idx].enabled = true;
      }

      updated++;
      logger.info(
        `[syncInviteLinks] Updated ${linkUpdate.firestore_group_id}: ` +
          `${currentLink ? currentLink.substring(0, 45) + "..." : "(empty)"} → ${newLink.substring(0, 45)}...`
      );
    }
  }

  // Write back only if changes were made
  if (updated > 0 || created) {
    await docRef.update({
      groups: config.groups,
      lastLinkSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLinkSyncSource: source,
      lastLinkSyncUpdated: updated,
    });
    logger.info(
      `[syncInviteLinks] Firestore updated: ${updated} links changed out of ${links.length} received (source: ${source})`
    );
  } else {
    logger.info(
      `[syncInviteLinks] No changes needed — all ${links.length} links already up-to-date (source: ${source})`
    );
  }

  if (notFound.length > 0) {
    logger.warn(
      `[syncInviteLinks] ${notFound.length} groups not found in Firestore:`,
      notFound
    );
  }

  return { updated, notFound, total: links.length, created };
}

// =============================================================================
// HTTP WEBHOOK (called by Baileys after lock-all)
// =============================================================================

export const syncWhatsAppInviteLinks = onRequest(
  {
    ...adminConfig,
    region: "europe-west1",
    timeoutSeconds: 60,
    secrets: [SOS_SYNC_API_KEY],
  },
  async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Validate API key
    const apiKey = req.headers["x-api-key"] as string;
    let expectedKey = "";
    try {
      expectedKey = SOS_SYNC_API_KEY.value();
    } catch {
      expectedKey = process.env.SOS_SYNC_API_KEY || "";
    }

    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      logger.warn("[syncInviteLinks] Unauthorized request");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Validate body
    const { links } = req.body;
    if (!Array.isArray(links) || links.length === 0) {
      res.status(400).json({ error: "Missing or empty links array" });
      return;
    }

    // Validate each link entry
    for (const link of links) {
      if (!link.firestore_group_id || !link.invite_link) {
        res.status(400).json({
          error:
            "Each link must have firestore_group_id and invite_link fields",
        });
        return;
      }
    }

    try {
      const result = await syncLinksToFirestore(links, "webhook");
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("[syncInviteLinks] Sync failed:", message);
      res.status(500).json({ error: message });
    }
  }
);
