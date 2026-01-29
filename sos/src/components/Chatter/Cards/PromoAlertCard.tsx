/**
 * PromoAlertCard
 *
 * Displays active promotion/hackathon alert with countdown.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, X } from "lucide-react";
import { ChatterActivePromotion } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";

interface PromoAlertCardProps {
  promotion: ChatterActivePromotion | null;
  onDismiss?: () => void;
}

export function PromoAlertCard({ promotion, onDismiss }: PromoAlertCardProps) {
  const { t } = useTranslation();

  if (!promotion) {
    return null;
  }

  // Calculate time remaining
  const getTimeRemaining = (): string => {
    const endDate = new Date(promotion.endsAt);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) return t("chatter.referrals.promoEnded");

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}j ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const multiplierDisplay = `x${promotion.multiplier}`;

  return (
    <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 overflow-hidden relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full -translate-x-10 -translate-y-10"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16 translate-y-16"></div>
      </div>

      <CardContent className="p-4 relative">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Zap className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">{promotion.name}</h3>
              <Badge className="bg-yellow-400 text-yellow-900 font-bold">
                {multiplierDisplay}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                {t("chatter.referrals.endsIn")} {getTimeRemaining()}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <p className="text-sm text-white/90 mt-3">
          {t("chatter.referrals.promoDescription", {
            multiplier: promotion.multiplier,
          })}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Compact promotion banner for dashboards
 */
export function PromoAlertBanner({
  promotion,
}: {
  promotion: ChatterActivePromotion | null;
}) {
  const { t } = useTranslation();

  if (!promotion) return null;

  return (
    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4" />
        <span className="font-medium">{promotion.name}</span>
        <Badge className="bg-yellow-400 text-yellow-900 font-bold text-xs">
          x{promotion.multiplier}
        </Badge>
      </div>
      <span className="text-sm text-white/80">
        <Clock className="h-3 w-3 inline mr-1" />
        {t("chatter.referrals.active")}
      </span>
    </div>
  );
}
