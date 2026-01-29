/**
 * PioneerBadgeCard
 *
 * Displays early adopter (Pioneer) status badge with country.
 * Shows special +50% lifetime bonus indicator.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Sparkles, MapPin } from "lucide-react";
import { ChatterEarlyAdopterStatus } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";
import { getCountryFlag } from "@/hooks/useEarlyAdopters";

interface PioneerBadgeCardProps {
  earlyAdopter: ChatterEarlyAdopterStatus;
  variant?: "compact" | "full";
}

export function PioneerBadgeCard({
  earlyAdopter,
  variant = "full",
}: PioneerBadgeCardProps) {
  const { t } = useTranslation();

  if (!earlyAdopter.isEarlyAdopter) {
    return null;
  }

  const countryFlag = earlyAdopter.country
    ? getCountryFlag(earlyAdopter.country)
    : "";

  if (variant === "compact") {
    return (
      <Badge
        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1"
      >
        <Award className="h-3 w-3" />
        Pioneer {countryFlag}
        <span className="text-xs opacity-90">+50%</span>
      </Badge>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Badge icon */}
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Award className="h-8 w-8 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-amber-900">
                {t("chatter.referrals.pioneerBadge")}
              </h3>
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>

            {earlyAdopter.country && (
              <div className="flex items-center gap-1 text-sm text-amber-700 mb-2">
                <MapPin className="h-3 w-3" />
                <span>
                  {countryFlag} {t(`countries.${earlyAdopter.country}`)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-amber-200 text-amber-800 font-bold"
              >
                +{((earlyAdopter.multiplier - 1) * 100).toFixed(0)}%{" "}
                {t("chatter.referrals.lifetimeBonus")}
              </Badge>
            </div>

            <p className="text-xs text-amber-600 mt-2">
              {t("chatter.referrals.pioneerDescription")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact pioneer indicator for headers/lists
 */
export function PioneerIndicator({ country }: { country: string | null }) {
  if (!country) return null;

  const flag = getCountryFlag(country);

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
      title="Early Adopter Pioneer"
    >
      <Award className="h-3 w-3" />
      {flag}
    </span>
  );
}
