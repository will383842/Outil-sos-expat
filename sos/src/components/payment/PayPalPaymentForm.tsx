// src/components/payment/PayPalPaymentForm.tsx
import React, { useState } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { useApp } from "../../contexts/AppContext";

interface PayPalPaymentFormProps {
  amount: number;
  currency: string;
  providerId: string;
  providerPayPalMerchantId?: string;
  callSessionId: string;
  clientId: string;
  description?: string;
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

export const PayPalPaymentForm: React.FC<PayPalPaymentFormProps> = ({
  amount,
  currency,
  providerId,
  providerPayPalMerchantId,
  callSessionId,
  clientId,
  description,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const intl = useIntl();
  const { settings } = useApp();

  // SECURITY FIX: Use commission rate from backend settings instead of hardcoded values
  // The backend will validate and recalculate these values for security
  const commissionRate = settings?.commissionRate ?? 0.20; // Default fallback only
  const platformFee = amount * commissionRate;
  const providerAmount = amount * (1 - commissionRate);

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
      });

      return result.data.orderId;
    } catch (error) {
      console.error("Erreur création ordre PayPal:", error);
      setPaymentStatus("error");
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
      onError(error instanceof Error ? error : new Error("Erreur de paiement PayPal"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (err: Record<string, unknown>) => {
    console.error("Erreur PayPal:", err);
    setPaymentStatus("error");
    setIsProcessing(false);
    onError(new Error("Erreur lors du paiement PayPal"));
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

  return (
    <div className="space-y-4">
      {/* Récapitulatif du paiement */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">
            <FormattedMessage id="payment.total" defaultMessage="Total" />
          </span>
          <span className="text-xl font-bold text-gray-900">
            {amount.toFixed(2)} {currency.toUpperCase()}
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
