/**
 * =============================================================================
 * PAGE DÉTAIL CONVERSATION — Interface Prestataire
 * =============================================================================
 *
 * Design 2026: Modern, clean, light theme
 * Layout optimisé : Infos client à GAUCHE | Chat IA à DROITE
 * Le trigger Firestore aiOnProviderMessage gère les réponses IA automatiques
 *
 * =============================================================================
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProvider, useAuth } from "../../contexts/UnifiedUserContext";
import { useLanguage } from "../../hooks/useLanguage";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getMockData } from "../components/DevTestTools";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Bot,
  Loader2,
  Copy,
  Check,
  Scale,
  Globe,
  Flag,
  Timer,
  Sparkles,
  RefreshCw,
  PhoneCall,
  FileText,
  Maximize2,
  Minimize2,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface Booking {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientEmail?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];
  providerId?: string;
  providerName?: string;
  providerType?: "lawyer" | "expat";
  providerCountry?: string;
  providerEmail?: string;
  providerPhone?: string;
  providerSpecialties?: string[];
  serviceType?: string;
  price?: number;
  duration?: number;
  aiProcessed?: boolean;
  aiProcessedAt?: Timestamp;
  aiError?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  completedAt?: Timestamp;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "provider";
  source?: string;
  content: string;
  createdAt?: Timestamp;
  order?: number; // FIX: Used for ordering messages with same timestamp
}

interface Conversation {
  id: string;
  bookingId?: string;
  providerId?: string;
  status?: string;
}

// 🆕 Type pour les logs de réflexion temps réel
interface ThinkingLogUI {
  id: string;
  step: string;
  message: string;
  details?: string;
  order: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONVERSATION_DURATION_MINUTES = {
  lawyer: 25,
  expat: 35,
} as const;

// =============================================================================
// HOOK: CONVERSATION EXPIRATION
// =============================================================================

function useConversationExpiration(booking: Booking | null) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!booking?.aiProcessedAt) {
      setRemainingTime(null);
      setIsExpired(false);
      return;
    }

    const providerType = booking.providerType || "lawyer";
    const durationMinutes = CONVERSATION_DURATION_MINUTES[providerType];
    const durationMs = durationMinutes * 60 * 1000;
    const startTime = booking.aiProcessedAt.toMillis();
    const expirationTime = startTime + durationMs;

    const calculateRemaining = () => {
      const now = Date.now();
      const remaining = expirationTime - now;

      if (remaining <= 0) {
        setRemainingTime(0);
        setIsExpired(true);
      } else {
        setRemainingTime(remaining);
        setIsExpired(false);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [booking?.aiProcessedAt, booking?.providerType]);

  const formatRemainingTime = () => {
    if (remainingTime === null) return null;
    if (remainingTime <= 0) return "00:00";

    const totalSeconds = Math.floor(remainingTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return {
    remainingTime,
    isExpired,
    formattedTime: formatRemainingTime(),
    durationMinutes: booking?.providerType
      ? CONVERSATION_DURATION_MINUTES[booking.providerType]
      : CONVERSATION_DURATION_MINUTES.lawyer,
  };
}

// =============================================================================
// AI CHAT COMPONENT
// =============================================================================

function AIChat({
  messages,
  onSendMessage,
  isLoading,
  isExpanded,
  onToggleExpand,
  disabled = false,
  disabledReason = "",
  remainingTime,
  isExpired,
  thinkingLogs = [],  // 🆕 Logs temps réel
}: {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  disabled?: boolean;
  disabledReason?: string;
  remainingTime?: string | null;
  isExpired?: boolean;
  thinkingLogs?: ThinkingLogUI[];  // 🆕 Logs temps réel
}) {
  const { t, currentLocale } = useLanguage({ mode: "provider" });
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUpRef = useRef(false);
  const prevMessagesLengthRef = useRef(messages.length);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect if user scrolled up manually (debounced to avoid excessive re-renders)
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    userScrolledUpRef.current = !isNearBottom;

    // Debounce the button visibility update
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollButton(!isNearBottom && messages.length > 3);
    }, 100);
  }, [messages.length]);

  // Auto-scroll only when: new message added AND user is near bottom
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (isNewMessage && !userScrolledUpRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages.length]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    const message = input.trim();
    setInput("");
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (timestamp?: Timestamp) => {
    if (!timestamp) return "";
    const locale = currentLocale?.replace("-", "_") || "fr-FR";
    return timestamp.toDate().toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimerColor = () => {
    if (!remainingTime) return "bg-gray-100 text-gray-600";
    const minutes = parseInt(remainingTime.split(":")[0]);
    if (minutes < 5) return "bg-red-100 text-red-700";
    return "bg-emerald-100 text-emerald-700";
  };

  return (
    <Card className="flex flex-col h-full border-0 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <Bot className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{t("aiChat.title")}</h3>
            <p className="text-sm text-gray-500">{t("aiChat.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {remainingTime && !isExpired && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getTimerColor()}`}>
              <Timer className="w-4 h-4" />
              <span>{remainingTime}</span>
            </div>
          )}
          {isExpired && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{t("aiChat.timeElapsed")}</span>
            </div>
          )}
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-white rounded-xl transition-colors"
            title={isExpanded ? t("common:actions.collapse") : t("common:actions.expand")}
          >
            {isExpanded ? <Minimize2 className="w-5 h-5 text-gray-500" /> : <Maximize2 className="w-5 h-5 text-gray-500" />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 relative"
      >
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-amber-600" />
            </div>
            <h4 className="font-semibold text-gray-900 text-lg mb-2">{t("aiChat.expertTitle")}</h4>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">{t("aiChat.expertDescription")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
                {t("aiChat.tags.internationalLaw")}
              </span>
              <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
                {t("aiChat.tags.expatTax")}
              </span>
              <span className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 shadow-sm">
                {t("aiChat.tags.immigration")}
              </span>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isAI = message.source === "gpt" || message.source === "claude" || message.role === "assistant";
            const isError = message.source === "gpt-error";
            // FIX: Detect system-generated context message (initial booking summary)
            const isSystemContext = message.source === "system" && message.role === "user";

            return (
              <div key={message.id} className={`flex ${isAI || isSystemContext ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                    isError
                      ? "bg-red-50 border border-red-200"
                      : isAI
                      ? "bg-white border border-gray-200"
                      : isSystemContext
                      ? "bg-blue-50 border border-blue-200" // FIX: Different style for system context
                      : "bg-amber-600 text-white"
                  }`}
                >
                  <div className={`flex items-center gap-2 mb-2 ${isAI ? "text-gray-500" : isSystemContext ? "text-blue-600" : "text-amber-200"}`}>
                    {isAI ? <Bot className="w-4 h-4 text-amber-600" /> : isSystemContext ? <FileText className="w-4 h-4 text-blue-500" /> : <User className="w-4 h-4" />}
                    <span className="text-xs font-medium">{isAI ? t("aiChat.legalAssistant") : isSystemContext ? t("aiChat.clientRequest") : t("aiChat.yourQuestion")}</span>
                    <span className="text-xs opacity-70">{formatTime(message.createdAt)}</span>
                  </div>

                  <div className={`text-sm whitespace-pre-wrap leading-relaxed ${isError ? "text-red-800" : ""}`}>
                    {message.content}
                  </div>

                  {isAI && !isError && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-xs text-gray-500"
                        title={t("aiChat.copyResponse")}
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-600">{t("common:actions.copied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>{t("common:actions.copy")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* 🆕 ENHANCED LOADING INDICATOR with thinking logs */}
        {isLoading && (
          <div className="flex justify-start px-2 sm:px-0">
            <div
              className="bg-white border border-gray-200 rounded-2xl px-4 py-4 sm:px-5 sm:py-5 shadow-lg w-full max-w-[calc(100vw-2rem)] sm:max-w-md"
              role="status"
              aria-live="polite"
              aria-label={thinkingLogs.length > 0 ? thinkingLogs[thinkingLogs.length - 1].message : t("aiChat.analyzing")}
            >
              {/* En-tête avec animation */}
              <div className="flex items-center gap-3 mb-3">
                {/* Dots animation */}
                <div className="flex space-x-1.5 motion-reduce:hidden">
                  <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                {/* Fallback pour reduced motion */}
                <div className="hidden motion-reduce:block">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                </div>
                {/* Titre principal */}
                <span className="text-base sm:text-sm font-semibold text-gray-800">
                  {t("aiChat.analyzing")}
                </span>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  🆕 LOGS TEMPS RÉEL: Les recherches s'affichent une par une
                  Le prestataire voit exactement ce que l'IA recherche
                  ═══════════════════════════════════════════════════════════════ */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {thinkingLogs.length > 0 ? (
                  thinkingLogs.map((log, index) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2 text-sm transition-all duration-300 ${
                        index === thinkingLogs.length - 1
                          ? "text-purple-700 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      {/* Icône selon le type d'étape */}
                      <span className="flex-shrink-0 mt-0.5">
                        {log.step === "analyzing_question" && "📋"}
                        {log.step === "searching_web" && "🔍"}
                        {log.step === "search_query" && "🔎"}
                        {log.step === "search_results" && "📄"}
                        {log.step === "analyzing_sources" && "📊"}
                        {log.step === "generating_response" && "✍️"}
                        {log.step === "finalizing" && "✓"}
                        {!["analyzing_question", "searching_web", "search_query", "search_results", "analyzing_sources", "generating_response", "finalizing"].includes(log.step) && "•"}
                      </span>
                      {/* Message */}
                      <span className="break-words">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">
                    {t("aiChat.preparingResponse") || "Préparation de la réponse..."}
                  </div>
                )}
              </div>

              {/* Indicateur de progression visuel */}
              {thinkingLogs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                          step <= Math.min(thinkingLogs.length, 5)
                            ? "bg-purple-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              userScrolledUpRef.current = false;
              setShowScrollButton(false);
            }}
            className="sticky bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 transition-colors text-sm font-medium z-10"
          >
            <ArrowLeft className="w-4 h-4 rotate-[-90deg]" />
            {t("aiChat.scrollToBottom") || "Aller en bas"}
          </button>
        )}
      </div>

      {/* Input */}
      <div className="p-5 border-t border-gray-100 bg-white">
        {disabled ? (
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">{disabledReason || t("dossierDetail.conversationClosed")}</p>
            <p className="text-sm text-gray-500 mt-1">{t("dossierDetail.historyAvailable")}</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("aiChat.inputPlaceholder")}
                disabled={isLoading}
                rows={1}
                enterKeyHint="send"
                className="flex-1 px-5 py-4 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 text-base bg-gray-50"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-6 py-4 h-auto min-h-[56px] bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-lg shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline ml-2">{t("common:actions.send")}</span>
                  </>
                )}
              </Button>
            </form>
            <p className="text-xs text-gray-400 mt-3 text-center">{t("aiChat.keyboardHint")}</p>
          </>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// CLIENT INFO PANEL
