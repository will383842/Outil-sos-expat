// src/components/provider/PayPalOnboarding.tsx
// Version simplifiée : le prestataire entre son email PayPal pour recevoir ses paiements
import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { CheckCircle, Loader2, AlertCircle, Mail } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";

interface PayPalOnboardingProps {
  providerId: string;
  providerEmail: string;
  providerType: "lawyer" | "expat";
  onStatusChange?: (status: PayPalStatus) => void;
  className?: string;
}

type PayPalStatus = "not_connected" | "pending" | "active";

export const PayPalOnboarding: React.FC<PayPalOnboardingProps> = ({
  providerId,
  providerEmail,
  providerType,
  onStatusChange,
  className = "",
}) => {
  const [status, setStatus] = useState<PayPalStatus>("not_connected");
  const [paypalEmail, setPaypalEmail] = useState<string>("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const intl = useIntl();

  // Charger le statut PayPal actuel
  useEffect(() => {
    loadPayPalStatus();
  }, [providerId]);

  const loadPayPalStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Vérifier dans sos_profiles
      const profileDoc = await getDoc(doc(db, "sos_profiles", providerId));

      if (profileDoc.exists()) {
        const data = profileDoc.data();
        const email = data.paypalEmail;
        const accountStatus = data.paypalAccountStatus;

        if (email) {
          setSavedEmail(email);
          setPaypalEmail(email);
          setStatus(accountStatus === "active" ? "active" : "active"); // Si email existe, c'est actif
          onStatusChange?.("active");
        } else {
          setStatus("not_connected");
          onStatusChange?.("not_connected");
        }
      }
    } catch (err) {
      console.error("Erreur chargement statut PayPal:", err);
      setError("Erreur lors du chargement du statut PayPal");
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const savePayPalEmail = async () => {
    if (!paypalEmail.trim()) {
      setError(intl.formatMessage({
        id: "provider.paypal.error.emailRequired",
        defaultMessage: "Veuillez entrer votre adresse email PayPal",
      }));
      return;
    }

    if (!validateEmail(paypalEmail)) {
      setError(intl.formatMessage({
        id: "provider.paypal.error.invalidEmail",
        defaultMessage: "Veuillez entrer une adresse email valide",
      }));
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const updateData = {
        paypalEmail: paypalEmail.trim().toLowerCase(),
        paypalAccountStatus: "active",
        paypalOnboardingComplete: true,
        paypalPaymentsReceivable: true,
        isVisible: true, // Rendre le prestataire visible
        updatedAt: new Date(),
      };

      // Mettre à jour sos_profiles
      await updateDoc(doc(db, "sos_profiles", providerId), updateData);

      // Mettre à jour la collection spécifique (lawyers ou expats)
      const collectionName = providerType === "lawyer" ? "lawyers" : "expats";
      await updateDoc(doc(db, collectionName, providerId), updateData);

      // Mettre à jour users
      await updateDoc(doc(db, "users", providerId), {
        paypalEmail: paypalEmail.trim().toLowerCase(),
        paypalAccountStatus: "active",
        paypalOnboardingComplete: true,
        updatedAt: new Date(),
      });

      setSavedEmail(paypalEmail);
      setStatus("active");
      onStatusChange?.("active");

      setSuccess(intl.formatMessage({
        id: "provider.paypal.success",
        defaultMessage: "Votre compte PayPal a été enregistré avec succès !",
      }));

      // Rafraîchir la page après 2 secondes
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error("Erreur sauvegarde email PayPal:", err);
      setError(intl.formatMessage({
        id: "provider.paypal.error.save",
        defaultMessage: "Erreur lors de l'enregistrement. Veuillez réessayer.",
      }));
    } finally {
      setIsSaving(false);
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
  if (status === "active" && savedEmail) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <CheckCircle className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
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
            <p className="text-sm text-green-600 mt-2 flex items-center">
              <Mail className="w-4 h-4 mr-1" />
              {savedEmail}
            </p>
          </div>
        </div>

        {/* Option pour modifier l'email */}
        <div className="mt-4 pt-4 border-t border-green-200">
          <button
            onClick={() => {
              setStatus("not_connected");
              setSavedEmail(null);
            }}
            className="text-sm text-green-600 hover:text-green-800 underline"
          >
            <FormattedMessage
              id="provider.paypal.changeEmail"
              defaultMessage="Modifier l'adresse email PayPal"
            />
          </button>
        </div>
      </div>
    );
  }

  // Formulaire pour entrer l'email PayPal
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start mb-4">
        <div className="flex-shrink-0 p-2 bg-[#003087] rounded-lg">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
          </svg>
        </div>
        <div className="ml-4">
          <h4 className="font-semibold text-gray-900">
            <FormattedMessage
              id="provider.paypal.connect.title"
              defaultMessage="Configurer PayPal"
            />
          </h4>
          <p className="text-sm text-gray-600 mt-1">
            <FormattedMessage
              id="provider.paypal.connect.description"
              defaultMessage="Entrez l'adresse email associée à votre compte PayPal pour recevoir vos paiements."
            />
          </p>
        </div>
      </div>

      {/* Champ email */}
      <div className="mb-4">
        <label htmlFor="paypal-email" className="block text-sm font-medium text-gray-700 mb-2">
          <FormattedMessage
            id="provider.paypal.emailLabel"
            defaultMessage="Adresse email PayPal"
          />
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            id="paypal-email"
            value={paypalEmail}
            onChange={(e) => {
              setPaypalEmail(e.target.value);
              setError(null);
            }}
            placeholder={providerEmail}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          <FormattedMessage
            id="provider.paypal.emailHint"
            defaultMessage="Cette adresse doit correspondre à votre compte PayPal"
          />
        </p>
      </div>

      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="mb-4 flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Bouton de sauvegarde */}
      <button
        onClick={savePayPalEmail}
        disabled={isSaving || !paypalEmail.trim()}
        className="w-full flex items-center justify-center px-4 py-3 bg-[#0070ba] text-white rounded-lg hover:bg-[#003087] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <FormattedMessage
              id="provider.paypal.saving"
              defaultMessage="Enregistrement..."
            />
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            <FormattedMessage
              id="provider.paypal.saveButton"
              defaultMessage="Enregistrer mon compte PayPal"
            />
          </>
        )}
      </button>

      {/* Note de sécurité */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <FormattedMessage
            id="provider.paypal.securityNote"
            defaultMessage="Vos paiements seront envoyés directement sur votre compte PayPal. SOS-Expat n'a jamais accès à vos informations bancaires."
          />
        </p>
      </div>
    </div>
  );
};

export default PayPalOnboarding;
