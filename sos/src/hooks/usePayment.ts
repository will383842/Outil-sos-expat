/**
 * usePayment Hooks
 *
 * Unified React hooks for the centralized payment system.
 * Used by Chatter, Influencer, and Blogger dashboards.
 *
 * Features:
 * - Payment method management (save, delete, set default)
 * - Withdrawal requests and tracking
 * - Country and provider information
 * - Payment configuration
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functionsPayment } from "@/config/firebase";
import { useAuth } from "../contexts/AuthContext";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported payment method types
 */
export type PaymentMethodType = "wise" | "mobile_money" | "bank_transfer";

/**
 * Withdrawal status progression
 */
export type WithdrawalStatus =
  | "pending"
  | "validating"
  | "approved"
  | "queued"
  | "processing"
  | "sent"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled";

/**
 * Mobile Money provider identifiers
 */
export type MobileMoneyProvider =
  | "orange_money"
  | "wave"
  | "mtn_momo"
  | "moov_money"
  | "airtel_money"
  | "mpesa"
  | "free_money"
  | "t_money"
  | "flooz"
  | "vodacom"
  | "mobilis";

/**
 * User type for payment context
 */
export type PaymentUserType = "chatter" | "influencer" | "blogger";

// ============================================================================
// PAYMENT DETAILS TYPES
// ============================================================================

export interface WisePaymentDetails {
  type: "wise";
  email: string;
  currency: string;
  accountHolderName: string;
  country?: string;
  iban?: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  bic?: string;
}

export interface MobileMoneyPaymentDetails {
  type: "mobile_money";
  provider: MobileMoneyProvider;
  phoneNumber: string;
  country: string;
  currency: string;
  accountName: string;
}

export interface BankTransferPaymentDetails {
  type: "bank_transfer";
  bankName?: string;
  accountHolderName: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  swiftBic?: string;
  iban?: string;
  sortCode?: string;
  bsb?: string;
  ifsc?: string;
  country: string;
  currency: string;
}

export type PaymentDetails =
  | WisePaymentDetails
  | MobileMoneyPaymentDetails
  | BankTransferPaymentDetails;

// ============================================================================
// USER PAYMENT METHOD
// ============================================================================

export interface UserPaymentMethod {
  id: string;
  userId: string;
  userType: PaymentUserType;
  methodType: PaymentMethodType;
  details: PaymentDetails;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  displayName: string; // e.g., "PayPal - john@example.com"
  provider?: 'wise' | 'flutterwave'; // Payment provider
  displayIcon?: string; // Icon name for display
}

// ============================================================================
// WITHDRAWAL REQUEST
// ============================================================================

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userType: PaymentUserType;
  amount: number;
  currency: string;
  targetCurrency: string;
  exchangeRate?: number;
  convertedAmount?: number;
  status: WithdrawalStatus;
  paymentMethodId: string;
  paymentMethod: PaymentMethodType;
  paymentDetailsSnapshot: PaymentDetails;
  commissionIds?: string[];
  commissionCount: number;
  paymentReference?: string;
  transactionId?: string;
  estimatedArrival?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  completedAt?: string;
  failedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  rejectionReason?: string;
  failureReason?: string;
  cancellationReason?: string;
  adminNotes?: string;
}

// ============================================================================
// PAYMENT TRACKING
// ============================================================================

export interface PaymentTrackingEvent {
  timestamp: string;
  status: WithdrawalStatus;
  description: string;
  details?: Record<string, unknown>;
}

export interface TrackingTimelineItem {
  step: number;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'failed';
  timestamp?: string;
}

export interface PaymentTrackingSummary {
  withdrawalId: string;
  currentStatus: WithdrawalStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  requestedAt: string;
  estimatedCompletion?: string;
  events: PaymentTrackingEvent[];
  lastUpdatedAt: string;
  // Extended fields for tracking UI
  statusLabel?: string;
  statusDescription?: string;
  progress?: number;
  timeline?: TrackingTimelineItem[];
}

// ============================================================================
// COUNTRY & PROVIDER INFO
// ============================================================================

export interface MobileMoneyProviderInfo {
  id: MobileMoneyProvider;
  name: string;
  countries: string[];
  currencies: string[];
  minAmount?: number;
  maxAmount?: number;
  processingTime: string;
  fees?: {
    fixed: number;
    percentage: number;
  };
}

