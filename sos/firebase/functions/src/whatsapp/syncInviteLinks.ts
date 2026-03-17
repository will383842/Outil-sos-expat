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
/**
 * Build seed config with actual invite links (synced with frontend seedWhatsAppGroups.ts).
 * All 68 groups are enabled with valid links so auto-create produces a working config.
 */
function buildSeedConfig(): {
  groups: FirestoreGroup[];
  defaultGroupIds: Record<string, string>;
} {
  // Invite links — single source of truth (must match frontend seed)
  const LINKS: Record<string, string> = {
    chatter_af_fr: "https://chat.whatsapp.com/BYgasir1XX8F07kCDU4qC8",
    chatter_af_en: "https://chat.whatsapp.com/DuSCD7rwPtvIINnA7dzg7x",
    chatter_as_fr: "https://chat.whatsapp.com/Ct8UZyO5bSR10uhvDkihNV",
    chatter_as_en: "https://chat.whatsapp.com/DeRfOv1caxJKbw8kz0CkBP",
    chatter_eu_fr: "https://chat.whatsapp.com/DbN8nrqfEQH01qRHlsCLXF",
    chatter_eu_en: "https://chat.whatsapp.com/IDPOwu6UD5F4BQvjXOvixT",
    chatter_na_fr: "https://chat.whatsapp.com/Jxs5Eci7anEAxCaiHpAdU0",
    chatter_na_en: "https://chat.whatsapp.com/CTbLbaEEFiw4I4jldIJRl8",
    chatter_sa_fr: "https://chat.whatsapp.com/LokkAcMRDPd4FzdqbRG19C",
    chatter_sa_en: "https://chat.whatsapp.com/GkQSaGhyV6BCekMyvtEFZ6",
    chatter_oc_fr: "https://chat.whatsapp.com/LOYOOhxOk63LkOQGlWM5nO",
    chatter_oc_en: "https://chat.whatsapp.com/JOHS0H7eHsk9m1DrrXcOtS",
    chatter_me_fr: "https://chat.whatsapp.com/LsWB4KtEvuT6jRG8z0lxHK",
    chatter_me_en: "https://chat.whatsapp.com/DLq6Dqfni1qB3ow3z264n7",
    influencer_lang_fr: "https://chat.whatsapp.com/HDklfyXDxnlBbytRhlOFr7",
    influencer_lang_en: "https://chat.whatsapp.com/EADHIewYh2UAIt5dl1VNm3",
    influencer_lang_es: "https://chat.whatsapp.com/IPnhUIprj4OIMebCRUkgNn",
    influencer_lang_pt: "https://chat.whatsapp.com/Eg5ZmcjYLbiBiCs9iedWta",
    influencer_lang_de: "https://chat.whatsapp.com/CieFk5FMULhCedwc5eE6WM",
    influencer_lang_ru: "https://chat.whatsapp.com/GnoruhuaQvd2ZUHC3KyRE2",
    influencer_lang_ar: "https://chat.whatsapp.com/IPDcxDXEHma7pPERfEGXgb",
    influencer_lang_zh: "https://chat.whatsapp.com/D1VKYOvX5FoI79hpAsaRuA",
    influencer_lang_hi: "https://chat.whatsapp.com/DHCUBSd6fkZ4NTOMn9WuDP",
    blogger_lang_fr: "https://chat.whatsapp.com/GqLo6X9OBNQ173rIggOznO",
    blogger_lang_en: "https://chat.whatsapp.com/Ex3h1uCAB36HWbQyEiK3RK",
    blogger_lang_es: "https://chat.whatsapp.com/EETaTdkvkuqEj3mI1QqftP",
    blogger_lang_pt: "https://chat.whatsapp.com/G1RMkDtmGRcJeeXyAZqCmD",
    blogger_lang_de: "https://chat.whatsapp.com/LjPgMUiwVzUC7LIobVKbiR",
    blogger_lang_ru: "https://chat.whatsapp.com/H6cIpeLF7Vm2MGp2fXI3Yk",
    blogger_lang_ar: "https://chat.whatsapp.com/JJZGZGcSPXIFVpPP7rrMes",
    blogger_lang_zh: "https://chat.whatsapp.com/HgFNzqjYLWqH5jBZhCAmEb",
    blogger_lang_hi: "https://chat.whatsapp.com/BrbIZ71SuJ0HdsZmZHTda0",
    groupAdmin_lang_fr: "https://chat.whatsapp.com/DnrWMG0vvozLEr3lKSXcgX",
    groupAdmin_lang_en: "https://chat.whatsapp.com/BpaFoRN2JWeE7PFEZCC15n",
    groupAdmin_lang_es: "https://chat.whatsapp.com/DD9qehOncPz3cCf2xPFH4P",
    groupAdmin_lang_pt: "https://chat.whatsapp.com/Gvo57KayELA1xhdqgdVWqA",
    groupAdmin_lang_de: "https://chat.whatsapp.com/Hu8FYSscMtzFI5tluhLGUn",
    groupAdmin_lang_ru: "https://chat.whatsapp.com/KhZZcsmROSpG0liiRb1vIg",
    groupAdmin_lang_ar: "https://chat.whatsapp.com/FMzUAzGtSh7LTvXxluRyzy",
    groupAdmin_lang_zh: "https://chat.whatsapp.com/H8axTEUiGWo9yyKQnw7dah",
    groupAdmin_lang_hi: "https://chat.whatsapp.com/BmCPXwQrVEmEXp4AhAeJE2",
    client_lang_fr: "https://chat.whatsapp.com/LGqbyYqDKBo5oKuVL7VyPv",
    client_lang_en: "https://chat.whatsapp.com/LPn67ly7GaKCmkGTslfzbS",
    client_lang_es: "https://chat.whatsapp.com/LnoZHwVLtq2Dn8vDCY1lUS",
    client_lang_pt: "https://chat.whatsapp.com/J77OETpgVp8IWc9IuhscqX",
    client_lang_de: "https://chat.whatsapp.com/HO6IO5wANuQ2BzDg5e8jJs",
    client_lang_ru: "https://chat.whatsapp.com/EqEyTtQN9lm1OzD2cxhB0g",
    client_lang_ar: "https://chat.whatsapp.com/Egwdyu1Pw4gFIIZ31gXEkJ",
    client_lang_zh: "https://chat.whatsapp.com/Cj6StuEbg1lCIn5uiEK9wM",
    client_lang_hi: "https://chat.whatsapp.com/Jk5m17BCxJREaYOqWyKMvr",
    lawyer_lang_fr: "https://chat.whatsapp.com/KwKVJILGvIY7FYutvJYlVc",
    lawyer_lang_en: "https://chat.whatsapp.com/KPVBNRJU9RSBhLwoFnHOYj",
    lawyer_lang_es: "https://chat.whatsapp.com/BjjDAw1lkbbEB7T0w8Okbp",
    lawyer_lang_pt: "https://chat.whatsapp.com/EbOouSl6OIELTPIIvdivvx",
    lawyer_lang_de: "https://chat.whatsapp.com/DoK1HV7IgPw1wRY0PugiGX",
    lawyer_lang_ru: "https://chat.whatsapp.com/GfXMxwQ9IreANeL9L6PvlQ",
    lawyer_lang_ar: "https://chat.whatsapp.com/LefbhJ3PtZLHFgMt2WJgob",
    lawyer_lang_zh: "https://chat.whatsapp.com/DSyOW8ULYJy1mNGdLp6YyW",
    lawyer_lang_hi: "https://chat.whatsapp.com/IwOY12dm4KQ8ATZNXULLCC",
    expat_lang_fr: "https://chat.whatsapp.com/CxspzVb4HRBGNTzzNu9giT",
    expat_lang_en: "https://chat.whatsapp.com/KcuVqyIx2Mg9HOeOmVaKEc",
    expat_lang_es: "https://chat.whatsapp.com/EhGJL62Ie7J6xK1AbDXEGb",
    expat_lang_pt: "https://chat.whatsapp.com/DIRSNWNTIeg9syWxa2LH6L",
    expat_lang_de: "https://chat.whatsapp.com/Hn2o0nBap2cFirFClbmKtF",
    expat_lang_ru: "https://chat.whatsapp.com/KuDbakUqANNJ8OtoOIdLP1",
    expat_lang_ar: "https://chat.whatsapp.com/Ke3O0Kqc29JG2kEpFhQU5t",
    expat_lang_zh: "https://chat.whatsapp.com/BhIxBmI17yWH6bLrFC1yzJ",
    expat_lang_hi: "https://chat.whatsapp.com/L6QT0JKJM0sKr4RcqWngFi",
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

  const ROLES: Record<string, string> = {
    chatter: "Chatter",
    influencer: "Influencer",
    blogger: "Blogger",
    groupAdmin: "Group Admin",
    client: "Client",
    lawyer: "Avocat",
    expat: "Expatrié Aidant",
  };

  const groups: FirestoreGroup[] = [];
  const defaultGroupIds: Record<string, string> = {};

  // Chatters: 14 continent groups (7 continents × FR/EN)
  for (const c of CONTINENTS) {
    for (const lang of [LANGUAGES[0], LANGUAGES[1]]) {
      const id = `chatter_${c.code.toLowerCase()}_${lang.code}`;
      const link = LINKS[id] || "";
      groups.push({
        id,
        name: `Chatter ${c.emoji} ${c.name} ${lang.flag}`,
        link,
        language: lang.code,
        role: "chatter",
        type: "continent",
        continentCode: c.code,
        enabled: !!link,
      });
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
      const link = LINKS[id] || "";
      groups.push({
        id,
        name: `${roleLabel} ${lang.name} ${lang.flag}`,
        link,
        language: lang.code,
        role: roleCode,
        type: "language",
        enabled: !!link,
      });
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
