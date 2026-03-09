/**
 * ShareMessageSelector — 2026 Design System
 *
 * Pre-written share messages by language with copy/share functionality.
 * Glassmorphism card with indigo/violet accents.
 */

import React from "react";
import { Copy, Check, MessageSquare, MessageCircle, Send } from "lucide-react";
import { useViralKit } from "@/hooks/useViralKit";
import { useTranslation } from "@/hooks/useTranslation";
import { UI, SPACING, ANIMATION } from "@/components/Chatter/designTokens";

interface ShareMessageSelectorProps {
  showShareButtons?: boolean;
}

export function ShareMessageSelector({
  showShareButtons = true,
}: ShareMessageSelectorProps) {
  const { t } = useTranslation();
  const {
    shareMessages,
    selectedLanguage,
    setSelectedLanguage,
    selectedMessage,
    selectMessage,
    copyMessage,
    copied,
    shareOn,
  } = useViralKit();

  const messages = shareMessages[selectedLanguage] || [];
  const languages = [
    { key: "fr" as const, label: "Français" },
    { key: "en" as const, label: "English" },
  ];

  return (
    <div className={`${UI.card} ${SPACING.cardPadding} space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
          <MessageSquare className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {t("chatter.referrals.shareMessages")}
        </h3>
      </div>

      {/* Language tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.05] rounded-xl">
        {languages.map((lang) => (
          <button
            key={lang.key}
            onClick={() => setSelectedLanguage(lang.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${ANIMATION.fast} ${
              selectedLanguage === lang.key
                ? "bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="space-y-2">
        {messages.map((message, index) => {
          const isSelected =
            message === selectedMessage ||
            messages.indexOf(selectedMessage) === index;

          return (
            <div
              key={index}
              onClick={() => selectMessage(index)}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${ANIMATION.fast} ${
                isSelected
                  ? "border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
                  : "border-slate-200 dark:border-white/[0.08] hover:border-indigo-300/40 dark:hover:border-indigo-500/20"
              }`}
            >
              <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>

              {isSelected && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyMessage(message);
                    }}
                    className={`${copied ? UI.button.primary : UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5 rounded-lg ${SPACING.touchTarget}`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        {t("common.copied")}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        {t("common.copy")}
                      </>
                    )}
                  </button>

                  {showShareButtons && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareOn("whatsapp", message);
                        }}
                        className={`${UI.button.secondary} px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${SPACING.touchTarget}`}
                        style={{ borderColor: "#25D366", color: "#25D366" }}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareOn("telegram", message);
                        }}
                        className={`${UI.button.secondary} px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${SPACING.touchTarget}`}
                        style={{ borderColor: "#0088cc", color: "#0088cc" }}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Telegram
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <p className={`text-xs ${UI.textMuted}`}>
        {t("chatter.referrals.messagesTip")}
      </p>
    </div>
  );
}
