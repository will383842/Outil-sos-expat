/**
 * KycReturn.tsx - Stripe KYC Verification Page
 *
 * Full KYC page with dashboard sidebar.
 * Handles both:
 * 1. Return from Stripe Connect onboarding flow (?success=true, ?refresh=true)
 * 2. Direct access for KYC completion
 *
 * P0 FIX: Moved KYC form to dedicated page with sidebar for better UX
 * - Users can scroll the form without issues
 * - Sidebar provides navigation context
 * - Clean, focused experience for verification
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useLocaleNavigate } from "@/multilingual-system/hooks/useLocaleNavigate";
import { useIntl, FormattedMessage } from "react-intl";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Shield, CreditCard, ArrowLeft } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StripeKYC from "@/components/StripeKyc";
import { getTranslatedRouteSlug, type RouteKey } from "@/multilingual-system/core/routing/localeRoutes";

type KycPageState = "loading" | "form" | "success" | "incomplete" | "error" | "refresh";

export default function KycReturn() {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { language } = useApp();

  const [pageState, setPageState] = useState<KycPageState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kycDetails, setKycDetails] = useState<{
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirementsCurrentlyDue: string[];
  } | null>(null);

  const checkStartedRef = useRef(false);

  // Get translated dashboard route
  const dashboardRoute = useMemo(() => {
    const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
    const dashboardSlug = getTranslatedRouteSlug('dashboard' as RouteKey, langCode);
    return `/${dashboardSlug}`;
  }, [language]);

  // Check KYC status on mount
  useEffect(() => {
    if (!user?.uid || checkStartedRef.current) return;
    checkStartedRef.current = true;

    const isSuccess = searchParams.get("success") === "true";
    const isRefresh = searchParams.get("refresh") === "true";

    const checkKycStatus = async () => {
      try {
        // Validate user role - must be a provider (lawyer or expat)
        if (!user.role || !["lawyer", "expat"].includes(user.role)) {
          setErrorMessage(intl.formatMessage({
            id: "kyc.return.error.invalidRole",
            defaultMessage: "Seuls les prestataires peuvent configurer un compte Stripe."
          }));
          setPageState("error");
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
          setPageState("success");
          await refreshUser?.();
        } else if (isRefresh) {
          // User clicked refresh link - show form again
          setPageState("form");
        } else if (isSuccess) {
          // User completed form but KYC not yet verified
          if (data.detailsSubmitted) {
            setPageState("incomplete"); // Pending Stripe verification
          } else {
            setPageState("form"); // Still needs to complete form
          }
        } else {
          // Direct access - show form
          setPageState("form");
        }
      } catch (err) {
        console.error("[KycReturn] Error checking status:", err);
        const errorMsg = (err as Error).message || "";

        // If no account exists, show form to create one
        if (errorMsg.includes("failed-precondition") || errorMsg.includes("No Stripe account")) {
          setPageState("form");
          return;
        }

        if (
          errorMsg.includes("does not have access to account") ||
          errorMsg.includes("No such account")
        ) {
          setErrorMessage(intl.formatMessage({
            id: "kyc.return.error.invalidAccount",
            defaultMessage: "Votre compte Stripe n'est plus valide. Veuillez en créer un nouveau."
          }));
        } else {
          setErrorMessage(intl.formatMessage({
            id: "kyc.return.error.generic",
            defaultMessage: "Une erreur est survenue lors de la vérification de votre compte."
          }));
        }
        setPageState("error");
      }
    };

    checkKycStatus();
  }, [user?.uid, user?.role, searchParams, intl, refreshUser]);

  // Auto-redirect after success
  useEffect(() => {
    if (pageState === "success") {
      const timer = setTimeout(() => {
        navigate(dashboardRoute, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pageState, navigate, dashboardRoute]);

  const handleGoToDashboard = () => {
    navigate(dashboardRoute, { replace: true });
  };

  const handleKycComplete = async () => {
    setPageState("success");
    await refreshUser?.();
  };

  // Loading state - show simple spinner outside dashboard layout
  if (pageState === "loading") {
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
  if (pageState === "success") {
    return (
      <DashboardLayout activeKey="profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                <FormattedMessage
                  id="kyc.return.success.title"
                  defaultMessage="Verification reussie !"
                />
              </h1>

              <p className="text-gray-600 mb-6">
                <FormattedMessage
                  id="kyc.return.success.message"
                  defaultMessage="Votre compte Stripe est maintenant configure. Vous pouvez recevoir des paiements."
                />
              </p>

              {kycDetails && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">
                      <FormattedMessage
                        id="kyc.return.success.chargesEnabled"
                        defaultMessage="Paiements actives"
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700">
                      <FormattedMessage
                        id="kyc.return.success.payoutsEnabled"
                        defaultMessage="Virements actives"
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
      </DashboardLayout>
    );
  }

  // Incomplete state (pending Stripe verification)
  if (pageState === "incomplete") {
    return (
      <DashboardLayout activeKey="profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-amber-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                <FormattedMessage
                  id="kyc.return.incomplete.title"
                  defaultMessage="Verification en cours"
                />
              </h1>

              <p className="text-gray-600 mb-6">
                <FormattedMessage
                  id="kyc.return.incomplete.message"
                  defaultMessage="Vos informations ont ete soumises. Stripe verifie actuellement votre compte. Cela peut prendre quelques minutes."
                />
              </p>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <FormattedMessage
                    id="kyc.return.incomplete.note"
                    defaultMessage="Vous serez notifie par email une fois la verification terminee."
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
      </DashboardLayout>
    );
  }

  // Error state
  if (pageState === "error") {
    return (
      <DashboardLayout activeKey="profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                <FormattedMessage
                  id="kyc.return.error.title"
                  defaultMessage="Erreur de verification"
                />
              </h1>

              <p className="text-gray-600 mb-6">
                {errorMessage || (
                  <FormattedMessage
                    id="kyc.return.error.message"
                    defaultMessage="Une erreur est survenue lors de la verification de votre compte."
                  />
                )}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    checkStartedRef.current = false;
                    setPageState("loading");
                  }}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <FormattedMessage
                    id="kyc.return.error.retry"
                    defaultMessage="Reessayer"
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
      </DashboardLayout>
    );
  }

  // Form state - show KYC form with dashboard layout
  return (
    <DashboardLayout activeKey="profile">
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoToDashboard}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={intl.formatMessage({ id: 'common.back', defaultMessage: 'Retour' })}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                <FormattedMessage
                  id="kyc.page.title"
                  defaultMessage="Verification d'identite"
                />
              </h1>
              <p className="text-gray-600">
                <FormattedMessage
                  id="kyc.page.subtitle"
                  defaultMessage="Completez votre verification pour recevoir des paiements"
                />
              </p>
            </div>
          </div>
        </div>

        {/* Security info banner */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">
                <FormattedMessage
                  id="stripe.kyc.banner.title"
                  defaultMessage="Verification securisee"
                />
              </h3>
              <p className="text-sm text-gray-600">
                <FormattedMessage
                  id="kyc.page.securityNote"
                  defaultMessage="Vos donnees sont chiffrees et securisees par Stripe. Cette verification est requise par la reglementation europeenne (DSP2) pour les services de paiement."
                />
              </p>
            </div>
          </div>
        </div>

        {/* KYC Form Container - P0 FIX: Full height, scrollable */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  <FormattedMessage
                    id="kyc.page.formTitle"
                    defaultMessage="Formulaire de verification Stripe"
                  />
                </h2>
                <p className="text-sm text-gray-500">
                  <FormattedMessage
                    id="kyc.page.formSubtitle"
                    defaultMessage="Remplissez les informations demandees ci-dessous"
                  />
                </p>
              </div>
            </div>
          </div>

          {/* Stripe KYC Form - P0 FIX: No height restrictions, natural scroll */}
          <div className="p-6">
            {user && (
              <StripeKYC
                userType={user.role as "lawyer" | "expat"}
                onComplete={handleKycComplete}
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
