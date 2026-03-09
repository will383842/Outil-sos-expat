/**
 * ReferralLinkCard — 2026 Refonte
 *
 * Displays active referral link with toggle between client/recruitment/provider.
 * Gradient card with glassmorphism and indigo/violet accents.
 */

import React from "react";
import { Link, Copy, Check, ExternalLink, Users, UserPlus, Briefcase } from "lucide-react";
import { useViralKit, formatReferralLink, type ShareLinkType } from "@/hooks/useViralKit";
import { useIntl } from "react-intl";
import { UI, ANIMATION, SPACING } from "@/components/Chatter/designTokens";

interface ReferralLinkCardProps {
  variant?: "full" | "compact";
}

const LINK_OPTIONS: { type: ShareLinkType; icon: React.ElementType; labelId: string; defaultLabel: string }[] = [
  { type: "client", icon: Users, labelId: "chatter.share.hub.clientLink", defaultLabel: "Client" },
  { type: "recruitment", icon: UserPlus, labelId: "chatter.share.hub.recruitmentLink", defaultLabel: "Recrutement" },
  { type: "provider", icon: Briefcase, labelId: "chatter.share.hub.providerLink", defaultLabel: "Provider" },
];

export const ReferralLinkCard = React.memo(function ReferralLinkCard({ variant = "full" }: ReferralLinkCardProps) {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) => intl.formatMessage({ id, defaultMessage });
  const {
    activeLink,
    activeCode,
    activeLinkType,
    setActiveLinkType,
    copied,
    copyLink,
    copyCode,
  } = useViralKit();

  if (!activeLink && variant === "compact") return null;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 p-3 bg-white/80 dark:bg-white/[0.04] backdrop-blur-lg border border-slate-200/60 dark:border-white/[0.08] rounded-xl">
        <Link className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
        <span className="flex-1 text-sm font-mono truncate text-slate-700 dark:text-slate-300">
          {formatReferralLink(activeLink, 30)}
        </span>
        <button
          onClick={copyLink}
          className={`${UI.button.secondary} p-2 rounded-lg ${SPACING.touchTarget}`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/25">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Link className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg">
          {t("chatter.referrals.yourReferralLink", "Votre lien")}
        </span>
      </div>

      {/* Link type toggle */}
      <div className="flex gap-1 p-1 bg-white/10 backdrop-blur-sm rounded-xl mb-4">
        {LINK_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeLinkType === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => setActiveLinkType(opt.type)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium rounded-lg transition-all ${ANIMATION.fast} ${
                isActive
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(opt.labelId, opt.defaultLabel)}
            </button>
          );
        })}
      </div>

      {/* Link input with copy */}
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/10">
        <input
          type="text"
          readOnly
          value={activeLink || "..."}
          className="flex-1 bg-transparent text-white font-mono text-sm outline-none"
        />
        <button
          onClick={copyLink}
          className={`bg-white text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-50 transition-all ${ANIMATION.fast} active:scale-95 ${SPACING.touchTarget}`}
          title={t("common.copy", "Copier")}
        >
          {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <a
          href={activeLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 bg-white text-indigo-600 font-semibold py-3 px-4 rounded-xl hover:bg-indigo-50 transition-all ${ANIMATION.fast} active:scale-[0.97] flex items-center justify-center gap-2 ${SPACING.touchTarget}`}
        >
          <ExternalLink className="w-5 h-5" />
          {t("chatter.referrals.previewLink", "Voir la page")}
        </a>
        <button
          onClick={copyLink}
          className={`flex-1 bg-white/15 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/25 border border-white/10 transition-all ${ANIMATION.fast} active:scale-[0.97] flex items-center justify-center gap-2 ${SPACING.touchTarget}`}
        >
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          {copied ? t("common.copied", "Copié !") : t("common.copy", "Copier le lien")}
        </button>
      </div>

      {/* Affiliate Code */}
      {activeCode && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <label className="text-indigo-100 text-xs font-medium mb-2 block uppercase tracking-wider">
            {t("chatter.referrals.codeLabel", "Votre code")}
          </label>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2 bg-white/15 rounded-lg font-mono text-xl text-white font-bold">
              {activeCode}
            </div>
            <button
              onClick={copyCode}
              className={`bg-white text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-50 transition-all ${ANIMATION.fast} active:scale-95`}
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <p className="text-indigo-100 text-sm mt-4">
        {t("chatter.referrals.shareLinkDesc", "Partagez ce lien pour gagner des commissions.")}
      </p>
    </div>
  );
});
