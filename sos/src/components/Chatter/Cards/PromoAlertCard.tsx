/**
 * PromoAlertCard — 2026 Design System
 *
 * Displays active promotion/hackathon alert with countdown.
 * Glassmorphism card with indigo/violet gradient.
 */

import React from "react";
import { useIntl } from "react-intl";
import { Zap, Clock, X } from "lucide-react";
import { ChatterActivePromotion } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";
import { UI, SPACING, ANIMATION } from "@/components/Chatter/designTokens";

interface PromoAlertCardProps {
  promotion: ChatterActivePromotion | null;
  onDismiss?: () => void;
}

export function PromoAlertCard({ promotion, onDismiss }: PromoAlertCardProps) {
  const { t } = useTranslation();
  const intl = useIntl();

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
      return t("chatter.referrals.timeRemaining.days", { days, hours });
    }
    if (hours > 0) {
      return t("chatter.referrals.timeRemaining.hours", { hours, minutes });
    }
    return t("chatter.referrals.timeRemaining.minutes", { minutes });
  };

  const multiplierDisplay = `x${promotion.multiplier}`;

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl overflow-hidden relative shadow-lg shadow-indigo-500/25">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full -translate-x-10"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full translate-x-16"></div>
      </div>

      <div className={`${SPACING.cardPadding} relative`}>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/20 transition-all ${ANIMATION.fast} ${SPACING.touchTarget}`}
            aria-label={intl.formatMessage({ id: 'chatter.promo.dismiss', defaultMessage: 'Dismiss' })}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Zap className="h-6 w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">{promotion.name}</h3>
              <span className="bg-yellow-400 text-yellow-900 font-bold text-xs px-2 py-0.5 rounded-full">
                {multiplierDisplay}
              </span>
            </div>

            <div className="flex items-center gap-2 text-white/80">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {t("chatter.referrals.endsIn")} {getTimeRemaining()}
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <p className="text-sm mt-3 text-indigo-100">
          {t("chatter.referrals.promoDescription", {
            multiplier: promotion.multiplier,
          })}
        </p>
      </div>
    </div>
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
    <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-between shadow-md shadow-indigo-500/20">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4" />
        <span className="font-medium">{promotion.name}</span>
        <span className="bg-yellow-400 text-yellow-900 font-bold text-xs px-2 py-0.5 rounded-full">
          x{promotion.multiplier}
        </span>
      </div>
      <span className="text-sm text-indigo-100">
        <Clock className="h-3 w-3 inline mr-1" />
        {t("chatter.referrals.active")}
      </span>
    </div>
  );
}
