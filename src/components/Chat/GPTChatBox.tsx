import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Copy, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { useLanguage } from "../../hooks/useLanguage";

interface GPTChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onRetryMessage?: (messageId: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  error?: string | null;
  maxHeight?: string;
  showTypingIndicator?: boolean;
  enableMessageActions?: boolean;
}

export default function GPTChatBox({
  messages,
  onSendMessage,
  onRetryMessage,
  isLoading = false,
  placeholder,
  error = null,
  maxHeight = "32rem",
  showTypingIndicator = true,
  enableMessageActions = true
}: GPTChatBoxProps) {
  const { t } = useLanguage({ mode: "provider" });
  const [newMessage, setNewMessage] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [newMessage, adjustTextareaHeight]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !isLoading) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [newMessage, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit, isComposing]);

  const handleCopyMessage = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  }, []);

  const handleRetry = useCallback((messageId: string) => {
    if (onRetryMessage) {
      onRetryMessage(messageId);
    }
  }, [onRetryMessage]);

  const formatTime = useCallback((timestamp: Date | number) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const MessageActions = ({ message }: { message: ChatMessage }) => (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-1 mt-1">
      {enableMessageActions && (
        <>
          <button
            onClick={() => handleCopyMessage(message.content, message.id)}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title={t("chat:copyMessage")}
            aria-label={copiedMessageId === message.id ? t("chat:messageCopied") : t("chat:copyMessage")}
          >
            {copiedMessageId === message.id ? (
              <CheckCircle size={12} className="text-green-600" aria-hidden="true" />
            ) : (
              <Copy size={12} className="text-gray-500" aria-hidden="true" />
            )}
          </button>
          {message.role === 'assistant' && onRetryMessage && (
            <button
              onClick={() => handleRetry(message.id)}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title={t("chat:regenerate")}
              aria-label={t("chat:regenerate")}
            >
              <RotateCcw size={12} className="text-gray-500" aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );

  const TypingIndicator = () => (
    <div
      className="flex items-start space-x-3 animate-fade-in"
      role="status"
      aria-busy="true"
      aria-label={t("chat:generating")}
    >
      <div className="w-8 h-8 bg-sos-pastel rounded-full flex items-center justify-center" aria-hidden="true">
        <Bot size={16} className="text-sos-red" />
      </div>
      <div className="bg-gray-100 px-4 py-3 rounded-sos">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1" aria-hidden="true">
            <div className="w-2 h-2 bg-sos-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-sos-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-sos-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-sm text-sos-text-light">{t("chat:typing")}</span>
        </div>
      </div>
    </div>
  );

  const ErrorMessage = () => (
    error && (
      <div
        className="flex items-start space-x-3 mb-4"
        role="alert"
        aria-live="assertive"
      >
        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center" aria-hidden="true">
          <AlertCircle size={16} className="text-red-600" />
        </div>
        <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-sos flex-1">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    )
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-sos shadow-sm border border-gray-100">
      {/* Messages Container - Accessible chat log */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={{ maxHeight }}
        role="log"
        aria-live="polite"
        aria-label={t("chat:chatHistory")}
        aria-relevant="additions"
      >
        <ErrorMessage />
        
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`group flex items-start space-x-3 animate-fade-in ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-sos-red to-sos-red-dark text-white'
                  : 'bg-gradient-to-br from-sos-pastel to-gray-100 text-sos-red border border-gray-200'
              }`}
              aria-hidden="true"
            >
              {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-xs lg:max-w-md ${
              message.role === 'user' ? 'items-end' : 'items-start'
            } flex flex-col`}>
              <div className={`px-4 py-3 rounded-sos shadow-sm ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-sos-red to-sos-red-dark text-white'
                  : 'bg-gray-50 text-sos-text border border-gray-200'
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
              
              <div className={`flex items-center mt-1 space-x-2 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <span className="text-xs text-gray-500">
                  {formatTime(message.timestamp)}
                </span>
                {message.role === 'assistant' && <MessageActions message={message} />}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && showTypingIndicator && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section - Sticky on mobile */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 sticky bottom-0 left-0 right-0 z-10 md:relative md:z-auto safe-area-bottom">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder={placeholder || t("chat:placeholder")}
                disabled={isLoading}
                className="w-full resize-none rounded-sos border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sos-red focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 bg-white shadow-sm"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                aria-label={t("chat:sendMessage")}
              />
              {newMessage && (
                <div className="absolute bottom-2 right-12 text-xs text-gray-400" aria-hidden="true">
                  {newMessage.length}/1000
                </div>
              )}
            </div>

            {/* Bouton envoi - minimum 44x44px pour mobile */}
            <button
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className="min-w-[44px] min-h-[44px] w-12 h-12 bg-gradient-to-br from-sos-red to-sos-red-dark text-white rounded-sos flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:from-sos-red-dark hover:to-sos-red transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
              aria-label={isLoading ? t("chat:sending") : t("chat:sendMessage")}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Instructions - cachées sur mobile pour gagner de l'espace */}
          <div className="hidden md:flex items-center justify-between text-xs text-gray-500">
            <span>{t("chat:instructions.desktop")}</span>
            {isLoading && (
              <span className="flex items-center space-x-1" role="status" aria-live="polite">
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                <span>{t("chat:sending")}</span>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// Note: Ces styles CSS doivent être ajoutés dans votre fichier global (index.css)
// @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
// .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
// .scroll-smooth { scroll-behavior: smooth; }