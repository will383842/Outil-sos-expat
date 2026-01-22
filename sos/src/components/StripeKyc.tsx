import { useEffect, useState, useRef, useCallback } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { useIntl, FormattedMessage } from "react-intl";
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
  Shield,
  CreditCard,
  FileText,
  User,
  Building,
  HelpCircle
} from "lucide-react";
import dashboardLog from "../utils/dashboardLogger";

// P0 FIX: Polling interval for KYC status check (fallback if webhook fails)
const KYC_POLLING_INTERVAL_MS = 30000; // 30 seconds

interface Props {
  onComplete?: () => void;
  userType: "lawyer" | "expat";
}

// KYC Steps for progress indicator
type KycStep = "identity" | "business" | "bank" | "review";

interface KycProgress {
  currentStep: KycStep;
  completedSteps: KycStep[];
  requirementsCount: number;
}

// Error code mapping for specific error messages
const getSpecificErrorMessage = (errorMsg: string, intl: ReturnType<typeof useIntl>): { message: string; canRetry: boolean; actionHint?: string } => {
  // Account issues
  if (errorMsg.includes("does not have access to account") ||
      errorMsg.includes("No such account") ||
      errorMsg.includes("account has been deleted")) {
    return {
      message: intl.formatMessage({ id: 'stripe.kyc.error.invalidAccount', defaultMessage: 'Votre compte Stripe précédent n\'est plus valide.' }),
      canRetry: true,
      actionHint: intl.formatMessage({ id: 'stripe.kyc.error.createNewHint', defaultMessage: 'Vous devez créer un nouveau compte pour continuer.' })
    };
  }

  // Country not supported
  if (errorMsg.includes("country_unsupported") || errorMsg.includes("Country not supported")) {
    return {
      message: intl.formatMessage({ id: 'stripe.kyc.error.countryNotSupported', defaultMessage: 'Stripe n\'est pas disponible dans votre pays.' }),
      canRetry: false,
      actionHint: intl.formatMessage({ id: 'stripe.kyc.error.usePayPalHint', defaultMessage: 'Veuillez utiliser PayPal à la place.' })
    };
  }

  // Document verification failed
  if (errorMsg.includes("document_verification") || errorMsg.includes("identity_document")) {
    return {
      message: intl.formatMessage({ id: 'stripe.kyc.error.documentFailed', defaultMessage: 'La vérification de votre document a échoué.' }),
      canRetry: true,
      actionHint: intl.formatMessage({ id: 'stripe.kyc.error.documentHint', defaultMessage: 'Assurez-vous que le document est lisible et non expiré.' })
    };
  }

  // Account restricted
  if (errorMsg.includes("account_restricted") || errorMsg.includes("restricted")) {
    return {
      message: intl.formatMessage({ id: 'stripe.kyc.error.accountRestricted', defaultMessage: 'Votre compte est temporairement restreint.' }),
      canRetry: false,
      actionHint: intl.formatMessage({ id: 'stripe.kyc.error.contactSupport', defaultMessage: 'Contactez notre support pour assistance.' })
    };
  }

  // Rate limited
  if (errorMsg.includes("rate_limit") || errorMsg.includes("too many requests")) {
    return {
      message: intl.formatMessage({ id: 'stripe.kyc.error.rateLimited', defaultMessage: 'Trop de tentatives. Veuillez patienter.' }),
      canRetry: true,
      actionHint: intl.formatMessage({ id: 'stripe.kyc.error.waitAndRetry', defaultMessage: 'Attendez quelques minutes avant de réessayer.' })
    };
  }

  // Network error
  if (errorMsg.includes("network") || errorMsg.includes("fetch") || errorMsg.includes("timeout")) {
    return {
      message: intl.formatMessage({ id: 'stripe.kyc.error.network', defaultMessage: 'Problème de connexion réseau.' }),
      canRetry: true,
      actionHint: intl.formatMessage({ id: 'stripe.kyc.error.checkConnection', defaultMessage: 'Vérifiez votre connexion internet.' })
    };
  }

  // Default error
  return {
    message: intl.formatMessage({ id: 'stripe.kyc.error.generic', defaultMessage: 'Une erreur est survenue lors de la connexion à Stripe.' }),
    canRetry: true
  };
};

