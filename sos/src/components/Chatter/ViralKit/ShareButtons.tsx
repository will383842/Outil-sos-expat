/**
 * ShareButtons — 2026 Refonte
 *
 * Social sharing buttons for referral links.
 * 10 platforms in 2 tiers: WhatsApp, Messenger, Telegram, SMS, Facebook, X, LinkedIn, Email, Instagram, TikTok.
 * Uses useViralKit() for platform config and share actions.
 */

import React from "react";
import {
  MessageCircle,
  Send,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Smartphone,
  Share2,
  Instagram,
  Music2,
} from "lucide-react";
import { useViralKit, type SharePlatform } from "@/hooks/useViralKit";
import { useIntl } from "react-intl";
import { UI, SPACING, ANIMATION } from "@/components/Chatter/designTokens";

// Icon mapping
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  telegram: Send,
  sms: Smartphone,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  email: Mail,
  instagram: Instagram,
  tiktok: Music2,
};

interface ShareButtonsProps {
  variant?: "full" | "icons-only" | "compact";
  className?: string;
  /** If provided, only show platforms in these tiers */
  tiers?: (1 | 2 | 3)[];
}

export const ShareButtons = React.memo(function ShareButtons({
  variant = "full",
  className = "",
  tiers,
}: ShareButtonsProps) {
  const intl = useIntl();
  const { platforms, shareOn } = useViralKit();

  const filteredPlatforms = tiers
    ? platforms.filter((p) => tiers.includes(p.tier))
    : platforms;

  if (variant === "icons-only") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {filteredPlatforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id] || Share2;
          return (
            <button
              key={platform.id}
              onClick={() => shareOn(platform.id)}
              style={{ color: platform.color }}
              className={`p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all ${ANIMATION.fast} active:scale-95 ${SPACING.touchTarget}`}
              title={platform.name}
              aria-label={`${intl.formatMessage({ id: "chatter.referrals.shareOn", defaultMessage: "Partager sur" })} ${platform.name}`}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`grid grid-cols-4 gap-2 ${className}`}>
        {filteredPlatforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id] || Share2;
          return (
            <button
              key={platform.id}
              onClick={() => shareOn(platform.id)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl ${platform.bgClass} border border-white/[0.06] hover:border-white/[0.1] transition-all active:scale-95`}
            >
              <Icon className="h-5 w-5" style={{ color: platform.color }} />
              <span className="text-[10px] text-white/50 font-medium">{platform.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Full variant — 2 rows
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {intl.formatMessage({ id: "chatter.referrals.shareOn", defaultMessage: "Partager sur" })}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {filteredPlatforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id] || Share2;
          return (
            <button
              key={platform.id}
              onClick={() => shareOn(platform.id)}
              className={`px-3 py-2.5 rounded-xl flex items-center gap-2 justify-start bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all ${ANIMATION.fast} active:scale-[0.97] ${SPACING.touchTarget}`}
              aria-label={`${intl.formatMessage({ id: "chatter.referrals.shareOn", defaultMessage: "Partager sur" })} ${platform.name}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" style={{ color: platform.color }} />
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{platform.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

/**
 * Single share button for a specific platform
 */
export const ShareButton = React.memo(function ShareButton({
  platformId,
  customMessage,
  className = "",
}: {
  platformId: string;
  customMessage?: string;
  className?: string;
}) {
  const { platforms, shareOn } = useViralKit();
  const platform = platforms.find((p) => p.id === platformId);

  if (!platform) return null;

  const Icon = PLATFORM_ICONS[platformId] || Share2;

  return (
    <button
      onClick={() => shareOn(platformId, customMessage)}
      className={`px-3 py-2.5 rounded-xl flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all ${ANIMATION.fast} active:scale-[0.97] ${SPACING.touchTarget} ${className}`}
      style={{ borderColor: platform.color, color: platform.color }}
    >
      <Icon className="h-4 w-4" />
      {platform.name}
    </button>
  );
});
