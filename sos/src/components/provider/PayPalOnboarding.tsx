// src/components/provider/PayPalOnboarding.tsx
// Version avec vérification par code email à 6 chiffres
import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../config/firebase";
import { CheckCircle, Loader2, AlertCircle, Mail, RefreshCw, Shield } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";

interface PayPalOnboardingProps {
  providerId: string;
  providerEmail: string;
  providerType: "lawyer" | "expat";
  onStatusChange?: (status: PayPalStatus) => void;
  className?: string;
}

type PayPalStatus = "not_connected" | "pending_verification" | "active";
type Step = "email" | "verification" | "success";

export const PayPalOnboarding: React.FC<PayPalOnboardingProps> = ({
  providerId,
  providerEmail,
  providerType,
  onStatusChange,
  className = "",
}) => {
  const [status, setStatus] = useState<PayPalStatus>("not_connected");
  const [step, setStep] = useState<Step>("email");
  const [paypalEmail, setPaypalEmail] = useState<string>("");
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const intl = useIntl();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // DEBUG LOGS - PayPal Onboarding Investigation
  console.log('[PayPalOnboarding DEBUG] 📦 Render', {
    providerId,
    providerEmail,
    providerType,
    status,
    step,
    paypalEmail,
    savedEmail,
    isLoading,
    isSending,
    isVerifying,
    error,
    success,
    cooldownSeconds,
    attemptsRemaining,
    timestamp: new Date().toISOString()
  });

  // Charger le statut PayPal actuel
  useEffect(() => {
    loadPayPalStatus();
  }, [providerId]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const loadPayPalStatus = async () => {
    console.log('[PayPalOnboarding DEBUG] 🔍 loadPayPalStatus STARTED', { providerId });
    try {
      setIsLoading(true);
      setError(null);

      const profileDoc = await getDoc(doc(db, "sos_profiles", providerId));

      if (profileDoc.exists()) {
        const data = profileDoc.data();
        const email = data.paypalEmail;
        const emailVerified = data.paypalEmailVerified;

        console.log('[PayPalOnboarding DEBUG] 📝 Profile data', {
          hasEmail: !!email,
          emailVerified,
          paypalAccountStatus: data.paypalAccountStatus,
          paypalOnboardingComplete: data.paypalOnboardingComplete,
        });

        if (email && emailVerified) {
          console.log('[PayPalOnboarding DEBUG] ✅ PayPal already verified');
          setSavedEmail(email);
          setPaypalEmail(email);
          setStatus("active");
          setStep("success");
          onStatusChange?.("active");
        } else {
          console.log('[PayPalOnboarding DEBUG] ⚠️ PayPal not yet verified');
          setStatus("not_connected");
          setStep("email");
          onStatusChange?.("not_connected");
        }
      } else {
        console.log('[PayPalOnboarding DEBUG] ❌ Profile doc does not exist');
      }
    } catch (err) {
      console.error("Erreur chargement statut PayPal:", err);
      console.log('[PayPalOnboarding DEBUG] ❌ loadPayPalStatus ERROR', { err });
      setError(intl.formatMessage({
        id: "provider.paypal.error.load",
        defaultMessage: "Erreur lors du chargement du statut PayPal",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendVerificationCode = async () => {
    console.log('[PayPalOnboarding DEBUG] 📧 sendVerificationCode STARTED', { paypalEmail });
    if (!paypalEmail.trim()) {
      console.log('[PayPalOnboarding DEBUG] ⚠️ Email is empty');
      setError(intl.formatMessage({
        id: "provider.paypal.error.emailRequired",
        defaultMessage: "Veuillez entrer votre adresse email PayPal",
      }));
      return;
    }

    if (!validateEmail(paypalEmail)) {
      console.log('[PayPalOnboarding DEBUG] ⚠️ Email is invalid');
      setError(intl.formatMessage({
        id: "provider.paypal.error.invalidEmail",
        defaultMessage: "Veuillez entrer une adresse email valide",
      }));
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      console.log('[PayPalOnboarding DEBUG] 📤 Calling sendPayPalVerificationCode function');
      const sendCode = httpsCallable(functions, "sendPayPalVerificationCode");
      await sendCode({
        email: paypalEmail.trim().toLowerCase(),
        locale: intl.locale,
      });

      console.log('[PayPalOnboarding DEBUG] ✅ Code sent successfully');
      setStep("verification");
      setVerificationCode(["", "", "", "", "", ""]);
      setAttemptsRemaining(3);
      setCooldownSeconds(60);
      setSuccess(intl.formatMessage({
        id: "provider.paypal.codeSent",
        defaultMessage: "Un code de vérification a été envoyé à votre adresse email",
      }));

      // Focus sur le premier input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);

    } catch (err) {
      console.error("Erreur envoi code:", err);
      console.log('[PayPalOnboarding DEBUG] ❌ sendVerificationCode ERROR', {
        err,
        errorMessage: (err as Error)?.message,
        errorCode: (err as { code?: string })?.code,
      });
      const errorMessage = (err as Error).message || (err as { code?: string }).code;

      if (errorMessage?.includes("resource-exhausted")) {
        setError(intl.formatMessage({
          id: "provider.paypal.error.tooManyAttempts",
          defaultMessage: "Trop de tentatives. Veuillez réessayer plus tard.",
        }));
      } else {
        setError(intl.formatMessage({
          id: "provider.paypal.error.sendCode",
          defaultMessage: "Erreur lors de l'envoi du code. Veuillez réessayer.",
        }));
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Ne garder que les chiffres
    const digit = value.replace(/\D/g, "").slice(-1);

    const newCode = [...verificationCode];
    newCode[index] = digit;
    setVerificationCode(newCode);
    setError(null);

    // Auto-focus sur le prochain input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-vérification quand tous les chiffres sont entrés
    if (digit && index === 5 && newCode.every(d => d !== "")) {
      verifyCode(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setVerificationCode(newCode);
      verifyCode(pastedData);
    }
  };

  const verifyCode = async (code?: string) => {
    const codeToVerify = code || verificationCode.join("");
    console.log('[PayPalOnboarding DEBUG] 🔐 verifyCode STARTED', {
      codeLength: codeToVerify.length,
      paypalEmail,
      providerType,
    });

    if (codeToVerify.length !== 6) {
      console.log('[PayPalOnboarding DEBUG] ⚠️ Code incomplete');
      setError(intl.formatMessage({
        id: "provider.paypal.error.incompleteCode",
        defaultMessage: "Veuillez entrer le code complet à 6 chiffres",
      }));
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      console.log('[PayPalOnboarding DEBUG] 📤 Calling verifyPayPalCode function');
      const verify = httpsCallable(functions, "verifyPayPalCode");
      const result = await verify({
        code: codeToVerify,
        email: paypalEmail.trim().toLowerCase(),
        providerType,
      });

      console.log('[PayPalOnboarding DEBUG] ✅ verifyPayPalCode SUCCESS', { result: result.data });
      setSavedEmail(paypalEmail);
      setStatus("active");
      setStep("success");
      onStatusChange?.("active");

      setSuccess(intl.formatMessage({
        id: "provider.paypal.success",
        defaultMessage: "Votre compte PayPal a été vérifié avec succès !",
      }));

      // Rafraîchir la page après 2 secondes
      console.log('[PayPalOnboarding DEBUG] 🔄 Will reload page in 2 seconds');
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error("Erreur vérification code:", err);
      console.log('[PayPalOnboarding DEBUG] ❌ verifyCode ERROR', {
        err,
        errorMessage: (err as Error)?.message,
        errorCode: (err as { code?: string })?.code,
      });
      const errorMessage = (err as Error).message || "";

      // Extraire le nombre de tentatives restantes du message d'erreur
      const attemptsMatch = errorMessage.match(/(\d+) attempt/);
      if (attemptsMatch) {
        setAttemptsRemaining(parseInt(attemptsMatch[1]));
      }

      if (errorMessage.includes("expired")) {
        setError(intl.formatMessage({
          id: "provider.paypal.error.codeExpired",
          defaultMessage: "Le code a expiré. Veuillez en demander un nouveau.",
        }));
      } else if (errorMessage.includes("not-found")) {
        setError(intl.formatMessage({
          id: "provider.paypal.error.noCode",
          defaultMessage: "Aucun code trouvé. Veuillez en demander un nouveau.",
        }));
      } else if (errorMessage.includes("resource-exhausted")) {
        setError(intl.formatMessage({
          id: "provider.paypal.error.maxAttempts",
          defaultMessage: "Trop de tentatives. Veuillez demander un nouveau code.",
        }));
        setAttemptsRemaining(0);
      } else {
        setError(intl.formatMessage({
          id: "provider.paypal.error.wrongCode",
          defaultMessage: "Code incorrect. Veuillez réessayer.",
        }));
      }

      // Effacer le code entré
      setVerificationCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

    } finally {
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    if (cooldownSeconds > 0) return;

    try {
      setIsSending(true);
      setError(null);

      const resend = httpsCallable(functions, "resendPayPalVerificationCode");
      await resend({
        email: paypalEmail.trim().toLowerCase(),
        locale: intl.locale,
      });

      setVerificationCode(["", "", "", "", "", ""]);
      setAttemptsRemaining(3);
      setCooldownSeconds(60);
      setSuccess(intl.formatMessage({
        id: "provider.paypal.codeResent",
        defaultMessage: "Un nouveau code a été envoyé",
      }));

      inputRefs.current[0]?.focus();

    } catch (err) {
      console.error("Erreur renvoi code:", err);
      setError(intl.formatMessage({
        id: "provider.paypal.error.resendCode",
        defaultMessage: "Erreur lors du renvoi du code. Veuillez réessayer.",
      }));
    } finally {
      setIsSending(false);
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

  // Statut connecté et vérifié - Afficher confirmation avant reload
  if (step === "success" && savedEmail) {
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
              <Shield className="w-4 h-4 ml-2 text-green-500" aria-label="Email vérifié" />
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Étape de vérification du code
  if (step === "verification") {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 p-2 bg-[#003087] rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <h4 className="font-semibold text-gray-900">
              <FormattedMessage
                id="provider.paypal.verify.title"
                defaultMessage="Vérifiez votre email"
              />
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              <FormattedMessage
                id="provider.paypal.verify.description"
                defaultMessage="Entrez le code à 6 chiffres envoyé à {email}"
                values={{ email: <strong>{paypalEmail}</strong> }}
              />
            </p>
          </div>
        </div>

        {/* Champs du code */}
        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {verificationCode.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isVerifying}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:opacity-50"
            />
          ))}
        </div>

        {/* Messages */}
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

        {/* Bouton vérifier */}
        <button
          onClick={() => verifyCode()}
          disabled={isVerifying || verificationCode.some(d => d === "")}
          className="w-full flex items-center justify-center px-4 py-3 bg-[#0070ba] text-white rounded-lg hover:bg-[#003087] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-4"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <FormattedMessage
                id="provider.paypal.verifying"
                defaultMessage="Vérification..."
              />
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              <FormattedMessage
                id="provider.paypal.verifyButton"
                defaultMessage="Vérifier le code"
              />
            </>
          )}
        </button>

        {/* Renvoyer le code */}
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => {
              setStep("email");
              setVerificationCode(["", "", "", "", "", ""]);
              setError(null);
              setSuccess(null);
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            <FormattedMessage
              id="provider.paypal.changeEmailLink"
              defaultMessage="Modifier l'email"
            />
          </button>

          <button
            onClick={resendCode}
            disabled={cooldownSeconds > 0 || isSending}
            className="flex items-center text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isSending ? "animate-spin" : ""}`} />
            {cooldownSeconds > 0 ? (
              <FormattedMessage
                id="provider.paypal.resendIn"
                defaultMessage="Renvoyer dans {seconds}s"
                values={{ seconds: cooldownSeconds }}
              />
            ) : (
              <FormattedMessage
                id="provider.paypal.resendCode"
                defaultMessage="Renvoyer le code"
              />
            )}
          </button>
        </div>

        {/* Info tentatives restantes */}
        {attemptsRemaining < 3 && attemptsRemaining > 0 && (
          <p className="text-xs text-orange-600 mt-3 text-center">
            <FormattedMessage
              id="provider.paypal.attemptsRemaining"
              defaultMessage="{count} tentative(s) restante(s)"
              values={{ count: attemptsRemaining }}
            />
          </p>
        )}
      </div>
    );
  }

  // Formulaire pour entrer l'email PayPal (étape initiale)
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

      {/* Bouton d'envoi du code */}
      <button
        onClick={sendVerificationCode}
        disabled={isSending || !paypalEmail.trim()}
        className="w-full flex items-center justify-center px-4 py-3 bg-[#0070ba] text-white rounded-lg hover:bg-[#003087] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isSending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <FormattedMessage
              id="provider.paypal.sendingCode"
              defaultMessage="Envoi du code..."
            />
          </>
        ) : (
          <>
            <Mail className="w-5 h-5 mr-2" />
            <FormattedMessage
              id="provider.paypal.sendCode"
              defaultMessage="Recevoir un code de vérification"
            />
          </>
        )}
      </button>

      {/* Note de sécurité */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-start text-xs text-gray-500">
          <Shield className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-green-500" />
          <p>
            <FormattedMessage
              id="provider.paypal.securityNote"
              defaultMessage="Un code de vérification sera envoyé à cette adresse pour confirmer que vous en êtes bien le propriétaire. Vos paiements seront ensuite envoyés directement sur ce compte PayPal."
            />
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayPalOnboarding;
