// src/contexts/PayPalContext.tsx
import React, { createContext, useContext, useMemo } from "react";
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

export const PayPalProvider: React.FC<PayPalProviderProps> = ({ children }) => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string || "";
  const mode: "sandbox" | "live" = (import.meta.env.VITE_PAYPAL_MODE as string) === "live" ? "live" : "sandbox";
  const isConfigured = Boolean(clientId);

  const initialOptions: ReactPayPalScriptOptions = useMemo(() => ({
    clientId: clientId || "test",
    currency: "EUR",
    intent: "capture",
    components: "buttons,card-fields", // Boutons PayPal + champs carte directement sur la page
    "disable-funding": "credit", // Désactive seulement le crédit PayPal, pas les cartes
  }), [clientId]);

  const contextValue = useMemo(() => ({
    clientId,
    isConfigured,
    mode,
  }), [clientId, isConfigured, mode]);

  // Si PayPal n'est pas configuré, on rend les enfants sans le provider
  if (!isConfigured) {
    console.warn("⚠️ PayPal non configuré: VITE_PAYPAL_CLIENT_ID manquant");
    return (
      <PayPalContext.Provider value={contextValue}>
        {children}
      </PayPalContext.Provider>
    );
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
