/**
 * =============================================================================
 * CHAT MESSAGE COMPONENT - Mobile-First
 * Displays a single chat message with role-based styling and actions
 * =============================================================================
 *
 * Optimisations mobile :
 * - Touch target 44px minimum sur le bouton copier
 * - Responsive max-width (85% mobile, 80% desktop)
 * - Texte lisible (16px minimum sur mobile)
 * - Animation respectant prefers-reduced-motion
 */

import { memo, useState, useCallback } from "react";
import { Bot, User, Copy, Check, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessageData {
  id?: string;
  role: "user" | "assistant" | "system" | "provider";
  content: string;
  source?: string;
  timestamp?: Date;
}

export interface ChatMessageProps {
  message: ChatMessageData;
  onCopy?: (content: string) => void;
  isCopied?: boolean;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format timestamp to HH:MM format
 */
function formatTime(timestamp?: Date): string {
  if (!timestamp) return "";
  return timestamp.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Basic markdown formatting for text
 * Supports: **bold**, *italic*, [links](url), `code`
 */
function formatMarkdown(text: string): React.ReactNode {
  // Split by code blocks first to preserve them
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, index) => {
    // Handle inline code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Process other markdown elements
    let processed: React.ReactNode = part;

    // Bold **text**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    if (boldParts.length > 1) {
      processed = boldParts.map((boldPart, i) => {
        if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
          return <strong key={i}>{boldPart.slice(2, -2)}</strong>;
        }
        return boldPart;
      });
    }

    // Italic *text* (excluding already processed bold)
    if (typeof processed === "string") {
      const italicParts = processed.split(/(\*[^*]+\*)/g);
      if (italicParts.length > 1) {
        processed = italicParts.map((italicPart, i) => {
          if (italicPart.startsWith("*") && italicPart.endsWith("*")) {
            return <em key={i}>{italicPart.slice(1, -1)}</em>;
          }
          return italicPart;
        });
      }
    }

    // Links [text](url)
    if (typeof processed === "string") {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const linkParts = processed.split(linkRegex);
      if (linkParts.length > 1) {
        const elements: React.ReactNode[] = [];
        for (let i = 0; i < linkParts.length; i += 3) {
          if (linkParts[i]) elements.push(linkParts[i]);
          if (linkParts[i + 1] && linkParts[i + 2]) {
            elements.push(
              <a
                key={`link-${i}`}
                href={linkParts[i + 2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-800 underline"
              >
                {linkParts[i + 1]}
              </a>
            );
          }
        }
        processed = elements;
      }
    }

    return <span key={index}>{processed}</span>;
  });
}

/**
 * Get icon based on message source
 */
function getSourceIcon(source?: string): { icon: typeof Bot; label: string } {
  switch (source) {
    case "gpt":
    case "gpt-4":
    case "gpt-4o":
      return { icon: Sparkles, label: "GPT-4" };
    case "claude":
      return { icon: Bot, label: "Claude" };
    case "perplexity":
      return { icon: Bot, label: "Perplexity" };
    case "gpt-error":
      return { icon: AlertCircle, label: "Erreur" };
    default:
      return { icon: Bot, label: "Assistant Juridique" };
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

function ChatMessageComponent({
  message,
  onCopy,
  isCopied = false,
  className,
}: ChatMessageProps) {
  const [localCopied, setLocalCopied] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const isAssistant = message.source === "gpt" || message.role === "assistant";
  const isError = message.source === "gpt-error";
  const isUser = message.role === "user" || message.role === "provider";

  const { icon: SourceIcon, label: sourceLabel } = getSourceIcon(message.source);

  const handleCopy = useCallback(async () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      await navigator.clipboard.writeText(message.content);
      setLocalCopied(true);
      setTimeout(() => setLocalCopied(false), 2000);
    }
  }, [message.content, onCopy]);

  const showCopied = isCopied || localCopied;

  return (
    <div
      className={cn(
        "flex",
        // Animation conditionnelle (respect prefers-reduced-motion)
        !prefersReducedMotion && "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <div
        className={cn(
          // Max width responsive : 85% mobile, 80% tablet+
          "max-w-[85%] sm:max-w-[80%]",
          "rounded-2xl px-3 sm:px-4 py-3 shadow-sm",
          isError
            ? "bg-red-50 border border-red-200"
            : isAssistant
            ? "bg-white border border-gray-200"
            : "bg-purple-600 text-white"
        )}
      >
        {/* Message Header */}
        <div
          className={cn(
            "flex items-center gap-2 mb-2",
            isAssistant ? "text-gray-500" : "text-purple-200"
          )}
        >
          {isAssistant || isError ? (
            <SourceIcon
              className={cn(
                "w-4 h-4 flex-shrink-0",
                isError ? "text-red-500" : "text-purple-600"
              )}
              aria-hidden="true"
            />
          ) : (
            <User className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          )}
          <span className="text-xs font-medium truncate">
            {isError ? "Erreur" : isAssistant ? sourceLabel : "Votre question"}
          </span>
          {message.timestamp && (
            <span className="text-xs opacity-70 flex-shrink-0">
              {formatTime(message.timestamp)}
            </span>
          )}
        </div>

        {/* Message Content */}
        <div
          className={cn(
            // Taille de texte responsive : 16px mobile, 14px desktop
            "text-base sm:text-sm",
            "whitespace-pre-wrap leading-relaxed",
            "break-words", // Évite le débordement sur mobile
            isError && "text-red-800"
          )}
        >
          {formatMarkdown(message.content)}
        </div>

        {/* Copy Action for Assistant Messages */}
        {isAssistant && !isError && (
          <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleCopy}
              aria-label={showCopied ? "Copié" : "Copier la réponse"}
              className={cn(
                "inline-flex items-center gap-1.5",
                // Touch target minimum 44px
                "min-h-[44px] min-w-[44px]",
                "px-3 py-2 -mr-1",
                "rounded-lg",
                "hover:bg-gray-100 active:bg-gray-200",
                "transition-colors text-xs text-gray-600",
                // Touch feedback
                "touch-manipulation active:scale-95"
              )}
            >
              {showCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="text-green-600">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize for performance
export const ChatMessage = memo(ChatMessageComponent);
ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
