// src/components/payment/PayPalPaymentForm.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import { auth } from "../../config/firebase";
import { AlertCircle, CheckCircle, CreditCard, Lock, ShieldCheck, Calendar, Shield } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { usePricingConfig } from "../../services/pricingService";
import { getCurrentTrafficSource } from "../../utils/trafficSource";
import { getStoredMetaIdentifiers } from "../../utils/fbpCookie";
import { getOrCreateEventId } from "../../utils/sharedEventId";

interface BookingData {
  firstName?: string;
  lastName?: string;
  title?: string;
  description?: string;
  clientPhone?: string;
  currentCountry?: string;
  // P2 FIX: Client languages for SMS notifications
  clientLanguages?: string[];
}

interface PayPalPaymentFormProps {
  amount: number;
  currency: string;
  providerId: string;
  providerPayPalMerchantId?: string;
  callSessionId: string;
  clientId: string;
  description?: string;
  serviceType?: 'lawyer' | 'expat';
  // P0 FIX: Phone numbers required for Twilio call
  clientPhone: string;
  providerPhone: string;
  // P0 FIX: Languages for Twilio voice prompts
  clientLanguages: string[];
  providerLanguages: string[];
  // Booking data for validation
  bookingData?: BookingData;
  onSuccess: (details: PayPalSuccessDetails) => void;
  onError: (error: Error) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

interface PayPalSuccessDetails {
  orderId: string;
  payerId: string;
  status: string;
  captureId?: string;
  authorizationId?: string; // AUTHORIZE flow: ID de l'autorisation (pas de capture immédiate)
}

interface CreateOrderResponse {
  orderId: string;
  approvalUrl: string;
}

interface CaptureOrderResponse {
  success: boolean;
  captureId: string;
  status: string;
}

// Mapping des codes d'erreur PayPal vers des clés i18n
const PAYPAL_ERROR_I18N_KEYS: Record<string, string> = {
  // Erreurs de carte/instrument
  INSTRUMENT_DECLINED: "payment.paypal.err.instrumentDeclined",
  CARD_DECLINED: "payment.paypal.err.instrumentDeclined",
  INSUFFICIENT_FUNDS: "payment.paypal.err.insufficientFunds",
  CARD_EXPIRED: "payment.paypal.err.cardExpired",
  INVALID_CARD_NUMBER: "payment.paypal.err.invalidCardNumber",
  INVALID_CVV: "payment.paypal.err.invalidCvv",

  // Erreurs de paiement
  PAYER_ACTION_REQUIRED: "payment.paypal.err.payerActionRequired",
  PAYER_CANNOT_PAY: "payment.paypal.err.payerCannotPay",
  TRANSACTION_REFUSED: "payment.paypal.err.transactionRefused",
  PAYMENT_DENIED: "payment.paypal.err.paymentDenied",

  // Erreurs de configuration
  INVALID_CURRENCY: "payment.paypal.err.invalidCurrency",
  DUPLICATE_INVOICE_ID: "payment.paypal.err.duplicateInvoice",
  ORDER_NOT_APPROVED: "payment.paypal.err.orderNotApproved",
  AUTHORIZATION_VOIDED: "payment.paypal.err.authorizationVoided",

  // Erreurs serveur/réseau
  INTERNAL_SERVER_ERROR: "payment.paypal.err.serverError",
  NETWORK_ERROR: "payment.paypal.err.networkError",

  // Erreurs de prestataire (nouveau)
  PROVIDER_NOT_CONFIGURED: "payment.paypal.err.providerNotConfigured",
  INVALID_AMOUNT: "payment.paypal.err.invalidAmount",
};

// Détecte si l'erreur est VRAIMENT causée par une extension de navigateur
// On ne veut PAS afficher ce message pour des erreurs normales
function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const err = error as Error;
  const message = err?.message?.toLowerCase() || "";
  const name = err?.name || "";

  // Seulement les vraies erreurs de blocage par extension
  // AbortError avec "user aborted" = extension qui bloque
  if (name === "AbortError" && message.includes("user aborted")) {
    return true;
  }

  // ERR_BLOCKED_BY_CLIENT = extension bloquante confirmée
  if (message.includes("err_blocked_by_client") || message.includes("net::err_blocked")) {
    return true;
  }

  // Ne PAS considérer comme erreur réseau :
  // - TypeError génériques (erreurs JS normales)
  // - "failed to fetch" seul (peut être serveur down, CORS, etc.)
  // - "network error" seul (trop générique)

