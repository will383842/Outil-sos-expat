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
};

function extractPayPalErrorCode(error: unknown): string {
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
      console.error("Card fields form not available");
      return;
    }

    // Vérifier si le formulaire est valide
    const formState = await cardFieldsForm.getState();
    if (!formState.isFormValid) {
      console.warn("Card form is not valid");
      return;
    }

    onSubmit();

    // Soumettre le formulaire de carte
    cardFieldsForm.submit().catch((err) => {
      console.error("Card submit error:", err);
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
    // Mettre à jour seulement si le montant change significativement (> 1 centime)
    if (Math.abs(stableAmount.current - amount) > 0.01) {
      console.log("💸 [PayPal] Amount changed:", { from: stableAmount.current, to: amount });
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

  const { pricing } = usePricingConfig();
  const currencyKey = (currency?.toLowerCase() || 'eur') as 'eur' | 'usd';
  const pricingConfig = pricing?.[serviceType]?.[currencyKey];
  const platformFee = pricingConfig?.connectionFeeAmount ?? Math.round(amount * 0.39 * 100) / 100;
  const providerAmount = pricingConfig?.providerAmount ?? Math.round((amount - platformFee) * 100) / 100;

  // Debug logs pour le montant PayPal
  console.log("🔍 [PayPal] Pricing details:", {
    amount,
    currency,
    serviceType,
    platformFee,
    providerAmount,
    pricingConfig,
    calculatedTotal: amount,
  });

  // Création de l'ordre PayPal (utilisé par les deux méthodes)
  // Utiliser useCallback pour éviter de recréer la fonction à chaque render
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

      console.log("💳 [PayPal] Creating order with:", {
        callSessionId,
        amount,
        providerAmount,
        platformFee,
        currency: currency.toUpperCase(),
        providerId,
        clientId,
        description: description || `Appel SOS-Expat - Session ${callSessionId}`,
        serviceType,
      });

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
        // Pass Meta and UTM tracking data
        metadata: {
          // Meta CAPI identifiers for purchase attribution
          ...(metaIds.fbp && { fbp: metaIds.fbp }),
          ...(metaIds.fbc && { fbc: metaIds.fbc }),
          pixelEventId,
          // UTM params for campaign attribution
          ...(trafficSource?.utm_source && { utm_source: trafficSource.utm_source }),
          ...(trafficSource?.utm_medium && { utm_medium: trafficSource.utm_medium }),
          ...(trafficSource?.utm_campaign && { utm_campaign: trafficSource.utm_campaign }),
          ...(trafficSource?.utm_content && { utm_content: trafficSource.utm_content }),
          ...(trafficSource?.utm_term && { utm_term: trafficSource.utm_term }),
          // Additional click IDs
          ...(trafficSource?.gclid && { gclid: trafficSource.gclid }),
          ...(trafficSource?.ttclid && { ttclid: trafficSource.ttclid }),
        },
      });

      currentOrderIdRef.current = result.data.orderId;
      return result.data.orderId;
    } catch (error) {
      console.error("Erreur création ordre PayPal:", error);
      setPaymentStatus("error");
      setErrorCode(extractPayPalErrorCode(error));
      setIsProcessing(false);
      throw error;
    }
  }, [amount, currency, providerId, callSessionId, clientId, description, serviceType, platformFee, providerAmount]);

  // Capture après approbation (utilisé par les deux méthodes)
  // Utiliser useCallback pour stabiliser la fonction
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
      console.error("Erreur capture PayPal:", error);
      setPaymentStatus("error");
      const code = extractPayPalErrorCode(error);
      setErrorCode(code);
      onError(error instanceof Error ? error : new Error(getTranslatedErrorMessage(code)));
    } finally {
      setIsProcessing(false);
    }
  }, [callSessionId, onSuccess, onError, intl]);

  // Handler pour PayPal Buttons (paiement via compte PayPal)
  const onApprove = useCallback(async (data: { orderID: string; payerID?: string | null }): Promise<void> => {
    setPaymentMethod("paypal");
    await captureOrder(data.orderID, data.payerID || undefined);
  }, [captureOrder]);

  // Handler pour Card Fields (paiement par carte)
  const onCardApprove = useCallback(async (data: { orderID: string }): Promise<void> => {
    setPaymentMethod("card");
    await captureOrder(data.orderID);
  }, [captureOrder]);

  const handleError = useCallback((err: Record<string, unknown>) => {
    console.error("Erreur PayPal:", err);
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

      {/* Section Carte Bancaire */}
      <div className={`transition-opacity duration-200 ${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
        <PayPalCardFieldsProvider
          createOrder={createOrder}
          onApprove={onCardApprove}
          onError={handleError}
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
              {/* Icônes des cartes acceptées */}
              <div className="flex items-center gap-1.5">
                <img src="https://cdn.jsdelivr.net/gh/nicepay-dev/nicepay-checkout-js@main/visa.svg" alt="Visa" className="h-6 sm:h-7 opacity-70" loading="lazy" />
                <img src="https://cdn.jsdelivr.net/gh/nicepay-dev/nicepay-checkout-js@main/mastercard.svg" alt="Mastercard" className="h-6 sm:h-7 opacity-70" loading="lazy" />
                <img src="https://www.svgrepo.com/show/508402/amex.svg" alt="Amex" className="h-6 sm:h-7 opacity-60" loading="lazy" />
              </div>
            </div>

            {/* Nom du titulaire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <FormattedMessage id="payment.cardholderName" defaultMessage="Nom sur la carte" />
              </label>
              <div className="w-full h-12 sm:h-11 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
                <PayPalNameField
                  className="w-full h-full"
                  style={{ border: 'none', outline: 'none' }}
                />
              </div>
            </div>

            {/* Numéro de carte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <FormattedMessage id="payment.cardNumber" defaultMessage="Numéro de carte" />
              </label>
              <div className="w-full h-12 sm:h-11 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
                <PayPalNumberField
                  className="w-full h-full"
                  style={{ border: 'none', outline: 'none' }}
                />
              </div>
            </div>

            {/* Expiration et CVV - Responsive */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <FormattedMessage id="payment.expiry" defaultMessage="Expiration" />
                </label>
                <div className="w-full h-12 sm:h-11 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
                  <PayPalExpiryField
                    className="w-full h-full"
                    style={{ border: 'none', outline: 'none' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <FormattedMessage id="payment.cvv" defaultMessage="CVV" />
                </label>
                <div className="w-full h-12 sm:h-11 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
                  <PayPalCVVField
                    className="w-full h-full"
                    style={{ border: 'none', outline: 'none' }}
                  />
                </div>
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
