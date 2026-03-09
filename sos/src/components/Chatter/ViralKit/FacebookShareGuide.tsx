/**
 * FacebookShareGuide — Facebook Sharing Options Modal (2026)
 *
 * Bottom-sheet (mobile) / centered modal (desktop) presenting 4 Facebook sharing options:
 * 1. Profile — opens Facebook sharer
 * 2. Group — copies message, opens groups page, shows tips
 * 3. Page — opens Facebook sharer for pages
 * 4. Messenger — opens Messenger dialog
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useIntl } from "react-intl";
import {
  X,
  User,
  Users,
  Building2,
  MessageCircle,
  Copy,
  Check,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { ANIMATION } from "@/components/Chatter/designTokens";
import { copyToClipboard as clipboardCopy } from "@/utils/clipboard";
import { lockScroll, unlockScroll } from "@/utils/scrollLockManager";

// ============================================================================
// TYPES
// ============================================================================

interface FacebookShareGuideProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  shareMessage: string;
}

interface ShareOption {
  id: "profile" | "group" | "page" | "messenger";
  icon: React.ElementType;
  titleId: string;
  defaultTitle: string;
  subtitleId: string;
  defaultSubtitle: string;
}

// ============================================================================
// CONFIG
// ============================================================================

const SHARE_OPTIONS: ShareOption[] = [
  {
    id: "profile",
    icon: User,
    titleId: "chatter.share.facebook.profile.title",
    defaultTitle: "Sur mon profil",
    subtitleId: "chatter.share.facebook.profile.subtitle",
    defaultSubtitle: "Publiez sur votre fil d'actualité",
  },
  {
    id: "group",
    icon: Users,
    titleId: "chatter.share.facebook.group.title",
    defaultTitle: "Dans un groupe",
    subtitleId: "chatter.share.facebook.group.subtitle",
    defaultSubtitle: "Partagez dans les groupes d'expatriés",
  },
  {
    id: "page",
    icon: Building2,
    titleId: "chatter.share.facebook.page.title",
    defaultTitle: "Sur ma page",
    subtitleId: "chatter.share.facebook.page.subtitle",
    defaultSubtitle: "Publiez depuis votre page Facebook",
  },
  {
    id: "messenger",
    icon: MessageCircle,
    titleId: "chatter.share.facebook.messenger.title",
    defaultTitle: "Via Messenger",
    subtitleId: "chatter.share.facebook.messenger.subtitle",
    defaultSubtitle: "Envoyez en message privé",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const FacebookShareGuide: React.FC<FacebookShareGuideProps> = ({
  isOpen,
  onClose,
  shareUrl,
  shareMessage,
}) => {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id, defaultMessage });

  const [showGroupTips, setShowGroupTips] = useState(false);
  const [copiedForGroup, setCopiedForGroup] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showGroupTips) {
          setShowGroupTips(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, showGroupTips]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setShowGroupTips(false);
      setCopiedForGroup(false);
    }
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  const handleOptionClick = useCallback(
    async (optionId: ShareOption["id"]) => {
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedMessage = encodeURIComponent(shareMessage);

      switch (optionId) {
        case "profile":
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,
            "_blank",
            "noopener,noreferrer"
          );
          onClose();
          break;

        case "group":
          // Copy message to clipboard first, then show tips
          await clipboardCopy(shareMessage);
          setCopiedForGroup(true);
          setShowGroupTips(true);
          setTimeout(() => setCopiedForGroup(false), 3000);
          break;

        case "page":
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,
            "_blank",
            "noopener,noreferrer"
          );
          onClose();
          break;

        case "messenger":
          window.open(
            `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=&redirect_uri=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
            "_blank",
            "noopener,noreferrer"
          );
          onClose();
          break;
      }
    },
    [shareUrl, shareMessage, onClose]
  );

  const handleOpenGroups = useCallback(() => {
    window.open("https://www.facebook.com/groups/", "_blank", "noopener,noreferrer");
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end lg:items-center lg:justify-center ${ANIMATION.fadeIn}`}
      role="dialog"
      aria-modal="true"
      aria-label={t("chatter.share.facebook.title", "Partager sur Facebook")}
    >
      <div
        className={`w-full lg:max-w-md max-h-[85vh] bg-[#0F0F1A] border-t lg:border border-white/10 rounded-t-3xl lg:rounded-2xl overflow-y-auto overscroll-contain ${ANIMATION.slideUp}`}
      >
        {/* Grabber bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            {showGroupTips && (
              <button
                onClick={() => setShowGroupTips(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-white/60 rotate-180" />
              </button>
            )}
            <h2 className="text-lg font-bold text-white">
              {showGroupTips
                ? t("chatter.share.facebook.groupTips.title", "Conseils groupes")
                : t("chatter.share.facebook.title", "Partager sur Facebook")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label={t("common.close", "Fermer")}
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-3">
          {showGroupTips ? (
            /* ── Group Tips Section ────────────────────────── */
            <>
              {/* Copied confirmation */}
              <div
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                  copiedForGroup
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-white/[0.03] border-white/[0.06]"
                }`}
              >
                {copiedForGroup ? (
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                )}
                <span className="text-sm text-white/70">
                  {copiedForGroup
                    ? t("chatter.share.facebook.groupTips.copied", "Message copie dans le presse-papier !")
                    : t("chatter.share.facebook.groupTips.readyToPaste", "Message pret a coller")}
                </span>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {t(
                      "chatter.share.facebook.groupTips.tip1",
                      "Publiez dans 3-5 groupes d'expatries par jour"
                    )}
                  </p>
                </div>

                <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <p className="text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">
                    {t(
                      "chatter.share.facebook.groupTips.suggestedGroups",
                      "Groupes suggeres"
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      t("chatter.share.facebook.groupTips.group1", "Expatries [pays]"),
                      t("chatter.share.facebook.groupTips.group2", "Francais a l'etranger"),
                      t("chatter.share.facebook.groupTips.group3", "Expats in [city]"),
                      t("chatter.share.facebook.groupTips.group4", "Communaute [pays]"),
                    ].map((group, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full"
                      >
                        {group}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/80 leading-relaxed">
                    {t(
                      "chatter.share.facebook.groupTips.warning",
                      "Ne spammez pas, apportez de la valeur. Adaptez votre message au groupe."
                    )}
                  </p>
                </div>
              </div>

              {/* Open Groups button */}
              <button
                onClick={handleOpenGroups}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1877F2]/20 text-[#1877F2] font-medium text-sm rounded-xl border border-[#1877F2]/20 hover:bg-[#1877F2]/30 transition-all active:scale-[0.97]"
              >
                <Users className="w-4 h-4" />
                {t(
                  "chatter.share.facebook.groupTips.openGroups",
                  "Ouvrir mes groupes Facebook"
                )}
              </button>
            </>
          ) : (
            /* ── Share Options Cards ──────────────────────── */
            <>
              {SHARE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionClick(option.id)}
                    className={`w-full flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] hover:border-white/[0.1] transition-all ${ANIMATION.fast} active:scale-[0.98] text-left`}
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#1877F2]/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#1877F2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {t(option.titleId, option.defaultTitle)}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {t(option.subtitleId, option.defaultSubtitle)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacebookShareGuide;