// Progress indicator component
function KycProgressIndicator({ requirements }: { requirements?: string[] }) {
  const intl = useIntl();

  // Determine progress based on requirements
  const steps = [
    {
      id: 'identity' as const,
      label: intl.formatMessage({ id: 'stripe.kyc.step.identity', defaultMessage: 'Identité' }),
      icon: User,
      required: requirements?.some(r => r.includes('individual') || r.includes('person')) ?? true
    },
    {
      id: 'business' as const,
      label: intl.formatMessage({ id: 'stripe.kyc.step.business', defaultMessage: 'Activité' }),
      icon: Building,
      required: requirements?.some(r => r.includes('business') || r.includes('company')) ?? true
    },
    {
      id: 'bank' as const,
      label: intl.formatMessage({ id: 'stripe.kyc.step.bank', defaultMessage: 'Compte bancaire' }),
      icon: CreditCard,
      required: requirements?.some(r => r.includes('external_account') || r.includes('bank')) ?? true
    },
    {
      id: 'review' as const,
      label: intl.formatMessage({ id: 'stripe.kyc.step.review', defaultMessage: 'Vérification' }),
      icon: FileText,
      required: true
    }
  ];

  const completedCount = requirements ?
    Math.max(0, 4 - Math.ceil(requirements.length / 2)) : 0;

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => {
          const isCompleted = index < completedCount;
          const isCurrent = index === completedCount;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-indigo-600 border-indigo-600 text-white' :
                  'bg-gray-100 border-gray-300 text-gray-400'}
              `}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-1 mx-2 rounded
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-xs text-gray-500">
        {steps.map((step, index) => (
          <span key={step.id} className={`text-center ${index < completedCount ? 'text-green-600' : ''}`}>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Info banner with tips
function KycInfoBanner() {
  const intl = useIntl();

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Shield className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">
            <FormattedMessage
              id="stripe.kyc.banner.title"
              defaultMessage="Vérification sécurisée"
            />
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            <FormattedMessage
              id="stripe.kyc.banner.description"
              defaultMessage="Cette vérification est requise pour recevoir des paiements. Vos données sont chiffrées et sécurisées par Stripe."
            />
          </p>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-4 h-4" />
              <span>
                <FormattedMessage
                  id="stripe.kyc.banner.time"
                  defaultMessage="5-10 minutes"
                />
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <FileText className="w-4 h-4" />
              <span>
                <FormattedMessage
                  id="stripe.kyc.banner.docs"
                  defaultMessage="Pièce d'identité requise"
                />
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <CreditCard className="w-4 h-4" />
              <span>
                <FormattedMessage
                  id="stripe.kyc.banner.bank"
                  defaultMessage="IBAN requis"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StripeKYC({ onComplete, userType }: Props) {
  const intl = useIntl();
  const { user } = useAuth();
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isKycComplete, setIsKycComplete] = useState(false);
  const [error, setError] = useState<{ message: string; canRetry: boolean; actionHint?: string } | null>(null);
  const [isCreatingNewAccount, setIsCreatingNewAccount] = useState(false);
  const [reinitKey, setReinitKey] = useState(0);
  const [requirements, setRequirements] = useState<string[]>([]);
  const initStartedRef = useRef(false);

  // Function to create new Stripe account
  const createNewAccount = async () => {
    dashboardLog.stripe('createNewAccount clicked', { userId: user?.uid, userType });
    if (!user?.uid || !user?.email) {
      dashboardLog.stripe('createNewAccount aborted - no user', { userId: user?.uid });
      return;
    }

    setIsCreatingNewAccount(true);
    setError(null);

    const errorKey = `stripe_kyc_${user.uid}_${userType}_error`;
    sessionStorage.removeItem(errorKey);

    try {
      const functions = getFunctions(undefined, "europe-west1");
      const createStripeAccount = httpsCallable(functions, "createStripeAccount");

      const result = await createStripeAccount({
        email: user.email,
        currentCountry: "FR",
        userType: userType,
      });

      const data = result.data as { success: boolean; accountId: string };

      if (data.success) {
        const checkKey = `stripe_kyc_${user.uid}_${userType}_check_in_progress`;
        const completedKey = `stripe_kyc_${user.uid}_${userType}_completed`;

        sessionStorage.removeItem(checkKey);
        sessionStorage.removeItem(completedKey);
        sessionStorage.removeItem(errorKey);

        initStartedRef.current = false;
        setStripeConnectInstance(null);
        setError(null);
        setIsKycComplete(false);
        setIsCreatingNewAccount(false);
        setLoading(true);
        setRequirements([]);

        setReinitKey(prev => prev + 1);

        dashboardLog.stripe('Account created, triggering re-initialization', { accountId: data.accountId });
      }
    } catch (err) {
      console.error("[StripeKYC] Failed to create new account:", err);
      const errorInfo = getSpecificErrorMessage((err as Error).message || '', intl);
      setError(errorInfo);
      setIsCreatingNewAccount(false);
    }
  };

  useEffect(() => {
    // Handle unauthenticated users with explicit error
    if (!user?.uid) {
      setLoading(false);
      setError({
        message: intl.formatMessage({ id: 'stripe.kyc.error.notAuthenticated', defaultMessage: 'Vous devez être connecté pour configurer votre compte Stripe.' }),
        canRetry: false,
        actionHint: intl.formatMessage({ id: 'stripe.kyc.error.loginRequired', defaultMessage: 'Veuillez vous reconnecter.' })
      });
      return;
    }

    const checkKey = `stripe_kyc_${user.uid}_${userType}_check_in_progress`;
    const completedKey = `stripe_kyc_${user.uid}_${userType}_completed`;
    const errorKey = `stripe_kyc_${user.uid}_${userType}_error`;

    const savedError = sessionStorage.getItem(errorKey);
    if (savedError) {
      setError(getSpecificErrorMessage(savedError, intl));
      setLoading(false);
      return;
    }

    if (sessionStorage.getItem(checkKey) === "true") {
      setLoading(false);
      return;
    }

    if (sessionStorage.getItem(completedKey) === "true") {
      setIsKycComplete(true);
      setLoading(false);
      return;
    }

    if (initStartedRef.current) {
      return;
    }

    initStartedRef.current = true;
    sessionStorage.setItem(checkKey, "true");

    const initializeStripe = async () => {
      dashboardLog.stripe('initializeStripe started', { userId: user?.uid, userType });
      dashboardLog.time('Stripe initialization');
      try {
        const functions = getFunctions(undefined, "europe-west1");

        try {
          dashboardLog.api('Calling checkStripeAccountStatus...');
          const checkStatus = httpsCallable(functions, "checkStripeAccountStatus");
          const statusResult = await checkStatus({ userType });
          const statusData = statusResult.data as {
            kycCompleted: boolean;
            detailsSubmitted: boolean;
            chargesEnabled: boolean;
            requirementsCurrentlyDue: string[];
            requirementsEventuallyDue: string[];
          };

          // Save requirements for progress indicator
          setRequirements([
            ...(statusData.requirementsCurrentlyDue || []),
            ...(statusData.requirementsEventuallyDue || [])
          ]);

          if (import.meta.env.DEV) {
            console.log("[StripeKYC] Status:", statusData.kycCompleted ? "complete" : "incomplete");
          }

          if (statusData.kycCompleted) {
            sessionStorage.setItem(completedKey, "true");
            sessionStorage.removeItem(checkKey);
            setIsKycComplete(true);
            setLoading(false);

            setTimeout(() => {
              onComplete?.();
            }, 100);

            return;
          }
        } catch (err) {
          const errorMsg = (err as Error).message || "";
          const errorInfo = getSpecificErrorMessage(errorMsg, intl);

          if (errorMsg.includes("does not have access to account") ||
              errorMsg.includes("No such account") ||
              errorMsg.includes("account has been deleted")) {
            console.error("[StripeKYC] Invalid Stripe account detected");
            sessionStorage.setItem(errorKey, errorMsg);
            sessionStorage.removeItem(checkKey);
            setError(errorInfo);
            setLoading(false);
            return;
          }

          if ((err as { code?: string }).code !== "failed-precondition") {
            console.error("[StripeKYC] Status check error:", errorMsg);
          }
        }

        const getStripeAccountSession = httpsCallable(functions, "getStripeAccountSession");

        const result = await getStripeAccountSession({ userType });
        const data = result.data as {
          success: boolean;
          accountId: string;
          clientSecret: string;
        };

        const instance = loadConnectAndInitialize({
          publishableKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
          fetchClientSecret: async () => data.clientSecret,
          appearance: {
            overlays: "dialog",
            variables: {
              colorPrimary: "#635BFF",
            },
          },
        });

        setStripeConnectInstance(instance);
        setLoading(false);
        sessionStorage.removeItem(checkKey);
      } catch (err) {
        const errorMsg = (err as Error).message || "";
        const errorInfo = getSpecificErrorMessage(errorMsg, intl);

        console.error("[StripeKYC] Initialization error:", err);
        sessionStorage.setItem(errorKey, errorMsg);
        sessionStorage.removeItem(checkKey);
        setError(errorInfo);
        setLoading(false);
      }
    };

    initializeStripe();
  }, [user?.uid, userType, reinitKey, intl, onComplete]);

  // Fallback polling for KYC status
  const checkKycStatus = useCallback(async () => {
    if (!user?.uid || isKycComplete || loading || error) return;

    const completedKey = `stripe_kyc_${user.uid}_${userType}_completed`;
    if (sessionStorage.getItem(completedKey) === "true") return;

    try {
      const functions = getFunctions(undefined, "europe-west1");
      const checkStatus = httpsCallable(functions, "checkStripeAccountStatus");
      const result = await checkStatus({ userType });
      const data = result.data as {
        kycCompleted: boolean;
        detailsSubmitted: boolean;
        chargesEnabled: boolean;
        requirementsCurrentlyDue: string[];
      };

      // Update requirements for progress
      if (data.requirementsCurrentlyDue) {
        setRequirements(data.requirementsCurrentlyDue);
      }

      if (data.kycCompleted) {
        dashboardLog.stripe('Polling detected KYC completion', { userId: user.uid });
        sessionStorage.setItem(completedKey, "true");
        setIsKycComplete(true);
        setTimeout(() => onComplete?.(), 100);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.log("[StripeKYC] Polling check failed (silent):", err);
      }
    }
  }, [user?.uid, userType, isKycComplete, loading, error, onComplete]);

  // Start polling when Stripe form is shown
  useEffect(() => {
    if (!stripeConnectInstance || isKycComplete || error) return;

    dashboardLog.stripe('Starting KYC polling fallback', { interval: KYC_POLLING_INTERVAL_MS });

    const pollInterval = setInterval(checkKycStatus, KYC_POLLING_INTERVAL_MS);

    return () => {
      clearInterval(pollInterval);
      dashboardLog.stripe('Stopped KYC polling');
    };
  }, [stripeConnectInstance, isKycComplete, error, checkKycStatus]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{intl.formatMessage({ id: 'stripe.kyc.loading' })}</p>
        </div>
      </div>
    );
  }

  // KYC complete
  if (isKycComplete) {
    return null;
  }

  // Error state with specific messaging
  if (error) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {intl.formatMessage({ id: 'stripe.kyc.accountError', defaultMessage: 'Problème avec votre compte Stripe' })}
          </h2>
          <p className="text-gray-600 mb-2">{error.message}</p>

          {error.actionHint && (
            <p className="text-sm text-gray-500 mb-6">{error.actionHint}</p>
          )}

          {error.canRetry && (
            <button
              onClick={createNewAccount}
              disabled={isCreatingNewAccount}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingNewAccount ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  {intl.formatMessage({ id: 'stripe.kyc.creatingAccount', defaultMessage: 'Création en cours...' })}
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  {intl.formatMessage({ id: 'stripe.kyc.createNewAccount', defaultMessage: 'Créer un nouveau compte Stripe' })}
                </>
              )}
            </button>
          )}

          {!error.canRetry && (
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <FormattedMessage id="stripe.kyc.contactSupport" defaultMessage="Contacter le support" />
            </a>
          )}

          <p className="mt-4 text-sm text-gray-500">
            {intl.formatMessage({ id: 'stripe.kyc.createNewAccountNote', defaultMessage: 'Un nouveau compte sera créé pour recevoir vos paiements.' })}
          </p>
        </div>
      </div>
    );
  }

  // Waiting for Stripe instance
  if (!stripeConnectInstance) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">
           {intl.formatMessage({ id: 'stripe.kyc.stripeLoading' })}
          </h2>
          <p className="text-sm text-gray-500">
            {intl.formatMessage({ id: 'stripe.kyc.pleaseWait', defaultMessage: 'Connexion à Stripe...' })}
          </p>
        </div>
      </div>
    );
  }

  // Show KYC form with progress indicator
  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Info banner */}
      <KycInfoBanner />

      {/* Progress indicator */}
      <KycProgressIndicator requirements={requirements} />

      {/* Stripe Connect Onboarding Form */}
      <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
        <ConnectAccountOnboarding
          collectionOptions={{
            fields: "eventually_due",
            futureRequirements: "include",
          }}
          onExit={async () => {
            const completedKey = `stripe_kyc_${user?.uid}_${userType}_completed`;

            if (sessionStorage.getItem(completedKey) === "true") {
              return;
            }

            try {
              const functions = getFunctions(undefined, "europe-west1");
              const checkStatus = httpsCallable(functions, "checkStripeAccountStatus");
              const result = await checkStatus({ userType });
              const data = result.data as {
                kycCompleted: boolean;
                detailsSubmitted: boolean;
                chargesEnabled: boolean;
                requirementsCurrentlyDue: string[];
              };

              // Update requirements
              if (data.requirementsCurrentlyDue) {
                setRequirements(data.requirementsCurrentlyDue);
              }

              if (import.meta.env.DEV) {
                console.log("[StripeKYC] Exit status:", data.kycCompleted ? "complete" : "incomplete");
              }

              if (data.kycCompleted) {
                sessionStorage.setItem(completedKey, "true");
                setIsKycComplete(true);

                setTimeout(() => {
                  onComplete?.();
                }, 100);
              }
            } catch (err) {
              console.error("[StripeKYC] Exit status check error:", err);
            }
          }}
        />
      </ConnectComponentsProvider>

      {/* Help note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium mb-1">
              <FormattedMessage
                id="stripe.kyc.help.title"
                defaultMessage="Besoin d'aide ?"
              />
            </p>
            <p className="text-sm text-blue-700">
              {intl.formatMessage({ id: 'stripe.kyc.note' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