  return false;
}

function extractPayPalErrorCode(error: unknown): string {
  // Vérifier d'abord si c'est une erreur réseau
  if (isNetworkError(error)) {
    return "NETWORK_ERROR";
  }

  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    let errorCode = (err.code as string) || (err.name as string) || "";
    if (!errorCode && Array.isArray(err.details)) {
      const detail = err.details[0] as Record<string, unknown>;
      errorCode = (detail?.issue as string) || "";
    }
    return errorCode;
  }
  return "";
}

// Composant bouton pour soumettre les champs de carte
const CardFieldsSubmitButton: React.FC<{
  isProcessing: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onError?: (error: unknown) => void;
}> = ({ isProcessing, disabled, onSubmit, onError }) => {
  const { cardFieldsForm } = usePayPalCardFields();
  const [isFormValid, setIsFormValid] = useState(false);

  // Check form validity periodically when fields might have changed
  useEffect(() => {
    if (!cardFieldsForm) return;

    const checkValidity = async () => {
      try {
        const formState = await cardFieldsForm.getState();
        setIsFormValid(formState.isFormValid);
      } catch {
        // Ignore errors during validity check
      }
    };

    // Check immediately
    checkValidity();

    // Check every 500ms while user is filling the form
    const interval = setInterval(checkValidity, 500);

    return () => clearInterval(interval);
  }, [cardFieldsForm]);

  const handleClick = async () => {
    if (!cardFieldsForm) {
      return;
    }

    const formState = await cardFieldsForm.getState();

    if (!formState.isFormValid) {
      return;
    }

    onSubmit();

    cardFieldsForm.submit().catch((err) => {
      if (import.meta.env.DEV) {
        console.error("Card submit error:", err);
      }
      // Reset processing state on error to prevent stuck UI
      onError?.(err);
    });
  };

  const isButtonDisabled = disabled || isProcessing || !isFormValid;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isButtonDisabled}
      className={`w-full py-3 rounded-xl font-semibold text-white
        transition-all duration-200 flex items-center justify-center gap-2
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
        active:scale-[0.98] touch-manipulation
        ${isButtonDisabled
          ? "bg-gray-400 cursor-not-allowed opacity-60"
          : "bg-gradient-to-r from-red-500 to-orange-500 shadow-md shadow-red-500/25"
        }`}
    >
      {isProcessing ? (
        <>
          <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-4 h-4" />
          <span><FormattedMessage id="payment.processing" defaultMessage="Traitement..." /></span>
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" />
          <span><FormattedMessage id="payment.payByCard" defaultMessage="Payer par carte" /></span>
        </>
      )}
    </button>
  );
};

