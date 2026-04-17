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
import { trackMetaPurchase, setMetaPixelUserData } from "../utils/metaPixel";
import { trackGoogleAdsPurchase, setGoogleAdsUserData } from "../utils/googleAds";
import { trackAdPurchase } from "../services/adAttributionService";
import { trackEvent } from "../utils/ga4";
import { getOrCreateEventId } from "../utils/sharedEventId";

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

  // P0 FIX 2026-02-02: Récupérer les données PRINCIPALEMENT depuis sessionStorage (URL propre)
  // Fallback sur les paramètres URL pour rétrocompatibilité avec anciens liens
  const paymentData = useMemo(() => {
    // Priorité 1: sessionStorage (données fraîches, URL propre)
    try {
      const savedData = sessionStorage.getItem('lastPaymentSuccess');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Vérifier que les données ne sont pas expirées (10 minutes)
        if (parsed.savedAt && (Date.now() - parsed.savedAt) < 10 * 60 * 1000) {
          console.log("✅ [SUCCESS_PAGE] Data loaded from sessionStorage:", {
            callId: parsed.callId,
            orderId: parsed.orderId,
            paymentIntentId: parsed.paymentIntentId?.substring(0, 15) + '...',
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn("⚠️ [SUCCESS_PAGE] Error reading sessionStorage:", e);
    }

    // Priorité 2: URL params (rétrocompatibilité avec anciens liens / F5 après expiration)
    const urlData = {
      callId: searchParams.get("callId"),
      paymentIntentId: searchParams.get("paymentIntentId"),
      orderId: searchParams.get("orderId"),
      providerId: searchParams.get("providerId") || searchParams.get("provider"),
      call: searchParams.get("call"),
      serviceType: searchParams.get("serviceType") || searchParams.get("service"),
      amount: searchParams.get("amount"),
      duration: searchParams.get("duration"),
      providerRole: searchParams.get("providerRole"),
    };

    if (urlData.callId || urlData.paymentIntentId) {
      console.log("✅ [SUCCESS_PAGE] Data loaded from URL params (fallback):", urlData);
      return urlData;
    }

    console.error("❌ [SUCCESS_PAGE] No valid payment data found");
    return null;
  }, [searchParams]);

  // Clean up sessionStorage after 30s — prevents stale data in multi-tab, but survives F5
  useEffect(() => {
    if (paymentData?.savedAt) {
      const cleanup = setTimeout(() => {
        try { sessionStorage.removeItem('lastPaymentSuccess'); } catch {}
      }, 30000);
      return () => clearTimeout(cleanup);
    }
  }, [paymentData?.savedAt]);

  // Extraire les valeurs individuelles depuis paymentData
  const callStatus = paymentData?.call || searchParams.get("call");
  const providerId = paymentData?.providerId || "1";
  const callId = paymentData?.callId || null;
  const paymentIntentId = paymentData?.paymentIntentId || null;
  const orderId = paymentData?.orderId || null;

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

  // P0 FIX: État d'initialisation pour éviter le flash d'erreur "serviceNotFound"
  // On attend que initializeServiceData() ait fini avant d'afficher quoi que ce soit
  const [isInitializing, setIsInitializing] = useState(true);
  // P0 FIX 2026-02-03: Track si les données de service sont effectivement chargées
  // pour éviter le flash d'erreur entre isInitializing=false et les états mis à jour
  const [serviceDataLoaded, setServiceDataLoaded] = useState(false);

  // UI state (appel)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModelShown, setReviewModelShown] = useState(false);
  const [callState, setCallState] = useState<CallState>(
    callStatus === "failed" ? "failed" : "connecting"
  );
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [countdownToCall, setCountdownToCall] = useState(240); // P2-4 FIX: 4 minutes (aligné avec Cloud Task)
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
     Init infos service (montant/durée) via sessionStorage ou storage
     P0 FIX 2026-02-02: Priorité sessionStorage (paymentData) puis selectedProvider
     Retourne true si l'initialisation a réussi (données trouvées)
     ========================= */
  const initializeServiceData = useCallback((): boolean => {
    // Priorité 1: Données de paymentData (sessionStorage, sauvegardées par CallCheckout)
    if (paymentData?.amount && paymentData?.serviceType) {
      const parsedAmount = parseFloat(String(paymentData.amount));
      setPaidAmount(Number.isNaN(parsedAmount) ? 0 : parsedAmount);
      setPaidServiceType(paymentData.serviceType);
      // Durées fixes basées sur le type de service
      const isLawyerService = paymentData.serviceType === "lawyer_call" || paymentData.providerRole === "lawyer";
      const d = isLawyerService ? 20 : 30;
      setPaidDuration(d);
      setProviderRole(paymentData.providerRole || "");
      setTimeRemaining(d * 60);
      console.log("✅ [SUCCESS_PAGE] Service data initialized from sessionStorage");
      return true;
    }

    // Priorité 2: URL params (rétrocompatibilité)
    const urlAmount = searchParams.get("amount");
    const urlServiceType =
      searchParams.get("serviceType") || searchParams.get("service");
    const urlProviderRole = searchParams.get("providerRole");

    if (urlAmount && urlServiceType) {
      const parsedAmount = parseFloat(urlAmount);
      setPaidAmount(Number.isNaN(parsedAmount) ? 0 : parsedAmount);
      setPaidServiceType(urlServiceType);
      const isLawyerService = urlServiceType === "lawyer_call" || urlProviderRole === "lawyer";
      const d = isLawyerService ? 20 : 30;
      setPaidDuration(d);
      setProviderRole(urlProviderRole || "");
      setTimeRemaining(d * 60);
      console.log("✅ [SUCCESS_PAGE] Service data initialized from URL params");
      return true;
    }

    // Priorité 3: selectedProvider dans sessionStorage
    const providerInfo = getProviderFromStorage();
    if (providerInfo) {
      const price =
        providerInfo.price || (providerInfo.type === "lawyer" ? 49 : 19);
      const duration = providerInfo.type === "lawyer" ? 20 : 30;

      setPaidAmount(price);
      setPaidServiceType(
        providerInfo.type === "lawyer" ? "lawyer_call" : "expat_call"
      );
      setPaidDuration(duration);
      setProviderRole(providerInfo.type);
      setTimeRemaining(duration * 60);
      console.log("✅ [SUCCESS_PAGE] Service data initialized from selectedProvider");
      return true;
    }

    // Priorité 4: Fallback sur PROVIDER_DEFAULTS
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
      console.log("✅ [SUCCESS_PAGE] Service data initialized from fallback defaults");
      return true;
    }

    return false;
  }, [paymentData, searchParams, providerId, getProviderFromStorage]);

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
      // P2-4 FIX: Aligner le timer d'affichage sur le délai réel du Cloud Task (240s)
      const displayCountdownSeconds = 240; // 4 min (aligné avec le Cloud Task backend)
      const callTriggerSeconds = 240; // 4 min (déclenchement de l'appel)
      const remainingSeconds = Math.max(
        0,
        displayCountdownSeconds - elapsedSeconds
      );

      setCountdownToCall(remainingSeconds);

      // Déclencher l'appel après 4 minutes (même si le compte à rebours affiche encore 1 min)
      if (elapsedSeconds >= callTriggerSeconds && callState === "connecting") {
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
     P0 FIX: Marquer l'initialisation comme terminée après avoir chargé les données
     P0 FIX 2026-02-03: Utiliser setServiceDataLoaded pour éviter le flash d'erreur
     ========================= */
  useEffect(() => {
    const success = initializeServiceData();

    // P0 FIX 2026-02-03: Mettre à jour serviceDataLoaded AVANT isInitializing
    // pour éviter le flash où isInitializing=false mais les données ne sont pas encore visibles
    if (success) {
      setServiceDataLoaded(true);
    }

    // Même si pas de données trouvées, on termine l'initialisation
    // pour éviter un loader infini - le guard affichera le message d'erreur
    setIsInitializing(false);

    if (!success) {
      console.warn("⚠️ [SUCCESS_PAGE] No service data found during initialization");
    }
  }, [initializeServiceData]);

  /* =========================
     Écoute Firestore : état de l'appel
     P1 FIX: Ajout de retry si le document n'existe pas encore
     P0 PERF FIX: Backoff exponentiel pour réduire le délai perçu
     ========================= */
  const [sessionRetryCount, setSessionRetryCount] = useState(0);
  // sessionLoadError surfaces a "slow connection" banner when Firestore retries exhaust.
  // Do NOT init from callStatus === "skipped" anymore: with Fix #1 the user no longer
  // reaches this page when scheduling fails, and hiding the countdown on "skipped" was
  // both misleading and hid the compte-à-rebours for legitimate slow networks.
  const [sessionLoadError, setSessionLoadError] = useState(false);
  const MAX_SESSION_RETRIES = 12; // 12 retries avec backoff = ~12s max wait (au lieu de 20s)

  // P0 PERF FIX: Backoff exponentiel - délais progressifs (ms)
  // Total: 300+500+800+1000+1200+1500+1500+1500+1500+1500+1500+1500 = ~12.8s
  const SESSION_RETRY_DELAYS = [300, 500, 800, 1000, 1200, 1500, 1500, 1500, 1500, 1500, 1500, 1500];
  const getSessionRetryDelay = (retryCount: number) => SESSION_RETRY_DELAYS[Math.min(retryCount, SESSION_RETRY_DELAYS.length - 1)];

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

        // P0 PERF FIX: Utiliser backoff exponentiel
        const nextDelay = getSessionRetryDelay(sessionRetryCount);
        console.log(`⏳ [SUCCESS_PAGE_DEBUG] call_sessions/${callId} not found`, {
          retryCount: sessionRetryCount + 1,
          maxRetries: MAX_SESSION_RETRIES,
          waitTime: `${nextDelay}ms (backoff)`,
          timestamp: new Date().toISOString()
        });

        if (sessionRetryCount < MAX_SESSION_RETRIES) {
          retryTimeout = setTimeout(() => {
            setSessionRetryCount(prev => prev + 1);
          }, nextDelay); // P0 PERF FIX: Backoff exponentiel (300ms → 1.5s)
        } else {
          console.error(`❌ [SUCCESS_PAGE_DEBUG] Max retries reached for call_sessions/${callId}`);
          setSessionLoadError(true);
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
          // P2-1 FIX: Lire conference.billingDuration (champ réel dans call_sessions)
          // au lieu de actualDuration/duration qui n'existent pas
          const duration = data?.conference?.billingDuration || data?.actualDuration || data?.duration || 0;
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

      // P2-1 FIX: Lire conference.billingDuration (champ réel dans call_sessions)
      const actualDuration = data?.conference?.billingDuration || data?.actualDuration || data?.duration || 0;
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
        // P0 PERF FIX: Utiliser le même backoff exponentiel pour les erreurs
        const nextDelay = getSessionRetryDelay(sessionRetryCount);
        console.log(`🔄 [SUCCESS_PAGE_DEBUG] Retrying onSnapshot in ${nextDelay}ms (backoff)...`);
        retryTimeout = setTimeout(() => {
          setSessionRetryCount(prev => prev + 1);
        }, nextDelay);
      } else {
        console.error(`❌ [SUCCESS_PAGE_DEBUG] Max retries reached, giving up on call_sessions/${callId}`);
        setSessionLoadError(true);
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
     P0 PERF FIX: Backoff exponentiel pour réduire le délai perçu
     ========================= */
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [orderLoading, setOrderLoading] = useState<boolean>(true);
  const [orderRetryCount, setOrderRetryCount] = useState(0);
  const MAX_ORDER_RETRIES = 10; // 10 retries avec backoff = ~10s max wait (au lieu de 16s)

  // P0 PERF FIX: Backoff exponentiel pour orders
  const ORDER_RETRY_DELAYS = [300, 500, 800, 1000, 1200, 1500, 1500, 1500, 1500, 1500];
  const getOrderRetryDelay = (retryCount: number) => ORDER_RETRY_DELAYS[Math.min(retryCount, ORDER_RETRY_DELAYS.length - 1)];

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

          // P0 PERF FIX: Utiliser backoff exponentiel
          const nextDelay = getOrderRetryDelay(orderRetryCount);
          console.log(`⏳ [SUCCESS_PAGE_DEBUG] orders/${orderId} not found`, {
            retryCount: orderRetryCount + 1,
            maxRetries: MAX_ORDER_RETRIES,
            waitTime: `${nextDelay}ms (backoff)`,
            timestamp: new Date().toISOString()
          });

          if (orderRetryCount < MAX_ORDER_RETRIES) {
            retryTimeout = setTimeout(() => {
              setOrderRetryCount(prev => prev + 1);
            }, nextDelay); // P0 PERF FIX: Backoff exponentiel
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

        // AUDIT-FIX M1: Guard against generating invoices for non-completed PayPal payments
        // PayPal webhook CHECKOUT.ORDER.APPROVED writes "APPROVED" before capture completes
        const paymentStatus = (paymentData?.status || '').toLowerCase();
        const completedStatuses = ['succeeded', 'captured', 'completed'];
        if (paymentStatus && !completedStatuses.includes(paymentStatus) && paymentStatus !== '') {
          console.warn(`⚠️ Payment not yet completed (status: "${paymentData?.status}"), skipping invoice generation`);
          return;
        }

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
        // AUDIT-FIX M5: SECURITY NOTE — This writes financial metadata from the browser.
        // A malicious user could pre-set invoicesCreated=true to prevent server-side invoice generation.
        // TODO: Consider moving this flag update to a Cloud Function for better security.
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

  /* =========================
     META PIXEL - TRACKING PURCHASE
     Track l'evenement Purchase pour Meta Ads quand le paiement est confirme
     ========================= */
  const [purchaseTracked, setPurchaseTracked] = useState(false);

  useEffect(() => {
    // Ne tracker qu'une seule fois et seulement si on a les donnees necessaires
    if (purchaseTracked) return;
    if (!order?.amount && !paidAmount) return;
    if (!orderId && !callId) return;

    // Verifier dans sessionStorage si deja tracke (protection contre F5)
    const purchaseKey = `meta_purchase_tracked_${orderId || callId}`;
    if (sessionStorage.getItem(purchaseKey)) {
      setPurchaseTracked(true);
      return;
    }

    // Track le Purchase avec les donnees de la commande
    const toNumLocal = (v: unknown): number => {
      const n = Number(v ?? 0);
      return Number.isFinite(n) ? n : 0;
    };
    const amount = toNumLocal(order?.amount) || paidAmount || 0;
    const currency = orderCurrency || 'eur';

    if (amount > 0) {
      const affiliateRef = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sos_affiliate_ref') || '' : '';
      // Meta Pixel tracking - use same eventId as CallCheckout for CAPI deduplication
      const purchaseEventId = getOrCreateEventId(`purchase_${callId}`, 'purchase');
      trackMetaPurchase({
        value: amount,
        currency: currency.toUpperCase(),
        content_name: isLawyer ? 'lawyer_call' : 'expat_call',
        content_type: 'service',
        content_id: callId || undefined,
        order_id: orderId || undefined,
        eventID: purchaseEventId,
        ...(affiliateRef && { affiliate_ref: affiliateRef }),
      });

      // Advanced Matching - send user data for better attribution
      if (user?.email) {
        setMetaPixelUserData({
          email: user.email,
          firstName: user.displayName?.split(' ')[0],
          lastName: user.displayName?.split(' ').slice(1).join(' '),
        });
      }

      // Google Ads: Enhanced Conversions user data + tracking
      // Wrapped in async IIFE because setGoogleAdsUserData uses SHA256 hashing
      (async () => {
        if (user?.email) {
          await setGoogleAdsUserData({
            email: user.email,
            firstName: user.displayName?.split(' ')[0],
            lastName: user.displayName?.split(' ').slice(1).join(' '),
          });
        }
        trackGoogleAdsPurchase({
          value: amount,
          currency: currency.toUpperCase(),
          content_name: isLawyer ? 'lawyer_call' : 'expat_call',
          content_type: 'service',
          transaction_id: orderId || callId || undefined,
          ...(affiliateRef && { affiliate_ref: affiliateRef }),
        });
      })();

      // GA4: purchase event (e-commerce standard)
      trackEvent('purchase', {
        transaction_id: orderId || callId || undefined,
        value: amount,
        currency: currency.toUpperCase(),
        items: [{
          item_id: providerId || undefined,
          item_name: isLawyer ? 'lawyer_call' : 'expat_call',
          item_category: isLawyer ? 'lawyer' : 'expat',
          price: amount,
          quantity: 1,
        }],
      });

      // Ad Attribution tracking (Firestore - pour dashboard admin)
      trackAdPurchase({
        value: amount,
        currency: currency.toUpperCase(),
        orderId: orderId || undefined,
        contentName: isLawyer ? 'lawyer_call' : 'expat_call',
        providerId: providerId || undefined,
        providerType: isLawyer ? 'lawyer' : 'expat',
        userId: user?.uid || undefined,
      });

      // Marquer comme tracke
      sessionStorage.setItem(purchaseKey, 'true');
      setPurchaseTracked(true);

      console.log('✅ [TRACKING] Purchase tracked (Meta + Google Ads):', {
        value: amount,
        currency: currency.toUpperCase(),
        content_name: isLawyer ? 'lawyer_call' : 'expat_call',
        orderId,
        callId,
      });
    }
  }, [order?.amount, paidAmount, orderId, callId, isLawyer, orderCurrency, purchaseTracked]);

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
  // P0 FIX 2026-02-03: Afficher un loader pendant l'initialisation pour éviter le flash "serviceNotFound"
  // Le loader reste visible tant que:
  // 1. isInitializing est vrai (première phase)
  // 2. OU serviceDataLoaded est faux ET paymentData existe (données attendues mais pas encore chargées)
  // Cela évite le flash d'erreur entre le moment où isInitializing devient false et les états sont mis à jour
  const shouldShowLoader = isInitializing || (!serviceDataLoaded && paymentData !== null);

  if (shouldShowLoader) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-orange-500 shadow-2xl mb-6">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-xl text-gray-300">
              {intl.formatMessage({ id: "success.loadingPaymentInfo", defaultMessage: "Chargement..." })}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // P0 FIX 2026-02-03: Garde-fou plus robuste - ne s'affiche que si
  // serviceDataLoaded est explicitement false ET que paymentData est null
  // (indiquant qu'il n'y a vraiment aucune donnée, pas juste un délai de chargement)
  if (!serviceDataLoaded && !paidAmount && !paidServiceType) {
    // Garde-fou si jamais pas d'info service (cohérent avec ton ancien rendu)
    return (
      <Layout>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              {/* {t.serviceNotFound} */}
              {intl.formatMessage({ id: "success.serviceNotFound" })}
            </h1>
            <Link to="/" className="text-red-400 hover:text-red-300">
              {/* {t.backToHome} */}
              {intl.formatMessage({ id: "success.backToHome" })}
            </Link>
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
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />

          {/* Particules */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

            {/* Session Load Error */}
            {sessionLoadError && (
              <div className="mb-8 p-6 bg-orange-500/20 border border-orange-400/30 rounded-2xl backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-orange-500/30 rounded-full">
                    <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-orange-300 mb-2">
                      {intl.formatMessage({ id: "success.sessionLoadError.title", defaultMessage: "Connexion lente" })}
                    </h3>
                    <p className="text-orange-200/80 text-sm mb-4">
                      {intl.formatMessage({ id: "success.sessionLoadError.message", defaultMessage: "La session prend plus de temps que prévu à charger. Votre paiement a été enregistré et l'appel sera lancé automatiquement." })}
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                    >
                      {intl.formatMessage({ id: "success.sessionLoadError.refresh", defaultMessage: "Rafraîchir la page" })}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* États — le countdown reste visible même si sessionLoadError (connexion lente) :
                l'horloge ne dépend pas du chargement Firestore, et le banner est déjà affiché ci-dessus */}
            {callState === "connecting" && (
              <>
                <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                    {/* {t.countdownTitle} */}
                    {intl.formatMessage({ id: "success.countdownTitle" })}
                  </span>
                </h1>

                {/* P0 PERF FIX: Message informatif pendant la préparation (premiers retries) */}
                {sessionRetryCount > 0 && sessionRetryCount <= 4 && (
                  <div className="mb-6 inline-flex items-center space-x-3 bg-blue-500/20 backdrop-blur-sm rounded-full px-6 py-3 border border-blue-400/30">
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-blue-300 font-medium">
                      {intl.formatMessage({ id: "success.preparingCall", defaultMessage: "Préparation de votre appel en cours..." })}
                    </span>
                  </div>
                )}

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
                    {/* P0 FIX: Show different title based on failure reason */}
                    {failureReason?.includes("client_no_answer")
                      ? intl.formatMessage({ id: "success.clientNoAnswerTitle" })
                      : failureReason?.includes("provider_no_answer")
                        ? intl.formatMessage({ id: "success.callFailed" })
                        : failureReason?.includes("early_disconnect")
                          ? intl.formatMessage({ id: "success.callTooShortTitle" })
                          : intl.formatMessage({ id: "success.technicalErrorTitle" })}
                  </span>
                </h1>

                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-r from-red-500 to-orange-500 shadow-2xl mb-6">
                    <AlertCircle className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-6">
                    {/* P0 FIX: Show different message based on failure reason */}
                    {failureReason?.includes("client_no_answer")
                      ? intl.formatMessage({ id: "success.clientNoAnswer" })
                      : failureReason?.includes("provider_no_answer")
                        ? intl.formatMessage({ id: "success.expertNoAnswer" })
                        : failureReason?.includes("early_disconnect")
                          ? intl.formatMessage({ id: "success.callTooShort" })
                          : intl.formatMessage({ id: "success.technicalError" })}
                  </p>
                  <button
                    onClick={() => navigate("/sos-appel")}
                    className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all duration-300 inline-flex items-center gap-2 shadow-lg shadow-red-500/30"
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
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                {isLawyer ? (
                  <>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white">
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
