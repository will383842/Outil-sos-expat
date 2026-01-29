/**
 * ShareButtons
 *
 * Social sharing buttons for referral link.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Send,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Share2,
} from "lucide-react";
import { useViralKit } from "@/hooks/useViralKit";
import { useTranslation } from "@/hooks/useTranslation";

// Icon mapping
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  telegram: Send,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
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
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {platforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id] || Share2;
          return (
            <Button
              key={platform.id}
              variant="outline"
              size="icon"
              onClick={() => shareOn(platform.id)}
              style={{ borderColor: platform.color, color: platform.color }}
              className="hover:opacity-80 transition-opacity"
              title={platform.name}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">
        {t("chatter.referrals.shareOn")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {platforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id] || Share2;
          return (
            <Button
              key={platform.id}
              variant="outline"
              onClick={() => shareOn(platform.id)}
              className="gap-2 justify-start"
              style={{ borderColor: platform.color }}
            >
              <Icon className="h-4 w-4" style={{ color: platform.color }} />
              <span className="text-sm">{platform.name}</span>
            </Button>
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
    <Button
      variant="outline"
      onClick={() => shareOn(platformId, customMessage)}
      className={`gap-2 ${className}`}
      style={{ borderColor: platform.color, color: platform.color }}
    >
      <Icon className="h-4 w-4" />
      {platform.name}
    </Button>
  );
}