// =============================================================================

function ClientInfoPanel({
  booking,
  isExpired,
  remainingTime,
  durationMinutes,
}: {
  booking: Booking;
  isExpired: boolean;
  remainingTime: string | null;
  durationMinutes: number;
}) {
  const { t, currentLocale } = useLanguage({ mode: "provider" });
  const isLawyer = booking.providerType === "lawyer";

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "—";
    const locale = currentLocale?.replace("-", "_") || "fr-FR";
    return timestamp.toDate().toLocaleString(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimerBg = () => {
    if (isExpired) return "bg-gray-50 border-gray-200";
    if (remainingTime && parseInt(remainingTime.split(":")[0]) < 5) return "bg-red-50 border-red-200";
    return "bg-emerald-50 border-emerald-200";
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            {!booking.aiProcessedAt ? (
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-100 text-amber-800">
                <Clock className="w-4 h-4" />
                {t("clientInfo.waitingAI")}
              </span>
            ) : isExpired ? (
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700">
                <CheckCircle className="w-4 h-4" />
                {t("clientInfo.archived")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-100 text-emerald-800">
                <PhoneCall className="w-4 h-4" />
                {t("clientInfo.activeConsultation")}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isLawyer ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {isLawyer ? <Scale className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
              {isLawyer ? t("common:types.lawyer") : t("common:types.expert")}
            </span>
          </div>

          {/* Timer */}
          {booking.aiProcessedAt && (
            <div className={`rounded-2xl p-5 text-center border ${getTimerBg()}`}>
              {isExpired ? (
                <>
                  <Timer className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">{t("dossierDetail.consultationTimeElapsed")}</p>
                  <p className="text-xs text-gray-500 mt-1">{t("clientInfo.duration", { minutes: durationMinutes })}</p>
                </>
              ) : (
                <>
                  <Timer className={`w-6 h-6 mx-auto mb-2 ${
                    remainingTime && parseInt(remainingTime.split(":")[0]) < 5 ? "text-red-500" : "text-emerald-600"
                  }`} />
                  <p className={`text-4xl font-bold tracking-tight ${
                    remainingTime && parseInt(remainingTime.split(":")[0]) < 5 ? "text-red-600" : "text-emerald-700"
                  }`}>
                    {remainingTime}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{t("clientInfo.timeRemaining", { minutes: durationMinutes })}</p>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4 text-center">
            {isExpired
              ? t("clientInfo.historyAvailable")
              : booking.aiProcessedAt
              ? t("dossierDetail.autoLockWarning")
              : t("dossierDetail.startAfterFirstResponse")}
          </p>
        </CardContent>
      </Card>

      {/* Client Info */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <User className="w-4 h-4 text-red-600" />
            </div>
            {t("clientInfo.client")}
          </h3>

          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t("clientInfo.name")}</span>
              <p className="font-semibold text-gray-900 text-lg mt-0.5">
                {booking.clientFirstName} {(booking.clientLastName || booking.clientName || "").charAt(0).toUpperCase()}.
              </p>
            </div>

            {booking.clientNationality && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t("clientInfo.nationality")}</span>
                <p className="font-medium text-gray-900 flex items-center gap-2 mt-0.5">
                  <Flag className="w-4 h-4 text-gray-400" />
                  {booking.clientNationality}
                </p>
              </div>
            )}

            {booking.clientCurrentCountry && (
              <div className="bg-red-50 -mx-5 px-5 py-4 border-y border-red-100">
                <span className="text-xs text-red-600 uppercase tracking-wide font-bold">
                  {t("clientInfo.interventionCountry")}
                </span>
                <p className="font-bold text-red-700 text-xl mt-1">{booking.clientCurrentCountry}</p>
              </div>
            )}

            {booking.clientLanguages && booking.clientLanguages.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t("clientInfo.languages")}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {booking.clientLanguages.map((lang) => (
                    <span key={lang} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-medium">
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Info */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="w-4 h-4 text-red-600" />
            </div>
            {t("clientInfo.request")}
          </h3>

          <div className="space-y-4">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t("clientInfo.title")}</span>
              <p className="font-semibold text-gray-900 mt-0.5">{booking.title || t("dossiers.noTitle")}</p>
            </div>

            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{t("clientInfo.description")}</span>
              <div className="mt-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {booking.description || t("dossiers.noDescription")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Info */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Timer className="w-4 h-4 text-red-600" />
            </div>
            {t("clientInfo.service")}
          </h3>

          {booking.duration && (
            <div className="bg-gray-50 rounded-xl p-4 text-center mb-4">
              <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <span className="font-bold text-gray-900 text-2xl">{booking.duration} min</span>
              <p className="text-xs text-gray-500 mt-1">{t("dossierDetail.consultationDuration")}</p>
            </div>
          )}

          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t("clientInfo.createdOn")} {formatDate(booking.createdAt)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ConversationDetail() {
  const { t } = useLanguage({ mode: "provider" });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeProvider, linkedProviders } = useProvider();
  const { isAdmin } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  // 🆕 State pour les logs de réflexion IA temps réel
  const [thinkingLogs, setThinkingLogs] = useState<ThinkingLogUI[]>([]);
  // Track booking source collection (bookings vs booking_requests)
  const [bookingSource, setBookingSource] = useState<"bookings" | "booking_requests" | null>(null);

  const { isExpired, formattedTime, durationMinutes } = useConversationExpiration(booking);
  const searchParams = new URLSearchParams(window.location.search);
  const isDevMock = searchParams.get("dev") === "true";
  // FIX: Detect if coming from multi-dashboard and get original booking_request ID
  const isFromMultiDashboard = searchParams.get("source") === "multi_dashboard";
  const originalBookingRequestId = searchParams.get("originalId");

  // Load booking - FIX: Use onSnapshot for real-time updates (detect when AI trigger completes)
  useEffect(() => {
    if (!id) return;

    // Mock data for dev mode
    if (isDevMock && id.startsWith("booking-")) {
      const mockData = getMockData();
      const mockBooking = mockData.bookings.find((b) => b.id === id);

      if (mockBooking) {
        setBooking({
          ...mockBooking,
          createdAt: { toDate: () => mockBooking.createdAt, toMillis: () => mockBooking.createdAt.getTime() } as unknown as Timestamp,
          aiProcessedAt: mockBooking.aiProcessedAt
            ? { toDate: () => mockBooking.aiProcessedAt!, toMillis: () => mockBooking.aiProcessedAt!.getTime() } as unknown as Timestamp
            : undefined,
        } as unknown as Booking);
        setLoading(false);
        return;
      }
    }

    // FIX: Try loading from 'bookings' collection with multiple strategies
    // Strategy 1: Direct ID lookup
    // Strategy 2: Search by externalId (for multi-dashboard booking_requests)
    let unsubscribe: (() => void) | null = null;
    let foundInCollection: string | null = null;
    let actualBookingId: string = id;

    const setupBookingListener = async () => {
      // Strategy 1: Direct lookup in 'bookings' collection
      const bookingsDoc = await getDoc(doc(db, "bookings", id));

      if (bookingsDoc.exists()) {
        foundInCollection = "bookings";
        actualBookingId = id;
        console.log("[ConversationDetail] 📦 Found directly in 'bookings' collection", { id });
      } else {
        // Strategy 2: Search by externalId (when ID is a booking_request ID from multi-dashboard)
        // The booking in Outil has externalId = booking_request ID from SOS
        console.log("[ConversationDetail] 🔍 Not found directly, searching by externalId...", {
          id,
          isFromMultiDashboard,
          originalBookingRequestId,
        });

        // Search by externalId (the booking_request ID)
        const searchId = originalBookingRequestId || id;
        const externalIdQuery = query(
          collection(db, "bookings"),
          where("externalId", "==", searchId)
        );
        const externalIdSnapshot = await getDocs(externalIdQuery);

        if (!externalIdSnapshot.empty) {
          foundInCollection = "bookings";
          actualBookingId = externalIdSnapshot.docs[0].id;
          console.log("[ConversationDetail] 📦 Found by externalId in 'bookings' collection", {
            externalId: searchId,
            actualBookingId,
          });
        }
      }

      if (!foundInCollection) {
        console.error("[ConversationDetail] ❌ Booking not found", {
          id,
          isFromMultiDashboard,
          originalBookingRequestId,
        });
        setError(t("dossierDetail.notFound"));
        setLoading(false);
        return;
      }

      // Store the booking source for conversation creation logic
      setBookingSource(foundInCollection as "bookings" | "booking_requests");

      // Setup real-time listener on the found booking
      const docRef = doc(db, foundInCollection, actualBookingId);
      unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const bookingData = { id: docSnap.id, ...docSnap.data() } as Booking;

            // Access control check
            if (!isAdmin && bookingData.providerId) {
              const hasAccess = linkedProviders.some(p => p.id === bookingData.providerId) ||
                                activeProvider?.id === bookingData.providerId;

              if (!hasAccess) {
                setError(t("dossierDetail.accessDenied"));
                setLoading(false);
                return;
              }
            }

            setBooking(bookingData);
            setLoading(false);

            console.log("[ConversationDetail] 📦 Booking updated (real-time):", {
              id: bookingData.id,
              collection: foundInCollection,
              aiProcessed: bookingData.aiProcessed,
              conversationId: (bookingData as unknown as Record<string, unknown>).conversationId,
            });
          } else {
            setError(t("dossierDetail.notFound"));
            setLoading(false);
          }
        },
        (err) => {
          console.error("Erreur chargement booking:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    };

    setupBookingListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, isAdmin, activeProvider?.id, linkedProviders, t, isDevMock]);

  // Load conversation - FIX: Simplified logic since booking is now real-time
  useEffect(() => {
    if (!id || !booking) return;

    let unsubMessages: (() => void) | null = null;

    // Mock data for dev mode
    if (isDevMock && id.startsWith("booking-")) {
      const mockData = getMockData();
      const mockConv = mockData.conversations.find((c) => c.bookingId === id);

      if (mockConv) {
        setConversation({
          id: mockConv.id,
          bookingId: mockConv.bookingId,
          providerId: mockConv.providerId,
          status: mockConv.status,
        });

        const mockMsgs = mockData.messages[mockConv.id] || [];
        setMessages(
          mockMsgs.map((m) => ({
            ...m,
            createdAt: { toDate: () => m.createdAt } as unknown as Timestamp,
          })) as unknown as Message[]
        );
      } else {
        const convId = `conv-${Date.now()}`;
        setConversation({ id: convId, bookingId: id, providerId: booking.providerId });
        setMessages([]);
      }
      return;
    }

    // FIX: Since booking is now real-time (onSnapshot), we can use conversationId directly
    // when it becomes available after aiOnBookingCreated trigger completes
    const bookingAny = booking as unknown as Record<string, unknown>;

    const setupConversation = async () => {
      let convId: string | null = null;

      // Priority 1: Use conversationId from booking (set by aiOnBookingCreated trigger)
      if (bookingAny.conversationId && typeof bookingAny.conversationId === "string") {
        convId = bookingAny.conversationId;
        console.log("[ConversationDetail] ✅ Using conversationId from booking:", convId);
        const convDoc = await getDoc(doc(db, "conversations", convId));
        if (convDoc.exists()) {
          setConversation({ id: convId, ...convDoc.data() } as Conversation);
        }
      }

      // Priority 2: Search by bookingId (fallback for older bookings)
      if (!convId) {
        const convQuery = query(collection(db, "conversations"), where("bookingId", "==", id));
        const convSnapshot = await getDocs(convQuery);

        if (!convSnapshot.empty) {
          const existingConv = convSnapshot.docs[0];
          convId = existingConv.id;
          console.log("[ConversationDetail] ✅ Found conversation by bookingId:", convId);
          setConversation({ id: convId, ...existingConv.data() } as Conversation);
        }
      }

      // Priority 2.5: Search by bookingRequestId (for multi-dashboard conversations)
      if (!convId) {
        const convQuery = query(collection(db, "conversations"), where("bookingRequestId", "==", id));
        const convSnapshot = await getDocs(convQuery);

        if (!convSnapshot.empty) {
          const existingConv = convSnapshot.docs[0];
          convId = existingConv.id;
          console.log("[ConversationDetail] ✅ Found conversation by bookingRequestId:", convId);
          setConversation({ id: convId, ...existingConv.data() } as Conversation);
        }
      }

      // Priority 3: If no conversation yet, handle based on booking source
      if (!convId) {
        // For booking_requests (multi-dashboard), create conversation immediately
        // Note: AI trigger (onBookingRequestCreatedGenerateAi) generates aiResponse but not conversation
        // Conversation is created here or via chat interaction
        if (bookingSource === "booking_requests") {
          console.log("[ConversationDetail] 📝 Creating conversation for booking_request");
          const newConvRef = await addDoc(collection(db, "conversations"), {
            bookingRequestId: id,
            providerId: booking.providerId,
            clientName: booking.clientName || booking.clientFirstName,
            status: "active",
            source: "multi_dashboard",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          convId = newConvRef.id;
          setConversation({ id: convId, bookingRequestId: id, providerId: booking.providerId } as unknown as Conversation);
        }
        // For bookings (Outil-native), wait for AI trigger or create fallback
        else if (!booking.aiProcessed) {
          console.log("[ConversationDetail] ⏳ Waiting for AI trigger to create conversation...", {
            bookingId: id,
            aiProcessed: booking.aiProcessed,
          });
          // Don't create empty conversation - wait for AI trigger
          // The booking useEffect (onSnapshot) will update booking when AI completes
          // This useEffect will then re-run with the new conversationId
          return;
        } else {
          // AI processed but no conversation found - create one as fallback
          console.log("[ConversationDetail] ⚠️ AI processed but no conversation - creating fallback");
          const newConvRef = await addDoc(collection(db, "conversations"), {
            bookingId: id,
            providerId: booking.providerId,
            clientName: booking.clientName || booking.clientFirstName,
            status: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          convId = newConvRef.id;
          setConversation({ id: convId, bookingId: id, providerId: booking.providerId });
        }
      }

      // FIX: Only setup messages listener if we have a convId
      if (!convId) return;

      // Setup real-time listener for messages
      const messagesQuery = query(
        collection(db, "conversations", convId, "messages"),
        orderBy("createdAt", "asc")
      );

      unsubMessages = onSnapshot(messagesQuery, (msgSnapshot) => {
        let msgs = msgSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Message[];

        // Sort by 'order' field when timestamps are equal (for initial context + AI response)
        msgs = msgs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          if (timeA !== timeB) return timeA - timeB;
          return (a.order || 0) - (b.order || 0);
        });

        setMessages(msgs);

        // Auto-detect AI loading state
        const lastMsg = msgs[msgs.length - 1];
        const lastMsgIsFromAI = lastMsg?.source === "gpt" || lastMsg?.source === "gpt-error" || lastMsg?.source === "claude";
        const lastMsgIsFromProvider = lastMsg?.source === "provider";

        if (lastMsgIsFromAI) {
          setAiLoading(false);
        } else if (lastMsgIsFromProvider) {
          setAiLoading(true);
        }

        console.log("[ConversationDetail] 📩 Messages updated:", {
          count: msgs.length,
          lastMsgSource: lastMsg?.source,
          lastMsgRole: lastMsg?.role,
          isAiLoading: lastMsgIsFromProvider && !lastMsgIsFromAI,
        });
      });
    };

    setupConversation().catch(console.error);

    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [id, booking, bookingSource, isDevMock]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 LISTENER TEMPS RÉEL: thinking_logs subcollection
  // Affiche les recherches IA en direct (comme GPT/Claude)
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Ne pas écouter si pas de conversation ou pas en loading
    if (!conversation?.id || !aiLoading) {
      setThinkingLogs([]);
      return;
    }

    // Écouter la sous-collection thinking_logs en temps réel
    const logsQuery = query(
      collection(db, "conversations", conversation.id, "thinking_logs"),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        step: doc.data().step || "",
        message: doc.data().message || "",
        details: doc.data().details,
        order: doc.data().order || 0,
      })) as ThinkingLogUI[];

      setThinkingLogs(logs);
    }, (error) => {
      console.error("[ConversationDetail] Erreur listener thinking_logs:", error);
    });

    return () => {
      unsubscribe();
      setThinkingLogs([]);
    };
  }, [conversation?.id, aiLoading]);

  // Send message
  const handleSendMessage = useCallback(async (message: string) => {
    if (!conversation?.id || !booking) return;

    setAiLoading(true);

    try {
      await addDoc(collection(db, "conversations", conversation.id, "messages"), {
        role: "user",
        source: "provider",
        content: message,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Erreur envoi message:", err);
      setAiLoading(false);

      await addDoc(collection(db, "conversations", conversation.id, "messages"), {
        role: "system",
        source: "gpt-error",
        content: `❌ Erreur d'envoi: ${(err as Error).message}`,
        createdAt: serverTimestamp(),
      });
    }
  }, [conversation?.id, booking]);

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
          <span className="text-gray-600">{t("page.loadingDossier")}</span>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <Card className="border-0 shadow-lg bg-red-50 max-w-md mx-auto mt-12">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-800 mb-2">{error || t("dossierDetail.notFound")}</h3>
          <Button onClick={() => navigate("/dashboard")} className="mt-4 bg-red-600 hover:bg-red-700 text-white">
            {t("page.backToDossiers")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{booking.title || t("dossiers.noTitle")}</h1>
        </div>
        {booking.aiProcessed && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            {t("page.aiActive")}
          </span>
        )}
      </div>

      {/* Layout: Left (info) | Right (chat) */}
      <div className={`flex-1 grid gap-6 min-h-0 ${chatExpanded ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"}`}>
        {/* Left Panel - Scrollable client info */}
        {!chatExpanded && (
          <div className="lg:col-span-1 overflow-y-auto pr-2">
            <ClientInfoPanel
              booking={booking}
              isExpired={isExpired}
              remainingTime={formattedTime}
              durationMinutes={durationMinutes}
            />
          </div>
        )}

        {/* Right Panel - AI Chat */}
        <div className={chatExpanded ? "col-span-1" : "lg:col-span-2"}>
          {conversation ? (
            <AIChat
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={aiLoading}
              thinkingLogs={thinkingLogs}  // 🆕 Logs temps réel
              isExpanded={chatExpanded}
              onToggleExpand={() => setChatExpanded(!chatExpanded)}
              disabled={isExpired}
              disabledReason={isExpired ? t("page.consultationExpiredMessage", { minutes: durationMinutes }) : undefined}
              remainingTime={formattedTime}
              isExpired={isExpired}
            />
          ) : (
            <Card className="h-full flex items-center justify-center border-0 shadow-lg bg-gray-50">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-gray-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-500">{t("page.initializingChat")}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
