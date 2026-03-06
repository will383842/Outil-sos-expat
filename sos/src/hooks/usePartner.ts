/**
 * usePartner Hook
 *
 * Central hook for partner operations in the frontend.
 * Provides data, actions, and computed values for partner dashboard.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsAffiliate } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export interface Partner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoUrl?: string;
  country: string;
  language: string;

  websiteUrl: string;
  websiteName: string;
  websiteDescription?: string;
  websiteCategory: string;
  websiteTraffic?: string;

  status: 'active' | 'suspended' | 'banned';
  isVisible: boolean;
  suspensionReason?: string;

  affiliateCode: string;
  affiliateLink: string;

  commissionConfig: {
    commissionPerCallLawyer: number;
    commissionPerCallExpat: number;
    usePercentage: boolean;
    commissionPercentage?: number;
    holdPeriodDays: number;
    releaseDelayHours: number;
    minimumCallDuration: number;
  };

  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalWithdrawn: number;

  totalClicks: number;
  totalClients: number;
  totalCalls: number;
  totalCommissions: number;
  conversionRate: number;
  currentMonthStats: {
    clicks: number;
    clients: number;
    calls: number;
    earnings: number;
    month: string;
  };

  preferredPaymentMethod: string | null;
  pendingWithdrawalId: string | null;

  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName?: string;
  vatNumber?: string;

  discountConfig?: {
    isActive: boolean;
    type: 'fixed' | 'percentage';
    value: number;
    label?: string;
    maxDiscountCents?: number;
  };

  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  type: 'client_referral' | 'manual_adjustment';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'validated' | 'available' | 'paid' | 'cancelled';
  sourceDetails?: {
    clientId?: string;
    clientEmail?: string;
    callSessionId?: string;
    callDuration?: number;
    connectionFee?: number;
    providerId?: string;
    providerType?: string;
  };
  createdAt: string;
  validatedAt: string | null;
  availableAt: string | null;
  paidAt: string | null;
  cancelledAt?: string | null;
  updatedAt: string;
}

export interface PartnerNotification {
  id: string;
  partnerId: string;
  type: string;
  title: string;
  titleTranslations?: Record<string, string>;
  message: string;
  messageTranslations?: Record<string, string>;
  data?: Record<string, unknown>;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface PartnerDashboardData {
  partner: Partner;
  recentCommissions: PartnerCommission[];
  recentClicks: { date: string; count: number }[];
  monthlyStats: {
    month: string;
    clicks: number;
    clients: number;
    calls: number;
    earnings: number;
  }[];
  notifications: PartnerNotification[];
  config?: {
    minimumWithdrawalAmount?: number;
  };
}

interface UpdatePartnerProfileInput {
  phone?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  photoUrl?: string;
}

interface RequestPartnerWithdrawalInput {
  paymentMethodId: string;
  amount?: number;
}

interface RequestPartnerWithdrawalResponse {
  success: boolean;
  withdrawalId?: string;
  message: string;
}

interface UsePartnerReturn {
  // Data
  dashboardData: PartnerDashboardData | null;
  partner: Partner | null;
  commissions: PartnerCommission[];
  notifications: PartnerNotification[];

  // State
  isLoading: boolean;
  error: string | null;
  isPartner: boolean;

  // Actions
  refreshDashboard: () => Promise<void>;
  requestWithdrawal: (input: RequestPartnerWithdrawalInput) => Promise<{
    success: boolean;
    withdrawalId?: string;
    message: string;
    error?: string;
  }>;
  updateProfile: (input: UpdatePartnerProfileInput) => Promise<{
    success: boolean;
    message: string;
  }>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Computed
  affiliateLink: string;
  unreadNotificationsCount: number;
  canWithdraw: boolean;
  totalBalance: number;
}

// ============================================================================
// HOOK
// ============================================================================

export function usePartner(): UsePartnerReturn {
  const { user } = useAuth();

  // State
  const [dashboardData, setDashboardData] = useState<PartnerDashboardData | null>(null);
  const [commissions, setCommissions] = useState<PartnerCommission[]>([]);
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPartner, setIsPartner] = useState(false);

  // Extract partner from dashboard data
  const partner = useMemo(() => {
    if (!dashboardData?.partner) return null;
    return dashboardData.partner as unknown as Partner;
  }, [dashboardData]);

  // ============================================================================
  // FETCH DASHBOARD
  // ============================================================================

  const refreshDashboard = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const getPartnerDashboard = httpsCallable<unknown, PartnerDashboardData>(
        functionsAffiliate,
        'getPartnerDashboard'
      );

      const result = await getPartnerDashboard({});
      setDashboardData(result.data);
      setIsPartner(true);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'functions/not-found') {
        setIsPartner(false);
      } else {
        setError(error.message || 'Failed to load dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!user?.uid || !isPartner) return;

    // Subscribe to commissions
    const commissionsQuery = query(
      collection(db, 'partner_commissions'),
      where('partnerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubCommissions = onSnapshot(commissionsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          validatedAt: d.validatedAt?.toDate?.()?.toISOString() || null,
          availableAt: d.availableAt?.toDate?.()?.toISOString() || null,
          paidAt: d.paidAt?.toDate?.()?.toISOString() || null,
          cancelledAt: d.cancelledAt?.toDate?.()?.toISOString() || null,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as PartnerCommission;
      });
      setCommissions(data);
    }, (err) => {
      console.error('[usePartner] Commissions subscription error:', err);
    });

    // Subscribe to notifications
    const notificationsQuery = query(
      collection(db, 'partner_notifications'),
      where('partnerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          readAt: d.readAt?.toDate?.()?.toISOString() || null,
        } as PartnerNotification;
      });
      setNotifications(data);
    }, (err) => {
      console.error('[usePartner] Notifications subscription error:', err);
    });

    return () => {
      unsubCommissions();
      unsubNotifications();
    };
  }, [user?.uid, isPartner]);

  // Initial load
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const requestWithdrawal = useCallback(
    async (input: RequestPartnerWithdrawalInput): Promise<{
      success: boolean;
      withdrawalId?: string;
      message: string;
      error?: string;
    }> => {
      try {
        const partnerRequestWithdrawal = httpsCallable<
          RequestPartnerWithdrawalInput,
          RequestPartnerWithdrawalResponse
        >(functionsAffiliate, 'partnerRequestWithdrawal');

        const result = await partnerRequestWithdrawal(input);

        if (result.data.success) {
          await refreshDashboard();
        }

        return {
          success: result.data.success,
          withdrawalId: result.data.withdrawalId,
          message: result.data.message,
        };
      } catch (err: unknown) {
        const error = err as { message?: string };
        return {
          success: false,
          message: error.message || 'Failed to request withdrawal',
        };
      }
    },
    [refreshDashboard]
  );

  const updateProfile = useCallback(
    async (input: UpdatePartnerProfileInput): Promise<{
      success: boolean;
      message: string;
    }> => {
      try {
        const updatePartnerProfile = httpsCallable<
          UpdatePartnerProfileInput,
          { success: boolean; message: string }
        >(functionsAffiliate, 'updatePartnerProfile');

        const result = await updatePartnerProfile(input);

        if (result.data.success) {
          await refreshDashboard();
        }

        return result.data;
      } catch (err: unknown) {
        const error = err as { message?: string };
        return {
          success: false,
          message: error.message || 'Failed to update profile',
        };
      }
    },
    [refreshDashboard]
  );

  const markNotificationRead = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        const notificationRef = doc(db, 'partner_notifications', notificationId);
        await updateDoc(notificationRef, {
          isRead: true,
          readAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    []
  );

  const markAllNotificationsRead = useCallback(
    async (): Promise<void> => {
      if (!user?.uid) return;

      try {
        const batch = writeBatch(db);
        const now = Timestamp.now();
        const unreadNotifications = notifications.filter((n) => !n.isRead);

        if (unreadNotifications.length === 0) return;

        for (const notification of unreadNotifications) {
          const notificationRef = doc(db, 'partner_notifications', notification.id);
          batch.update(notificationRef, {
            isRead: true,
            readAt: now,
          });
        }

        await batch.commit();
      } catch (err) {
        console.error('[usePartner] Failed to mark all notifications as read:', err);
      }
    },
    [user?.uid, notifications]
  );

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const affiliateLink = useMemo(() => {
    if (!partner?.affiliateLink) return '';
    return partner.affiliateLink;
  }, [partner?.affiliateLink]);

  const canWithdraw = useMemo(() => {
    if (!partner) return false;
    return (
      partner.availableBalance >= 3000 &&
      !partner.pendingWithdrawalId &&
      partner.status === 'active'
    );
  }, [partner]);

  const totalBalance = useMemo(() => {
    if (!partner) return 0;
    return partner.availableBalance + partner.pendingBalance + partner.validatedBalance;
  }, [partner]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    dashboardData,
    partner,
    commissions,
    notifications,

    // State
    isLoading,
    error,
    isPartner,

    // Actions
    refreshDashboard,
    requestWithdrawal,
    updateProfile,
    markNotificationRead,
    markAllNotificationsRead,

    // Computed
    affiliateLink,
    unreadNotificationsCount,
    canWithdraw,
    totalBalance,
  };
}

export default usePartner;