export const PayPalPaymentForm: React.FC<PayPalPaymentFormProps> = ({
  amount,
  currency,
  providerId,
  callSessionId,
  clientId,
  description,
  serviceType = 'expat',
  clientPhone,
  providerPhone,
  clientLanguages,
  providerLanguages,
  bookingData,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorCode, setErrorCode] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | null>(null);
  const [sdkLoadTimeout, setSdkLoadTimeout] = useState(false);

  const intl = useIntl();
  const currentOrderIdRef = useRef<string>("");

  // Safety timeout: if SDK is still pending after 15 seconds, show error
  useEffect(() => {
    if (isPending && !sdkLoadTimeout) {
      const timeoutId = setTimeout(() => {
        if (isPending) {
          console.error("PayPal SDK loading timeout after 15s");
          setSdkLoadTimeout(true);
        }
      }, 15000);
      return () => clearTimeout(timeoutId);
    }
  }, [isPending, sdkLoadTimeout]);

  // Stabiliser le montant pour éviter les re-renders du SDK PayPal
  const stableAmount = useRef(amount);
  useEffect(() => {
    if (Math.abs(stableAmount.current - amount) > 0.01) {
      stableAmount.current = amount;
    }
  }, [amount]);

  const getTranslatedErrorMessage = (code: string): string => {
    const i18nKey = PAYPAL_ERROR_I18N_KEYS[code];
    if (i18nKey) {
      return intl.formatMessage({ id: i18nKey });
    }
    return intl.formatMessage({ id: "payment.paypal.err.generic" });
  };

  const { pricing, loading: pricingLoading } = usePricingConfig();
  const currencyKey = (currency?.toLowerCase() || 'eur') as 'eur' | 'usd';
  const pricingConfig = pricing?.[serviceType]?.[currencyKey];
  const platformFee = pricingConfig?.connectionFeeAmount ?? Math.round(amount * 0.39 * 100) / 100;
  const providerAmount = pricingConfig?.providerAmount ?? Math.round((amount - platformFee) * 100) / 100;

  // Création de l'ordre PayPal (utilisé par les deux méthodes)
  // Utilise la version HTTP de la fonction pour éviter les problèmes CORS
  const createOrder = useCallback(async (): Promise<string> => {
    try {
      setIsProcessing(true);
      setPaymentStatus("processing");

      // Obtenir le token d'authentification Firebase
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }
      const idToken = await currentUser.getIdToken();

      // Collect tracking data for Meta CAPI attribution
      const metaIds = getStoredMetaIdentifiers();
      const trafficSource = getCurrentTrafficSource();
      const pixelEventId = getOrCreateEventId(`purchase_${callSessionId}`, 'purchase');

      // Appeler la fonction HTTP au lieu de la fonction callable
      const response = await fetch(
        "https://createpaypalorderhttp-5tfnuxa2hq-ew.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            callSessionId,
            amount,
            providerAmount,
            platformFee,
            currency: currency.toUpperCase(),
            providerId,
            clientId,
            // P0 FIX: Phone numbers required for Twilio call
            clientPhone,
            providerPhone,
            // P0 FIX: Languages for Twilio voice prompts
            clientLanguages,
            providerLanguages,
            // P1 FIX: Send booking title, description and country for SMS notifications to provider
            title: bookingData?.title || description || `Appel SOS-Expat - Session ${callSessionId}`,
            description: bookingData?.description || description || `Appel SOS-Expat - Session ${callSessionId}`,
            clientCurrentCountry: bookingData?.currentCountry || "",
            serviceType,
            metadata: {
              ...(metaIds.fbp && { fbp: metaIds.fbp }),
              ...(metaIds.fbc && { fbc: metaIds.fbc }),
              pixelEventId,
              ...(trafficSource?.utm_source && { utm_source: trafficSource.utm_source }),
              ...(trafficSource?.utm_medium && { utm_medium: trafficSource.utm_medium }),
              ...(trafficSource?.utm_campaign && { utm_campaign: trafficSource.utm_campaign }),
              ...(trafficSource?.utm_content && { utm_content: trafficSource.utm_content }),
              ...(trafficSource?.utm_term && { utm_term: trafficSource.utm_term }),
              ...(trafficSource?.gclid && { gclid: trafficSource.gclid }),
              ...(trafficSource?.ttclid && { ttclid: trafficSource.ttclid }),
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const err = new Error(errorData.error || `HTTP ${response.status}`);
        // Attach error code for better UX messages
        (err as any).code = errorData.code || "";
        throw err;
      }

      const result: CreateOrderResponse & { success: boolean } = await response.json();
      currentOrderIdRef.current = result.orderId;
      return result.orderId;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("PayPal createOrder error:", error);
      }
      setPaymentStatus("error");
      setErrorCode(extractPayPalErrorCode(error));
      setIsProcessing(false);
      throw error;
    }
  }, [amount, currency, providerId, callSessionId, clientId, description, serviceType, platformFee, providerAmount, clientPhone, providerPhone, clientLanguages, providerLanguages, bookingData]);

  // Autorisation après approbation (AUTHORIZE flow comme Stripe)
  // L'autorisation bloque les fonds mais ne les capture pas encore
  // La capture se fait côté serveur après 2 minutes d'appel
  // Si l'appel dure moins de 2 minutes, l'autorisation est annulée (void)
  const authorizeOrder = useCallback(async (orderId: string, payerId?: string): Promise<void> => {
    try {
      // Obtenir le token d'authentification Firebase
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }
      const idToken = await currentUser.getIdToken();

      // Appeler la fonction HTTP d'autorisation (pas de capture immédiate)
      const response = await fetch(
        "https://authorizepaypalorderhttp-5tfnuxa2hq-ew.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            orderId,
            callSessionId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const err = new Error(errorData.error || `HTTP ${response.status}`);
        // Attach error code for better UX messages
        (err as any).code = errorData.code || "";
        throw err;
      }

      const result = await response.json();

      if (result.success) {
        setPaymentStatus("success");
        onSuccess({
          orderId,
          payerId: payerId || "",
          status: result.status,
          // authorizationId au lieu de captureId - la capture se fera après 2 min d'appel
          authorizationId: result.authorizationId,
        });
      } else {
        throw new Error("Autorisation PayPal échouée");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("PayPal authorizeOrder error:", error);
      }
      setPaymentStatus("error");
      const code = extractPayPalErrorCode(error);
      setErrorCode(code);
      onError(error instanceof Error ? error : new Error(getTranslatedErrorMessage(code)));
    } finally {
      setIsProcessing(false);
    }
  }, [callSessionId, onSuccess, onError, intl]);

  // Handler pour PayPal Buttons
  const onApprove = useCallback(async (data: { orderID: string; payerID?: string | null }): Promise<void> => {
    setPaymentMethod("paypal");
    await authorizeOrder(data.orderID, data.payerID || undefined);
  }, [authorizeOrder]);

  // Handler pour Card Fields
  const onCardApprove = useCallback(async (data: { orderID: string }): Promise<void> => {
    setPaymentMethod("card");
    await authorizeOrder(data.orderID);
  }, [authorizeOrder]);

  const handleError = useCallback((err: Record<string, unknown>) => {
    if (import.meta.env.DEV) {
      console.error("PayPal handleError:", err);
    }
    setPaymentStatus("error");
    const code = extractPayPalErrorCode(err);
    setErrorCode(code);
    setIsProcessing(false);
    onError(new Error(getTranslatedErrorMessage(code)));
  }, [onError, getTranslatedErrorMessage]);

  const handleCancel = useCallback(() => {
    setPaymentStatus("idle");
    setIsProcessing(false);
    setPaymentMethod(null);
    onCancel?.();
  }, [onCancel]);

  const resetForm = () => {
    setPaymentStatus("idle");
    setErrorCode("");
    setPaymentMethod(null);
    setIsProcessing(false);
  };

  // Loading state - Skeleton loader to prevent page jumping
  if (isPending) {
    return (
      <div className="paypal-payment-container">
        <div className="paypal-skeleton">
          <div className="p-6 space-y-4">
            {/* Skeleton for amount */}
            <div className="h-12 bg-white/50 rounded-lg animate-pulse" />
            {/* Skeleton for card form */}
            <div className="space-y-3">
              <div className="h-5 w-32 bg-white/50 rounded animate-pulse" />
              <div className="h-11 bg-white/50 rounded-lg animate-pulse" />
              <div className="h-11 bg-white/50 rounded-lg animate-pulse" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-11 bg-white/50 rounded-lg animate-pulse" />
                <div className="h-11 bg-white/50 rounded-lg animate-pulse" />
              </div>
              <div className="h-12 bg-white/50 rounded-xl animate-pulse" />
            </div>
            {/* Skeleton for separator */}
            <div className="h-4 bg-white/30 rounded animate-pulse" />
            {/* Skeleton for PayPal button */}
            <div className="h-12 bg-yellow-100/50 rounded-lg animate-pulse" />
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-3 animate-pulse">
          <FormattedMessage id="payment.paypal.loading" defaultMessage="Chargement du système de paiement sécurisé..." />
        </p>
      </div>
    );
  }

  // Error state du script PayPal (rejected or timeout)
  if (isRejected || sdkLoadTimeout) {
    return (
      <div className="space-y-4">
        <div className="flex items-center p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-red-700 font-medium block">
              <FormattedMessage
                id="payment.paypal.loadError"
                defaultMessage="Impossible de charger le système de paiement. Veuillez rafraîchir la page."
              />
            </span>
            {sdkLoadTimeout && (
              <span className="text-red-600 text-sm block mt-1">
                <FormattedMessage
                  id="payment.paypal.timeoutHint"
                  defaultMessage="Un bloqueur de publicités ou une extension de sécurité peut bloquer le chargement."
                />
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/30"
        >
          <FormattedMessage id="payment.paypal.reload" defaultMessage="Rafraîchir la page" />
        </button>
      </div>
    );
  }

  // Success state
  if (paymentStatus === "success") {
    return (
      <div className="flex flex-col items-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <span className="text-green-800 font-semibold text-lg text-center">
          <FormattedMessage
            id="payment.paypal.success"
            defaultMessage="Paiement effectué avec succès !"
          />
        </span>
      </div>
    );
  }

  // Error state
  if (paymentStatus === "error") {
    // Erreur réseau - message spécial avec instructions
    if (errorCode === "NETWORK_ERROR") {
      return (
        <div className="space-y-4">
          <div className="p-5 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <span className="text-orange-800 block font-semibold text-base">
                  <FormattedMessage
                    id="payment.paypal.networkError.title"
                    defaultMessage="Problème de connexion détecté"
                  />
                </span>
                <span className="text-orange-700 text-sm block mt-2">
                  <FormattedMessage
                    id="payment.paypal.networkError.description"
                    defaultMessage="Une extension de navigateur (antivirus, bloqueur de pub) semble bloquer le paiement."
                  />
                </span>
                <ul className="text-orange-700 text-sm mt-4 space-y-2 list-disc list-inside">
                  <li>
                    <FormattedMessage
                      id="payment.paypal.networkError.tip1"
                      defaultMessage="Essayez en navigation privée (Ctrl+Maj+N)"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="payment.paypal.networkError.tip2"
                      defaultMessage="Désactivez temporairement votre antivirus web"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="payment.paypal.networkError.tip3"
                      defaultMessage="Désactivez les bloqueurs de publicités"
                    />
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/30"
          >
            <FormattedMessage id="payment.paypal.retry" defaultMessage="Réessayer" />
          </button>
        </div>
      );
    }

    // Erreur standard
    return (
      <div className="space-y-4">
        <div className="flex items-center p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <AlertCircle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-red-800 block font-semibold">
              <FormattedMessage id="payment.paypal.error" defaultMessage="Erreur de paiement" />
            </span>
            <span className="text-red-600 text-sm block mt-1">
              {errorCode ? getTranslatedErrorMessage(errorCode) : (
                <FormattedMessage
                  id="payment.paypal.errorRetry"
                  defaultMessage="Veuillez réessayer ou utiliser un autre moyen de paiement."
                />
              )}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/30"
        >
          <FormattedMessage id="payment.paypal.retry" defaultMessage="Réessayer" />
        </button>
      </div>
    );
  }

  return (
    <div className="paypal-payment-container space-y-3 sm:space-y-4">

      {/* Récapitulatif du paiement - Style Stripe compact */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900 text-sm">
            <FormattedMessage id="payment.total" defaultMessage="Total à payer" />
          </span>
          <span className="text-base font-black bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
            {amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Processing state - Enhanced with step indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100">
          <div className="relative">
            <div className="animate-spin rounded-full border-2 border-red-200 border-t-red-500 w-6 h-6" />
            <Lock className="absolute inset-0 m-auto w-3 h-3 text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-800 font-semibold text-sm">
              <FormattedMessage
                id="payment.paypal.processing"
                defaultMessage="Traitement sécurisé en cours..."
              />
            </span>
            <span className="text-gray-500 text-xs">
              <FormattedMessage
                id="payment.paypal.doNotClose"
                defaultMessage="Ne fermez pas cette page"
              />
            </span>
          </div>
        </div>
      )}

      {/* Section Carte Bancaire - opacity only, NO pointer-events-none (blocks iframes) */}
      <div className={`transition-opacity duration-200 ${disabled || isProcessing ? "opacity-50" : ""}`}>
        <PayPalCardFieldsProvider
          createOrder={createOrder}
          onApprove={onCardApprove}
          onError={handleError}
          // Note: PayPal SDK only allows certain CSS properties
          // Allowed: font-size, font-family, font-weight, font-style, color, padding,
          // letter-spacing, line-height, text-align, text-decoration, text-shadow, text-transform
          // NOT allowed: background-color, border, border-radius, box-shadow, height, etc.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={{
            input: {
              "font-size": "16px",
              "font-family": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              "font-weight": "400",
              "color": "#1f2937",
              "padding": "12px",
              "line-height": "1.5",
            },
            "input::placeholder": {
              "color": "#9ca3af",
              "font-weight": "400",
            },
            "input:focus": {
              "color": "#1f2937",
            },
            ".invalid": {
              "color": "#ef4444",
            },
          } as any}
        >
          <div className="space-y-3">
            {/* Header avec icônes de cartes - Compact */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-gray-800">
                  <FormattedMessage id="payment.creditCard" defaultMessage="Carte bancaire" />
                </span>
              </div>
              {/* Icônes des cartes acceptées */}
              <div className="flex items-center gap-1">
                <svg className="h-5 w-auto" viewBox="0 0 750 471"><rect fill="#0E4595" width="750" height="471" rx="20"/><path d="M278.198 334.228l33.36-195.763h53.358l-33.385 195.763H278.198zm246.11-191.54c-10.569-3.966-27.135-8.222-47.822-8.222-52.726 0-89.863 26.55-90.18 64.604-.297 28.129 26.514 43.822 46.754 53.185 20.77 9.598 27.752 15.716 27.652 24.283-.133 13.123-16.586 19.116-31.924 19.116-21.355 0-32.701-2.967-50.225-10.274l-6.878-3.112-7.487 43.823c12.463 5.466 35.508 10.199 59.438 10.445 56.09 0 92.502-26.248 92.916-66.884.199-22.27-14.016-39.216-44.801-53.188-18.65-9.056-30.072-15.099-29.951-24.269 0-8.137 9.668-16.838 30.559-16.838 17.447-.271 30.088 3.534 39.936 7.5l4.781 2.259 7.232-42.428m137.31-4.223h-41.23c-12.772 0-22.332 3.486-27.94 16.234l-79.245 179.404h56.031s9.159-24.121 11.232-29.418c6.123 0 60.555.084 68.336.084 1.596 6.854 6.492 29.334 6.492 29.334h49.512l-43.188-195.638zm-65.417 126.408c4.414-11.279 21.26-54.724 21.26-54.724-.316.521 4.379-11.334 7.074-18.684l3.606 16.878s10.217 46.729 12.353 56.53h-44.293zM232.903 138.465L180.664 271.96l-5.565-27.129c-9.726-31.274-40.025-65.157-73.898-82.12l47.767 171.204 56.455-.063 84.004-195.386-56.524-.001" fill="#fff"/></svg>
                <svg className="h-5 w-auto" viewBox="0 0 750 471"><rect fill="#fff" width="750" height="471" rx="20"/><circle fill="#EB001B" cx="250" cy="235" r="150"/><circle fill="#F79E1B" cx="500" cy="235" r="150"/><path fill="#FF5F00" d="M325 118a149.8 149.8 0 000 234 149.8 149.8 0 000-234"/></svg>
              </div>
            </div>

            {/* Numéro de carte */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                <FormattedMessage id="payment.cardNumber" defaultMessage="Numéro de carte" />
              </label>
              <div className="paypal-field-wrapper">
                <div className="field-icon">
                  <CreditCard className="h-4 w-4" />
                </div>
                <PayPalNumberField className="paypal-field-inner" />
              </div>
            </div>

            {/* Expiration et CVV */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                  <FormattedMessage id="payment.expiry" defaultMessage="Expiration" />
                </label>
                <div className="paypal-field-wrapper">
                  <div className="field-icon">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <PayPalExpiryField className="paypal-field-inner" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">
                  <FormattedMessage id="payment.cvv" defaultMessage="CVV" />
                </label>
                <div className="paypal-field-wrapper">
                  <div className="field-icon">
                    <Shield className="h-4 w-4" />
                  </div>
                  <PayPalCVVField className="paypal-field-inner" />
                </div>
              </div>
            </div>

            {/* Bouton Payer par carte - Plus grand sur mobile */}
            <CardFieldsSubmitButton
              isProcessing={isProcessing && paymentMethod === "card"}
              disabled={disabled}
              onSubmit={() => setPaymentMethod("card")}
              onError={(err) => {
                setIsProcessing(false);
                setPaymentStatus("error");
                setErrorCode(extractPayPalErrorCode(err));
              }}
            />
          </div>
        </PayPalCardFieldsProvider>
      </div>

      {/* Séparateur "ou" */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-white text-gray-400 text-xs font-medium uppercase">
            <FormattedMessage id="payment.or" defaultMessage="ou" />
          </span>
        </div>
      </div>

      {/* Bouton PayPal - Ne pas griser pour validation, seulement pour disabled/processing */}
      <div className={`paypal-buttons-container transition-opacity duration-200 ${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
        <PayPalButtons
          style={{
            layout: "horizontal",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 44,
            tagline: false,
          }}
          disabled={disabled || isProcessing}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={handleError}
          onCancel={handleCancel}
        />
      </div>

      {/* Badge de sécurité compact */}
      <div className="flex items-center justify-center gap-4 pt-1">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          <span>SSL 256-bit</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <ShieldCheck className="w-3 h-3" />
          <span>PCI DSS</span>
        </div>
      </div>
    </div>
  );
};

export default PayPalPaymentForm;
