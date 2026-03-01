/**
 * useViralKit Hook
 *
 * Provides viral marketing tools for chatters:
 * - Referral links
 * - Share messages
 * - Social sharing
 * - QR code generation
 */

import { useState, useCallback, useMemo } from "react";
import { useChatter } from "@/hooks/useChatter";
import { useChatterMissions } from "@/hooks/useChatterMissions";
import { ChatterViralKit } from "@/types/chatter";
import { trackMetaCustomEvent } from "@/utils/metaPixel";
import { logAnalyticsEvent } from "@/config/firebase";

interface SharePlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  getShareUrl: (text: string, url: string) => string;
}

interface UseViralKitReturn {
  // Data
  viralKit: ChatterViralKit | null;
  referralLink: string;
  referralCode: string;

  // Share messages
  shareMessages: {
    fr: string[];
    en: string[];
  };
  selectedMessage: string;

  // Platforms
  platforms: SharePlatform[];

  // State
  copied: boolean;
  selectedLanguage: "fr" | "en";

  // Actions
  copyLink: () => Promise<void>;
  copyCode: () => Promise<void>;
  copyMessage: (message: string) => Promise<void>;
  shareOn: (platformId: string, customMessage?: string) => void;
  setSelectedLanguage: (lang: "fr" | "en") => void;
  selectMessage: (index: number) => void;
  generateQRCode: () => string;
}

// Pre-defined share messages
const SHARE_MESSAGES = {
  fr: [
    "Je gagne de l'argent en aidant les expatries a trouver des avocats! Rejoins-moi et gagne aussi: {link}",
    "Tu veux un revenu complementaire? Deviens Chatter SOS-Expat comme moi! Inscription gratuite: {link}",
    "SOS-Expat m'a permis de gagner {amount} ce mois. Rejoins mon equipe: {link}",
    "Aide les expatries et gagne des commissions! C'est simple et gratuit. Mon lien: {link}",
  ],
  en: [
    "I'm earning money helping expats find lawyers! Join me and earn too: {link}",
    "Want extra income? Become an SOS-Expat Chatter like me! Free signup: {link}",
    "SOS-Expat helped me earn {amount} this month. Join my team: {link}",
    "Help expats and earn commissions! It's simple and free. My link: {link}",
  ],
};

// Social platforms configuration
const PLATFORMS: SharePlatform[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: "MessageCircle",
    color: "#25D366",
    getShareUrl: (text, url) =>
      `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: "Send",
    color: "#0088cc",
    getShareUrl: (text, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "Facebook",
    color: "#1877F2",
    getShareUrl: (text, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
  },
  {
    id: "twitter",
    name: "Twitter/X",
    icon: "Twitter",
    color: "#1DA1F2",
    getShareUrl: (text, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "Linkedin",
    color: "#0A66C2",
    getShareUrl: (text, url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "email",
    name: "Email",
    icon: "Mail",
    color: "#EA4335",
    getShareUrl: (text, url) =>
      `mailto:?subject=${encodeURIComponent("Rejoins SOS-Expat Chatters!")}&body=${encodeURIComponent(text)}`,
  },
];

export function useViralKit(): UseViralKitReturn {
  const { dashboardData } = useChatter();
  const { trackShare } = useChatterMissions();
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"fr" | "en">("fr");
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);

  // Build referral link
  const referralCode = dashboardData?.chatter?.affiliateCodeRecruitment || "";
  const referralLink = useMemo(() => {
    if (!referralCode) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/devenir-chatter?ref=${referralCode}`;
  }, [referralCode]);

  // Process messages with placeholders
  const processedMessages = useMemo(() => {
    const earnings = dashboardData?.chatter?.totalEarned || 0;
    const earningsFormatted = `$${(earnings / 100).toFixed(0)}`;

    const process = (messages: string[]) =>
      messages.map((msg) =>
        msg.replace("{link}", referralLink).replace("{amount}", earningsFormatted)
      );

    return {
      fr: process(SHARE_MESSAGES.fr),
      en: process(SHARE_MESSAGES.en),
    };
  }, [referralLink, dashboardData]);

  const selectedMessage = processedMessages[selectedLanguage][selectedMessageIndex] || "";

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const copyLink = () => {
    // P1-5 FIX: Track copy link event
    try { trackMetaCustomEvent("CopyReferralLink", { referralCode }); } catch {}
    return copyToClipboard(referralLink);
  };
  const copyCode = () => {
    try { trackMetaCustomEvent("CopyReferralCode", { referralCode }); } catch {}
    return copyToClipboard(referralCode);
  };
  const copyMessage = (message: string) => copyToClipboard(message);

  // Share on platform
  const shareOn = (platformId: string, customMessage?: string) => {
    const platform = PLATFORMS.find((p) => p.id === platformId);
    if (!platform) return;

    const message = customMessage || selectedMessage;
    const shareUrl = platform.getShareUrl(message, referralLink);

    window.open(shareUrl, "_blank", "noopener,noreferrer");

    // P1-5 FIX: Track share event for analytics
    try {
      trackMetaCustomEvent("ShareReferralLink", {
        platform: platformId,
        referralCode,
      });
      logAnalyticsEvent("share", { method: platformId, content_type: "referral_link" });
    } catch {
      // Analytics tracking should never break the app
    }

    // Track share for daily missions
    trackShare();
  };

  // Select message
  const selectMessage = (index: number) => {
    if (index >= 0 && index < processedMessages[selectedLanguage].length) {
      setSelectedMessageIndex(index);
    }
  };

  // Generate QR code URL (using a free QR code API)
  const generateQRCode = useCallback(() => {
    if (!referralLink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referralLink)}`;
  }, [referralLink]);

  // Build viral kit object
  const viralKit: ChatterViralKit = {
    referralLink,
    referralCode,
    shareMessages: {
      fr: processedMessages.fr[0] || "",
      en: processedMessages.en[0] || "",
    },
    qrCodeUrl: generateQRCode(),
  };

  return {
    viralKit,
    referralLink,
    referralCode,
    shareMessages: processedMessages,
    selectedMessage,
    platforms: PLATFORMS,
    copied,
    selectedLanguage,
    copyLink,
    copyCode,
    copyMessage,
    shareOn,
    setSelectedLanguage,
    selectMessage,
    generateQRCode,
  };
}

/**
 * Format referral link for display (shortened)
 */
export function formatReferralLink(link: string, maxLength: number = 40): string {
  if (link.length <= maxLength) return link;
  return link.substring(0, maxLength - 3) + "...";
}
