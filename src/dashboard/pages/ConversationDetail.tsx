/**
 * =============================================================================
 * PAGE DÉTAIL CONVERSATION — Interface Prestataire
 * Layout optimisé : Infos client à GAUCHE | Chat IA à DROITE
 *
 * Le trigger Firestore aiOnProviderMessage gère les réponses IA automatiques
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
import { getMockData, type MockBooking, type MockMessage } from "../components/DevTestTools";
import {
  ArrowLeft,
  User,
  MapPin,
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
  PhoneOff,
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

  // Client
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientEmail?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];

  // Prestataire
  providerId?: string;
  providerName?: string;
  providerType?: "lawyer" | "expat";
  providerCountry?: string;
  providerEmail?: string;
  providerPhone?: string;
  providerSpecialties?: string[];

  // Service
  serviceType?: string;
  price?: number;
  duration?: number;

  // IA
  aiProcessed?: boolean;
  aiProcessedAt?: Timestamp;
  aiError?: string;

  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  completedAt?: Timestamp;
}

// =============================================================================
// CONSTANTES DURÉES CONVERSATION
// =============================================================================

const CONVERSATION_DURATION_MINUTES = {
  lawyer: 25,  // 25 minutes pour les avocats
  expat: 35,   // 35 minutes pour les experts expatriés
} as const;

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "provider";
  source?: string;
  content: string;
  createdAt?: Timestamp;
}

interface Conversation {
  id: string;
  bookingId?: string;
  providerId?: string;
  status?: string;
}

// =============================================================================
// HOOK: CALCUL EXPIRATION CONVERSATION
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
// COMPOSANT CHAT IA (Panneau droit)
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
}) {
  const { t } = useLanguage({ mode: "provider" });
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    return timestamp.toDate().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Bot className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t("aiChat.title")}</h3>
            <p className="text-xs text-gray-600">{t("aiChat.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {remainingTime && !isExpired && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                remainingTime.startsWith("0") && parseInt(remainingTime.split(":")[0]) < 5
                  ? "bg-red-100 text-red-700 animate-pulse"
                  : "bg-green-100 text-green-700"
              }`}
            >
              <Timer className="w-4 h-4" />
              <span>{remainingTime}</span>
            </div>
          )}
          {isExpired && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{t("aiChat.timeElapsed")}</span>
            </div>
          )}
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            title={isExpanded ? t("common:actions.collapse") : t("common:actions.expand")}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">{t("aiChat.expertTitle")}</h4>
            <p className="text-sm text-gray-600 max-w-xs mx-auto">{t("aiChat.expertDescription")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                {t("aiChat.tags.internationalLaw")}
              </span>
              <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                {t("aiChat.tags.expatTax")}
              </span>
              <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
                {t("aiChat.tags.immigration")}
              </span>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            // Détecter les messages IA (source="ai" pour nouveau backend, source="gpt" pour l'ancien)
            const isAI = message.source === "ai" || message.source === "gpt" || message.role === "assistant";
            const isError = message.source === "gpt-error" || message.source === "ai-error";

            return (
              <div
                key={message.id}
                className={`flex ${isAI ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-sm ${
                    isError
                      ? "bg-red-50 border border-red-200"
                      : isAI
                      ? "bg-white border border-gray-200"
                      : "bg-purple-600 text-white"
                  }`}
                >
                  <div className={`flex items-center gap-2 mb-2 ${isAI ? "text-gray-500" : "text-purple-200"}`}>
                    {isAI ? (
                      <Bot className="w-4 h-4 text-purple-600" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span className="text-xs font-medium">
                      {isAI ? t("aiChat.legalAssistant") : t("aiChat.yourQuestion")}
                    </span>
                    <span className="text-xs opacity-70">{formatTime(message.createdAt)}</span>
                  </div>

                  <div className={`text-sm whitespace-pre-wrap leading-relaxed ${isError ? "text-red-800" : ""}`}>
                    {message.content}
                  </div>

                  {isAI && !isError && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg hover:bg-gray-100 transition-colors text-xs text-gray-600"
                        title={t("aiChat.copyResponse")}
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-green-600">{t("common:actions.copied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
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

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm text-gray-600">{t("aiChat.analyzing")}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {disabled ? (
          <div className="bg-gray-100 rounded-xl p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-gray-700">
              {disabledReason || t("dossierDetail.conversationClosed")}
            </p>
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
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 text-base"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-5 py-3 min-h-[48px] min-w-[48px] bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">{t("common:actions.send")}</span>
                  </>
                )}
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">{t("aiChat.keyboardHint")}</p>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PANNEAU INFOS CLIENT (Gauche)
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
  const { t } = useLanguage({ mode: "provider" });
  const isLawyer = booking.providerType === "lawyer";

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "—";
    return timestamp.toDate().toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4 overflow-y-auto">
      {/* Statut de la conversation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          {!booking.aiProcessedAt ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border bg-amber-100 text-amber-800 border-amber-200">
              <Clock className="w-4 h-4" />
              {t("clientInfo.waitingAI")}
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border bg-gray-100 text-gray-800 border-gray-200">
              <CheckCircle className="w-4 h-4" />
              {t("clientInfo.archived")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border bg-green-100 text-green-800 border-green-200">
              <PhoneCall className="w-4 h-4" />
              {t("clientInfo.activeConsultation")}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              isLawyer ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
            }`}
          >
            {isLawyer ? <Scale className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {isLawyer ? t("common:types.lawyer") : t("common:types.expert")}
          </span>
        </div>

        {/* Timer */}
        {booking.aiProcessedAt && (
          <div className={`rounded-lg p-3 text-center ${
            isExpired
              ? "bg-gray-50 border border-gray-200"
              : remainingTime && parseInt(remainingTime.split(":")[0]) < 5
              ? "bg-red-50 border border-red-200"
              : "bg-green-50 border border-green-200"
          }`}>
            {isExpired ? (
              <>
                <Timer className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-sm font-medium text-gray-600">{t("dossierDetail.consultationTimeElapsed")}</p>
                <p className="text-xs text-gray-500 mt-1">{t("clientInfo.duration", { minutes: durationMinutes })}</p>
              </>
            ) : (
              <>
                <Timer className={`w-5 h-5 mx-auto mb-1 ${
                  remainingTime && parseInt(remainingTime.split(":")[0]) < 5 ? "text-red-500" : "text-green-600"
                }`} />
                <p className={`text-2xl font-bold ${
                  remainingTime && parseInt(remainingTime.split(":")[0]) < 5 ? "text-red-600" : "text-green-700"
                }`}>
                  {remainingTime}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t("clientInfo.timeRemaining", { minutes: durationMinutes })}</p>
              </>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-3 text-center">
          {isExpired
            ? t("clientInfo.historyAvailable")
            : booking.aiProcessedAt
            ? t("dossierDetail.autoLockWarning")
            : t("dossierDetail.startAfterFirstResponse")
          }
        </p>
      </div>

      {/* Infos Client */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-red-600" />
          {t("clientInfo.client")}
        </h3>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t("clientInfo.name")}</span>
            <p className="font-medium text-gray-900">
              {booking.clientFirstName} {(booking.clientLastName || booking.clientName || "").charAt(0).toUpperCase()}.
            </p>
          </div>

          {booking.clientNationality && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">{t("clientInfo.nationality")}</span>
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-gray-400" />
                {booking.clientNationality}
              </p>
            </div>
          )}

          {booking.clientCurrentCountry && (
            <div className="bg-red-50 -mx-4 px-4 py-3 border-y border-red-100">
              <span className="text-xs text-red-600 uppercase tracking-wide font-medium">
                {t("clientInfo.interventionCountry")}
              </span>
              <p className="font-bold text-red-700 text-lg">{booking.clientCurrentCountry}</p>
            </div>
          )}

          {booking.clientLanguages && booking.clientLanguages.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">{t("clientInfo.languages")}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {booking.clientLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium"
                  >
                    {lang.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demande du client */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-red-600" />
          {t("clientInfo.request")}
        </h3>

        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t("clientInfo.title")}</span>
            <p className="font-medium text-gray-900">{booking.title || t("dossiers.noTitle")}</p>
          </div>

          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">{t("clientInfo.description")}</span>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {booking.description || t("dossiers.noDescription")}
            </div>
          </div>
        </div>
      </div>

      {/* Infos service */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <Timer className="w-4 h-4 text-red-600" />
          {t("clientInfo.service")}
        </h3>

        {booking.duration && (
          <div className="bg-gray-50 rounded-lg p-3 text-center mb-3">
            <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <span className="font-bold text-gray-900 text-lg">{booking.duration} min</span>
            <p className="text-xs text-gray-500">{t("dossierDetail.consultationDuration")}</p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {t("clientInfo.createdOn")} {formatDate(booking.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
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
  // Indicateur pour la première réponse IA (quand aiProcessed est false)
  const [waitingForFirstAIResponse, setWaitingForFirstAIResponse] = useState(false);

  const { isExpired, formattedTime, durationMinutes } = useConversationExpiration(booking);

  // Mode mock activé UNIQUEMENT avec ?dev=true dans l'URL
  const isDevMock = new URLSearchParams(window.location.search).get("dev") === "true";

  // Charger le booking avec listener temps réel pour détecter quand l'IA termine
  useEffect(() => {
    if (!id) return;

    // En mode mock avec un bookingId mock, utiliser les données mock
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

    // Listener temps réel sur le booking pour détecter quand l'IA termine la première réponse
    const docRef = doc(db, "bookings", id);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const bookingData = { id: docSnap.id, ...docSnap.data() } as Booking;

          // Vérification accès (seulement à la première lecture)
          if (!isAdmin && bookingData.providerId && !booking) {
            const hasAccess = linkedProviders.some(p => p.id === bookingData.providerId) ||
                              activeProvider?.id === bookingData.providerId;

            if (!hasAccess) {
              setError(t("dossierDetail.accessDenied"));
              setLoading(false);
              return;
            }
          }

          setBooking(bookingData);

          // Gérer l'indicateur "IA en cours de traitement"
          if (!bookingData.aiProcessed && !bookingData.aiSkipped && !bookingData.aiError) {
            // L'IA n'a pas encore traité ce booking -> afficher l'indicateur
            setWaitingForFirstAIResponse(true);
          } else {
            // L'IA a terminé (ou erreur/skip) -> masquer l'indicateur
            setWaitingForFirstAIResponse(false);
          }
        } else {
          setError(t("dossierDetail.notFound"));
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erreur chargement booking:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id, isAdmin, activeProvider?.id, linkedProviders, t, isDevMock, booking]);

  // Charger la conversation
  useEffect(() => {
    if (!id || !booking) return;

    let unsubMessages: (() => void) | null = null;

    const loadConversation = async () => {
      // En mode mock avec un bookingId mock, utiliser les données mock
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

          // Charger les messages mock
          const mockMsgs = mockData.messages[mockConv.id] || [];
          setMessages(
            mockMsgs.map((m) => ({
              ...m,
              createdAt: { toDate: () => m.createdAt } as unknown as Timestamp,
            })) as unknown as Message[]
          );
        } else {
          // Créer une conversation mock vide
          const convId = `conv-${Date.now()}`;
          setConversation({
            id: convId,
            bookingId: id,
            providerId: booking.providerId,
          });
          setMessages([]);
        }
        return;
      }

      const convQuery = query(
        collection(db, "conversations"),
        where("bookingId", "==", id)
      );

      const convSnapshot = await getDocs(convQuery);

      let convId: string;

      if (!convSnapshot.empty) {
        const existingConv = convSnapshot.docs[0];
        convId = existingConv.id;
        setConversation({ id: convId, ...existingConv.data() } as Conversation);
      } else {
        const newConvRef = await addDoc(collection(db, "conversations"), {
          bookingId: id,
          providerId: booking.providerId,
          clientName: booking.clientName || booking.clientFirstName,
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        convId = newConvRef.id;
        setConversation({
          id: convId,
          bookingId: id,
          providerId: booking.providerId,
        });
      }

      // Écouter les messages
      const messagesQuery = query(
        collection(db, "conversations", convId, "messages"),
        orderBy("createdAt", "asc")
      );

      unsubMessages = onSnapshot(messagesQuery, (msgSnapshot) => {
        const msgs = msgSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(msgs);

        // Arrêter l'indicateur de chargement dès qu'un message IA arrive
        // Note: le backend utilise source="ai", l'ancien système utilisait source="gpt"
        const lastMsg = msgs[msgs.length - 1];
        if (
          lastMsg?.role === "assistant" ||
          lastMsg?.role === "system" ||
          lastMsg?.source === "ai" ||
          lastMsg?.source === "gpt" ||
          lastMsg?.source === "gpt-error" ||
          lastMsg?.source === "system"
        ) {
          setAiLoading(false);
        }
      });
    };

    loadConversation().catch((err) => {
      console.error("Erreur chargement conversation:", err);
    });

    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [id, booking, isDevMock]);

  // Envoyer un message
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
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{t("page.loadingDossier")}</span>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-red-800 mb-1">
          {error || t("dossierDetail.notFound")}
        </h3>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          {t("page.backToDossiers")}
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {booking.title || t("dossiers.noTitle")}
          </h1>
        </div>
        {booking.aiProcessed && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            {t("page.aiActive")}
          </span>
        )}
      </div>

      {/* Layout : Gauche (infos) | Droite (chat) - avec min-height pour éviter les layout shifts */}
      <div
        className={`flex-1 grid gap-4 min-h-[500px] transition-all duration-300 ease-in-out ${
          chatExpanded ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
        }`}
      >
        {/* Panneau gauche - masqué avec transition au lieu de supprimé */}
        <div
          className={`lg:col-span-1 overflow-hidden transition-all duration-300 ease-in-out ${
            chatExpanded
              ? "hidden lg:hidden"
              : "block"
          }`}
        >
          <div className="sticky top-4">
            <ClientInfoPanel
              booking={booking}
              isExpired={isExpired}
              remainingTime={formattedTime}
              durationMinutes={durationMinutes}
            />
          </div>
        </div>

        {/* Panneau droit - Chat IA */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            chatExpanded ? "col-span-1" : "lg:col-span-2"
          }`}
        >
          {conversation ? (
            <AIChat
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={aiLoading || waitingForFirstAIResponse}
              isExpanded={chatExpanded}
              onToggleExpand={() => setChatExpanded(!chatExpanded)}
              disabled={isExpired}
              disabledReason={
                isExpired
                  ? t("page.consultationExpiredMessage", { minutes: durationMinutes })
                  : undefined
              }
              remainingTime={formattedTime}
              isExpired={isExpired}
            />
          ) : waitingForFirstAIResponse ? (
            // Afficher l'indicateur de chargement pendant que l'IA génère la première réponse
            <div className="h-full min-h-[400px] flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("aiChat.title")}</h3>
                  <p className="text-xs text-gray-600">{t("aiChat.subtitle")}</p>
                </div>
              </div>
              {/* Zone de chargement avec les 3 points */}
              <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                  <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm inline-block">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1">
                        <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm text-gray-600">{t("aiChat.generatingFirstResponse")}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">{t("aiChat.pleaseWait")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-gray-500">{t("page.initializingChat")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
