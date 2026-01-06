// src/pages/SuccessPayment.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  useSearchParams,
  useParams,
  Link,
  useLocation,
} from "react-router-dom";
import { useLocaleNavigate, parseLocaleFromPath } from "../multilingual-system";
import {
  Phone,
  CheckCircle,
  Scale,
  Users,
  Star,
  Clock,
  Shield,
  ArrowRight,
  Zap,
  User,
  Briefcase,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import ReviewModal from "../components/review/ReviewModal";
import { formatDateTime, formatDate } from "../utils/localeFormatters";

// 🔁 Firestore
import { doc, onSnapshot, getDoc, collection, query, where, getDocs, limit as firestoreLimit, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useIntl, FormattedMessage } from "react-intl";
import { generateBothInvoices } from "../services/invoiceGenerator";
import { usePricingConfig } from "../services/pricingService";
import { navigationLogger, firestoreLogger, callLogger } from "../utils/debugLogger";

/* =========================
   Types pour l'order / coupon / metadata
   ========================= */
type Currency = "eur" | "usd";

interface OrderCoupon {
  code?: string;
  discountAmount?: number | string;
}

interface OrderMetadata {
  price_origin?: "override" | "standard" | string;
  override_label?: string;
  // Pour le calcul d'économies
  original_standard_amount?: number | string; // ex: 100
  effective_base_amount?: number | string; // ex: 39 (après override)
}

interface OrderDoc {
  id?: string;
  amount?: number | string; // total payé
  currency?: Currency;
  coupon?: OrderCoupon | null;
  metadata?: OrderMetadata | null;
}

/* =========================
   Types / constantes “service appel”
   ========================= */
interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  price: number;
  duration: number;
  role: string;
}

type CallState =
  | "connecting"
  | "countdown"
  | "ready_to_ring"
  | "in_progress"
  | "completed"
  | "failed";

const PROVIDER_DEFAULTS = {
  "1": { type: "lawyer", price: 49, duration: 20, role: "lawyer" },
  "2": { type: "expat", price: 19, duration: 30, role: "expat" },
  "3": { type: "lawyer", price: 49, duration: 20, role: "lawyer" },
  "4": { type: "expat", price: 19, duration: 30, role: "expat" },
} as const;

// REMOVED: Hardcoded COMMISSION_RATES
// Commission amounts are now centralized in admin_config/pricing (Firestore)
// Use usePricingConfig() hook to get connectionFeeAmount

/* =========================
   Page principale
   ========================= */
