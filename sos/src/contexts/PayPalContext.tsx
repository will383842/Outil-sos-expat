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

  // ============= DEBUG LOGS =============
  console.log('%c💳 [PayPalContext] Provider initializing', 'background: #003087; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;', {
    isConfigured,
    mode,
    clientIdPresent: !!clientId,
    clientIdPrefix: clientId ? clientId.substring(0, 15) + '...' : 'N/A',
    timestamp: new Date().toISOString(),
  });

  const initialOptions: ReactPayPalScriptOptions = useMemo(() => {
    const options = {
      clientId: clientId || "test",
      currency: "EUR",
      intent: "capture",
      components: "buttons,card-fields", // Boutons PayPal + champs carte directement sur la page
      "disable-funding": "credit", // Désactive seulement le crédit PayPal, pas les cartes
    };
    console.log('💳 [PayPalContext] PayPal SDK options:', options);
    return options;
  }, [clientId]);

  const contextValue = useMemo(() => ({
    clientId,
    isConfigured,
    mode,
  }), [clientId, isConfigured, mode]);

  // Si PayPal n'est pas configuré, on rend les enfants sans le provider
  if (!isConfigured) {
    console.warn("%c⚠️ [PayPalContext] PayPal NON CONFIGURÉ: VITE_PAYPAL_CLIENT_ID manquant", 'background: #f44336; color: white; padding: 2px 6px; border-radius: 3px;');
    return (
      <PayPalContext.Provider value={contextValue}>
        {children}
      </PayPalContext.Provider>
    );
  }

  console.log('%c✅ [PayPalContext] PayPal configured - rendering PayPalScriptProvider', 'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px;');

  return (
    <PayPalContext.Provider value={contextValue}>
      <PayPalScriptProvider options={initialOptions}>
        {children}
      </PayPalScriptProvider>
    </PayPalContext.Provider>
  );
};

export default PayPalContext;