export interface CountryPaymentInfo {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  supportedMethods: PaymentMethodType[];
  mobileProviders: MobileMoneyProvider[];
  bankTransferAvailable: boolean;
  wiseAvailable: boolean;
}

// ============================================================================
// CONSTANTS - MOBILE MONEY PROVIDERS BY COUNTRY
// ============================================================================

export const MOBILE_MONEY_PROVIDERS_BY_COUNTRY: Record<
  string,
  Array<{ id: MobileMoneyProvider; name: string }>
> = {
  // West Africa (BCEAO Zone)
  SN: [
    { id: "orange_money", name: "Orange Money" },
    { id: "wave", name: "Wave" },
  ],
  CI: [
    { id: "orange_money", name: "Orange Money" },
    { id: "mtn_momo", name: "MTN Mobile Money" },
    { id: "moov_money", name: "Moov Money" },
    { id: "wave", name: "Wave" },
  ],
  ML: [
    { id: "orange_money", name: "Orange Money" },
    { id: "moov_money", name: "Moov Money" },
  ],
  BF: [
    { id: "orange_money", name: "Orange Money" },
    { id: "moov_money", name: "Moov Money" },
  ],
  NE: [
    { id: "orange_money", name: "Orange Money" },
    { id: "airtel_money", name: "Airtel Money" },
  ],
  TG: [
    { id: "moov_money", name: "Moov Money" },
  ],
  BJ: [
    { id: "mtn_momo", name: "MTN Mobile Money" },
    { id: "moov_money", name: "Moov Money" },
  ],
  // Central Africa (BEAC Zone)
  CM: [
    { id: "orange_money", name: "Orange Money" },
    { id: "mtn_momo", name: "MTN Mobile Money" },
  ],
  GA: [
    { id: "airtel_money", name: "Airtel Money" },
  ],
  CG: [
    { id: "airtel_money", name: "Airtel Money" },
    { id: "mtn_momo", name: "MTN Mobile Money" },
  ],
  // East Africa
  KE: [
    { id: "mpesa", name: "M-Pesa" },
    { id: "airtel_money", name: "Airtel Money" },
  ],
  TZ: [
    { id: "mpesa", name: "M-Pesa" },
    { id: "airtel_money", name: "Airtel Money" },
  ],
  UG: [
    { id: "mtn_momo", name: "MTN Mobile Money" },
    { id: "airtel_money", name: "Airtel Money" },
  ],
  RW: [
    { id: "mtn_momo", name: "MTN Mobile Money" },
    { id: "airtel_money", name: "Airtel Money" },
  ],
  // West Africa (Non-CFA)
  GH: [
    { id: "mtn_momo", name: "MTN Mobile Money" },
    { id: "airtel_money", name: "AirtelTigo Money" },
  ],
  NG: [
    { id: "mtn_momo", name: "MTN Mobile Money" },
    { id: "airtel_money", name: "Airtel Money" },
  ],
};

// ============================================================================
// CONSTANTS - SUPPORTED CURRENCIES FOR WISE
// ============================================================================

