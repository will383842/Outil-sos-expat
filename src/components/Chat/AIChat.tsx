/**
 * =============================================================================
 * AI CHAT CONTAINER COMPONENT
 * Full chat interface with messages, input, and state management
 * =============================================================================
 */

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Bot, Maximize2, Minimize2, Sparkles, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage, type ChatMessageData } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

// =============================================================================
// TYPES
// =============================================================================

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "provider";
  source?: string;
  content: string;
  createdAt?: { toDate: () => Date } | Date;
}

export interface AIChatProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateTags?: string[];
  headerTitle?: string;
  headerSubtitle?: string;
  placeholder?: string;
  className?: string;
}

// =============================================================================
// LOADING INDICATOR
// =============================================================================

function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-sm text-gray-600">Analyse juridique en cours...</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  title?: string;
  description?: string;
  tags?: string[];
}

function EmptyState({
  title = "Assistant Juridique Expert",
  description = "Tapez les questions de votre client pour recevoir des reponses juridiques detaillees et sourcees.",
  tags = ["Droit international", "Fiscalite expatries", "Immigration"],
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-8 h-8 text-purple-600" />
      </div>
      <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-600 max-w-xs mx-auto">{description}</p>
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DISABLED STATE
// =============================================================================

interface DisabledStateProps {
  reason?: string;
}

function DisabledState({ reason }: DisabledStateProps) {
  return (
    <div className="bg-gray-100 rounded-xl p-4 text-center">
      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
      <p className="font-medium text-gray-700">
        {reason || "Conversation terminee"}
      </p>
      <p className="text-sm text-gray-500 mt-1">
        L'historique reste consultable ci-dessus
      </p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function AIChatComponent({
  messages,
  onSendMessage,
  isLoading = false,
  isExpanded = false,
  onToggleExpand,
  disabled = false,
  disabledReason = "",
  emptyStateTitle,
  emptyStateDescription,
  emptyStateTags,
  headerTitle = "Assistant Juridique IA",
  headerSubtitle = "Posez les questions du client ici",
  placeholder = "Tapez la question du client...",
  className,
}: AIChatProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || disabled) return;

    const message = input.trim();
    setInput("");
    await onSendMessage(message);
  }, [input, isLoading, disabled, onSendMessage]);

  // Handle copy with feedback
  const handleCopy = useCallback((content: string, id?: string) => {
    navigator.clipboard.writeText(content);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  // Convert Message to ChatMessageData
  const convertMessage = useCallback((msg: Message): ChatMessageData => {
    let timestamp: Date | undefined;
    if (msg.createdAt) {
      timestamp =
        typeof (msg.createdAt as { toDate: () => Date }).toDate === "function"
          ? (msg.createdAt as { toDate: () => Date }).toDate()
          : (msg.createdAt as Date);
    }
    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      source: msg.source,
      timestamp,
    };
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Bot className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{headerTitle}</h3>
            <p className="text-xs text-gray-600">{headerSubtitle}</p>
          </div>
        </div>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            title={isExpanded ? "Reduire" : "Agrandir"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
            tags={emptyStateTags}
          />
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={convertMessage(msg)}
              onCopy={(content) => handleCopy(content, msg.id)}
              isCopied={copiedId === msg.id}
            />
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && <LoadingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {disabled ? (
          <DisabledState reason={disabledReason} />
        ) : (
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            placeholder={placeholder}
            disabled={disabled}
          />
        )}
      </div>
    </div>
  );
}

export const AIChat = memo(AIChatComponent);
AIChat.displayName = "AIChat";

export default AIChat;
