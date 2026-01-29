/**
 * CountryCounter
 *
 * Single country early adopter counter display.
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, Check, X } from "lucide-react";
import { ChatterEarlyAdopterCounter } from "@/types/chatter";
import {
  getCountryFlag,
  formatRemainingSlots,
  getUrgencyLevel,
} from "@/hooks/useEarlyAdopters";
import { useTranslation } from "@/hooks/useTranslation";

interface CountryCounterProps {
  counter: ChatterEarlyAdopterCounter;
  variant?: "card" | "row" | "compact";
  locale?: "fr" | "en";
}

export function CountryCounter({
  counter,
  variant = "card",
  locale = "fr",
}: CountryCounterProps) {
  const { t } = useTranslation();

  const flag = getCountryFlag(counter.countryCode);
  const progressPercent = Math.round(
    (counter.currentCount / counter.maxEarlyAdopters) * 100
  );
  const urgency = getUrgencyLevel(
    counter.remainingSlots,
    counter.maxEarlyAdopters
  );

  const urgencyColors = {
    none: "bg-gray-200",
    low: "bg-green-500",
    medium: "bg-yellow-500",
    high: "bg-red-500",
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 p-2">
        <span className="text-2xl">{flag}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{counter.countryName}</p>
          <p className="text-xs text-gray-500">
            {formatRemainingSlots(counter.remainingSlots, locale)}
          </p>
        </div>
        {!counter.isOpen && (
          <Badge variant="secondary" className="text-xs">
            <X className="h-3 w-3 mr-1" />
            {t("pioneers.full")}
          </Badge>
        )}
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className="flex items-center gap-4 p-3 border-b last:border-0">
        <span className="text-3xl">{flag}</span>
        <div className="flex-1">
          <p className="font-medium">{counter.countryName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {counter.currentCount}/{counter.maxEarlyAdopters}
            </span>
          </div>
        </div>
        <div className="text-right">
          {counter.isOpen ? (
            <>
              <p className="font-bold text-lg">{counter.remainingSlots}</p>
              <p className="text-xs text-gray-500">
                {t("pioneers.spotsLeft")}
              </p>
            </>
          ) : (
            <Badge variant="secondary">
              <Check className="h-3 w-3 mr-1" />
              {t("pioneers.complete")}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <Card
      className={`overflow-hidden ${
        !counter.isOpen ? "opacity-75" : ""
      } ${urgency === "high" ? "ring-2 ring-red-500" : ""}`}
    >
      {urgency === "high" && counter.isOpen && (
        <div className="bg-red-500 text-white text-xs text-center py-1 flex items-center justify-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t("pioneers.almostFull")}
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-4xl">{flag}</span>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{counter.countryName}</h3>

            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">{t("pioneers.pioneers")}</span>
                <span>
                  {counter.currentCount}/{counter.maxEarlyAdopters}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="mt-3 flex items-center justify-between">
              {counter.isOpen ? (
                <>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {counter.remainingSlots}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("pioneers.spotsRemaining")}
                    </p>
                  </div>
                  {urgency !== "none" && (
                    <Badge
                      className={`${urgencyColors[urgency]} text-white`}
                    >
                      {urgency === "high"
                        ? t("pioneers.lastSpots")
                        : urgency === "medium"
                        ? t("pioneers.limitedSpots")
                        : t("pioneers.available")}
                    </Badge>
                  )}
                </>
              ) : (
                <Badge variant="secondary" className="w-full justify-center">
                  <Check className="h-4 w-4 mr-1" />
                  {t("pioneers.complete")}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
