// src/components/payment/PayPalPaymentForm.tsx
import React, { useState } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { usePricingConfig } from "../../services/pricingService";

interface PayPalPaymentFormProps {
  amount: number;
  currency: string;
  providerId: string;
  providerPayPalMerchantId?: string;
  callSessionId: string;
  clientId: string;
  description?: string;
  serviceType?: 'lawyer' | 'expat'; // Service type for pricing lookup
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

// P1-3 FIX: Mapping des codes d'erreur PayPal vers des clés i18n (9 langues supportées)
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

/**
 * Extrait le code d'erreur PayPal depuis l'objet d'erreur
 */
function extractPayPalErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    let errorCode = (err.code as string) || (err.name as string) || "";

    // Parfois l'erreur est dans err.details[0].issue
    if (!errorCode && Array.isArray(err.details)) {
      const detail = err.details[0] as Record<string, unknown>;
      errorCode = (detail?.issue as string) || "";
    }
    return errorCode;
  }
  return "";
}

export const PayPalPaymentForm: React.FC<PayPalPaymentFormProps> = ({
  amount,
  currency,
  providerId,
  callSessionId,
  clientId,
  description,
  serviceType = 'expat', // Default to expat if not specified
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  // P1-3 FIX: State pour le code d'erreur (traduit dynamiquement via i18n)
  const [errorCode, setErrorCode] = useState<string>("");

  // Hook i18n pour traduction dans les 9 langues
  const intl = useIntl();

  /**
   * Traduit un code d'erreur PayPal via le système i18n (9 langues)
   */
  const getTranslatedErrorMessage = (code: string): string => {
    const i18nKey = PAYPAL_ERROR_I18N_KEYS[code];
    if (i18nKey) {
      return intl.formatMessage({ id: i18nKey });
    }
    // Message par défaut si le code n'est pas mappé
    return intl.formatMessage({ id: "payment.paypal.err.generic" });
  };

  // Get commission amounts from centralized admin_config/pricing (Firestore)
  const { pricing } = usePricingConfig();
  const currencyKey = (currency?.toLowerCase() || 'eur') as 'eur' | 'usd';
  const pricingConfig = pricing?.[serviceType]?.[currencyKey];

  // Use connectionFeeAmount from admin_config/pricing, with sensible fallbacks
  // Backend will recalculate and validate these values for security
  const platformFee = pricingConfig?.connectionFeeAmount ?? Math.round(amount * 0.39 * 100) / 100;
  const providerAmount = pricingConfig?.providerAmount ?? Math.round((amount - platformFee) * 100) / 100;

  const createOrder = async (): Promise<string> => {
    try {
      setIsProcessing(true);
      setPaymentStatus("processing");

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
          serviceType?: string; // P0 FIX: Ajout du serviceType
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
        serviceType, // P0 FIX: Passer le serviceType au backend
      });

      return result.data.orderId;
    } catch (error) {
      console.error("Erreur création ordre PayPal:", error);
      setPaymentStatus("error");
      // P1-3 FIX: Stocker le code d'erreur (traduit via i18n dans 9 langues)
      setErrorCode(extractPayPalErrorCode(error));
      // P1-8 FIX: Reset isProcessing en cas d'erreur
      setIsProcessing(false);
      throw error;
    }
  };

  const onApprove = async (data: { orderID: string; payerID?: string | null }): Promise<void> => {
    try {
      setIsProcessing(true);

      const capturePayPalOrder = httpsCallable<
        { orderId: string; callSessionId: string },
        CaptureOrderResponse
      >(functions, "capturePayPalOrder");

      const result = await capturePayPalOrder({
        orderId: data.orderID,
        callSessionId,
      });

      if (result.data.success) {
        setPaymentStatus("success");
        onSuccess({
          orderId: data.orderID,
          payerId: data.payerID || "",
          status: result.data.status,
          captureId: result.data.captureId,
        });
      } else {
        throw new Error("Capture PayPal échouée");
      }
    } catch (error) {
      console.error("Erreur capture PayPal:", error);
      setPaymentStatus("error");
      // P1-3 FIX: Stocker le code d'erreur (traduit via i18n dans 9 langues)
      const code = extractPayPalErrorCode(error);
      setErrorCode(code);
      onError(error instanceof Error ? error : new Error(getTranslatedErrorMessage(code)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (err: Record<string, unknown>) => {
    console.error("Erreur PayPal:", err);
    setPaymentStatus("error");
    // P1-3 FIX: Stocker le code d'erreur (traduit via i18n dans 9 langues)
    const code = extractPayPalErrorCode(err);
    setErrorCode(code);
    setIsProcessing(false);
    onError(new Error(getTranslatedErrorMessage(code)));
  };

  const handleCancel = () => {
    setPaymentStatus("idle");
    setIsProcessing(false);
    onCancel?.();
  };

  // Loading state du script PayPal
  if (isPending) {
    return (
      <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-3" />
        <span className="text-gray-600">
          <FormattedMessage id="payment.paypal.loading" defaultMessage="Chargement de PayPal..." />
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
            defaultMessage="Impossible de charger PayPal. Veuillez rafraîchir la page."
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

  // P0-2 FIX: Error state - afficher l'erreur à l'utilisateur
  // P1-3 FIX: Message d'erreur traduit via i18n (9 langues supportées)
  if (paymentStatus === "error") {
    return (
      <div className="space-y-4">
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-red-700 block font-medium">
              <FormattedMessage
                id="payment.paypal.error"
                defaultMessage="Erreur de paiement"
              />
            </span>
            {/* P1-3 FIX: Message d'erreur traduit via i18n (9 langues) */}
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
          onClick={() => {
            setPaymentStatus("idle");
            setErrorCode(""); // Reset le code d'erreur
          }}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <FormattedMessage
            id="payment.paypal.retry"
            defaultMessage="Réessayer"
          />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Récapitulatif du paiement */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">
            <FormattedMessage id="payment.total" defaultMessage="Total" />
          </span>
          <span className="text-xl font-bold text-gray-900">
            {amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          <FormattedMessage
            id="payment.paypal.securePayment"
            defaultMessage="Paiement sécurisé par PayPal"
          />
        </p>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-3" />
          <span className="text-blue-700">
            <FormattedMessage
              id="payment.paypal.processing"
              defaultMessage="Traitement du paiement en cours..."
            />
          </span>
        </div>
      )}

      {/* Boutons PayPal */}
      <div className={`${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
        <PayPalButtons
          style={{
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 50,
          }}
          disabled={disabled || isProcessing}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={handleError}
          onCancel={handleCancel}
        />
      </div>

      {/* Message de sécurité */}
      <p className="text-center text-xs text-gray-500 mt-2">
        <FormattedMessage
          id="payment.paypal.guarantee"
          defaultMessage="Votre paiement est protégé par la garantie PayPal"
        />
      </p>
    </div>
  );
};

export default PayPalPaymentForm;
