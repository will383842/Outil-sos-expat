/**
 * useUnifiedAffiliate — Hook for the unified affiliate dashboard (Phase 8)
 *
 * Fetches the user's commission plan and unified affiliate code.
 * Works alongside existing role-specific hooks (useAffiliate, useChatter, etc.)
 * by reading from the unified commission plan system.
 */

import { useState, useEffect, useCallback } from "react";
import { getFirestore, doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../contexts/AuthContext";
import { functionsPayment } from "../config/firebase";

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedCommissionRate {
  type: string;       // e.g. "client_call", "recruitment_call"
  fixedAmount?: number; // cents
  percentage?: number;
  enabled: boolean;
  label?: string;
}

export interface UnifiedPlanInfo {
  planId: string;
  planName: string;
  role: string;
  rates: UnifiedCommissionRate[];
  discount?: {
    type: "fixed" | "percentage";
    value: number;
    label?: string;
    enabled: boolean;
  };
  lockedRates?: Record<string, { fixedAmount?: number; percentage?: number }>;
}

export interface UnifiedCommission {
  id: string;
  type: string;
  subType?: string;
  amount: number;     // cents
  status: string;
  referrerId: string;
  sourceId: string;
  createdAt: string;  // ISO
  availableAt?: string;
}

export interface UnifiedReferral {
  id: string;
  userId: string;
  email?: string;
  firstName?: string;
  role?: string;
  registeredAt: string;
  totalCommissions: number; // cents
}

export interface UnifiedAffiliateData {
  affiliateCode: string | null;
  planInfo: UnifiedPlanInfo | null;
  commissions: UnifiedCommission[];
  referrals: UnifiedReferral[];
  balance: {
    available: number;
    pending: number;
    totalEarned: number;
  };
  isLoading: boolean;
  error: string | null;
  refreshPlan: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useUnifiedAffiliate(): UnifiedAffiliateData {
  const { user } = useAuth();
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<UnifiedPlanInfo | null>(null);
  const [commissions, setCommissions] = useState<UnifiedCommission[]>([]);
  const [referrals, setReferrals] = useState<UnifiedReferral[]>([]);
  const [balance, setBalance] = useState({ available: 0, pending: 0, totalEarned: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = getFirestore();

  // Fetch user's affiliate code + lockedRates from user doc
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAffiliateCode(
          data.affiliateCode || data.affiliateCodeClient || null
        );

        // Read lockedRates if available (set at registration from plan)
        if (data.lockedRates) {
          const rates: UnifiedCommissionRate[] = Object.entries(
            data.lockedRates as Record<string, { fixedAmount?: number; percentage?: number }>
          ).map(([type, r]) => ({
            type,
            fixedAmount: r.fixedAmount,
            percentage: r.percentage,
            enabled: true,
          }));

          setPlanInfo((prev) => prev ? { ...prev, rates, lockedRates: data.lockedRates } : {
            planId: data.commissionPlanId || "default",
            planName: data.commissionPlanId || "Default",
            role: data.role || data.affiliateRole || "affiliate",
            rates,
            lockedRates: data.lockedRates,
          });
        }

        // Balance from user doc
        setBalance({
          available: data.availableBalance || data.tirelire || 0,
          pending: data.pendingBalance || 0,
          totalEarned: data.totalEarned || data.totalCommissions || 0,
        });
      }
      setIsLoading(false);
    }, (err) => {
      setError(err.message);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user?.uid, db]);

  // Subscribe to unified commissions
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "unified_commissions"),
      where("referrerId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      setCommissions(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data.type || "",
          subType: data.subType,
          amount: data.amount || 0,
          status: data.status || "pending",
          referrerId: data.referrerId || "",
          sourceId: data.sourceId || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          availableAt: data.availableAt?.toDate?.()?.toISOString(),
        };
      }));
    }, () => {
      // Collection may not exist yet (shadow mode) — silently ignore
    });

    return () => unsub();
  }, [user?.uid, db]);

  // Subscribe to referrals (users referred by this affiliate)
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "users"),
      where("referredByUserId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setReferrals(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: d.id,
          email: data.email,
          firstName: data.firstName || data.name,
          role: data.role,
          registeredAt: data.createdAt?.toDate?.()?.toISOString() || "",
          totalCommissions: 0, // computed separately if needed
        };
      }));
    }, () => {
      // May fail due to security rules — non-critical
    });

    return () => unsub();
  }, [user?.uid, db]);

  // Fetch full plan details from backend
  const refreshPlan = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const getMyPlanFn = httpsCallable<void, UnifiedPlanInfo>(
        functionsPayment,
        "getMyCommissionPlan"
      );
      const result = await getMyPlanFn();
      setPlanInfo(result.data);
    } catch {
      // Callable may not be deployed yet — use lockedRates from user doc
    }
  }, [user?.uid]);

  return {
    affiliateCode,
    planInfo,
    commissions,
    referrals,
    balance,
    isLoading,
    error,
    refreshPlan,
  };
}
