// src/components/payment/PayPalPaymentForm.tsx
import React, { useState, useRef } from "react";
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
import { Loader2, AlertCircle, CheckCircle, CreditCard } from "lucide-react";
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
      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
        ${disabled || isProcessing
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <FormattedMessage id="payment.processing" defaultMessage="Traitement..." />
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
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

  // Création de l'ordre PayPal (utilisé par les deux méthodes)
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
          serviceType?: string;
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
  };

  // Capture après approbation (utilisé par les deux méthodes)
  const captureOrder = async (orderId: string, payerId?: string): Promise<void> => {
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
  };

  // Handler pour PayPal Buttons (paiement via compte PayPal)
  const onApprove = async (data: { orderID: string; payerID?: string | null }): Promise<void> => {
    setPaymentMethod("paypal");
    await captureOrder(data.orderID, data.payerID || undefined);
  };

  // Handler pour Card Fields (paiement par carte)
  const onCardApprove = async (data: { orderID: string }): Promise<void> => {
    setPaymentMethod("card");
    await captureOrder(data.orderID);
  };

  const handleError = (err: Record<string, unknown>) => {
    console.error("Erreur PayPal:", err);
    setPaymentStatus("error");
    const code = extractPayPalErrorCode(err);
    setErrorCode(code);
    setIsProcessing(false);
    onError(new Error(getTranslatedErrorMessage(code)));
  };

  const handleCancel = () => {
    setPaymentStatus("idle");
    setIsProcessing(false);
    setPaymentMethod(null);
    onCancel?.();
  };

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
            id="payment.securePayment"
            defaultMessage="Paiement sécurisé"
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

      {/* Section Carte Bancaire */}
      <div className={`${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
        <PayPalCardFieldsProvider
          createOrder={createOrder}
          onApprove={onCardApprove}
          onError={handleError}
        >
          <div className="space-y-3">
            {/* Titre section carte */}
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <CreditCard className="w-5 h-5" />
              <FormattedMessage id="payment.creditCard" defaultMessage="Carte bancaire" />
            </div>

            {/* Nom du titulaire */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <FormattedMessage id="payment.cardholderName" defaultMessage="Nom du titulaire" />
              </label>
              <PayPalNameField
                className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Numéro de carte */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <FormattedMessage id="payment.cardNumber" defaultMessage="Numéro de carte" />
              </label>
              <PayPalNumberField
                className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Expiration et CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  <FormattedMessage id="payment.expiry" defaultMessage="Date d'expiration" />
                </label>
                <PayPalExpiryField
                  className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  <FormattedMessage id="payment.cvv" defaultMessage="CVV" />
                </label>
                <PayPalCVVField
                  className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Bouton Payer par carte */}
            <CardFieldsSubmitButton
              isProcessing={isProcessing && paymentMethod === "card"}
              disabled={disabled}
              onSubmit={() => setPaymentMethod("card")}
            />
          </div>
        </PayPalCardFieldsProvider>
      </div>

      {/* Séparateur "ou" */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-gray-500">
            <FormattedMessage id="payment.or" defaultMessage="ou" />
          </span>
        </div>
      </div>

      {/* Bouton PayPal */}
      <div className={`${disabled || isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
        <PayPalButtons
          style={{
            layout: "horizontal",
            color: "gold",
            shape: "rect",
            label: "paypal",
            height: 48,
            tagline: false,
          }}
          disabled={disabled || isProcessing}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={handleError}
          onCancel={handleCancel}
        />
      </div>

      {/* Message de sécurité */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <FormattedMessage
          id="payment.secureSSL"
          defaultMessage="Données protégées par SSL"
        />
      </div>
    </div>
  );
};

export default PayPalPaymentForm;
