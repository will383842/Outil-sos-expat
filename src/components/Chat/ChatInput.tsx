/**
 * =============================================================================
 * CHAT INPUT COMPONENT - Mobile-First
 * Auto-resizing textarea with send button and keyboard shortcuts
 * =============================================================================
 *
 * Optimisations mobile :
 * - Font size 16px minimum (évite zoom iOS)
 * - Touch target 44px minimum
 * - iOS keyboard safe area
 * - Masque le hint sur mobile (économie d'espace)
 * - Support du clavier iOS/Android
 */

import { memo, useRef, useEffect, useCallback, forwardRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMediaQuery";

// =============================================================================
// TYPES
// =============================================================================

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
  maxHeight?: number;
  showHint?: boolean;
  /** Activer l'envoi automatique sur Enter (desktop) */
  submitOnEnter?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

const ChatInputComponent = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      value,
      onChange,
      onSend,
      disabled = false,
      placeholder = "Tapez votre message...",
      isLoading = false,
      className,
      maxHeight = 120,
      showHint = true,
      submitOnEnter = true,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const isMobile = useIsMobile();

    // Auto-resize textarea based on content
    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        // Reset height to auto to get proper scrollHeight
        textarea.style.height = "auto";
        // Set new height, capped at maxHeight
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value, maxHeight, textareaRef]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Sur mobile, ne pas intercepter Enter (permet retour à la ligne natif)
        // Sur desktop, Enter to send, Shift+Enter for new line
        if (e.key === "Enter" && !e.shiftKey && submitOnEnter && !isMobile) {
          e.preventDefault();
          if (!disabled && !isLoading && value.trim()) {
            onSend();
          }
        }
      },
      [disabled, isLoading, value, onSend, submitOnEnter, isMobile]
    );

    // Handle input change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
      },
      [onChange]
    );

    // Handle send button click
    const handleSendClick = useCallback(() => {
      if (!disabled && !isLoading && value.trim()) {
        onSend();
      }
    }, [disabled, isLoading, value, onSend]);

    const isDisabled = disabled || isLoading;
    const canSend = value.trim().length > 0 && !isDisabled;

    // Masquer le hint sur mobile (économie d'espace)
    const shouldShowHint = showHint && !isMobile;

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex gap-2 sm:gap-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            // iOS: enterkeyhint pour le clavier
            enterKeyHint={isMobile ? "send" : undefined}
            className={cn(
              "flex-1 px-3 sm:px-4 py-3 border border-gray-200 rounded-xl resize-none",
              "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              // Font size 16px minimum pour éviter le zoom sur iOS
              "text-base sm:text-sm",
              "transition-colors",
              "placeholder:text-gray-400",
              // Touch feedback
              "touch-manipulation"
            )}
            style={{ minHeight: "48px" }}
          />
          <Button
            type="button"
            onClick={handleSendClick}
            disabled={!canSend}
            aria-label="Envoyer le message"
            className={cn(
              // Touch target minimum 44x44, idéalement 48x48
              "min-w-[48px] min-h-[48px]",
              "px-4 sm:px-5 py-3",
              "bg-purple-600 text-white rounded-xl",
              "hover:bg-purple-700 active:bg-purple-800",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors flex items-center justify-center gap-2",
              "h-auto",
              // Touch feedback
              "touch-manipulation active:scale-95"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Send className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline">Envoyer</span>
              </>
            )}
          </Button>
        </div>

        {shouldShowHint && (
          <p className="text-xs text-gray-500 text-center">
            Entree pour envoyer | Shift+Entree pour retour a la ligne
          </p>
        )}
      </div>
    );
  }
);

ChatInputComponent.displayName = "ChatInput";

export const ChatInput = memo(ChatInputComponent);

export default ChatInput;