const SuccessPayment: React.FC = () => {
  const intl = useIntl();
  const [searchParams] = useSearchParams();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const { user, isFullyReady } = useAuth();

  // Get centralized pricing configuration from admin_config/pricing
  const { pricing } = usePricingConfig();
  
  // Extract country from URL path (e.g., /en-de/... → de)
  const { country: urlCountry } = parseLocaleFromPath(location.pathname);

  // URL Parameters
  const callStatus = searchParams.get("call");
  const providerId =
    searchParams.get("providerId") || searchParams.get("provider") || "1";
  // P0 FIX: Recuperer callId depuis URL ou sessionStorage (en cas de F5)
  // IMPORTANT: Ne JAMAIS generer un nouveau callId car il ne correspondra a aucun document Firestore
  const callId = useMemo(() => {
    const urlCallId = searchParams.get("callId");
    if (urlCallId) {
      console.log("✅ [SUCCESS_PAGE] callId from URL:", urlCallId);
      return urlCallId;
    }
    // Fallback: recuperer depuis sessionStorage (sauvegarde avant navigation)
    try {
      const savedData = sessionStorage.getItem('lastPaymentSuccess');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.callId && parsed.savedAt && (Date.now() - parsed.savedAt) < 10 * 60 * 1000) {
          console.log("✅ [SUCCESS_PAGE] callId recovered from sessionStorage:", parsed.callId);
          return parsed.callId;
        }
      }
    } catch (e) {
      console.warn("⚠️ [SUCCESS_PAGE] Error reading sessionStorage:", e);
    }
    console.error("❌ [SUCCESS_PAGE] No valid callId found");
    return null;
  }, [searchParams]);

  // P0 FIX: Recuperer paymentIntentId depuis URL ou sessionStorage (en cas de F5)
  const paymentIntentId = useMemo(() => {
    const urlPaymentIntentId = searchParams.get("paymentIntentId");
    if (urlPaymentIntentId && urlPaymentIntentId !== "undefined") {
      console.log("✅ [SUCCESS_PAGE] paymentIntentId from URL:", urlPaymentIntentId.substring(0, 15) + '...');
      return urlPaymentIntentId;
    }
    // Fallback: recuperer depuis sessionStorage (sauvegarde avant navigation)
    try {
      const savedData = sessionStorage.getItem('lastPaymentSuccess');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.paymentIntentId && parsed.savedAt && (Date.now() - parsed.savedAt) < 10 * 60 * 1000) {
          console.log("✅ [SUCCESS_PAGE] paymentIntentId recovered from sessionStorage:", parsed.paymentIntentId.substring(0, 15) + '...');
          return parsed.paymentIntentId;
        }
      }
    } catch (e) {
      console.warn("⚠️ [SUCCESS_PAGE] Error reading paymentIntentId from sessionStorage:", e);
    }
    console.warn("⚠️ [SUCCESS_PAGE] No valid paymentIntentId found");
    return null;
  }, [searchParams]);

  // >>> orderId pour le bloc "total payé + économies"
  // const { orderId } = useParams<{ orderId: string }>();
  const orderId = searchParams.get("orderId");

  // DEBUG: Log l'arrivée sur la page avec tous les paramètres
  useEffect(() => {
    const allParams = Object.fromEntries(searchParams.entries());

    navigationLogger.afterNavigate({
      path: location.pathname,
      searchParams: allParams
    });

    console.log("📍 [SUCCESS_PAGE_DEBUG] Page loaded with params:", {
      callStatus,
      providerId,
      callId,
      paymentIntentId: paymentIntentId?.substring(0, 15) + '...',
      orderId,
      allParams,
      timestamp: new Date().toISOString(),
      referrer: document.referrer
    });

    // Vérifier les paramètres manquants critiques
    const missingParams: string[] = [];
    if (!callId) missingParams.push('callId');
    if (!paymentIntentId) missingParams.push('paymentIntentId');

    if (missingParams.length > 0) {
      navigationLogger.urlParamsMissing({
        page: 'PaymentSuccess',
        missingParams
      });
      console.warn("⚠️ [SUCCESS_PAGE_DEBUG] Missing critical params:", missingParams);
    }
  }, []);

  // UI state (appel)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModelShown, setReviewModelShown] = useState(false);
  const [callState, setCallState] = useState<CallState>(
    callStatus === "failed" ? "failed" : "connecting"
  );
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownToCall, setCountdownToCall] = useState(240); // 5 minutes
  const [paymentTimestamp, setPaymentTimestamp] = useState<number | null>(null);
  // P0 FIX: Track failure reason to display the correct message (client vs provider no_answer)
  const [failureReason, setFailureReason] = useState<string | null>(null);
  // P0 FIX: Track actual call duration to prevent review if call didn't happen
  const [callDuration, setCallDuration] = useState<number>(0);

  // Service data
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidServiceType, setPaidServiceType] = useState<string>("");
  const [paidDuration, setPaidDuration] = useState<number>(0);
  const [providerRole, setProviderRole] = useState<string>("");

  const isLawyer = useMemo(
    () => paidServiceType === "lawyer_call" || providerRole === "lawyer",
    [paidServiceType, providerRole]
  );

  /* =========================
     Helpers provider depuis storage
     ========================= */
  const getProviderFromStorage = useCallback((): ProviderInfo | null => {
    try {
      const savedProvider = sessionStorage.getItem("selectedProvider");
      if (savedProvider) {
        const providerData = JSON.parse(savedProvider);
        return {
          id: providerData.id,
          name: providerData.name,
          type: providerData.type,
          price: providerData.price,
          duration: providerData.duration,
          role: providerData.type,
        };
      }

      const savedRequest = sessionStorage.getItem("bookingRequest");
      if (savedRequest) {
        const requestData = JSON.parse(savedRequest);
        return {
          id: requestData.providerId,
          name: requestData.providerName,
          type: requestData.providerType,
          price: requestData.price,
          duration: requestData.duration,
          role: requestData.providerType,
        };
      }

      const legacyProvider = sessionStorage.getItem("providerData");
      if (legacyProvider) {
        const providerData = JSON.parse(legacyProvider);
        return {
          id: providerData.id || providerId,
          name: providerData.name,
          type: providerData.type,
          price: providerData.price,
          duration: providerData.duration,
          role: providerData.type,
        };
      }
    } catch (error) {
      console.error("Error parsing provider data:", error);
    }
    return null;
  }, [providerId]);

  /* =========================
     Init infos service (montant/durée) via URL ou storage
     ========================= */
  const initializeServiceData = useCallback(() => {
    const urlAmount = searchParams.get("amount");
    const urlServiceType =
      searchParams.get("serviceType") || searchParams.get("service");
    const urlDuration = searchParams.get("duration");
    const urlProviderRole = searchParams.get("providerRole");

    if (urlAmount && urlServiceType) {
      const parsedAmount = parseFloat(urlAmount);
      setPaidAmount(Number.isNaN(parsedAmount) ? 0 : parsedAmount);
      setPaidServiceType(urlServiceType);
      const parsedDuration = urlDuration ? parseInt(urlDuration, 10) : 0;
      const d = Number.isNaN(parsedDuration) ? 0 : parsedDuration;
      setPaidDuration(d);
      setProviderRole(urlProviderRole || "");
      setTimeRemaining(d * 60);
      return;
    }

    const providerInfo = getProviderFromStorage();
    if (providerInfo) {
      const price =
        providerInfo.price || (providerInfo.type === "lawyer" ? 49 : 19);
      const duration =
        providerInfo.duration || (providerInfo.type === "lawyer" ? 20 : 30);

      setPaidAmount(price);
      setPaidServiceType(
        providerInfo.type === "lawyer" ? "lawyer_call" : "expat_call"
      );
      setPaidDuration(duration);
      setProviderRole(providerInfo.type);
      setTimeRemaining(duration * 60);
      return;
    }

    const fallbackProvider =
      PROVIDER_DEFAULTS[providerId as keyof typeof PROVIDER_DEFAULTS];
    if (fallbackProvider) {
      setPaidAmount(fallbackProvider.price);
      setPaidServiceType(
        fallbackProvider.type === "lawyer" ? "lawyer_call" : "expat_call"
      );
      setPaidDuration(fallbackProvider.duration);
      setProviderRole(fallbackProvider.role);
      setTimeRemaining(fallbackProvider.duration * 60);
    }
  }, [searchParams, providerId, getProviderFromStorage]);

  /* =========================
     Timestamp de paiement (PaymentIntent) - inchangé
     P0 FIX: Attendre que l'auth soit prête avant d'accéder à Firestore
     ========================= */
  useEffect(() => {
    if (!paymentIntentId || !isFullyReady) return;

    const sessionKey = `payment_timestamp_${paymentIntentId}`;
    try {
      const savedTimestamp = sessionStorage.getItem(sessionKey);
      if (savedTimestamp) {
        const timestamp = parseInt(savedTimestamp, 10);
        if (!Number.isNaN(timestamp)) {
          setPaymentTimestamp(timestamp);
          return;
        }
      }
    } catch {}

    const fetchPaymentTimestamp = async () => {
      try {
        const paymentDoc = await getDoc(doc(db, "payments", paymentIntentId));
        if (paymentDoc.exists()) {
          const data: any = paymentDoc.data();
          let timestamp: number | null = null;

          if (data.paymentSuccessTimestamp) {
            timestamp = data.paymentSuccessTimestamp.toDate?.()
              ? data.paymentSuccessTimestamp.toDate().getTime()
              : data.paymentSuccessTimestamp;
          } else if (data.updatedAt) {
            timestamp = data.updatedAt.toDate?.()
              ? data.updatedAt.toDate().getTime()
              : data.updatedAt;
          } else if (data.createdAt) {
            timestamp = data.createdAt.toDate?.()
              ? data.createdAt.toDate().getTime()
              : data.createdAt;
          }

          if (timestamp) {
            setPaymentTimestamp(timestamp);
            sessionStorage.setItem(sessionKey, String(timestamp));
          } else {
            const now = Date.now();
            setPaymentTimestamp(now);
            sessionStorage.setItem(sessionKey, String(now));
          }
        } else {
          const now = Date.now();
          setPaymentTimestamp(now);
          sessionStorage.setItem(sessionKey, String(now));
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du timestamp:", error);
        const now = Date.now();
        setPaymentTimestamp(now);
        sessionStorage.setItem(sessionKey, String(now));
      }
    };

    fetchPaymentTimestamp();
  }, [paymentIntentId, isFullyReady]);

  /* =========================
     Compte à rebours “ready_to_ring”
     ========================= */
  useEffect(() => {
    if (!paymentTimestamp || callState !== "connecting") return;

    const updateCountdown = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - paymentTimestamp) / 1000);
      const totalCountdownSeconds = 240; // 5 min
      const remainingSeconds = Math.max(
        0,
        totalCountdownSeconds - elapsedSeconds
      );

      setCountdownToCall(remainingSeconds);

      if (remainingSeconds === 0 && callState === "connecting") {
        setCallState("ready_to_ring");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [paymentTimestamp, callState]);

  /* =========================
     Timer local en “in_progress”
     ========================= */
  useEffect(() => {
    if (callState !== "in_progress" || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [callState, timeRemaining]);

  /* =========================
     Init données
     ========================= */
  useEffect(() => {
    initializeServiceData();
  }, [initializeServiceData]);

  /* =========================
     Écoute Firestore : état de l'appel
     P1 FIX: Ajout de retry si le document n'existe pas encore
     ========================= */
  const [sessionRetryCount, setSessionRetryCount] = useState(0);
  const MAX_SESSION_RETRIES = 10; // 10 retries x 2s = 20s max wait

  useEffect(() => {
    // P0 FIX: Attendre que l'auth soit prête avant d'écouter Firestore
    if (!callId || !isFullyReady) return;

    const ref = doc(db, "call_sessions", callId);
    let retryTimeout: NodeJS.Timeout | null = null;

    const unsub = onSnapshot(ref, (snap) => {
      // P1 FIX: Si le document n'existe pas, retry après délai
      if (!snap.exists()) {
        // DEBUG: Log détaillé pour le retry
        firestoreLogger.retry({
          collection: 'call_sessions',
          docId: callId,
          attempt: sessionRetryCount + 1,
          maxAttempts: MAX_SESSION_RETRIES
        });

        callLogger.docNotFound({
          callSessionId: callId,
          retryCount: sessionRetryCount + 1
        });

        console.log(`⏳ [SUCCESS_PAGE_DEBUG] call_sessions/${callId} not found`, {
          retryCount: sessionRetryCount + 1,
          maxRetries: MAX_SESSION_RETRIES,
          waitTime: '2000ms',
          timestamp: new Date().toISOString()
        });

        if (sessionRetryCount < MAX_SESSION_RETRIES) {
          retryTimeout = setTimeout(() => {
            setSessionRetryCount(prev => prev + 1);
          }, 2000); // Retry every 2 seconds
        } else {
          console.error(`❌ [SUCCESS_PAGE_DEBUG] Max retries reached for call_sessions/${callId}`);
        }
        return;
      }

      // Document exists, reset retry counter
      firestoreLogger.snapshot({
        collection: 'call_sessions',
        docId: callId,
        exists: true,
        status: snap.data()?.status
      });

      if (sessionRetryCount > 0) {
        callLogger.docFound({
          callSessionId: callId,
          status: snap.data()?.status || 'unknown'
        });
        console.log(`✅ [SUCCESS_PAGE_DEBUG] call_sessions/${callId} found after ${sessionRetryCount} retries`, {
          status: snap.data()?.status,
          timestamp: new Date().toISOString()
        });
        setSessionRetryCount(0);
      }

      const data = snap.data() as any;

      // DEBUG: Log le changement de statut
      const newStatus = data?.status;
      if (newStatus && newStatus !== callState) {
        callLogger.statusChange({
          callSessionId: callId,
          prevStatus: callState,
          newStatus: newStatus
        });
        console.log(`🔄 [SUCCESS_PAGE_DEBUG] Call status changed: ${callState} → ${newStatus}`, {
          callId,
          timestamp: new Date().toISOString()
        });
      }

      // Handle status changes
      // P0 FIX: "pending" est le statut initial du backend (TwilioCallManager)
      // Il doit être mappé vers "connecting" côté frontend
      switch (data?.status) {
        case "pending":
        case "scheduled":
          if (callState !== "connecting") {
            setCallState("connecting");
          }
          break;
        case "provider_connecting":
        case "client_connecting":
          setCallState("ready_to_ring");
          break;
        case "active":
        case "both_connecting":
          setCallState("in_progress");
          break;
        case "completed":
          setCallState("completed");
          // P0 FIX: Store actual call duration to check before allowing review
          const duration = data?.actualDuration || data?.duration || 0;
          setCallDuration(duration);
          break;
        case "failed":
        case "cancelled":
          setCallState("failed");
          // P0 FIX: Extract failure reason to show correct message (client vs provider no_answer)
          if (data?.payment?.refundReason) {
            setFailureReason(data.payment.refundReason);
            console.log(`🔵 [SUCCESS_PAGE_DEBUG] Failure reason: ${data.payment.refundReason}`);
          }
          break;
        default:
          if (data?.status) {
            console.log(`🔵 [SUCCESS_PAGE_DEBUG] Unknown call status: ${data.status}`);
          }
          break;
      }

      // P0 FIX: Only show review modal if call actually happened (duration >= 5 minutes)
      const actualDuration = data?.actualDuration || data?.duration || 0;
      const MIN_DURATION_FOR_REVIEW = 300; // 5 minutes
      if (data?.status === "completed" && !reviewModelShown && actualDuration >= MIN_DURATION_FOR_REVIEW) {
        console.log(`🔵 [SUCCESS_PAGE_DEBUG] Call completed with duration ${actualDuration}s, showing review modal in 1.5s`);
        setTimeout(() => {
          setShowReviewModal(true);
          setReviewModelShown(true);
        }, 1500);
      } else if (data?.status === "completed" && !reviewModelShown && actualDuration < MIN_DURATION_FOR_REVIEW) {
        console.log(`🔵 [SUCCESS_PAGE_DEBUG] Call completed but duration too short (${actualDuration}s < ${MIN_DURATION_FOR_REVIEW}s), NOT showing review modal`);
      }
    }, (error) => {
      // P1 FIX: Handle errors with retry
      firestoreLogger.snapshotError({
        collection: 'call_sessions',
        docId: callId,
        error: error?.message || String(error)
      });

      console.error(`❌ [SUCCESS_PAGE_DEBUG] onSnapshot error for call_sessions/${callId}:`, {
        error: error?.message || String(error),
        code: error?.code,
        retryCount: sessionRetryCount,
        maxRetries: MAX_SESSION_RETRIES,
        timestamp: new Date().toISOString()
      });

      if (sessionRetryCount < MAX_SESSION_RETRIES) {
        console.log(`🔄 [SUCCESS_PAGE_DEBUG] Retrying onSnapshot in 3s...`);
        retryTimeout = setTimeout(() => {
          setSessionRetryCount(prev => prev + 1);
        }, 3000);
      } else {
        console.error(`❌ [SUCCESS_PAGE_DEBUG] Max retries reached, giving up on call_sessions/${callId}`);
      }
    });

    return () => {
      unsub();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  // P0 FIX: Ne PAS inclure callState dans les dépendances - cause une boucle infinie
  // car chaque changement de callState déclenche un nouveau onSnapshot qui change callState
  // P0 FIX: Inclure isFullyReady pour attendre que l'auth soit prête
  }, [callId, sessionRetryCount, reviewModelShown, isFullyReady]);

  /* =========================
     Utils
     ========================= */
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  /* =========================
     >>> PARTIE "ORDER" pour Total payé + Économies
     P1 FIX: Ajout de retry si le document n'existe pas encore
     ========================= */
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [orderLoading, setOrderLoading] = useState<boolean>(true);
  const [orderRetryCount, setOrderRetryCount] = useState(0);
  const MAX_ORDER_RETRIES = 8; // 8 retries x 2s = 16s max wait

  useEffect(() => {
    if (!orderId) {
      setOrderLoading(false);
      return;
    }
    // P0 FIX: Attendre que l'auth soit prête avant d'écouter Firestore
    if (!isFullyReady) return;

    const ref = doc(db, "orders", orderId);
    setOrderLoading(true);
    let retryTimeout: NodeJS.Timeout | null = null;

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setOrderLoading(false);
          const orderData = { id: snap.id, ...(snap.data() as OrderDoc) };
          setOrder(orderData);

          firestoreLogger.snapshot({
            collection: 'orders',
            docId: orderId,
            exists: true
          });

          if (orderRetryCount > 0) {
            console.log(`✅ [SUCCESS_PAGE_DEBUG] orders/${orderId} found after ${orderRetryCount} retries`, {
              amount: orderData.amount,
              currency: orderData.currency,
              timestamp: new Date().toISOString()
            });
            setOrderRetryCount(0);
          } else {
            console.log(`🔵 [SUCCESS_PAGE_DEBUG] Order loaded:`, {
              orderId,
              amount: orderData.amount,
              currency: orderData.currency
            });
          }
        } else {
          // P1 FIX: Document doesn't exist yet, retry
          firestoreLogger.retry({
            collection: 'orders',
            docId: orderId,
            attempt: orderRetryCount + 1,
            maxAttempts: MAX_ORDER_RETRIES
          });

          console.log(`⏳ [SUCCESS_PAGE_DEBUG] orders/${orderId} not found`, {
            retryCount: orderRetryCount + 1,
            maxRetries: MAX_ORDER_RETRIES,
            waitTime: '2000ms',
            timestamp: new Date().toISOString()
          });

          if (orderRetryCount < MAX_ORDER_RETRIES) {
            retryTimeout = setTimeout(() => {
              setOrderRetryCount(prev => prev + 1);
            }, 2000);
          } else {
            console.warn(`⚠️ [SUCCESS_PAGE_DEBUG] Max retries reached for orders/${orderId}, giving up`);
            setOrderLoading(false);
            setOrder(null);
          }
        }
      },
      (error) => {
        firestoreLogger.snapshotError({
          collection: 'orders',
          docId: orderId,
          error: error?.message || String(error)
        });

        console.error(`❌ [SUCCESS_PAGE_DEBUG] Order onSnapshot error:`, {
          orderId,
          error: error?.message || String(error),
          timestamp: new Date().toISOString()
        });
        setOrderLoading(false);
      }
    );

    return () => {
      unsub();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  // P0 FIX: Inclure isFullyReady pour attendre que l'auth soit prête
  }, [orderId, orderRetryCount, isFullyReady]);

  /* =========================
     GÉNÉRATION AUTOMATIQUE DES FACTURES
     ========================= */
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);

  useEffect(() => {
    // Ne générer qu'une seule fois et seulement si on a les données nécessaires
    // P0 FIX: Attendre que l'auth soit prête avant d'accéder à Firestore
    if (!callId || !user?.uid || invoiceGenerated || !isFullyReady) return;

    // Vérifier dans sessionStorage si déjà généré pour cette session
    const invoiceKey = `invoice_generated_${callId}`;
    if (sessionStorage.getItem(invoiceKey)) {
      setInvoiceGenerated(true);
      return;
    }

    const generateInvoices = async () => {
      try {
        console.log("🧾 Vérification et génération des factures pour l'appel:", callId);

        // 1. Vérifier si les factures existent déjà dans la base
        // P0 FIX: Ajouter clientId au filtre pour respecter les règles Firestore
        const currentUserId = user?.uid;
        if (!currentUserId) {
          console.warn("⚠️ Utilisateur non connecté, impossible de vérifier les factures");
          return;
        }
        const existingInvoicesQuery = query(
          collection(db, 'invoice_records'),
          where('callId', '==', callId),
          where('clientId', '==', currentUserId),
          firestoreLimit(1)
        );
        const existingInvoices = await getDocs(existingInvoicesQuery);

        if (!existingInvoices.empty) {
          console.log("✅ Factures déjà générées pour cet appel");
          sessionStorage.setItem(invoiceKey, 'true');
          setInvoiceGenerated(true);
          return;
        }

        // 2. Récupérer les données de la call_session
        const callSessionRef = doc(db, 'call_sessions', callId);
        const callSessionSnap = await getDoc(callSessionRef);

        if (!callSessionSnap.exists()) {
          console.warn("⚠️ Call session non trouvée:", callId);
          return;
        }

        const callSessionData = callSessionSnap.data();

        // 3. Récupérer le paiement associé (Stripe ou PayPal)
        // P0 FIX: Ajouter clientId au filtre pour respecter les règles Firestore
        let paymentData: Record<string, any> | null = null;

        // Essayer d'abord la collection 'payments' (Stripe)
        const paymentQuery = query(
          collection(db, 'payments'),
          where('callSessionId', '==', callId),
          where('clientId', '==', currentUserId),
          firestoreLimit(1)
        );
        const paymentSnap = await getDocs(paymentQuery);

        if (!paymentSnap.empty) {
          paymentData = paymentSnap.docs[0].data();
        } else {
          // Essayer avec callId
          const paymentQuery2 = query(
            collection(db, 'payments'),
            where('callId', '==', callId),
            where('clientId', '==', currentUserId),
            firestoreLimit(1)
          );
          const paymentSnap2 = await getDocs(paymentQuery2);

          if (!paymentSnap2.empty) {
            paymentData = paymentSnap2.docs[0].data();
          }
        }

        // Si pas trouvé dans 'payments', vérifier si c'est un paiement PayPal
        // Les données PayPal sont stockées dans call_sessions.payment
        if (!paymentData && callSessionData.payment) {
          console.log("💳 Utilisation des données de paiement PayPal depuis call_sessions");
          const isPayPal = callSessionData.payment.gateway === 'paypal' ||
                          callSessionData.payment.paymentMethod === 'paypal' ||
                          !!callSessionData.payment.paypalOrderId;

          if (isPayPal) {
            // Récupérer les montants depuis paypal_orders si disponible
            let paypalOrderData: Record<string, any> | null = null;
            if (callSessionData.payment.paypalOrderId) {
              const paypalOrderDoc = await getDoc(doc(db, 'paypal_orders', callSessionData.payment.paypalOrderId));
              if (paypalOrderDoc.exists()) {
                paypalOrderData = paypalOrderDoc.data();
              }
            }

            paymentData = {
              amount: paypalOrderData?.capturedGrossAmount || paypalOrderData?.amount || callSessionData.payment.amount || paidAmount,
              platformFee: paypalOrderData?.capturedPlatformFee || paypalOrderData?.platformFee || callSessionData.payment.platformFee,
              providerAmount: paypalOrderData?.capturedProviderAmount || paypalOrderData?.providerAmount || callSessionData.payment.providerAmount,
              currency: paypalOrderData?.capturedCurrency || paypalOrderData?.currency || callSessionData.payment.currency || 'EUR',
              paymentMethod: 'paypal',
              paypalOrderId: callSessionData.payment.paypalOrderId,
              status: callSessionData.payment.status
            };
          }
        }

        if (!paymentData) {
          console.warn("⚠️ Paiement non trouvé pour cet appel (ni Stripe, ni PayPal)");
          return;
        }

        // 4. Construire les objets pour generateBothInvoices
        const callRecord = {
          id: callId,
          clientId: callSessionData.clientId || user.uid,
          providerId: callSessionData.providerId || '',
          clientName: callSessionData.clientName || user.displayName || '',
          providerName: callSessionData.providerName || '',
          serviceType: (callSessionData.serviceType || 'lawyer_call') as 'lawyer_call' | 'expat_advice' | 'emergency_help',
          duration: callSessionData.duration || paidDuration || 20,
          clientCountry: callSessionData.clientCountry || '',
          providerCountry: callSessionData.providerCountry || '',
          createdAt: callSessionData.createdAt?.toDate?.() || new Date()
        };

        // Calculer les frais de plateforme (commission)
        // Pour PayPal, utiliser les montants déjà calculés côté serveur
        const totalAmount = paymentData.amount || paidAmount || 0;
        let platformFee: number;
        let providerAmountCalc: number;

        if (paymentData.platformFee !== undefined && paymentData.providerAmount !== undefined) {
          // Utiliser les montants déjà calculés (PayPal ou données existantes)
          platformFee = paymentData.platformFee;
          providerAmountCalc = paymentData.providerAmount;
        } else {
          // Calculate from centralized admin_config/pricing
          const serviceType = callRecord.serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
          const pricingConfig = pricing?.[serviceType]?.eur;

          // Use connectionFeeAmount from admin_config/pricing, with fallback
          platformFee = pricingConfig?.connectionFeeAmount ?? Math.round(totalAmount * 0.39 * 100) / 100;
          providerAmountCalc = pricingConfig?.providerAmount ?? Math.round((totalAmount - platformFee) * 100) / 100;
        }

        const payment = {
          amount: totalAmount,
          platformFee: platformFee,
          providerAmount: providerAmountCalc,
          clientEmail: paymentData.clientEmail || user.email || '',
          providerEmail: paymentData.providerEmail || '',
          providerPhone: paymentData.providerPhone || '',
          providerId: callSessionData.providerId || '',
          paymentMethod: paymentData.paymentMethod || 'card',
          currency: paymentData.currency || 'EUR',
          transactionId: paymentData.stripePaymentIntentId || paymentData.paypalOrderId || paymentIntentId || ''
        };

        console.log("📄 Génération des factures avec:", { callRecord, payment });

        // 5. Générer les factures
        const result = await generateBothInvoices(
          callRecord,
          payment,
          user?.uid || '',
          {
            locale: language || 'en',
            metadata: {
              sessionId: callId,
              userAgent: navigator.userAgent
            }
          }
        );

        console.log("✅ Factures générées avec succès:", result);

        // 6. Mettre à jour le flag invoicesCreated dans call_sessions pour éviter
        // que le serveur (TwilioCallManager) ne régénère des factures en doublon
        try {
          await updateDoc(callSessionRef, {
            'metadata.invoicesCreated': true,
            'metadata.invoicesCreatedAt': serverTimestamp(),
            'metadata.invoiceNumbers': result.invoiceNumbers
          });
          console.log("✅ Flag invoicesCreated mis à jour dans call_sessions");
        } catch (updateError) {
          console.warn("⚠️ Impossible de mettre à jour le flag invoicesCreated:", updateError);
          // Non bloquant - les factures sont quand même générées
        }

        sessionStorage.setItem(invoiceKey, 'true');
        setInvoiceGenerated(true);

      } catch (error) {
        console.error("❌ Erreur lors de la génération des factures:", error);
        // Ne pas bloquer l'UX, les factures peuvent être générées plus tard par le serveur
      }
    };

    // Attendre un peu pour s'assurer que le paiement est bien enregistré
    const timer = setTimeout(() => {
      generateInvoices();
    }, 3000);

    return () => clearTimeout(timer);
  // P0 FIX: Inclure isFullyReady pour attendre que l'auth soit prête
  }, [callId, user?.uid, invoiceGenerated, language, paidAmount, paidDuration, paymentIntentId, isFullyReady, pricing]);

  // Devise / symbole (pour le bloc order)
  const orderCurrency: Currency = (order?.currency as Currency) ?? "eur";
  const C = orderCurrency === "eur" ? "€" : "$";

  // Helpers numériques pour bloc order
  const toNum = (v: unknown): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* =========================
     Rendu
     ========================= */
  if (!paidAmount && !paidServiceType) {
    // Garde-fou si jamais pas d'info service (cohérent avec ton ancien rendu)
    return (
      <Layout>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              {/* {t.serviceNotFound} */}
              {intl.formatMessage({ id: "success.serviceNotFound" })}
            </h1>
            <a href="/" className="text-red-400 hover:text-red-300">
              {/* {t.backToHome} */}
              {intl.formatMessage({ id: "success.backToHome" })}
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950">
        {/* Hero Section avec état dynamique */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10" />

          {/* Particules */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
            {/* Badge statut */}
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full pl-6 pr-6 py-3 border border-white/20 mb-8">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-white font-semibold">
                {/* {t.paymentSuccessful} */}
                {intl.formatMessage({ id: "success.paymentSuccessful" })}
              </span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>

            {/* Timestamp paiement si présent */}
            {paymentTimestamp && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                  <Clock className="w-4 h-4 text-gray-300" />
                  <span className="text-white/80 text-sm">
                    {intl.formatMessage({ id: "success.paymentAt" })}:{" "}
                    {formatDateTime(
                      paymentTimestamp,
                      {
                        language,
                        userCountry: (user as { currentCountry?: string; country?: string })?.currentCountry || 
                                    (user as { currentCountry?: string; country?: string })?.country ||
                                    (urlCountry ? urlCountry.toUpperCase() : undefined),
                      }
                    )}{" "}
                    ✨
                  </span>
                </div>
              </div>
            )}

            {/* Loading timestamp */}
            {!paymentTimestamp && callState === "connecting" && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white/60 text-sm">
                    {/* {t.loadingPaymentInfo} */}
                    {intl.formatMessage({ id: "success.loadingPaymentInfo" })}
                  </span>
                </div>
              </div>
            )}

            {/* États */}
            {callState === "connecting" && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                    {/* {t.countdownTitle} */}
                    {intl.formatMessage({ id: "success.countdownTitle" })}
                  </span>
                </h1>

                <div className="mb-8">
                  {paymentTimestamp ? (
                    <>
                      <div className="inline-flex items-center justify-center w-48 h-48 rounded-full bg-gradient-to-r from-red-600 to-orange-500 shadow-2xl mb-6">
                        <div className="w-44 h-44 rounded-full bg-gray-950 flex items-center justify-center">
                          <div className="text-6xl font-black text-white">
                            {formatTime(countdownToCall)}
                          </div>
                        </div>
                      </div>
                      <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        {/* {t.connecting} */}
                        {intl.formatMessage({ id: "success.connecting" })}
                      </p>
                      <div className="mt-4 inline-flex items-center space-x-2 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2">
                        <span className="text-white/70 text-sm">
                          {/* {t.almostThere} */}
                          {intl.formatMessage({ id: "success.almostThere" })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-blue-600 to-purple-500 shadow-2xl mb-6">
                        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                      <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        {/* {t.loadingPaymentInfo} */}
                        {intl.formatMessage({
                          id: "success.loadingPaymentInfo",
                        })}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}

            {callState === "ready_to_ring" && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {/* {t.readyToRingTitle} */}
                    {intl.formatMessage({ id: "success.readyToRingTitle" })}
                  </span>
                </h1>

                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-green-500 to-blue-500 shadow-2xl mb-6 animate-bounce">
                    <Phone className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                    {/* {t.readyToRingDesc} */}
                    {intl.formatMessage({ id: "success.readyToRingDesc" })}
                  </p>
                  <div className="mt-4 inline-flex items-center space-x-2 bg-green-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-400/20">
                    <span className="text-green-300 text-sm font-medium">
                      {/* {t.expertComing} */}
                      {intl.formatMessage({ id: "success.expertComing" })}
                    </span>
                  </div>
                </div>
              </>
            )}

            {callState === "in_progress" && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {/* {t.callInProgress} */}
                    {intl.formatMessage({ id: "success.callInProgress" })}
                  </span>
                </h1>

                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-green-500 to-blue-500 shadow-2xl mb-6">
                    <Phone className="w-16 h-16 text-white animate-pulse" />
                  </div>
                  <div className="text-4xl font-black text-white mb-4">
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-xl text-gray-300">
                    {/* {t.timeRemaining} */}
                    {intl.formatMessage({ id: "success.timeRemaining" })}
                  </p>
                  <div className="mt-4 inline-flex items-center space-x-2 bg-green-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-400/20">
                    <span className="text-green-300 text-sm font-medium">
                      {/* {t.youRock} */}
                      {intl.formatMessage({ id: "success.youRock" })}
                    </span>
                  </div>
                </div>
              </>
            )}

            {callState === "completed" && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {/* {t.callCompleted} */}
                    {intl.formatMessage({ id: "success.callCompleted" })}
                  </span>
                </h1>

                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-green-500 to-blue-500 shadow-2xl mb-6">
                    <CheckCircle className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                    {/* {t.thankYou} */}
                    {intl.formatMessage({ id: "success.thankYou" })}
                  </p>
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 backdrop-blur-sm rounded-full px-6 py-3 border border-yellow-400/20">
                    <span className="text-yellow-300 text-lg font-bold">
                      {/* {t.superFast} */}
                      {intl.formatMessage({ id: "success.superFast" })}
                    </span>
                  </div>
                </div>
              </>
            )}

            {callState === "failed" && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                    {/* P0 FIX: Show different title based on who didn't answer */}
                    {failureReason?.includes("client_no_answer")
                      ? intl.formatMessage({ id: "success.clientNoAnswerTitle" })
                      : intl.formatMessage({ id: "success.callFailed" })}
                  </span>
                </h1>

                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-red-500 to-orange-500 shadow-2xl mb-6">
                    <AlertCircle className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                    {/* P0 FIX: Show different message based on who didn't answer */}
                    {failureReason?.includes("client_no_answer")
                      ? intl.formatMessage({ id: "success.clientNoAnswer" })
                      : intl.formatMessage({ id: "success.expertNoAnswer" })}
                  </p>
                  <button
                    onClick={() => navigate("/prestataires")}
                    className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    {/* {t.chooseAnother} */}
                    {intl.formatMessage({ id: "success.chooseAnother" })}
                    🔄
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* =========================
            SECTION RÉCAP “TOTAL PAYÉ + ÉCONOMIES”
            ========================= */}
        <section className="pb-4 bg-gray-950 mt-4">
          <div className="max-w-4xl mx-auto px-6">
            <div className="rounded-2xl border border-green-300/30 bg-green-50/90 p-4 md:p-5">
              {/* État de chargement de l'order */}
              {orderLoading && (
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-green-200/70 animate-pulse rounded" />
                  <div className="h-4 w-64 bg-green-200/50 animate-pulse rounded" />
                </div>
              )}

              {/* Order absent */}
              {!orderLoading && !order && (
                <div className="text-green-900/80 text-sm">
                  {intl.formatMessage(
                    { id: "success.orderNotFound" },
                    { orderId: orderId || "" }
                  )}
                </div>
              )}

              {/* Bloc récap (si order) */}
              {!!order && (
                <div className="space-y-1">
                  {/* Total payé */}
                  <div className="flex justify-between">
                    <span className="text-green-900/80">
                      {intl.formatMessage({ id: "success.totalPaid" })}
                    </span>
                    <span className="font-bold text-green-900">
                      {C}
                      {fmt(toNum(order.amount))}
                    </span>
                  </div>

                  {/* Badge override */}
                  {order?.metadata?.price_origin === "override" &&
                    !!order?.metadata?.override_label && (
                      <div className="text-sm text-green-700">
                        {intl.formatMessage({ id: "success.specialPrice" })}{" "}
                        {order.metadata!.override_label}
                      </div>
                    )}
                  {/* Remise coupon */}
                  {toNum(order?.coupon?.discountAmount) > 0 && (
                    <div className="text-sm text-green-700">
                      {intl.formatMessage(
                        { id: "success.couponDiscount" },
                        {
                          code: order?.coupon?.code || "",
                          symbol: C,
                          amount: fmt(toNum(order?.coupon?.discountAmount)),
                        }
                      )}
                    </div>
                  )}

                  {/* Économies (si metadata dispo) */}
                  {(() => {
                    const original = toNum(
                      order?.metadata?.original_standard_amount || 0
                    ); // ex: 100
                    const effectiveBase = toNum(
                      order?.metadata?.effective_base_amount || 0
                    ); // ex: 39 (après override)
                    const paid = toNum(order?.amount || 0); // ex: 31.20 (après coupon)
                    const savedFromOverride = Math.max(
                      0,
                      original - effectiveBase
                    );
                    const savedFromCoupon = Math.max(0, effectiveBase - paid);
                    const totalSaved = Math.max(0, original - paid);
                    if (!original || totalSaved <= 0) return null;
                    return (
                      <div className="text-sm text-emerald-700">
                        {intl.formatMessage(
                          { id: "success.youSaved" },
                          { symbol: C, amount: fmt(totalSaved) }
                        )}
                        {savedFromOverride > 0 &&
                          ` ${intl.formatMessage(
                            { id: "success.viaSpecialPrice" },
                            {
                              symbol: C,
                              amount: fmt(savedFromOverride),
                            }
                          )}`}
                        {savedFromCoupon > 0 &&
                          ` ${intl.formatMessage(
                            { id: "success.viaCoupon" },
                            {
                              symbol: C,
                              amount: fmt(savedFromCoupon),
                              code: order?.coupon?.code ?? "",
                            }
                          )}`}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Détails "debug" optionnels */}
            {!!order && (
              <details className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-white/80">
                <summary className="cursor-pointer select-none text-sm">
                  {intl.formatMessage({ id: "success.orderDetails" })}
                </summary>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{intl.formatMessage({ id: "success.currency" })}</span>
                    <span className="font-medium uppercase">
                      {orderCurrency}
                    </span>
                  </div>
                  {order?.metadata?.price_origin && (
                    <div className="flex justify-between">
                      <span>
                        {intl.formatMessage({ id: "success.priceOrigin" })}
                      </span>
                      <span className="font-medium">
                        {order.metadata!.price_origin}
                      </span>
                    </div>
                  )}
                  {order?.metadata?.override_label && (
                    <div className="flex justify-between">
                      <span>
                        {intl.formatMessage({ id: "success.overrideLabel" })}
                      </span>
                      <span className="font-medium">
                        {order.metadata!.override_label}
                      </span>
                    </div>
                  )}
                  {typeof order?.metadata?.original_standard_amount !==
                    "undefined" && (
                    <div className="flex justify-between">
                      <span>
                        {intl.formatMessage({
                          id: "success.originalStandard",
                        })}
                      </span>
                      <span className="font-medium">
                        {C}
                        {fmt(toNum(order?.metadata?.original_standard_amount))}
                      </span>
                    </div>
                  )}
                  {typeof order?.metadata?.effective_base_amount !==
                    "undefined" && (
                    <div className="flex justify-between">
                      <span>
                        {intl.formatMessage({ id: "success.effectiveBase" })}
                      </span>
                      <span className="font-medium">
                        {C}
                        {fmt(toNum(order?.metadata?.effective_base_amount))}
                      </span>
                    </div>
                  )}
                  {order?.coupon?.code && (
                    <div className="flex justify-between">
                      <span>
                        {intl.formatMessage({ id: "success.coupon" })}
                      </span>
                      <span className="font-medium">
                        {order.coupon.code} (-{C}
                        {fmt(toNum(order?.coupon?.discountAmount))})
                      </span>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </section>

        {/* Section Détails du service (ton bloc existant conservé) */}
        <section className="py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                {isLawyer ? (
                  <>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    {/* {t.serviceDetails} */}
                    {intl.formatMessage({ id: "success.serviceDetails" })} —{" "}
                    {intl.formatMessage({ id: "success.lawyerLabel" })}
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <User className="w-5 h-5" />
                    </div>
                    {/* {t.serviceDetails} */}
                    {intl.formatMessage({ id: "success.serviceDetails" })} —{" "}
                    {intl.formatMessage({ id: "success.expatLabel" })}
                  </>
                )}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-gray-600 font-medium">
                      {/* {t.service} */}
                      {intl.formatMessage({ id: "success.service" })}:
                    </span>
                    <span className="font-bold text-gray-900">
                      {isLawyer
                        ? intl.formatMessage({ id: "success.lawyerCall" })
                        : intl.formatMessage({ id: "success.expatCall" })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-gray-600 font-medium">
                      {/* {t.duration} */}
                      {intl.formatMessage({ id: "success.duration" })}:
                    </span>
                    <span className="font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {paidDuration || (isLawyer ? "20" : "30")} min
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl border border-green-200">
                    <span className="text-green-700 font-medium">
                      {/* {t.price} */}
                      {intl.formatMessage({ id: "success.price" })}:
                    </span>

                    <span className="font-black text-2xl text-green-800">
                      {C}
                      {fmt(toNum(order?.amount || paidAmount))}
                    </span>
                    {/* <span className="font-black text-2xl text-green-800">
                      <span className="font-bold text-green-900">
                      {C}
                      {fmt(toNum(order?.amount))}
                      </span>
                      €{paidAmount || (isLawyer ? "49" : "19")}
                    </span> */}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-gray-600 font-medium">
                      {/* {t.date} */}
                      {intl.formatMessage({ id: "success.date" })}:
                    </span>
                    <span className="font-bold text-gray-900">
                      {formatDate(
                        new Date(),
                        {
                          language,
                          userCountry: (user as { currentCountry?: string; country?: string })?.currentCountry || 
                                      (user as { currentCountry?: string; country?: string })?.country ||
                                      (urlCountry ? urlCountry.toUpperCase() : undefined),
                          format: 'medium',
                        }
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Garanties */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center mb-4">
                  <span className="text-sm font-semibold text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                    {/* {t.allGood} */}
                    {intl.formatMessage({ id: "success.allGood" })}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      {intl.formatMessage({ id: "success.paymentSecure" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Zap className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      {intl.formatMessage({ id: "success.connectionFast" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">
                      {intl.formatMessage({
                        id: "success.satisfactionGuaranteed",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Raccourcis utiles */}
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-600">
              <Link to="/dashboard" className="underline hover:text-gray-800">
                {intl.formatMessage({ id: "success.clientSpace" })}
              </Link>
              <span>•</span>
              <Link to="/" className="underline hover:text-gray-800">
                {intl.formatMessage({ id: "success.home" })}
              </Link>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="py-16 bg-gray-950">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="space-y-4">
              {/* Laisser un avis -> uniquement quand l'appel est terminé ET a duré au moins 5 minutes */}
              {/* P0 FIX: Only show review button if call actually happened (duration >= 5 min) */}
              {callState === "completed" && callDuration >= 300 && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-4 px-8 rounded-2xl hover:scale-105 transition-all duration-300 font-bold text-lg inline-flex items-center justify-center gap-3"
                >
                  <Star size={20} />
                  {/* {t.leaveReview} */}
                  {intl.formatMessage({ id: "success.leaveReview" })}
                  <ArrowRight size={16} />
                </button>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate("/dashboard")} // ✅ P0 UX FIX: Use navigate instead of window.location.href
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white py-4 px-8 rounded-2xl hover:bg-white/20 transition-all duration-300 font-bold inline-flex items-center justify-center gap-3"
                >
                  {/* {t.goToDashboard} */}
                  {intl.formatMessage({ id: "success.goToDashboard" })}
                  🚀
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => navigate("/")}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 py-4 px-8 rounded-2xl hover:bg-white/10 hover:text-white transition-all duration-300 font-medium inline-flex items-center justify-center gap-3"
                >
                  {/* {t.backToHome} */}
                  {intl.formatMessage({ id: "success.backToHome" })}
                  🏠
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        providerId={providerId}
        providerName={
          isLawyer
            ? intl.formatMessage({ id: "success.providerNameLawyer" })
            : intl.formatMessage({ id: "success.providerNameExpat" })
        }
        callId={callId}
        serviceType={isLawyer ? "lawyer_call" : "expat_call"}
      />
    </Layout>
  );
};

export default SuccessPayment;
