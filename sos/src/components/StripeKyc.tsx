import { useEffect, useState, useRef } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { useIntl } from "react-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";
import dashboardLog from "../utils/dashboardLogger";

interface Props {
  onComplete?: () => void;
  userType: "lawyer" | "expat"; // ✅ NEW: Required prop
}

export default function StripeKYC({ onComplete, userType }: Props) {
  const intl = useIntl();
  const { user } = useAuth();
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isKycComplete, setIsKycComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNewAccount, setIsCreatingNewAccount] = useState(false);
  const [reinitKey, setReinitKey] = useState(0); // P0 FIX: Trigger to force re-initialization without page reload
  const initStartedRef = useRef(false);

  // DEBUG LOGS - Page Jump Investigation
  console.log('[StripeKYC DEBUG] 📦 Render', {
    userType,
    loading,
    isKycComplete,
    hasError: !!error,
    hasStripeInstance: !!stripeConnectInstance,
    isCreatingNewAccount,
    reinitKey,
    userId: user?.uid,
    timestamp: new Date().toISOString()
  });

  // ✅ P0 FIX: Function to create new Stripe account
  const createNewAccount = async () => {
    dashboardLog.stripe('createNewAccount clicked', { userId: user?.uid, userType });
    if (!user?.uid || !user?.email) {
      dashboardLog.stripe('createNewAccount aborted - no user', { userId: user?.uid });
      return;
    }

    setIsCreatingNewAccount(true);
    setError(null);

    // ✅ Clear error from sessionStorage to allow re-initialization after reload
    const errorKey = `stripe_kyc_${user.uid}_${userType}_error`;
    sessionStorage.removeItem(errorKey);

    try {
      const functions = getFunctions(undefined, "europe-west1");
      const createStripeAccount = httpsCallable(functions, "createStripeAccount");

      // Get user data for account creation
      const result = await createStripeAccount({
        email: user.email,
        currentCountry: "FR", // Default, will be updated in onboarding
        userType: userType,
      });

      const data = result.data as { success: boolean; accountId: string };

      if (data.success) {
        // P0 FIX: Reset ALL state and restart initialization WITHOUT page reload
        const checkKey = `stripe_kyc_${user.uid}_${userType}_check_in_progress`;
        const completedKey = `stripe_kyc_${user.uid}_${userType}_completed`;
        const errorKey = `stripe_kyc_${user.uid}_${userType}_error`;

        // Clear all sessionStorage keys for this user/type
        sessionStorage.removeItem(checkKey);
        sessionStorage.removeItem(completedKey);
        sessionStorage.removeItem(errorKey);

        // Reset all state
        initStartedRef.current = false;
        setStripeConnectInstance(null);
        setError(null);
        setIsKycComplete(false);
        setIsCreatingNewAccount(false);
        setLoading(true);

        // Trigger useEffect re-run by changing reinitKey
        setReinitKey(prev => prev + 1);

        dashboardLog.stripe('Account created, triggering re-initialization', { accountId: data.accountId });
      }
    } catch (err) {
      console.error("[StripeKYC] Failed to create new account:", err);
      setError((err as Error).message || "Impossible de créer un nouveau compte");
      setIsCreatingNewAccount(false);
    }
  };

  useEffect(() => {
    console.log('[StripeKYC DEBUG] 🎯 useEffect triggered', {
      userId: user?.uid,
      userType,
      reinitKey,
      timestamp: new Date().toISOString()
    });

    if (!user?.uid) {
      console.log('[StripeKYC DEBUG] ⚠️ No user uid, setting loading false');
      setLoading(false);
      return;
    }

    // ✅ Include userType in session keys
    const checkKey = `stripe_kyc_${user.uid}_${userType}_check_in_progress`;
    const completedKey = `stripe_kyc_${user.uid}_${userType}_completed`;
    const errorKey = `stripe_kyc_${user.uid}_${userType}_error`; // ✅ P0 FIX: Track errors in sessionStorage

    // ✅ Guard 1: Check if error already detected (prevents repeated API calls)
    const savedError = sessionStorage.getItem(errorKey);
    if (savedError) {
      console.log('[StripeKYC DEBUG] ⚠️ Guard 1: Saved error found', { savedError });
      setError(savedError);
      setLoading(false);
      return;
    }

    // ✅ Guard 2: Check if check in progress
    if (sessionStorage.getItem(checkKey) === "true") {
      console.log('[StripeKYC DEBUG] ⚠️ Guard 2: Check in progress');
      setLoading(false);
      return;
    }

    // ✅ Guard 3: Check if already completed
    if (sessionStorage.getItem(completedKey) === "true") {
      console.log('[StripeKYC DEBUG] ✅ Guard 3: Already completed');
      setIsKycComplete(true);
      setLoading(false);
      return;
    }

    // ✅ Guard 4: Check ref (for same-mount re-renders)
    if (initStartedRef.current) {
      console.log('[StripeKYC DEBUG] ⚠️ Guard 4: Init already started');
      return;
    }

    console.log('[StripeKYC DEBUG] 🚀 Starting initialization');
    initStartedRef.current = true;
    sessionStorage.setItem(checkKey, "true");

    const initializeStripe = async () => {
      dashboardLog.stripe('initializeStripe started', { userId: user?.uid, userType });
      dashboardLog.time('Stripe initialization');
      try {
        const functions = getFunctions(undefined, "europe-west1");

        // ✅ Check existing account status
        try {
          dashboardLog.api('Calling checkStripeAccountStatus...');
          const checkStatus = httpsCallable(
            functions,
            "checkStripeAccountStatus"
          );
          const statusResult = await checkStatus({ userType });
          const statusData = statusResult.data as {
            kycCompleted: boolean;
            detailsSubmitted: boolean;
            chargesEnabled: boolean;
            requirementsCurrentlyDue: string[];
          };

          if (import.meta.env.DEV) {
            console.log("[StripeKYC] Status:", statusData.kycCompleted ? "complete" : "incomplete");
          }

          if (statusData.kycCompleted) {
            console.log('[StripeKYC DEBUG] ✅ Status check: KYC COMPLETE - updating state');
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

          // ✅ P0 FIX: Detect invalid/revoked Stripe account
          if (errorMsg.includes("does not have access to account") ||
              errorMsg.includes("No such account") ||
              errorMsg.includes("account has been deleted")) {
            const errorMessage = "Votre compte Stripe précédent n'est plus valide. Veuillez en créer un nouveau.";
            console.error("[StripeKYC] Invalid Stripe account detected");
            sessionStorage.setItem(errorKey, errorMessage); // ✅ Save error to prevent re-calls
            sessionStorage.removeItem(checkKey);
            setError(errorMessage);
            setLoading(false);
            return;
          }

          if ((err as { code?: string }).code !== "failed-precondition") {
            console.error("[StripeKYC] Status check error:", errorMsg);
          }
          // No account yet - will create one below
        }

        // ✅ Get account session
        const getStripeAccountSession = httpsCallable(
          functions,
          "getStripeAccountSession"
        );

        const result = await getStripeAccountSession({ userType });
        const data = result.data as {
          success: boolean;
          accountId: string;
          clientSecret: string;
        };

        console.log('[StripeKYC DEBUG] 🔧 Creating Stripe instance');
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

        console.log('[StripeKYC DEBUG] ✅ Stripe instance created - updating state');
        setStripeConnectInstance(instance);
        setLoading(false);
        sessionStorage.removeItem(checkKey);
      } catch (err) {
        const errorMsg = (err as Error).message || "";
        let errorMessage: string;

        // ✅ P0 FIX: Detect invalid/revoked Stripe account in session creation too
        if (errorMsg.includes("does not have access to account") ||
            errorMsg.includes("No such account") ||
            errorMsg.includes("account has been deleted")) {
          errorMessage = "Votre compte Stripe précédent n'est plus valide. Veuillez en créer un nouveau.";
        } else {
          errorMessage = "Erreur de connexion à Stripe. Veuillez réessayer.";
        }

        console.error("[StripeKYC] Initialization error:", err);
        sessionStorage.setItem(errorKey, errorMessage); // ✅ Save error to prevent re-calls
        sessionStorage.removeItem(checkKey);
        setError(errorMessage);
        setLoading(false);
      }
    };

    initializeStripe();
  }, [user?.uid, userType, reinitKey]); // P0 FIX: Added reinitKey to trigger re-initialization after account creation

  // ✅ Show loading state while checking
  // P0 FIX: Added min-h-[200px] to prevent layout jumps during state transitions
  if (loading) {
    console.log('[StripeKYC DEBUG] 🔄 Rendering LOADING state', { userType, timestamp: new Date().toISOString() });
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{intl.formatMessage({ id: 'stripe.kyc.loading' })}</p>
        </div>
      </div>
    );
  }

  // ✅ If KYC is complete, render nothing (component will unmount/hide)
  if (isKycComplete) {
    console.log('[StripeKYC DEBUG] ✅ Rendering NULL (KYC complete)', { userType, timestamp: new Date().toISOString() });
    return null;
  }

  // ✅ P0 FIX: Show error state with option to create new account
  // P0 FIX: Added min-h-[200px] to prevent layout jumps during state transitions
  if (error) {
    console.log('[StripeKYC DEBUG] ❌ Rendering ERROR state', { error, userType, timestamp: new Date().toISOString() });
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {intl.formatMessage({ id: 'stripe.kyc.accountError' }, { defaultMessage: 'Problème avec votre compte Stripe' })}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>

          <button
            onClick={createNewAccount}
            disabled={isCreatingNewAccount}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreatingNewAccount ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                {intl.formatMessage({ id: 'stripe.kyc.creatingAccount' }, { defaultMessage: 'Création en cours...' })}
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                {intl.formatMessage({ id: 'stripe.kyc.createNewAccount' }, { defaultMessage: 'Créer un nouveau compte Stripe' })}
              </>
            )}
          </button>

          <p className="mt-4 text-sm text-gray-500">
            {intl.formatMessage({ id: 'stripe.kyc.createNewAccountNote' }, { defaultMessage: 'Un nouveau compte sera créé pour recevoir vos paiements.' })}
          </p>
        </div>
      </div>
    );
  }

  // ✅ If no Stripe instance and not complete, show loading state
  // P0 FIX: Added min-h-[200px] to prevent layout jumps during state transitions
  if (!stripeConnectInstance) {
    console.log('[StripeKYC DEBUG] ⏳ Rendering NO INSTANCE state', { userType, timestamp: new Date().toISOString() });
    return (
      <div className="flex items-center justify-center p-8 min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">
           {intl.formatMessage({ id: 'stripe.kyc.stripeLoading' })}
          </h2>
          <p className="text-sm text-gray-500">
            {intl.formatMessage({ id: 'stripe.kyc.pleaseWait' }, { defaultMessage: 'Connexion à Stripe...' })}
          </p>
        </div>
      </div>
    );
  }

  // ✅ Show KYC form
  console.log('[StripeKYC DEBUG] 📝 Rendering KYC FORM', { userType, timestamp: new Date().toISOString() });
  return (
    <div className="max-w-4xl mx-auto p-4">
      <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
        <ConnectAccountOnboarding
          collectionOptions={{
            fields: "eventually_due",
            futureRequirements: "include",
          }}
          onExit={async () => {
            // ✅ P0 FIX: Remove verbose logging

            // ✅ Include userType in session key
            const completedKey = `stripe_kyc_${user?.uid}_${userType}_completed`;

            if (sessionStorage.getItem(completedKey) === "true") {
              // ✅ P0 FIX: Already completed, skip silently
              return;
            }

            try {
              const functions = getFunctions(undefined, "europe-west1");
              const checkStatus = httpsCallable(
                functions,
                "checkStripeAccountStatus"
              );
              // ✅ Pass userType to backend
              const result = await checkStatus({ userType });
              const data = result.data as {
                kycCompleted: boolean;
                detailsSubmitted: boolean;
                chargesEnabled: boolean;
                requirementsCurrentlyDue: string[];
              };

              // ✅ P0 FIX: Only log in development mode
              if (import.meta.env.DEV) {
                console.log("[StripeKYC] Exit status:", data.kycCompleted ? "complete" : "incomplete");
              }

              if (data.kycCompleted) {
                sessionStorage.setItem(completedKey, "true");
                setIsKycComplete(true); // ✅ Update state

                setTimeout(() => {
                  onComplete?.();
                }, 100);
              }
              // ✅ P0 FIX: Remove verbose incomplete logging
            } catch (error) {
              console.error("[StripeKYC] Exit status check error:", error);
            }
          }}
        />
      </ConnectComponentsProvider>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          {intl.formatMessage({ id: 'stripe.kyc.note' })}
        </p>
      </div>
    </div>
  );
}
