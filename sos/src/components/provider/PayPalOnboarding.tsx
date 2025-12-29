// src/components/provider/PayPalOnboarding.tsx
import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import { CheckCircle, ExternalLink, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";

interface PayPalOnboardingProps {
  providerId: string;
  providerEmail: string;
  providerFirstName: string;
  providerLastName: string;
  providerCountry: string;
  businessName?: string;
  onStatusChange?: (status: PayPalMerchantStatus) => void;
  className?: string;
}

type PayPalMerchantStatus =
  | "not_connected"
  | "pending"
  | "active"
  | "suspended"
  | "restricted";

interface MerchantStatusResponse {
  isConnected: boolean;
  status: PayPalMerchantStatus;
  merchantId?: string;
  email?: string;
  paymentsReceivable?: boolean;
  primaryEmailConfirmed?: boolean;
}

interface OnboardingLinkResponse {
  actionUrl: string;
  partnerId: string;
}

export const PayPalOnboarding: React.FC<PayPalOnboardingProps> = ({
  providerId,
  providerEmail,
  providerFirstName,
  providerLastName,
  providerCountry,
  businessName,
  onStatusChange,
  className = "",
}) => {
  const [status, setStatus] = useState<PayPalMerchantStatus>("not_connected");
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intl = useIntl();

  // Vérifier le statut du merchant au chargement
  useEffect(() => {
    checkMerchantStatus();
  }, [providerId]);

  const checkMerchantStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const checkStatus = httpsCallable<
        { providerId: string },
        MerchantStatusResponse
      >(functions, "checkPayPalMerchantStatus");

      const result = await checkStatus({ providerId });
      const { isConnected, status: merchantStatus, merchantId: id } = result.data;

      setStatus(merchantStatus);
      setMerchantId(id || null);
      onStatusChange?.(merchantStatus);
    } catch (err) {
      console.error("Erreur vérification statut PayPal:", err);
      setStatus("not_connected");
    } finally {
      setIsLoading(false);
    }
  };

  const startOnboarding = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const createOnboardingLink = httpsCallable<
        {
          providerId: string;
          email: string;
          firstName: string;
          lastName: string;
          country: string;
          businessName?: string;
        },
        OnboardingLinkResponse
      >(functions, "createPayPalOnboardingLink");

      const result = await createOnboardingLink({
        providerId,
        email: providerEmail,
        firstName: providerFirstName,
        lastName: providerLastName,
        country: providerCountry,
        businessName,
      });

      // Rediriger vers PayPal pour l'onboarding
      window.location.href = result.data.actionUrl;
    } catch (err) {
      console.error("Erreur création lien onboarding PayPal:", err);
      setError(
        intl.formatMessage({
          id: "provider.paypal.error.onboarding",
          defaultMessage: "Impossible de démarrer la connexion PayPal. Veuillez réessayer.",
        })
      );
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">
          <FormattedMessage
            id="provider.paypal.checking"
            defaultMessage="Vérification du statut PayPal..."
          />
        </span>
      </div>
    );
  }

  // Statut connecté et actif
  if (status === "active") {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
          <div>
            <h4 className="font-semibold text-green-800">
              <FormattedMessage
                id="provider.paypal.connected"
                defaultMessage="PayPal connecté"
              />
            </h4>
            <p className="text-sm text-green-700 mt-1">
              <FormattedMessage
                id="provider.paypal.ready"
                defaultMessage="Vous pouvez recevoir des paiements via PayPal"
              />
            </p>
            {merchantId && (
              <p className="text-xs text-green-600 mt-1">
                Merchant ID: {merchantId}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={checkMerchantStatus}
          className="mt-3 flex items-center text-sm text-green-600 hover:text-green-800"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          <FormattedMessage
            id="provider.paypal.refresh"
            defaultMessage="Actualiser le statut"
          />
        </button>
      </div>
    );
  }

  // Statut en attente
  if (status === "pending") {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-500 mr-3" />
          <div>
            <h4 className="font-semibold text-yellow-800">
              <FormattedMessage
                id="provider.paypal.pending"
                defaultMessage="Vérification en cours"
              />
            </h4>
            <p className="text-sm text-yellow-700 mt-1">
              <FormattedMessage
                id="provider.paypal.pendingDescription"
                defaultMessage="PayPal vérifie votre compte. Cela peut prendre quelques minutes."
              />
            </p>
          </div>
        </div>
        <button
          onClick={checkMerchantStatus}
          className="mt-3 flex items-center text-sm text-yellow-600 hover:text-yellow-800"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          <FormattedMessage
            id="provider.paypal.checkAgain"
            defaultMessage="Vérifier à nouveau"
          />
        </button>
      </div>
    );
  }

  // Non connecté - bouton pour démarrer
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 p-2 bg-[#003087] rounded-lg">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
          </svg>
        </div>
        <div className="ml-4 flex-1">
          <h4 className="font-semibold text-gray-900">
            <FormattedMessage
              id="provider.paypal.connect.title"
              defaultMessage="Connecter PayPal"
            />
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            <FormattedMessage
              id="provider.paypal.connect.description"
              defaultMessage="Recevez des paiements de clients du monde entier via PayPal"
            />
          </p>

          {error && (
            <div className="mt-3 flex items-center text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}

          <button
            onClick={startOnboarding}
            disabled={isConnecting}
            className="mt-4 inline-flex items-center px-4 py-2 bg-[#0070ba] text-white rounded-lg hover:bg-[#003087] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <FormattedMessage
                  id="provider.paypal.connecting"
                  defaultMessage="Connexion en cours..."
                />
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                <FormattedMessage
                  id="provider.paypal.connectButton"
                  defaultMessage="Connecter mon compte PayPal"
                />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <FormattedMessage
            id="provider.paypal.connect.note"
            defaultMessage="Vous serez redirigé vers PayPal pour compléter la connexion. Vos informations bancaires ne sont jamais partagées avec SOS-Expat."
          />
        </p>
      </div>
    </div>
  );
};

export default PayPalOnboarding;
