/**
 * useViralKit Hook — Refonte 2026
 *
 * Viral marketing tools for chatters:
 * - 3 referral links (client, recruitment, provider)
 * - Platform-optimized share messages via i18n
 * - 10 platforms: WhatsApp, Messenger, Telegram, SMS, Facebook, Twitter/X, LinkedIn, Email, Instagram, TikTok
 * - Client-side QR code (qrcode.react)
 * - Web Share API with AbortError handling
 * - 5 message categories: urgent, earnings, help, personal, professional
 */

import { useState, useCallback, useMemo } from "react";
import { useIntl } from "react-intl";
import { useChatterData } from "@/contexts/ChatterDataContext";
import { useChatterMissions } from "@/hooks/useChatterMissions";
import { ChatterViralKit } from "@/types/chatter";
import { trackMetaCustomEvent } from "@/utils/metaPixel";
import { logAnalyticsEvent } from "@/config/firebase";
import { copyToClipboard as clipboardCopy } from "@/utils/clipboard";

// ============================================================================
// TYPES
// ============================================================================

export type ShareLinkType = "client" | "recruitment" | "provider";

export type MessageCategory = "urgent" | "earnings" | "help" | "personal" | "professional";

export interface SharePlatform {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  color: string;
  bgClass: string;
  getShareUrl: (text: string, url: string) => string;
  /** If true, copies link to clipboard before opening (Instagram, TikTok) */
  copyFirst?: boolean;
}

export interface CategorizedMessage {
  category: MessageCategory;
  text: string;
}

export interface UseViralKitReturn {
  // Links
  activeLinkType: ShareLinkType;
  setActiveLinkType: (type: ShareLinkType) => void;
  activeLink: string;
  activeCode: string;
  clientLink: string;
  recruitmentLink: string;
  providerLink: string;

  // Share messages (categorized, i18n)
  shareMessages: CategorizedMessage[];
  selectedMessage: string;
  selectedCategory: MessageCategory | "all";
  setSelectedCategory: (cat: MessageCategory | "all") => void;
  filteredMessages: CategorizedMessage[];
  categories: MessageCategory[];

  // Platforms
  platforms: SharePlatform[];
  tier1Platforms: SharePlatform[];
  tier2Platforms: SharePlatform[];
  tier3Platforms: SharePlatform[];

  // State
  copied: boolean;

  // Actions
  copyLink: () => Promise<void>;
  copyCode: () => Promise<void>;
  copyMessage: (message: string) => Promise<void>;
  shareOn: (platformId: string, customMessage?: string) => void;
  shareNative: () => Promise<boolean>;
  selectMessage: (index: number) => void;

