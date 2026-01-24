/**
 * ChatPanel - Panneau de chat inline pour le multi-dashboard
 *
 * Affiche les conversations et permet d'envoyer des messages
 * Interface intuitive avec indicateurs visuels clairs
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  X,
  MessageSquare,
  Clock,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// =============================================================================
// TYPES
// =============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  createdAt: string;
  model?: string;
}

export interface Conversation {
  id: string;
  providerId: string;
  providerType?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messagesCount: number;
  messages: Message[];
  bookingContext?: {
    clientName?: string;
    country?: string;
    category?: string;
  };
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  providerType?: 'lawyer' | 'expat';
  bookingRequestId?: string;
  initialMessage?: string; // Message d'accueil IA
  conversations: Conversation[];
  isLoading: boolean;
  onSendMessage: (message: string, conversationId?: string) => Promise<void>;
  onLoadConversations: () => Promise<void>;
}

// =============================================================================
// COMPONENT
// =============================================================================

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  providerId,
  providerName,
  providerType,
  bookingRequestId,
  initialMessage,
  conversations,
  isLoading,
  onSendMessage,
  onLoadConversations,
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations when panel opens
  useEffect(() => {
    if (isOpen && conversations.length === 0) {
      onLoadConversations();
    }
  }, [isOpen, conversations.length, onLoadConversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConversationId]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Get active conversation
  const activeConversation = activeConversationId
    ? conversations.find(c => c.id === activeConversationId)
    : conversations[0];

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle send
  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    const messageToSend = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      await onSendMessage(messageToSend, activeConversation?.id);
      await onLoadConversations();
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white flex items-center gap-2">
                Chat IA - {providerName}
                {providerType && (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-white/20 rounded-full">
                    {providerType === 'lawyer' ? 'Avocat' : 'Aidant'}
                  </span>
                )}
              </h3>
              <p className="text-xs text-white/70">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation selector (if multiple) */}
        {conversations.length > 1 && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {conversations.map((conv, index) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                    activeConversation?.id === conv.id
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                >
                  <MessageSquare className="w-3 h-3" />
                  Conv. {index + 1}
                  <span className="text-[10px] opacity-70">
                    ({conv.messagesCount} msg)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chargement des conversations...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Initial AI message from booking */}
              {initialMessage && (!activeConversation || activeConversation.messages.length === 0) && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl rounded-tl-sm px-4 py-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {initialMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-blue-600 dark:text-blue-400">
                        <Sparkles className="w-3 h-3" />
                        Réponse auto-générée
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversation messages */}
              {activeConversation?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' && "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      msg.role === 'assistant'
                        ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                        : "bg-gradient-to-br from-gray-400 to-gray-500"
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <Bot className="w-4 h-4 text-white" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={cn("flex-1 max-w-[80%]", msg.role === 'user' && "flex justify-end")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3",
                        msg.role === 'assistant'
                          ? "bg-gray-100 dark:bg-gray-800 rounded-tl-sm"
                          : "bg-blue-600 text-white rounded-tr-sm"
                      )}
                    >
                      <p className={cn(
                        "text-sm whitespace-pre-wrap",
                        msg.role === 'assistant' ? "text-gray-800 dark:text-gray-200" : "text-white"
                      )}>
                        {msg.content}
                      </p>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2 mt-1 text-[10px] text-gray-400",
                      msg.role === 'user' && "justify-end"
                    )}>
                      <Clock className="w-3 h-3" />
                      {formatTime(msg.createdAt)}
                      {msg.model && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{msg.model}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* No messages placeholder */}
              {!initialMessage && (!activeConversation || activeConversation.messages.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    Démarrer une conversation
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                    Envoyez un message pour démarrer une conversation avec l'assistant IA
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Écrivez votre message..."
              rows={1}
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              className={cn(
                "p-3 rounded-xl transition-all",
                message.trim() && !isSending
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
              )}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
            Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
