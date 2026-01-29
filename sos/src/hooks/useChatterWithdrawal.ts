/**
 * useChatterWithdrawal Hook
 *
 * React hook for managing chatter withdrawals.
 * Handles withdrawal form state and submission.
 */

import { useState, useCallback, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../contexts/AuthContext";
import {
  ChatterPaymentMethod,
  ChatterPaymentDetails,
  ChatterWiseDetails,
  ChatterMobileMoneyDetails,
  ChatterBankDetails,
  RequestWithdrawalInput,
} from "../types/chatter";

// ============================================================================
// TYPES
// ============================================================================

interface WithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  status: string;
  message: string;
}

interface UseChatterWithdrawalReturn {
  // State
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  withdrawalId: string | null;

  // Form state
  selectedMethod: ChatterPaymentMethod | null;
  amount: number | null;

  // Actions
  setPaymentMethod: (method: ChatterPaymentMethod) => void;
  setAmount: (amount: number | null) => void;
  submitWithdrawal: (paymentDetails: ChatterPaymentDetails) => Promise<WithdrawalResponse>;
  reset: () => void;

  // Validation
  validateWiseDetails: (details: Partial<ChatterWiseDetails>) => string[];
  validateMobileMoneyDetails: (details: Partial<ChatterMobileMoneyDetails>) => string[];
  validateBankDetails: (details: Partial<ChatterBankDetails>) => string[];
}

// Mobile Money providers by country
export const MOBILE_MONEY_PROVIDERS: Record<
  string,
  Array<{ id: string; name: string }>
> = {
  SN: [
    { id: "orange", name: "Orange Money" },
    { id: "wave", name: "Wave" },
  ],
  CI: [
    { id: "orange", name: "Orange Money" },
    { id: "mtn", name: "MTN Mobile Money" },
    { id: "moov", name: "Moov Money" },
    { id: "wave", name: "Wave" },
  ],
  CM: [
    { id: "orange", name: "Orange Money" },
    { id: "mtn", name: "MTN Mobile Money" },
  ],
  BF: [
    { id: "orange", name: "Orange Money" },
    { id: "moov", name: "Moov Money" },
  ],
  ML: [
    { id: "orange", name: "Orange Money" },
    { id: "moov", name: "Moov Money" },
  ],
  KE: [
    { id: "mpesa", name: "M-Pesa" },
    { id: "airtel", name: "Airtel Money" },
  ],
  TZ: [
    { id: "mpesa", name: "M-Pesa" },
    { id: "airtel", name: "Airtel Money" },
  ],
  UG: [
    { id: "mtn", name: "MTN Mobile Money" },
    { id: "airtel", name: "Airtel Money" },
  ],
  GH: [
    { id: "mtn", name: "MTN Mobile Money" },
    { id: "airtel", name: "AirtelTigo Money" },
  ],
  NG: [
    { id: "mtn", name: "MTN Mobile Money" },
    { id: "airtel", name: "Airtel Money" },
  ],
};

// Supported currencies for Wise
export const WISE_CURRENCIES = [
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "XOF", name: "CFA Franc BCEAO", symbol: "CFA" },
  { code: "XAF", name: "CFA Franc BEAC", symbol: "FCFA" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
  { code: "TND", name: "Tunisian Dinar", symbol: "TND" },
];

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useChatterWithdrawal(): UseChatterWithdrawalReturn {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [withdrawalId, setWithdrawalId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ChatterPaymentMethod | null>(null);
  const [amount, setAmount] = useState<number | null>(null);

  const functions = getFunctions(undefined, "europe-west1");

  // Set payment method
  const setPaymentMethod = useCallback((method: ChatterPaymentMethod) => {
    setSelectedMethod(method);
    setError(null);
  }, []);

  // Submit withdrawal
  const submitWithdrawal = useCallback(
    async (paymentDetails: ChatterPaymentDetails): Promise<WithdrawalResponse> => {
      if (!user?.uid) {
        throw new Error("You must be logged in");
      }

      if (!selectedMethod) {
        throw new Error("Please select a payment method");
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      try {
        const requestWithdrawalFn = httpsCallable<RequestWithdrawalInput, WithdrawalResponse>(
          functions,
          "chatterRequestWithdrawal"
        );

        const result = await requestWithdrawalFn({
          amount: amount || undefined, // If null, withdraw all
          paymentMethod: selectedMethod,
          paymentDetails,
        });

        setSuccess(true);
        setWithdrawalId(result.data.withdrawalId);

        return result.data;
      } catch (err) {
        console.error("[useChatterWithdrawal] Error:", err);
        const errorMessage = err instanceof Error ? err.message : "Withdrawal failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user?.uid, selectedMethod, amount, functions]
  );

  // Reset state
  const reset = useCallback(() => {
    setSelectedMethod(null);
    setAmount(null);
    setError(null);
    setSuccess(false);
    setWithdrawalId(null);
  }, []);

  // Validate Wise details
  const validateWiseDetails = useCallback(
    (details: Partial<ChatterWiseDetails>): string[] => {
      const errors: string[] = [];

      if (!details.email) {
        errors.push("Email is required");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
        errors.push("Invalid email format");
      }

      if (!details.accountHolderName) {
        errors.push("Account holder name is required");
      }

      if (!details.currency) {
        errors.push("Currency is required");
      }

      return errors;
    },
    []
  );

  // Validate Mobile Money details
  const validateMobileMoneyDetails = useCallback(
    (details: Partial<ChatterMobileMoneyDetails>): string[] => {
      const errors: string[] = [];

      if (!details.provider) {
        errors.push("Provider is required");
      }

      if (!details.phoneNumber) {
        errors.push("Phone number is required");
      } else if (!/^\+?[0-9]{8,15}$/.test(details.phoneNumber.replace(/\s/g, ""))) {
        errors.push("Invalid phone number format");
      }

      if (!details.country) {
        errors.push("Country is required");
      }

      if (!details.accountName) {
        errors.push("Account name is required");
      }

      return errors;
    },
    []
  );

  // Validate Bank details
  const validateBankDetails = useCallback(
    (details: Partial<ChatterBankDetails>): string[] => {
      const errors: string[] = [];

      if (!details.bankName) {
        errors.push("Bank name is required");
      }

      if (!details.accountHolderName) {
        errors.push("Account holder name is required");
      }

      if (!details.accountNumber) {
        errors.push("Account number is required");
      }

      if (!details.country) {
        errors.push("Country is required");
      }

      if (!details.currency) {
        errors.push("Currency is required");
      }

      return errors;
    },
    []
  );

  return {
    isSubmitting,
    error,
    success,
    withdrawalId,
    selectedMethod,
    amount,
    setPaymentMethod,
    setAmount,
    submitWithdrawal,
    reset,
    validateWiseDetails,
    validateMobileMoneyDetails,
    validateBankDetails,
  };
}

export default useChatterWithdrawal;
