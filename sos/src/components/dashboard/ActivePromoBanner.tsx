/**
 * m5 FIX: ActivePromoBanner
 * Shows providers when a promotional price is currently active for their service type.
 * Reads from admin_config/pricing overrides (same source as Pricing page).
 */

import React from "react";
import { usePricingConfig } from "@/services/pricingService";
import { Tag, Clock } from "lucide-react";
import { FormattedMessage } from "react-intl";

interface ActivePromoBannerProps {
  providerRole: "lawyer" | "expat";
}

const ActivePromoBanner: React.FC<ActivePromoBannerProps> = ({ providerRole }) => {
  const { pricing, loading } = usePricingConfig() as {
    pricing?: {
      lawyer: Record<string, { totalAmount: number }>;
      expat: Record<string, { totalAmount: number }>;
      overrides?: Record<string, Record<string, {
        enabled: boolean;
        totalAmount: number;
        label?: string;
        endsAt?: number | { seconds: number };
      }>>;
    };
    loading: boolean;
    error?: unknown;
  };

  if (loading || !pricing) return null;

  const overrides = pricing.overrides;
  if (!overrides) return null;

  const serviceOverrides = overrides[providerRole];
  if (!serviceOverrides) return null;

  // Check EUR override (primary currency)
  const eurOverride = serviceOverrides.eur;
  if (!eurOverride?.enabled) return null;

  // Check if override is still active (date-wise)
  const now = Date.now();
  if (eurOverride.endsAt) {
    const endsAtMs = typeof eurOverride.endsAt === "number"
      ? eurOverride.endsAt
      : eurOverride.endsAt.seconds * 1000;
    if (now > endsAtMs) return null;
  }

  const normalPrice = pricing[providerRole]?.eur?.totalAmount;
  const promoPrice = eurOverride.totalAmount;
  const label = eurOverride.label;

  // Format end date if available
  let endsAtText = "";
  if (eurOverride.endsAt) {
    const endsAtMs = typeof eurOverride.endsAt === "number"
      ? eurOverride.endsAt
      : eurOverride.endsAt.seconds * 1000;
    const endsAtDate = new Date(endsAtMs);
    endsAtText = endsAtDate.toLocaleDateString();
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-xl">
      <div className="flex items-start gap-3">
        <Tag className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-green-800 dark:text-green-300 text-sm">
            <FormattedMessage
              id="dashboard.promoBanner.title"
              defaultMessage="Prix promotionnel actif"
            />
          </h4>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            {label && <span className="font-medium">{label} — </span>}
            <FormattedMessage
              id="dashboard.promoBanner.description"
              defaultMessage="Vos clients paient actuellement {promoPrice}€ au lieu de {normalPrice}€"
              values={{
                promoPrice: (promoPrice / 100).toFixed(2),
                normalPrice: normalPrice ? (normalPrice / 100).toFixed(2) : "—",
              }}
            />
          </p>
          {endsAtText && (
            <p className="text-xs text-green-600 dark:text-green-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <FormattedMessage
                id="dashboard.promoBanner.endsAt"
                defaultMessage="Fin de la promotion : {date}"
                values={{ date: endsAtText }}
              />
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivePromoBanner;