  // Legacy compat
  viralKit: ChatterViralKit | null;
  referralLink: string;
  referralCode: string;
  generateQRCode: () => string;
  selectedLanguage: "fr" | "en";
  setSelectedLanguage: (lang: "fr" | "en") => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALL_CATEGORIES: MessageCategory[] = ["urgent", "earnings", "help", "personal", "professional"];

const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

// ============================================================================
// PLATFORMS WITH DEDICATED I18N MESSAGES
// These platforms get category-specific messages via chatter.share.platform.{platform}.{category}
// Others fall back to the generic selected message.
// ============================================================================

const PLATFORMS_WITH_DEDICATED_MESSAGES = ["whatsapp", "linkedin", "email"] as const;

// Format adapters for platforms without dedicated messages
const PLATFORM_FORMAT_ADAPTERS: Record<string, (msg: string) => string> = {
  sms: (msg) => msg.length > 160 ? msg.substring(0, 157) + "..." : msg,
  twitter: (msg) => msg.length > 250 ? msg.substring(0, 247) + "..." : msg,
};

// ============================================================================
// PLATFORMS
// ============================================================================

const PLATFORMS: SharePlatform[] = [
  // TIER 1 — Messaging direct (80% traffic)
  {
    id: "whatsapp",
    name: "WhatsApp",
    tier: 1,
    color: "#25D366",
    bgClass: "bg-[#25D366]/10",
    getShareUrl: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "messenger",
    name: "Messenger",
    tier: 1,
    color: "#0099FF",
    bgClass: "bg-[#0099FF]/10",
    getShareUrl: (_text, url) =>
      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=&redirect_uri=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
  },
  {
    id: "telegram",
    name: "Telegram",
    tier: 1,
    color: "#0088CC",
    bgClass: "bg-[#0088CC]/10",
    getShareUrl: (text, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "sms",
    name: "SMS",
    tier: 1,
    color: "#34C759",
    bgClass: "bg-[#34C759]/10",
    getShareUrl: (text) =>
      isIOS ? `sms:&body=${encodeURIComponent(text)}` : `sms:?body=${encodeURIComponent(text)}`,
  },
  // TIER 2 — Social networks (15% traffic)
  {
    id: "facebook",
    name: "Facebook",
    tier: 2,
    color: "#1877F2",
    bgClass: "bg-[#1877F2]/10",
    getShareUrl: (text, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
  },
  {
    id: "twitter",
    name: "Twitter/X",
    tier: 2,
    color: "#1DA1F2",
    bgClass: "bg-[#1DA1F2]/10",
    getShareUrl: (text, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    tier: 2,
    color: "#0A66C2",
    bgClass: "bg-[#0A66C2]/10",
    getShareUrl: (_text, url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "email",
    name: "Email",
    tier: 2,
    color: "#EA4335",
    bgClass: "bg-[#EA4335]/10",
    getShareUrl: (text, url) =>
      `mailto:?subject=${encodeURIComponent("SOS-Expat")}&body=${encodeURIComponent(text)}`,
  },
  // TIER 3 — Copy-first (Instagram, TikTok)
  {
    id: "instagram",
    name: "Instagram",
    tier: 3,
    color: "#E4405F",
    bgClass: "bg-gradient-to-br from-[#F58529]/10 to-[#DD2A7B]/10",
    getShareUrl: () => `https://www.instagram.com/`,
    copyFirst: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    tier: 3,
    color: "#000000",
    bgClass: "bg-white/10",
    getShareUrl: () => `https://www.tiktok.com/`,
    copyFirst: true,
  },
];

// ============================================================================
// HOOK
// ============================================================================

export function useViralKit(): UseViralKitReturn {
  const intl = useIntl();
  const { dashboardData, clientShareUrl, recruitmentShareUrl, providerShareUrl } = useChatterData();
  const { trackShare } = useChatterMissions();

  const [copied, setCopied] = useState(false);
  const [activeLinkType, setActiveLinkType] = useState<ShareLinkType>("client");
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory | "all">("all");
  const [selectedLanguage, setSelectedLanguage] = useState<"fr" | "en">("fr");

  // ── Links ──────────────────────────────────────────────────────────────

  const clientLink = clientShareUrl || "";
  const recruitmentLink = recruitmentShareUrl || "";
  const providerLink = providerShareUrl || "";

  const activeLink = useMemo(() => {
    switch (activeLinkType) {
      case "client": return clientLink;
      case "recruitment": return recruitmentLink;
      case "provider": return providerLink;
    }
  }, [activeLinkType, clientLink, recruitmentLink, providerLink]);

  const activeCode = useMemo(() => {
    const chatter = dashboardData?.chatter;
    if (!chatter) return "";
    switch (activeLinkType) {
      case "client": return chatter.affiliateCodeClient || "";
      case "recruitment": return chatter.affiliateCodeRecruitment || "";
      case "provider": return chatter.affiliateCodeProvider || "";
    }
  }, [activeLinkType, dashboardData]);

  // Legacy compat
  const referralCode = dashboardData?.chatter?.affiliateCodeRecruitment || "";
  const referralLink = recruitmentLink;

  // ── Messages (i18n) ────────────────────────────────────────────────────

  const earnings = dashboardData?.chatter?.totalEarned || 0;
  const earningsFormatted = `$${(earnings / 100).toFixed(0)}`;

  const shareMessages = useMemo((): CategorizedMessage[] => {
    const t = (id: string, fallback: string) =>
      intl.formatMessage({ id, defaultMessage: fallback });

    const processMsg = (text: string) =>
      text.replace(/\{link\}/g, activeLink).replace(/\{amount\}/g, earningsFormatted);

    return [
      // URGENT
      { category: "urgent", text: processMsg(t("chatter.share.message.urgent.1", "Offre limitée ! Deviens Chatter SOS-Expat et gagne des commissions dès aujourd'hui. Inscription gratuite : {link}")) },
      { category: "urgent", text: processMsg(t("chatter.share.message.urgent.2", "Dernière chance de rejoindre mon équipe ! Les places sont limitées. Inscris-toi maintenant : {link}")) },
      // EARNINGS
      { category: "earnings", text: processMsg(t("chatter.share.message.earnings.1", "J'ai gagné {amount} ce mois avec SOS-Expat ! Rejoins-moi : {link}")) },
      { category: "earnings", text: processMsg(t("chatter.share.message.earnings.2", "Gagne $10 par appel en aidant les expatriés ! C'est gratuit : {link}")) },
      // HELP
      { category: "help", text: processMsg(t("chatter.share.message.help.1", "Tu connais des expats qui galèrent ? Partage ce lien, ça les aide vraiment : {link}")) },
      { category: "help", text: processMsg(t("chatter.share.message.help.2", "Aide les expatriés à trouver un avocat rapidement. Partage : {link}")) },
      // PERSONAL
      { category: "personal", text: processMsg(t("chatter.share.message.personal.1", "Hey ! J'utilise SOS-Expat pour aider les expatriés et je gagne de l'argent. Regarde : {link}")) },
      { category: "personal", text: processMsg(t("chatter.share.message.personal.2", "Moi aussi j'étais expat et j'aurais aimé connaître ce service. Découvre : {link}")) },
      // PROFESSIONAL
      { category: "professional", text: processMsg(t("chatter.share.message.professional.1", "Opportunité : SOS-Expat recrute des Chatters. Commissions attractives, travail flexible. Détails : {link}")) },
      { category: "professional", text: processMsg(t("chatter.share.message.professional.2", "Programme d'affiliation SOS-Expat : $10/conversion, 0 investissement. Info : {link}")) },
    ];
  }, [intl, activeLink, earningsFormatted]);

  // Filter messages by category
  const filteredMessages = useMemo(() => {
    if (selectedCategory === "all") return shareMessages;
    return shareMessages.filter((m) => m.category === selectedCategory);
  }, [shareMessages, selectedCategory]);

  const selectedMessage = filteredMessages[selectedMessageIndex]?.text || "";

  // ── Platform tiers ─────────────────────────────────────────────────────

  const tier1Platforms = useMemo(() => PLATFORMS.filter((p) => p.tier === 1), []);
  const tier2Platforms = useMemo(() => PLATFORMS.filter((p) => p.tier === 2), []);
  const tier3Platforms = useMemo(() => PLATFORMS.filter((p) => p.tier === 3), []);

  // ── Clipboard ──────────────────────────────────────────────────────────

  const doCopy = useCallback(async (text: string) => {
    const success = await clipboardCopy(text);
    if (success) {
      setCopied(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const copyLink = useCallback(() => {
    try { trackMetaCustomEvent("CopyReferralLink", { type: activeLinkType }); } catch {}
    return doCopy(activeLink);
  }, [activeLink, activeLinkType, doCopy]);

  const copyCode = useCallback(() => {
    try { trackMetaCustomEvent("CopyReferralCode", { code: activeCode }); } catch {}
    return doCopy(activeCode);
  }, [activeCode, doCopy]);

  const copyMessage = useCallback((message: string) => doCopy(message), [doCopy]);

  // ── Share on platform ──────────────────────────────────────────────────

  // Build platform-specific message using dedicated i18n key if available
  const getPlatformMessage = useCallback((platformId: string, fallbackMessage: string): string => {
    // If platform has dedicated messages, use the category-specific i18n key
    if ((PLATFORMS_WITH_DEDICATED_MESSAGES as readonly string[]).includes(platformId)) {
      const category = selectedCategory !== "all" ? selectedCategory : "personal";
      const key = `chatter.share.platform.${platformId}.${category}`;
      const translated = intl.formatMessage({ id: key, defaultMessage: "__MISSING__" });
      if (translated !== "__MISSING__") {
        return translated
          .replace(/\{link\}/g, activeLink)
          .replace(/\{amount\}/g, earningsFormatted);
      }
    }
    // Apply format adapter (truncation for twitter/sms)
    const adapter = PLATFORM_FORMAT_ADAPTERS[platformId];
    return adapter ? adapter(fallbackMessage) : fallbackMessage;
  }, [intl, selectedCategory, activeLink, earningsFormatted]);

  const shareOn = useCallback((platformId: string, customMessage?: string) => {
    const platform = PLATFORMS.find((p) => p.id === platformId);
    if (!platform) return;

    // Use platform-optimized message or fallback to selected/custom message
    const baseMessage = customMessage || selectedMessage;
    const message = customMessage ? baseMessage : getPlatformMessage(platformId, baseMessage);

    // For Instagram/TikTok, copy link first then open app
    if (platform.copyFirst) {
      clipboardCopy(activeLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }

    const shareUrl = platform.getShareUrl(message, activeLink);
    window.open(shareUrl, "_blank", "noopener,noreferrer");

    // Analytics
    try {
      trackMetaCustomEvent("ShareReferralLink", { platform: platformId, linkType: activeLinkType });
      logAnalyticsEvent("share", { method: platformId, content_type: "referral_link" });
    } catch {}

    trackShare();
  }, [selectedMessage, activeLink, activeLinkType, trackShare]);

  // ── Web Share API (1-tap share) ────────────────────────────────────────

  const shareNative = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.share) return false;

    try {
      await navigator.share({
        title: "SOS-Expat",
        text: selectedMessage,
        url: activeLink,
      });

      // Analytics
      try {
        trackMetaCustomEvent("NativeShare", { linkType: activeLinkType });
        logAnalyticsEvent("share", { method: "native", content_type: "referral_link" });
      } catch {}

      trackShare();
      return true;
    } catch (err: unknown) {
      // AbortError = user cancelled → NOT an error, just return false
      if (err instanceof Error && err.name === "AbortError") {
        return false;
      }
      return false;
    }
  }, [selectedMessage, activeLink, activeLinkType, trackShare]);

  // ── Select message ─────────────────────────────────────────────────────

  const selectMessage = useCallback((index: number) => {
    if (index >= 0 && index < filteredMessages.length) {
      setSelectedMessageIndex(index);
    }
  }, [filteredMessages.length]);

  // ── QR code (legacy compat — now rendered client-side with qrcode.react) ──

  const generateQRCode = useCallback(() => {
    if (!activeLink) return "";
    // Legacy: return external API URL. New code uses QRCodeCanvas directly.
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(activeLink)}`;
  }, [activeLink]);

  // ── Build viral kit object (legacy compat) ─────────────────────────────

  const viralKit: ChatterViralKit = {
    referralLink: activeLink,
    referralCode: activeCode,
    shareMessages: {
      fr: shareMessages[0]?.text || "",
      en: shareMessages[0]?.text || "",
    },
    qrCodeUrl: generateQRCode(),
  };

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    // Links
    activeLinkType,
    setActiveLinkType,
    activeLink,
    activeCode,
    clientLink,
    recruitmentLink,
    providerLink,

    // Messages
    shareMessages,
    selectedMessage,
    selectedCategory,
    setSelectedCategory,
    filteredMessages,
    categories: ALL_CATEGORIES,

    // Platforms
    platforms: PLATFORMS,
    tier1Platforms,
    tier2Platforms,
    tier3Platforms,

    // State
    copied,

    // Actions
    copyLink,
    copyCode,
    copyMessage,
    shareOn,
    shareNative,
    selectMessage,

    // Legacy compat
    viralKit,
    referralLink,
    referralCode,
    generateQRCode,
    selectedLanguage,
    setSelectedLanguage,
  };
}

/**
 * Format referral link for display (shortened)
 */
export function formatReferralLink(link: string, maxLength: number = 40): string {
  if (link.length <= maxLength) return link;
  return link.substring(0, maxLength - 3) + "...";
}
