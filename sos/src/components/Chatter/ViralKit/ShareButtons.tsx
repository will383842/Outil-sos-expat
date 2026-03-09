/**
 * ShareButtons — 2026 Design System
 *
 * Social sharing buttons for referral link.
 * Glassmorphism cards with platform-colored accents.
 */

import React from "react";
import {
  MessageCircle,
  Send,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Globe,
  HelpCircle,
  Share2,
} from "lucide-react";
import { useViralKit } from "@/hooks/useViralKit";
import { useTranslation } from "@/hooks/useTranslation";
import { UI, SPACING, ANIMATION } from "@/components/Chatter/designTokens";

// Icon mapping
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  telegram: Send,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  reddit: Globe,
  quora: HelpCircle,
  email: Mail,
};

interface ShareButtonsProps {
  variant?: "full" | "icons-only";
  className?: string;
}

export function ShareButtons({
  variant = "full",
  className = "",
}: ShareButtonsProps) {
  const { t } = useTranslation();
  const { platforms, shareOn, selectedMessage } = useViralKit();

  if (variant === "icons-only") {
    return (
      <div className={`flex gap-2 ${className}`}>
        {platforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id] || Share2;
          return (
            <button
              key={platform.id}
              onClick={() => shareOn(platform.id)}
              style={{ borderColor: platform.color, color: platform.color }}
              className={`${UI.button.secondary} p-2.5 rounded-xl hover:opacity-80 transition-all ${ANIMATION.fast} active:scale-95 ${SPACING.touchTarget}`}
              title={platform.name}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {t("chatter.referrals.shareOn")}
      </h3>
      <div className="grid sm:grid-cols-3 gap-2">
        {platforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id] || Share2;
          return (
            <button
              key={platform.id}
              onClick={() => shareOn(platform.id)}
              className={`${UI.button.secondary} px-3 py-2.5 rounded-xl flex items-center gap-2 justify-start transition-all ${ANIMATION.fast} hover:shadow-sm active:scale-[0.97] ${SPACING.touchTarget}`}
              style={{ borderColor: platform.color }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" style={{ color: platform.color }} />
              <span className="text-sm text-slate-700 dark:text-slate-300">{platform.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Single share button for a specific platform
 */
export function ShareButton({
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
      className={`${UI.button.secondary} px-3 py-2.5 rounded-xl flex items-center gap-2 transition-all ${ANIMATION.fast} active:scale-[0.97] ${SPACING.touchTarget} ${className}`}
      style={{ borderColor: platform.color, color: platform.color }}
    >
      <Icon className="h-4 w-4" />
      {platform.name}
    </button>
  );
}
