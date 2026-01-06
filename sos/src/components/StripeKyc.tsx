import { useEffect, useState, useRef } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { useIntl } from "react-intl";

interface Props {
  onComplete?: () => void;
  userType: "lawyer" | "expat"; // ✅ NEW: Required prop
}

export default function StripeKYC({ onComplete, userType }: Props) {
  const intl = useIntl();
  const { user } = useAuth();
  const [stripeConnectInstance, setStripeConnectInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isKycComplete, setIsKycComplete] = useState(false); // ✅ NEW: Track completion
  const initStartedRef = useRef(false);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // ✅ Include userType in session keys
    const checkKey = `stripe_kyc_${user.uid}_${userType}_check_in_progress`;
    const completedKey = `stripe_kyc_${user.uid}_${userType}_completed`;

    // ✅ Guard 1: Check sessionStorage
    if (sessionStorage.getItem(checkKey) === "true") {
      // ✅ P0 FIX: Remove verbose logging to reduce console spam
      setLoading(false);
      return;
    }

    if (sessionStorage.getItem(completedKey) === "true") {
      // ✅ P0 FIX: Remove verbose logging to reduce console spam
      setIsKycComplete(true); // ✅ Set completed state
      setLoading(false);
      return;
    }

    // ✅ Guard 2: Check ref
    if (initStartedRef.current) {
      // ✅ P0 FIX: Remove verbose logging to reduce console spam
      return;
    }

    // ✅ P0 FIX: Remove verbose logging to reduce console spam
    initStartedRef.current = true;
    sessionStorage.setItem(checkKey, "true");

    const initializeStripe = async () => {
      try {
        const functions = getFunctions(undefined, "europe-west1");

        // ✅ P0 FIX: Remove verbose logging to reduce console spam
        try {
          const checkStatus = httpsCallable(
            functions,
            "checkStripeAccountStatus"
          );
          // ✅ Pass userType to backend
          const statusResult = await checkStatus({ userType });
          const statusData = statusResult.data as {
            kycCompleted: boolean;
            detailsSubmitted: boolean;
            chargesEnabled: boolean;
            requirementsCurrentlyDue: string[];
          };

          // ✅ P0 FIX: Only log in development mode
          if (import.meta.env.DEV) {
            console.log("[StripeKYC] Status:", statusData.kycCompleted ? "complete" : "incomplete");
          }

          if (statusData.kycCompleted) {
            sessionStorage.setItem(completedKey, "true");
            sessionStorage.removeItem(checkKey);
            setIsKycComplete(true); // ✅ Set completed state
            setLoading(false);

            setTimeout(() => {
              onComplete?.();
            }, 100);

            return;
          }
        } catch (error: any) {
          if (error.code !== "failed-precondition") {
            // Only log unexpected errors
            console.error("[StripeKYC] Status check error:", error.message || error);
          }
          // No account yet - will create one below
        }

        // ✅ P0 FIX: Remove verbose logging
        const getStripeAccountSession = httpsCallable(
          functions,
          "getStripeAccountSession"
        );

        // ✅ Pass userType to backend
        const result = await getStripeAccountSession({ userType });
        const data = result.data as {
          success: boolean;
          accountId: string;
          clientSecret: string;
        };

        // ✅ P0 FIX: Remove verbose logging

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
      } catch (error) {
        console.error("[StripeKYC] Initialization error:", error);
        setLoading(false);
        sessionStorage.removeItem(checkKey);
      }
    };

    initializeStripe();
  }, [user?.uid, userType, onComplete]); // ✅ Add userType to dependencies

  // ✅ Show loading state while checking
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{intl.formatMessage({ id: 'stripe.kyc.loading' })}</p>
        </div>
      </div>
    );
  }

  // ✅ If KYC is complete, render nothing (component will unmount/hide)
  if (isKycComplete) {
    return (
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            {intl.formatMessage({ id: 'stripe.kyc.verified' })}
          </h2>
    );
  }

  // ✅ If no Stripe instance and not complete, show error state
  if (!stripeConnectInstance) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          {/* <div className="text-red-600 text-6xl mb-4">⚠️</div> */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
           {intl.formatMessage({ id: 'stripe.kyc.stripeLoading' })}
          </h2>
          {/* <p className="text-gray-600">Please refresh the page to try again.</p> */}
        </div>
      </div>
    );
  }

  // ✅ Show KYC form
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
