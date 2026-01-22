// src/components/payment/PayPalPaymentForm.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  PayPalNameField,
  usePayPalCardFields,
  usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import { Loader2, AlertCircle, CheckCircle, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { usePricingConfig } from "../../services/pricingService";
import { getCurrentTrafficSource } from "../../utils/trafficSource";
import { getStoredMetaIdentifiers } from "../../utils/fbpCookie";
import { getOrCreateEventId } from "../../utils/sharedEventId";

interface PayPalPaymentFormProps {
  amount: number;
  currency: string;
  providerId: string;
  providerPayPalMerchantId?: string;
  callSessionId: string;
  clientId: string;
  description?: string;
  serviceType?: 'lawyer' | 'expat';
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
  INSTRUMENT_DECLINED: "payment.paypal.err.instrumentDeclined",
  PAYER_ACTION_REQUIRED: "payment.paypal.err.payerActionRequired",
  PAYER_CANNOT_PAY: "payment.paypal.err.payerCannotPay",
  INVALID_CURRENCY: "payment.paypal.err.invalidCurrency",
  DUPLICATE_INVOICE_ID: "payment.paypal.err.duplicateInvoice",
  ORDER_NOT_APPROVED: "payment.paypal.err.orderNotApproved",
  AUTHORIZATION_VOIDED: "payment.paypal.err.authorizationVoided",
  INTERNAL_SERVER_ERROR: "payment.paypal.err.serverError",
  NETWORK_ERROR: "payment.paypal.err.networkError",
};

// Détecte si l'erreur est une erreur réseau (souvent causée par des extensions de navigateur)
function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const errorStr = String(error).toLowerCase();
  const message = (error as Error)?.message?.toLowerCase() || "";

  return (
    errorStr.includes("failed to fetch") ||
    errorStr.includes("network error") ||
    errorStr.includes("networkerror") ||
    errorStr.includes("net::err_failed") ||
    errorStr.includes("aborted") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    (error as Error)?.name === "AbortError" ||
    (error as Error)?.name === "TypeError"
  );
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
}> = ({ isProcessing, disabled, onSubmit }) => {
  const { cardFieldsForm } = usePayPalCardFields();

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
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`w-full py-4 sm:py-3.5 px-4 rounded-xl font-semibold text-base sm:text-sm
        transition-all duration-200 flex items-center justify-center gap-2.5
        shadow-sm active:scale-[0.98] touch-manipulation
        ${disabled || isProcessing
          ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
          : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-200 hover:shadow-md"
        }`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <FormattedMessage id="payment.processing" defaultMessage="Traitement..." />
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" />
          <FormattedMessage id="payment.payByCard" defaultMessage="Payer par carte" />
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

  const intl = useIntl();
  const currentOrderIdRef = useRef<string>("");

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
  const createOrder = useCallback(async (): Promise<string> => {
    try {
      setIsProcessing(true);
      setPaymentStatus("processing");

      // Collect tracking data for Meta CAPI attribution
      const metaIds = getStoredMetaIdentifiers();
      const trafficSource = getCurrentTrafficSource();
      const pixelEventId = getOrCreateEventId(`purchase_${callSessionId}`, 'purchase');

      const createPayPalOrder = httpsCallable<
        {
          callSessionId: string;
          amount: number;
          providerAmount: number;
          platformFee: number;
          currency: string;
          providerId: string;
          clientId: string;
          description?: string;
          serviceType?: string;
          metadata?: Record<string, string>;
        },
        CreateOrderResponse
      >(functions, "createPayPalOrder");

      const result = await createPayPalOrder({
        callSessionId,
        amount,
        providerAmount,
        platformFee,
        currency: currency.toUpperCase(),
        providerId,
        clientId,
        description: description || `Appel SOS-Expat - Session ${callSessionId}`,
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
      });

      currentOrderIdRef.current = result.data.orderId;
      return result.data.orderId;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("PayPal createOrder error:", error);
      }
      setPaymentStatus("error");
      setErrorCode(extractPayPalErrorCode(error));
      setIsProcessing(false);
      throw error;
    }
  }, [amount, currency, providerId, callSessionId, clientId, description, serviceType, platformFee, providerAmount]);

  // Capture après approbation
  const captureOrder = useCallback(async (orderId: string, payerId?: string): Promise<void> => {
    try {
      const capturePayPalOrder = httpsCallable<
        { orderId: string; callSessionId: string },
        CaptureOrderResponse
      >(functions, "capturePayPalOrder");

      const result = await capturePayPalOrder({
        orderId,
        callSessionId,
      });

      if (result.data.success) {
        setPaymentStatus("success");
        onSuccess({
          orderId,
          payerId: payerId || "",
          status: result.data.status,
          captureId: result.data.captureId,
        });
      } else {
        throw new Error("Capture PayPal échouée");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("PayPal captureOrder error:", error);
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
    await captureOrder(data.orderID, data.payerID || undefined);
  }, [captureOrder]);

  // Handler pour Card Fields
  const onCardApprove = useCallback(async (data: { orderID: string }): Promise<void> => {
    setPaymentMethod("card");
    await captureOrder(data.orderID);
  }, [captureOrder]);

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

  // Loading state
  if (isPending) {
    return (
      <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
        <span className="text-gray-600">
          <FormattedMessage id="payment.paypal.loading" defaultMessage="Chargement..." />
        </span>
      </div>
    );
  }

  // Error state du script PayPal
  if (isRejected) {
    return (
      <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
        <span className="text-red-700">
          <FormattedMessage
            id="payment.paypal.loadError"
            defaultMessage="Impossible de charger le système de paiement. Veuillez rafraîchir la page."
          />
        </span>
      </div>
    );
  }

  // Success state
  if (paymentStatus === "success") {
    return (
      <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
        <span className="text-green-700">
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
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-orange-800 block font-medium">
                  <FormattedMessage
                    id="payment.paypal.networkError.title"
                    defaultMessage="Problème de connexion détecté"
                  />
                </span>
                <span className="text-orange-700 text-sm block mt-1">
                  <FormattedMessage
                    id="payment.paypal.networkError.description"
                    defaultMessage="Une extension de navigateur (antivirus, bloqueur de pub) semble bloquer le paiement."
                  />
                </span>
                <ul className="text-orange-700 text-sm mt-3 space-y-1.5 list-disc list-inside">
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
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FormattedMessage id="payment.paypal.retry" defaultMessage="Réessayer" />
          </button>
        </div>
      );
    }

    // Erreur standard
    return (
      <div className="space-y-4">
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-red-700 block font-medium">
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
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <FormattedMessage id="payment.paypal.retry" defaultMessage="Réessayer" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Récapitulatif du paiement - Design moderne */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-sm sm:text-base text-gray-600 font-medium">
            <FormattedMessage id="payment.total" defaultMessage="Total à payer" />
          </span>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            {amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Processing state - Plus visible */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-blue-50 rounded-xl border border-blue-100">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
          <span className="text-blue-700 font-medium text-center">
            <FormattedMessage
              id="payment.paypal.processing"
              defaultMessage="Traitement sécurisé en cours..."
            />
          </span>
          <span className="text-blue-500 text-sm mt-1">
            <FormattedMessage
              id="payment.doNotClose"
              defaultMessage="Ne fermez pas cette page"
            />
          </span>
        </div>
      )}

      {/* CSS pour les champs PayPal - une seule bordure */}
      <style>{`
        .paypal-card-field {
          width: 100%;
          height: 48px;
        }
        @media (min-width: 640px) {
          .paypal-card-field {
            height: 44px;
          }
        }
        .paypal-card-field > div,
        .paypal-card-field iframe {
          border: none !important;
          outline: none !important;
        }
      `}</style>

      {/* Section Carte Bancaire */}
      <div className={`transition-opacity duration-200 ${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
        <PayPalCardFieldsProvider
          createOrder={createOrder}
          onApprove={onCardApprove}
          onError={handleError}
          // Note: PayPal SDK style types are incomplete, using type assertion
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={{
            input: {
              "font-size": "16px",
              "font-family": "system-ui, -apple-system, sans-serif",
              "color": "#374151",
              "padding": "12px",
              "border": "1px solid #d1d5db",
              "border-radius": "8px",
              "height": "100%",
              "box-sizing": "border-box",
              "background-color": "#ffffff",
            },
            "input:focus": {
              "border-color": "#3b82f6",
              "box-shadow": "0 0 0 2px rgba(59, 130, 246, 0.2)",
              "outline": "none",
            },
            ".invalid": {
              "color": "#dc2626",
              "border-color": "#dc2626",
            },
          } as any}
        >
          <div className="space-y-4">
            {/* Header avec icônes de cartes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="text-sm sm:text-base">
                  <FormattedMessage id="payment.creditCard" defaultMessage="Carte bancaire" />
                </span>
              </div>
              {/* Icônes des cartes acceptées - SVG inline pour fiabilité */}
              <div className="flex items-center gap-2">
                {/* Visa */}
                <svg className="h-5 sm:h-6" viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#0E4595" width="750" height="471" rx="20"/>
                  <path d="M278.198 334.228l33.36-195.763h53.358l-33.385 195.763H278.198zm246.11-191.54c-10.569-3.966-27.135-8.222-47.822-8.222-52.726 0-89.863 26.55-90.18 64.604-.297 28.129 26.514 43.822 46.754 53.185 20.77 9.598 27.752 15.716 27.652 24.283-.133 13.123-16.586 19.116-31.924 19.116-21.355 0-32.701-2.967-50.225-10.274l-6.878-3.112-7.487 43.823c12.463 5.466 35.508 10.199 59.438 10.445 56.09 0 92.502-26.248 92.916-66.884.199-22.27-14.016-39.216-44.801-53.188-18.65-9.056-30.072-15.099-29.951-24.269 0-8.137 9.668-16.838 30.559-16.838 17.447-.271 30.088 3.534 39.936 7.5l4.781 2.259 7.232-42.428m137.31-4.223h-41.23c-12.772 0-22.332 3.486-27.94 16.234l-79.245 179.404h56.031s9.159-24.121 11.232-29.418c6.123 0 60.555.084 68.336.084 1.596 6.854 6.492 29.334 6.492 29.334h49.512l-43.188-195.638zm-65.417 126.408c4.414-11.279 21.26-54.724 21.26-54.724-.316.521 4.379-11.334 7.074-18.684l3.606 16.878s10.217 46.729 12.353 56.53h-44.293zM232.903 138.465L180.664 271.96l-5.565-27.129c-9.726-31.274-40.025-65.157-73.898-82.12l47.767 171.204 56.455-.063 84.004-195.386-56.524-.001" fill="#fff"/>
                </svg>
                {/* Mastercard */}
                <svg className="h-5 sm:h-6" viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#fff" width="750" height="471" rx="20"/>
                  <circle fill="#EB001B" cx="250" cy="235" r="150"/>
                  <circle fill="#F79E1B" cx="500" cy="235" r="150"/>
                  <path fill="#FF5F00" d="M325 118a149.8 149.8 0 000 234 149.8 149.8 0 000-234"/>
                </svg>
                {/* Amex */}
                <svg className="h-5 sm:h-6" viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg">
                  <rect fill="#006FCF" width="750" height="471" rx="20"/>
                  <path d="M0 221h51l11-26 12 26h161v-20l14 20h83l14-21v21h333v-61l-6-3 6-3v-54H354l-13 19-12-19H156v19l-16-19H67l-34 78v23H0v61zm67-74l-16 38h-7l-16-38v52H0v-74h38l14 33 14-33h38v74H67v-52zm88 52h-29v-12h29v-12h-29v-12h32v-12h-51v74h51l-3-26zm54 0h-36v-74h36v12h-17v12h17v12h-17v12h17v26zm35 0l-38-53v53h-19v-74h21l37 52v-52h19v74h-20zm59-62h-20v62h-19v-62h-20v-12h59v12zm47 62l-24-34 24-40h-22l-24 40 24 34h22zm166 0l-25-40 25-34h-22l-24 34 24 40h22zm-119 0h-36v-74h36v12h-17v12h17v12h-17v12h17v26zm71-62h-20v62h-19v-62h-20v-12h59v12z" fill="#fff"/>
                </svg>
              </div>
            </div>

            {/* Nom du titulaire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <FormattedMessage id="payment.cardholderName" defaultMessage="Nom sur la carte" />
              </label>
              <PayPalNameField className="paypal-card-field" />
            </div>

            {/* Numéro de carte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <FormattedMessage id="payment.cardNumber" defaultMessage="Numéro de carte" />
              </label>
              <PayPalNumberField className="paypal-card-field" />
            </div>

            {/* Expiration et CVV - Responsive */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <FormattedMessage id="payment.expiry" defaultMessage="Expiration" />
                </label>
                <PayPalExpiryField className="paypal-card-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <FormattedMessage id="payment.cvv" defaultMessage="CVV" />
                </label>
                <PayPalCVVField className="paypal-card-field" />
              </div>
            </div>

            {/* Bouton Payer par carte - Plus grand sur mobile */}
            <CardFieldsSubmitButton
              isProcessing={isProcessing && paymentMethod === "card"}
              disabled={disabled}
              onSubmit={() => setPaymentMethod("card")}
            />
          </div>
        </PayPalCardFieldsProvider>
      </div>

      {/* Séparateur "ou" - Plus visible */}
      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-white text-gray-400 text-sm font-medium uppercase tracking-wide">
            <FormattedMessage id="payment.or" defaultMessage="ou" />
          </span>
        </div>
      </div>

      {/* Bouton PayPal */}
      <div className={`transition-opacity duration-200 ${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
        <PayPalButtons
          style={{
            layout: "horizontal",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 50,
            tagline: false,
          }}
          disabled={disabled || isProcessing}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={handleError}
          onCancel={handleCancel}
        />
      </div>

      {/* Badges de sécurité */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 pt-2 pb-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Lock className="w-3.5 h-3.5" />
          <span>
            <FormattedMessage id="payment.ssl256" defaultMessage="Chiffrement SSL 256-bit" />
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>
            <FormattedMessage id="payment.pciCompliant" defaultMessage="Conforme PCI DSS" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default PayPalPaymentForm;
