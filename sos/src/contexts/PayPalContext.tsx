// src/contexts/PayPalContext.tsx
import React, { createContext, useContext, useMemo, useRef } from "react";
import { PayPalScriptProvider, ReactPayPalScriptOptions } from "@paypal/react-paypal-js";

interface PayPalContextValue {
  clientId: string;
  isConfigured: boolean;
  mode: "sandbox" | "live";
}

const PayPalContext = createContext<PayPalContextValue>({
  clientId: "",
  isConfigured: false,
  mode: "sandbox",
});

export const usePayPal = () => useContext(PayPalContext);

interface PayPalProviderProps {
  children: React.ReactNode;
}

// Flag pour éviter les logs multiples
let _hasLoggedPayPalInit = false;

export const PayPalProvider: React.FC<PayPalProviderProps> = ({ children }) => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string || "";
  const mode: "sandbox" | "live" = (import.meta.env.VITE_PAYPAL_MODE as string) === "live" ? "live" : "sandbox";
  const isConfigured = Boolean(clientId);

  // Ref pour tracker si le provider PayPal a déjà été monté
  const hasInitializedRef = useRef(false);

  // Log une seule fois au premier montage
  if (!_hasLoggedPayPalInit && isConfigured) {
    _hasLoggedPayPalInit = true;
    console.log('💳 [PayPalContext] Provider initialized', {
      mode,
      clientIdPrefix: clientId.substring(0, 15) + '...',
    });
  }

  const initialOptions: ReactPayPalScriptOptions = useMemo(() => ({
    clientId: clientId, // Ne jamais utiliser de fallback invalide - le SDK échouera proprement
    currency: "EUR",
    intent: "authorize",
    components: "buttons,card-fields",
    "disable-funding": "credit",
  }), [clientId]);

  const contextValue = useMemo(() => ({
    clientId,
    isConfigured,
    mode,
  }), [clientId, isConfigured, mode]);

  // Si PayPal n'est pas configuré, on rend les enfants sans le provider
  if (!isConfigured) {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      console.warn("⚠️ [PayPalContext] PayPal NON CONFIGURÉ: VITE_PAYPAL_CLIENT_ID manquant");
    }
    return (
      <PayPalContext.Provider value={contextValue}>
        {children}
      </PayPalContext.Provider>
    );
  }

  // Marquer comme initialisé pour éviter les re-logs
  if (!hasInitializedRef.current) {
    hasInitializedRef.current = true;
  }

  return (
    <PayPalContext.Provider value={contextValue}>
      <PayPalScriptProvider options={initialOptions}>
        {children}
      </PayPalScriptProvider>
    </PayPalContext.Provider>
  );
};

export default PayPalContext;
