/**
 * ShareMessageSelector — 2026 Refonte
 *
 * Pre-written share messages organized by category (urgent, earnings, help, personal, professional).
 * Uses i18n for all messages. Chatters can select, edit, and copy/share.
 */

import React, { useState, useCallback } from "react";
import { Copy, Check, MessageSquare, Pencil, X } from "lucide-react";
import { useIntl } from "react-intl";
import { useViralKit, type MessageCategory } from "@/hooks/useViralKit";
import { UI, SPACING, ANIMATION } from "@/components/Chatter/designTokens";

// Category config with icons and colors
const CATEGORY_CONFIG: Record<MessageCategory, { icon: string; color: string }> = {
  urgent: { icon: "🔥", color: "border-red-500/50 bg-red-50 dark:bg-red-500/10" },
  earnings: { icon: "💰", color: "border-amber-500/50 bg-amber-50 dark:bg-amber-500/10" },
  help: { icon: "🤝", color: "border-blue-500/50 bg-blue-50 dark:bg-blue-500/10" },
  personal: { icon: "❤️", color: "border-violet-500/50 bg-violet-50 dark:bg-violet-500/10" },
  professional: { icon: "📢", color: "border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10" },
};

interface ShareMessageSelectorProps {
  showShareButtons?: boolean;
}

export const ShareMessageSelector = React.memo(function ShareMessageSelector({
  showShareButtons = true,
}: ShareMessageSelectorProps) {
  const intl = useIntl();
  const t = (id: string, defaultMessage: string) => intl.formatMessage({ id, defaultMessage });

  const {
    filteredMessages,
    selectedMessage,
    selectMessage,
    copyMessage,
    copied,
    shareOn,
    selectedCategory,
    setSelectedCategory,
    categories,
  } = useViralKit();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedText, setEditedText] = useState("");
  const [customMessages, setCustomMessages] = useState<Record<number, string>>({});

  const categoryOptions: { key: MessageCategory | "all"; labelId: string; defaultLabel: string }[] = [
    { key: "all", labelId: "chatter.share.category.all", defaultLabel: "Tous" },
    { key: "urgent", labelId: "chatter.share.category.urgent", defaultLabel: "Urgent" },
    { key: "earnings", labelId: "chatter.share.category.earnings", defaultLabel: "Gains" },
    { key: "help", labelId: "chatter.share.category.help", defaultLabel: "Aide" },
    { key: "personal", labelId: "chatter.share.category.personal", defaultLabel: "Personnel" },
    { key: "professional", labelId: "chatter.share.category.professional", defaultLabel: "Pro" },
  ];

  const handleStartEdit = useCallback((index: number, text: string) => {
    setEditingIndex(index);
    setEditedText(text);
  }, []);

  const handleSaveEdit = useCallback((index: number) => {
    if (editedText.trim()) {
      setCustomMessages((prev) => ({ ...prev, [index]: editedText.trim() }));
    }
    setEditingIndex(null);
  }, [editedText]);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditedText("");
  }, []);

  const getDisplayText = (index: number, originalText: string) =>
    customMessages[index] || originalText;

  return (
    <div className={`${UI.card} ${SPACING.cardPadding} space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
          <MessageSquare className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {t("chatter.referrals.shareMessages", "Messages de partage")}
        </h3>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {categoryOptions.map((cat) => {
          const isActive = selectedCategory === cat.key;
          const config = cat.key !== "all" ? CATEGORY_CONFIG[cat.key as MessageCategory] : null;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key);
                selectMessage(0);
                setCustomMessages({});
                setEditingIndex(null);
              }}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${ANIMATION.fast} ${SPACING.touchTarget} ${
                isActive
                  ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300/50 dark:border-indigo-500/30"
                  : "bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-white/10"
              }`}
            >
              {config && <span className="mr-1">{config.icon}</span>}
              {t(cat.labelId, cat.defaultLabel)}
            </button>
          );
        })}
      </div>

      {/* Message list */}
      <div className="space-y-2">
        {filteredMessages.map((message, index) => {
          const displayText = getDisplayText(index, message.text);
          const isSelected = displayText === selectedMessage;
          const isEditing = editingIndex === index;
          const catConfig = CATEGORY_CONFIG[message.category];

          return (
            <div
              key={`${selectedCategory}-${index}`}
              onClick={() => selectMessage(index)}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${ANIMATION.fast} ${
                isSelected
                  ? "border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
                  : "border-slate-200 dark:border-white/[0.08] hover:border-indigo-300/40 dark:hover:border-indigo-500/20"
              }`}
            >
              {/* Category badge */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${catConfig.color}`}>
                  {catConfig.icon} {t(`chatter.share.category.${message.category}`, message.category)}
                </span>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full p-2 text-sm bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700 dark:text-slate-300"
                    rows={3}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveEdit(index); }}
                      className={`${UI.button.primary} px-3 py-1.5 text-xs flex items-center gap-1 rounded-lg ${SPACING.touchTarget}`}
                    >
                      <Check className="h-3 w-3" />
                      {t("common.save", "Sauvegarder")}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                      className={`${UI.button.ghost} px-3 py-1.5 text-xs flex items-center gap-1 rounded-lg ${SPACING.touchTarget}`}
                    >
                      <X className="h-3 w-3" />
                      {t("common.cancel", "Annuler")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{displayText}</p>

                  {isSelected && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); copyMessage(displayText); }}
                        className={`${copied ? UI.button.primary : UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5 rounded-lg ${SPACING.touchTarget}`}
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? t("common.copied", "Copié !") : t("common.copy", "Copier")}
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(index, displayText); }}
                        className={`${UI.button.secondary} px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${SPACING.touchTarget}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("chatter.referrals.editMessage", "Modifier")}
                      </button>

                      {showShareButtons && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); shareOn("whatsapp", displayText); }}
                            className={`${UI.button.secondary} px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${SPACING.touchTarget}`}
                            style={{ borderColor: "#25D366", color: "#25D366" }}
                          >
                            WhatsApp
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); shareOn("telegram", displayText); }}
                            className={`${UI.button.secondary} px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${SPACING.touchTarget}`}
                            style={{ borderColor: "#0088cc", color: "#0088cc" }}
                          >
                            Telegram
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <p className={`text-xs ${UI.textMuted}`}>
        {t("chatter.referrals.messagesTip", "Sélectionnez un message et partagez-le")}
      </p>
    </div>
  );
});