export const WISE_SUPPORTED_CURRENCIES = [
  { code: "EUR", name: "Euro", symbol: "\u20ac" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "\u00a3" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "XOF", name: "CFA Franc BCEAO", symbol: "CFA" },
  { code: "XAF", name: "CFA Franc BEAC", symbol: "FCFA" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "MAD" },
  { code: "TND", name: "Tunisian Dinar", symbol: "TND" },
  { code: "NGN", name: "Nigerian Naira", symbol: "\u20a6" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH\u20b5" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
];

// ============================================================================
// CONSTANTS - COUNTRY PAYMENT INFO
// ============================================================================

export const COUNTRY_PAYMENT_INFO: CountryPaymentInfo[] = [
  // Europe
  { code: "FR", name: "France", currency: "EUR", currencySymbol: "\u20ac", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "DE", name: "Germany", currency: "EUR", currencySymbol: "\u20ac", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "ES", name: "Spain", currency: "EUR", currencySymbol: "\u20ac", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "IT", name: "Italy", currency: "EUR", currencySymbol: "\u20ac", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "BE", name: "Belgium", currency: "EUR", currencySymbol: "\u20ac", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "CH", name: "Switzerland", currency: "CHF", currencySymbol: "CHF", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "GB", name: "United Kingdom", currency: "GBP", currencySymbol: "\u00a3", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  // North America
  { code: "US", name: "United States", currency: "USD", currencySymbol: "$", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "CA", name: "Canada", currency: "CAD", currencySymbol: "CA$", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  // North Africa
  { code: "MA", name: "Morocco", currency: "MAD", currencySymbol: "MAD", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "TN", name: "Tunisia", currency: "TND", currencySymbol: "TND", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
  { code: "DZ", name: "Algeria", currency: "DZD", currencySymbol: "DZD", supportedMethods: ["bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: false },
  // West Africa
  { code: "SN", name: "Senegal", currency: "XOF", currencySymbol: "CFA", supportedMethods: ["wise", "mobile_money"], mobileProviders: ["orange_money", "wave"], bankTransferAvailable: false, wiseAvailable: true },
  { code: "CI", name: "Ivory Coast", currency: "XOF", currencySymbol: "CFA", supportedMethods: ["wise", "mobile_money"], mobileProviders: ["orange_money", "mtn_momo", "moov_money", "wave"], bankTransferAvailable: false, wiseAvailable: true },
  { code: "ML", name: "Mali", currency: "XOF", currencySymbol: "CFA", supportedMethods: ["mobile_money"], mobileProviders: ["orange_money", "moov_money"], bankTransferAvailable: false, wiseAvailable: false },
  { code: "BF", name: "Burkina Faso", currency: "XOF", currencySymbol: "CFA", supportedMethods: ["mobile_money"], mobileProviders: ["orange_money", "moov_money"], bankTransferAvailable: false, wiseAvailable: false },
  { code: "GH", name: "Ghana", currency: "GHS", currencySymbol: "GH\u20b5", supportedMethods: ["wise", "mobile_money"], mobileProviders: ["mtn_momo", "airtel_money"], bankTransferAvailable: false, wiseAvailable: true },
  { code: "NG", name: "Nigeria", currency: "NGN", currencySymbol: "\u20a6", supportedMethods: ["wise", "mobile_money", "bank_transfer"], mobileProviders: ["mtn_momo", "airtel_money"], bankTransferAvailable: true, wiseAvailable: true },
  // Central Africa
  { code: "CM", name: "Cameroon", currency: "XAF", currencySymbol: "FCFA", supportedMethods: ["mobile_money"], mobileProviders: ["orange_money", "mtn_momo"], bankTransferAvailable: false, wiseAvailable: false },
  // East Africa
  { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh", supportedMethods: ["wise", "mobile_money"], mobileProviders: ["mpesa", "airtel_money"], bankTransferAvailable: false, wiseAvailable: true },
  { code: "TZ", name: "Tanzania", currency: "TZS", currencySymbol: "TSh", supportedMethods: ["mobile_money"], mobileProviders: ["mpesa", "airtel_money"], bankTransferAvailable: false, wiseAvailable: false },
  { code: "UG", name: "Uganda", currency: "UGX", currencySymbol: "USh", supportedMethods: ["mobile_money"], mobileProviders: ["mtn_momo", "airtel_money"], bankTransferAvailable: false, wiseAvailable: false },
  // South Africa
  { code: "ZA", name: "South Africa", currency: "ZAR", currencySymbol: "R", supportedMethods: ["wise", "bank_transfer"], mobileProviders: [], bankTransferAvailable: true, wiseAvailable: true },
];

// ============================================================================
// FIREBASE FUNCTIONS SETUP
// ============================================================================

// Use the dedicated payment functions instance (europe-west3) from centralized config
// to isolate payment operations from CPU quota pressure of 500+ general functions
const functions = functionsPayment;

// ============================================================================
// HOOK: usePaymentMethods
// ============================================================================

interface UsePaymentMethodsReturn {
  methods: UserPaymentMethod[];
  defaultMethodId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveMethod: (details: PaymentDetails, setAsDefault?: boolean) => Promise<string>;
  deleteMethod: (methodId: string) => Promise<void>;
  setDefaultMethod: (methodId: string) => Promise<void>;
}

interface PaymentMethodsResponse {
  success: boolean;
  methods: UserPaymentMethod[];
  defaultMethodId: string | null;
}

interface SaveMethodResponse {
  success: boolean;
  methodId: string;
  message: string;
}

interface DeleteMethodResponse {
  success: boolean;
  message: string;
}

interface SetDefaultResponse {
  success: boolean;
  message: string;
}

export function usePaymentMethods(): UsePaymentMethodsReturn {
  const { user } = useAuth();
  const [methods, setMethods] = useState<UserPaymentMethod[]>([]);
  const [defaultMethodId, setDefaultMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch payment methods
  const refresh = useCallback(async () => {
    if (!user?.uid) {
      setMethods([]);
      setDefaultMethodId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const getPaymentMethodsFn = httpsCallable<void, PaymentMethodsResponse>(
        functions,
        "paymentGetMethods"
      );

      const result = await getPaymentMethodsFn();
      setMethods(result.data.methods);
      setDefaultMethodId(result.data.defaultMethodId);
    } catch (err) {
      console.error("[usePaymentMethods] Error fetching methods:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch payment methods";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Save payment method
  const saveMethod = useCallback(
    async (details: PaymentDetails, setAsDefault = false): Promise<string> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const savePaymentMethodFn = httpsCallable<
        { details: PaymentDetails; setAsDefault: boolean },
        SaveMethodResponse
      >(functions, "paymentSaveMethod");

      const result = await savePaymentMethodFn({ details, setAsDefault });

      if (!result.data.success) {
        throw new Error(result.data.message || "Failed to save payment method");
      }

      // Refresh methods after save
      await refresh();

      return result.data.methodId;
    },
    [user?.uid, refresh]
  );

  // Delete payment method
  const deleteMethod = useCallback(
    async (methodId: string): Promise<void> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const deletePaymentMethodFn = httpsCallable<
        { methodId: string },
        DeleteMethodResponse
      >(functions, "paymentDeleteMethod");

      const result = await deletePaymentMethodFn({ methodId });

      if (!result.data.success) {
        throw new Error(result.data.message || "Failed to delete payment method");
      }

      // Refresh methods after delete
      await refresh();
    },
    [user?.uid, refresh]
  );

  // Set default payment method
  const setDefaultMethodAction = useCallback(
    async (methodId: string): Promise<void> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const setDefaultPaymentMethodFn = httpsCallable<
        { methodId: string },
        SetDefaultResponse
      >(functions, "paymentSetDefault");

      const result = await setDefaultPaymentMethodFn({ methodId });

      if (!result.data.success) {
        throw new Error(result.data.message || "Failed to set default payment method");
      }

      // Update local state immediately
      setDefaultMethodId(methodId);

      // Refresh to ensure consistency
      await refresh();
    },
    [user?.uid, refresh]
  );

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    methods,
    defaultMethodId,
    loading,
    error,
    refresh,
    saveMethod,
    deleteMethod,
    setDefaultMethod: setDefaultMethodAction,
  };
}

// ============================================================================
// HOOK: useWithdrawals
// ============================================================================

interface UseWithdrawalsReturn {
  withdrawals: WithdrawalRequest[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  requestWithdrawal: (paymentMethodId: string, amount?: number) => Promise<string>;
  cancelWithdrawal: (withdrawalId: string, reason?: string) => Promise<void>;
}

interface WithdrawalsResponse {
  success: boolean;
  withdrawals: WithdrawalRequest[];
  total: number;
}

interface RequestWithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  status: WithdrawalStatus;
  message: string;
  telegramConfirmationRequired?: boolean;
}

interface CancelWithdrawalResponse {
  success: boolean;
  message: string;
}

export function useWithdrawals(options?: {
  limit?: number;
  status?: WithdrawalStatus[];
}): UseWithdrawalsReturn {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Fetch withdrawals
  const refresh = useCallback(async () => {
    if (!user?.uid) {
      setWithdrawals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const getWithdrawalsFn = httpsCallable<
        { limit?: number; status?: WithdrawalStatus[] },
        WithdrawalsResponse
      >(functions, "paymentGetHistory");

      const result = await getWithdrawalsFn({
        limit: optionsRef.current?.limit,
        status: optionsRef.current?.status,
      });

      setWithdrawals(result.data.withdrawals);
    } catch (err) {
      console.error("[useWithdrawals] Error fetching withdrawals:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch withdrawals";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Request withdrawal
  const requestWithdrawal = useCallback(
    async (paymentMethodId: string, amount?: number): Promise<string> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const requestWithdrawalFn = httpsCallable<
        { paymentMethodId: string; amount?: number },
        RequestWithdrawalResponse
      >(functions, "paymentRequestWithdrawal");

      const result = await requestWithdrawalFn({ paymentMethodId, amount });

      if (!result.data.success) {
        throw new Error(result.data.message || "Failed to request withdrawal");
      }

      // Refresh withdrawals after request
      await refresh();

      return result.data.withdrawalId;
    },
    [user?.uid, refresh]
  );

  // Cancel withdrawal
  const cancelWithdrawal = useCallback(
    async (withdrawalId: string, reason?: string): Promise<void> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const cancelWithdrawalFn = httpsCallable<
        { withdrawalId: string; reason?: string },
        CancelWithdrawalResponse
      >(functions, "paymentCancelWithdrawal");

      const result = await cancelWithdrawalFn({ withdrawalId, reason });

      if (!result.data.success) {
        throw new Error(result.data.message || "Failed to cancel withdrawal");
      }

      // Refresh withdrawals after cancel
      await refresh();
    },
    [user?.uid, refresh]
  );

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    withdrawals,
    loading,
    error,
    refresh,
    requestWithdrawal,
    cancelWithdrawal,
  };
}

// ============================================================================
// HOOK: useWithdrawalTracking
// ============================================================================

interface UseWithdrawalTrackingReturn {
  tracking: PaymentTrackingSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface TrackingResponse {
  success: boolean;
  tracking: PaymentTrackingSummary;
}

export function useWithdrawalTracking(withdrawalId: string | null): UseWithdrawalTrackingReturn {
  const { user } = useAuth();
  const [tracking, setTracking] = useState<PaymentTrackingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch tracking info
  const refresh = useCallback(async () => {
    if (!user?.uid || !withdrawalId) {
      setTracking(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const getWithdrawalTrackingFn = httpsCallable<
        { withdrawalId: string },
        TrackingResponse
      >(functions, "paymentGetStatus");

      const result = await getWithdrawalTrackingFn({ withdrawalId });

      if (result.data.success) {
        setTracking(result.data.tracking);
      } else {
        setTracking(null);
      }
    } catch (err) {
      console.error("[useWithdrawalTracking] Error fetching tracking:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch tracking info";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, withdrawalId]);

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    if (withdrawalId) {
      refresh();
    } else {
      setTracking(null);
    }
  }, [withdrawalId, refresh]);

  // Auto-refresh every 30 seconds if status is processing
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up auto-refresh only if tracking exists and status is processing
    if (tracking && tracking.currentStatus === "processing") {
      intervalRef.current = setInterval(() => {
        refresh();
      }, 30000); // 30 seconds
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tracking?.currentStatus, refresh]);

  return {
    tracking,
    loading,
    error,
    refresh,
  };
}

// ============================================================================
// HOOK: useCountryPaymentInfo
// ============================================================================

interface UseCountryPaymentInfoReturn {
  countries: CountryPaymentInfo[];
  getCountryInfo: (countryCode: string) => CountryPaymentInfo | null;
  getMobileProviders: (countryCode: string) => MobileMoneyProviderInfo[];
  isCountrySupported: (countryCode: string) => boolean;
  getSupportedMethods: (countryCode: string) => PaymentMethodType[];
}

// Mobile Money Provider details
const MOBILE_PROVIDER_DETAILS: Record<MobileMoneyProvider, Omit<MobileMoneyProviderInfo, "id">> = {
  orange_money: {
    name: "Orange Money",
    countries: ["SN", "CI", "ML", "BF", "NE", "CM"],
    currencies: ["XOF", "XAF"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 1.5 },
  },
  wave: {
    name: "Wave",
    countries: ["SN", "CI"],
    currencies: ["XOF"],
    processingTime: "Instant",
    fees: { fixed: 0, percentage: 1 },
  },
  mtn_momo: {
    name: "MTN Mobile Money",
    countries: ["CI", "CM", "GH", "NG", "UG", "RW", "BJ"],
    currencies: ["XOF", "XAF", "GHS", "NGN", "UGX", "RWF"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 1.5 },
  },
  moov_money: {
    name: "Moov Money",
    countries: ["CI", "ML", "BF", "TG", "BJ"],
    currencies: ["XOF"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 1.5 },
  },
  airtel_money: {
    name: "Airtel Money",
    countries: ["NE", "KE", "TZ", "UG", "RW", "GH", "NG", "GA", "CG"],
    currencies: ["XOF", "KES", "TZS", "UGX", "RWF", "GHS", "NGN", "XAF"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 1.5 },
  },
  mpesa: {
    name: "M-Pesa",
    countries: ["KE", "TZ"],
    currencies: ["KES", "TZS"],
    processingTime: "Instant",
    fees: { fixed: 0, percentage: 1 },
  },
  free_money: {
    name: "Free Money",
    countries: ["SN"],
    currencies: ["XOF"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 1.5 },
  },
  t_money: {
    name: "T-Money",
    countries: ["TG"],
    currencies: ["XOF"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 1.5 },
  },
  flooz: {
    name: "Flooz",
    countries: ["TG"],
    currencies: ["XOF"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 1.5 },
  },
  vodacom: {
    name: "Vodacom M-Pesa",
    countries: ["ZA", "CD"],
    currencies: ["ZAR", "CDF"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 1.5 },
  },
  mobilis: {
    name: "Mobilis",
    countries: ["DZ"],
    currencies: ["DZD"],
    processingTime: "Instant - 24h",
    fees: { fixed: 0, percentage: 2 },
  },
};

export function useCountryPaymentInfo(): UseCountryPaymentInfoReturn {
  // Get country info by code
  const getCountryInfo = useCallback((countryCode: string): CountryPaymentInfo | null => {
    return COUNTRY_PAYMENT_INFO.find((c) => c.code === countryCode) || null;
  }, []);

  // Get mobile providers for a country
  const getMobileProviders = useCallback((countryCode: string): MobileMoneyProviderInfo[] => {
    const country = COUNTRY_PAYMENT_INFO.find((c) => c.code === countryCode);
    if (!country || country.mobileProviders.length === 0) {
      return [];
    }

    return country.mobileProviders
      .map((providerId) => {
        const details = MOBILE_PROVIDER_DETAILS[providerId];
        if (!details) return null;
        return {
          id: providerId,
          ...details,
        };
      })
      .filter((p): p is MobileMoneyProviderInfo => p !== null);
  }, []);

  // Check if country is supported
  const isCountrySupported = useCallback((countryCode: string): boolean => {
    return COUNTRY_PAYMENT_INFO.some((c) => c.code === countryCode);
  }, []);

  // Get supported payment methods for a country
  const getSupportedMethods = useCallback((countryCode: string): PaymentMethodType[] => {
    const country = COUNTRY_PAYMENT_INFO.find((c) => c.code === countryCode);
    return country?.supportedMethods || [];
  }, []);

  return {
    countries: COUNTRY_PAYMENT_INFO,
    getCountryInfo,
    getMobileProviders,
    isCountrySupported,
    getSupportedMethods,
  };
}

// ============================================================================
// HOOK: usePaymentConfig
// ============================================================================

interface UsePaymentConfigReturn {
  minimumWithdrawal: number;
  isEnabled: boolean;
  loading: boolean;
  currency: string;
  processingTimes: {
    wise: string;
    mobile_money: string;
    bank_transfer: string;
  };
}

interface PaymentConfigResponse {
  success: boolean;
  config: {
    minimumWithdrawalAmount: number;
    withdrawalsEnabled: boolean;
    currency: string;
  };
}

export function usePaymentConfig(): UsePaymentConfigReturn {
  const { user } = useAuth();
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(3000); // Default $30.00 in cents
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD");

  // Fetch config with timeout to prevent infinite loading
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const getPaymentConfigFn = httpsCallable<void, PaymentConfigResponse>(
          functions,
          "paymentAdminGetConfig"
        );

        // Add 10 second timeout to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Config fetch timeout")), 10000);
        });

        const result = await Promise.race([getPaymentConfigFn(), timeoutPromise]);

        if (result.data.success) {
          setMinimumWithdrawal(result.data.config.minimumWithdrawalAmount);
          setIsEnabled(result.data.config.withdrawalsEnabled);
          setCurrency(result.data.config.currency || "USD");
        }
      } catch (err) {
        console.error("[usePaymentConfig] Error fetching config:", err);
        // Use default values on error
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user?.uid]);

  // Static processing times
  const processingTimes = useMemo(
    () => ({
      wise: "1-3 business days",
      mobile_money: "Instant - 24 hours",
      bank_transfer: "3-5 business days",
    }),
    []
  );

  return {
    minimumWithdrawal,
    isEnabled,
    loading,
    currency,
    processingTimes,
  };
}

// ============================================================================
// HOOK: usePaymentValidation
// ============================================================================

interface ValidationErrors {
  [key: string]: string;
}

interface UsePaymentValidationReturn {
  validateWiseDetails: (details: Partial<WisePaymentDetails>) => ValidationErrors;
  validateMobileMoneyDetails: (details: Partial<MobileMoneyPaymentDetails>) => ValidationErrors;
  validateBankTransferDetails: (details: Partial<BankTransferPaymentDetails>) => ValidationErrors;
  validatePaymentDetails: (details: Partial<PaymentDetails>) => ValidationErrors;
  isValid: (errors: ValidationErrors) => boolean;
}

export function usePaymentValidation(): UsePaymentValidationReturn {
  // Validate Wise details
  const validateWiseDetails = useCallback(
    (details: Partial<WisePaymentDetails>): ValidationErrors => {
      const errors: ValidationErrors = {};

      if (!details.email) {
        errors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
        errors.email = "Invalid email format";
      }

      if (!details.accountHolderName) {
        errors.accountHolderName = "Account holder name is required";
      } else if (details.accountHolderName.length < 2) {
        errors.accountHolderName = "Account holder name is too short";
      }

      if (!details.currency) {
        errors.currency = "Currency is required";
      } else if (!WISE_SUPPORTED_CURRENCIES.some((c) => c.code === details.currency)) {
        errors.currency = "Currency not supported";
      }

      return errors;
    },
    []
  );

  // Validate Mobile Money details
  const validateMobileMoneyDetails = useCallback(
    (details: Partial<MobileMoneyPaymentDetails>): ValidationErrors => {
      const errors: ValidationErrors = {};

      if (!details.provider) {
        errors.provider = "Provider is required";
      }

      if (!details.phoneNumber) {
        errors.phoneNumber = "Phone number is required";
      } else {
        const cleanPhone = details.phoneNumber.replace(/\s/g, "");
        if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
          errors.phoneNumber = "Invalid phone number format";
        }
      }

      if (!details.country) {
        errors.country = "Country is required";
      } else {
        // Validate provider is available in country
        const countryProviders = MOBILE_MONEY_PROVIDERS_BY_COUNTRY[details.country];
        if (!countryProviders) {
          errors.country = "Mobile money not available in this country";
        } else if (
          details.provider &&
          !countryProviders.some((p) => p.id === details.provider)
        ) {
          errors.provider = "Provider not available in selected country";
        }
      }

      if (!details.accountName) {
        errors.accountName = "Account name is required";
      }

      return errors;
    },
    []
  );

  // Validate Bank Transfer details
  const validateBankTransferDetails = useCallback(
    (details: Partial<BankTransferPaymentDetails>): ValidationErrors => {
      const errors: ValidationErrors = {};

      if (!details.accountHolderName) {
        errors.accountHolderName = "Account holder name is required";
      }

      if (!details.country) {
        errors.country = "Country is required";
      }

      if (!details.currency) {
        errors.currency = "Currency is required";
      }

      // IBAN validation for European countries
      const europeanCountries = ["FR", "DE", "ES", "IT", "BE", "CH", "GB", "NL", "AT", "PT"];
      if (details.country && europeanCountries.includes(details.country)) {
        if (!details.iban) {
          errors.iban = "IBAN is required for European transfers";
        } else if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(details.iban.replace(/\s/g, ""))) {
          errors.iban = "Invalid IBAN format";
        }
      }

      // Account number or IBAN required
      if (!details.accountNumber && !details.iban) {
        errors.accountNumber = "Account number or IBAN is required";
      }

      return errors;
    },
    []
  );

  // Validate any payment details based on type
  const validatePaymentDetails = useCallback(
    (details: Partial<PaymentDetails>): ValidationErrors => {
      if (!details.type) {
        return { type: "Payment method type is required" };
      }

      switch (details.type) {
        case "wise":
          return validateWiseDetails(details as Partial<WisePaymentDetails>);
        case "mobile_money":
          return validateMobileMoneyDetails(details as Partial<MobileMoneyPaymentDetails>);
        case "bank_transfer":
          return validateBankTransferDetails(details as Partial<BankTransferPaymentDetails>);
        default:
          return { type: "Invalid payment method type" };
      }
    },
    [
      validateWiseDetails,
      validateMobileMoneyDetails,
      validateBankTransferDetails,
    ]
  );

  // Check if validation passed
  const isValid = useCallback((errors: ValidationErrors): boolean => {
    return Object.keys(errors).length === 0;
  }, []);

  return {
    validateWiseDetails,
    validateMobileMoneyDetails,
    validateBankTransferDetails,
    validatePaymentDetails,
    isValid,
  };
}

// ============================================================================
// HOOK: usePendingWithdrawal
// ============================================================================

interface UsePendingWithdrawalReturn {
  hasPendingWithdrawal: boolean;
  pendingWithdrawal: WithdrawalRequest | null;
  loading: boolean;
}

export function usePendingWithdrawal(): UsePendingWithdrawalReturn {
  const { withdrawals, loading } = useWithdrawals({
    status: ["pending", "approved", "processing"],
    limit: 1,
  });

  const pendingWithdrawal = useMemo(() => {
    return withdrawals.length > 0 ? withdrawals[0] : null;
  }, [withdrawals]);

  const hasPendingWithdrawal = useMemo(() => {
    return withdrawals.length > 0;
  }, [withdrawals]);

  return {
    hasPendingWithdrawal,
    pendingWithdrawal,
    loading,
  };
}

// ============================================================================
// HELPER: Format amount for display
// ============================================================================

export function formatPaymentAmount(
  amountInCents: number,
  currency: string = "USD"
): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// HELPER: Get payment method display name
// ============================================================================

export function getPaymentMethodDisplayName(details: PaymentDetails): string {
  switch (details.type) {
    case "wise":
      return `Wise - ${details.email}`;
    case "mobile_money": {
      const providerName =
        MOBILE_PROVIDER_DETAILS[details.provider]?.name || details.provider;
      return `${providerName} - ${details.phoneNumber}`;
    }
    case "bank_transfer": {
      const bankName = details.bankName || "Bank";
      const accountId = details.accountNumber
        ? `****${details.accountNumber.slice(-4)}`
        : details.iban
          ? `****${details.iban.slice(-4)}`
          : "";
      return `${bankName}${accountId ? ` (${accountId})` : ""}`;
    }
    default:
      return "Unknown payment method";
  }
}

// ============================================================================
// HELPER: Get withdrawal status color
// ============================================================================

export function getWithdrawalStatusColor(status: WithdrawalStatus): string {
  switch (status) {
    case "pending":
      return "yellow";
    case "validating":
      return "yellow";
    case "approved":
      return "blue";
    case "queued":
      return "blue";
    case "processing":
      return "blue";
    case "sent":
      return "indigo";
    case "completed":
      return "green";
    case "failed":
      return "red";
    case "rejected":
      return "red";
    case "cancelled":
      return "gray";
    default:
      return "gray";
  }
}

// ============================================================================
// HELPER: Get withdrawal status label
// ============================================================================

export function getWithdrawalStatusLabel(
  status: WithdrawalStatus,
  locale: string = "en"
): string {
  const labels: Record<WithdrawalStatus, { en: string; fr: string }> = {
    pending: { en: "Pending", fr: "En attente" },
    validating: { en: "Validating", fr: "Validation" },
    approved: { en: "Approved", fr: "Approuvé" },
    queued: { en: "Queued", fr: "En file d'attente" },
    processing: { en: "Processing", fr: "En cours" },
    sent: { en: "Sent", fr: "Envoyé" },
    completed: { en: "Completed", fr: "Terminé" },
    failed: { en: "Failed", fr: "Échoué" },
    rejected: { en: "Rejected", fr: "Rejeté" },
    cancelled: { en: "Cancelled", fr: "Annulé" },
  };

  const lang = locale.startsWith("fr") ? "fr" : "en";
  return labels[status]?.[lang] || status;
}

export default usePaymentMethods;
