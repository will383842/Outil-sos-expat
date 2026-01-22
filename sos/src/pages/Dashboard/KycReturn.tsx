/**
 * KycReturn.tsx
 *
 * Handles return from Stripe Connect onboarding flow.
 * Routes: /dashboard/kyc?success=true or /dashboard/kyc?refresh=true
 *
 * This component:
 * 1. Reads query params from Stripe redirect
 * 2. Checks the current KYC status
 * 3. Shows appropriate feedback
 * 4. Redirects to dashboard
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useIntl, FormattedMessage } from "react-intl";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

type KycReturnStatus = "loading" | "success" | "incomplete" | "error" | "refresh";

export default function KycReturn() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();

  const [status, setStatus] = useState<KycReturnStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kycDetails, setKycDetails] = useState<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirementsCurrentlyDue: string[];
  } | null>(null);

  const checkStartedRef = useRef(false);

  useEffect(() => {
    if (!user?.uid || checkStartedRef.current) return;
    checkStartedRef.current = true;

    const isSuccess = searchParams.get("success") === "true";
    const isRefresh = searchParams.get("refresh") === "true";
    const providerId = searchParams.get("provider"); // Optional: for deep links from emails

    const checkKycStatus = async () => {
      try {
        // Validate user role - must be a provider (lawyer or expat)
        if (!user.role || !["lawyer", "expat"].includes(user.role)) {
          setErrorMessage(intl.formatMessage({
            id: "kyc.return.error.invalidRole",
            defaultMessage: "Seuls les prestataires peuvent configurer un compte Stripe."
          }));
          setStatus("error");
          return;
        }

        const functions = getFunctions(undefined, "europe-west1");
        const checkStatus = httpsCallable(functions, "checkStripeAccountStatus");

        const userType = user.role as "lawyer" | "expat";
        const result = await checkStatus({ userType });

        const data = result.data as {
          kycCompleted: boolean;
          detailsSubmitted: boolean;
          chargesEnabled: boolean;
          payoutsEnabled: boolean;
          requirementsCurrentlyDue: string[];
          requirementsEventuallyDue: string[];
        };

        setKycDetails({
          chargesEnabled: data.chargesEnabled,
          payoutsEnabled: data.payoutsEnabled,
          requirementsCurrentlyDue: data.requirementsCurrentlyDue,
        });

        if (data.kycCompleted) {
          setStatus("success");
          // Refresh user data to get updated KYC status
          await refreshUser?.();
        } else if (isRefresh) {
          // User clicked refresh link - onboarding not complete yet
          setStatus("refresh");
        } else if (isSuccess) {
          // User completed form but KYC not yet verified by Stripe
          // This can happen when Stripe needs more verification time
          if (data.detailsSubmitted) {
            setStatus("success"); // Details submitted, waiting for Stripe
          } else {
            setStatus("incomplete");
          }
        } else {
          setStatus("incomplete");
        }
      } catch (err) {
        console.error("[KycReturn] Error checking status:", err);
        const errorMsg = (err as Error).message || "";

        if (
          errorMsg.includes("does not have access to account") ||
          errorMsg.includes("No such account")
        ) {
          setErrorMessage(intl.formatMessage({
            id: "kyc.return.error.invalidAccount",
            defaultMessage: "Votre compte Stripe n'est plus valide. Veuillez en créer un nouveau depuis votre tableau de bord."
          }));
        } else {
          setErrorMessage(intl.formatMessage({
            id: "kyc.return.error.generic",
            defaultMessage: "Une erreur est survenue lors de la vérification de votre compte."
          }));
        }
        setStatus("error");
      }
    };

    checkKycStatus();
  }, [user?.uid, user?.role, searchParams, intl, refreshUser]);

  // Auto-redirect after showing success message
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  const handleGoToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  const handleRetryOnboarding = () => {
    // Navigate to dashboard which will show the KYC form again
    navigate("/dashboard", { replace: true });
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" color="blue" />
          <p className="mt-4 text-gray-600">
            <FormattedMessage
              id="kyc.return.checking"
              defaultMessage="Vérification de votre compte Stripe..."
            />
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              <FormattedMessage
                id="kyc.return.success.title"
                defaultMessage="Vérification réussie !"
              />
            </h1>

            <p className="text-gray-600 mb-6">
              <FormattedMessage
                id="kyc.return.success.message"
                defaultMessage="Votre compte Stripe est maintenant configuré. Vous pouvez recevoir des paiements."
              />
            </p>

            {kycDetails && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">
                    <FormattedMessage
                      id="kyc.return.success.chargesEnabled"
                      defaultMessage="Paiements activés"
                    />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">
                    <FormattedMessage
                      id="kyc.return.success.payoutsEnabled"
                      defaultMessage="Virements activés"
                    />
                  </span>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-4">
              <FormattedMessage
                id="kyc.return.success.redirect"
                defaultMessage="Redirection automatique dans 3 secondes..."
              />
            </p>

            <button
              onClick={handleGoToDashboard}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <FormattedMessage
                id="kyc.return.goToDashboard"
                defaultMessage="Aller au tableau de bord"
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Refresh state (user needs to complete onboarding)
  if (status === "refresh") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <RefreshCw className="w-10 h-10 text-amber-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              <FormattedMessage
                id="kyc.return.refresh.title"
                defaultMessage="Vérification incomplète"
              />
            </h1>

            <p className="text-gray-600 mb-6">
              <FormattedMessage
                id="kyc.return.refresh.message"
                defaultMessage="Votre vérification Stripe n'est pas terminée. Veuillez reprendre le processus depuis votre tableau de bord."
              />
            </p>

            {kycDetails?.requirementsCurrentlyDue && kycDetails.requirementsCurrentlyDue.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  <FormattedMessage
                    id="kyc.return.refresh.requirements"
                    defaultMessage="Informations requises :"
                  />
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside">
                  {kycDetails.requirementsCurrentlyDue.slice(0, 3).map((req, i) => (
                    <li key={i}>{req.replace(/_/g, " ")}</li>
                  ))}
                  {kycDetails.requirementsCurrentlyDue.length > 3 && (
                    <li>
                      <FormattedMessage
                        id="kyc.return.refresh.moreRequirements"
                        defaultMessage="+ {count} autres"
                        values={{ count: kycDetails.requirementsCurrentlyDue.length - 3 }}
                      />
                    </li>
                  )}
                </ul>
              </div>
            )}

            <button
              onClick={handleRetryOnboarding}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <FormattedMessage
                id="kyc.return.refresh.retry"
                defaultMessage="Reprendre la vérification"
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Incomplete state
  if (status === "incomplete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              <FormattedMessage
                id="kyc.return.incomplete.title"
                defaultMessage="Vérification en cours"
              />
            </h1>

            <p className="text-gray-600 mb-6">
              <FormattedMessage
                id="kyc.return.incomplete.message"
                defaultMessage="Vos informations ont été soumises. Stripe vérifie actuellement votre compte. Cela peut prendre quelques minutes."
              />
            </p>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <FormattedMessage
                  id="kyc.return.incomplete.note"
                  defaultMessage="Vous serez notifié par email une fois la vérification terminée."
                />
              </p>
            </div>

            <button
              onClick={handleGoToDashboard}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <FormattedMessage
                id="kyc.return.goToDashboard"
                defaultMessage="Aller au tableau de bord"
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            <FormattedMessage
              id="kyc.return.error.title"
              defaultMessage="Erreur de vérification"
            />
          </h1>

          <p className="text-gray-600 mb-6">
            {errorMessage || (
              <FormattedMessage
                id="kyc.return.error.message"
                defaultMessage="Une erreur est survenue lors de la vérification de votre compte."
              />
            )}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleRetryOnboarding}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <FormattedMessage
                id="kyc.return.error.retry"
                defaultMessage="Réessayer"
              />
            </button>

            <button
              onClick={handleGoToDashboard}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              <FormattedMessage
                id="kyc.return.goToDashboard"
                defaultMessage="Aller au tableau de bord"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
