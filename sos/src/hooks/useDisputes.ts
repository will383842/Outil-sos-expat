// src/hooks/useDisputes.ts
// Custom hook for disputes collection queries and management
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
// P0 FIX: Import unified DisputeStatus from finance types
import { DisputeStatus } from '../types/finance';

// =============================================================================
// TYPES
// =============================================================================

// Re-export DisputeStatus for backward compatibility
export type { DisputeStatus };
export type PaymentMethod = 'stripe' | 'paypal';
export type UrgencyLevel = 'urgent' | 'medium' | 'normal';
export type DisputeEventType = 'created' | 'evidence_submitted' | 'status_changed' | 'note_added' | 'response_received';

export interface DisputeEvent {
  id: string;
  type: DisputeEventType;
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

export interface DisputeEvidence {
  id: string;
  type: 'document' | 'text' | 'call_recording' | 'communication_log';
  name: string;
  description?: string;
  fileUrl?: string;
  textContent?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface DisputeNote {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
}

export interface Dispute {
  id: string;
  paymentId: string;
  stripeDisputeId?: string;
  paypalDisputeId?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  status: DisputeStatus;
  reason: string;
  reasonCode: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  providerId?: string;
  providerName?: string;
  callSessionId?: string;
  createdAt: Date;
  dueDate: Date;
  resolvedAt?: Date;
  evidenceSubmitted: boolean;
  evidence: DisputeEvidence[];
  notes: DisputeNote[];
  timeline: DisputeEvent[];
}

export interface DisputeStats {
  openCount: number;
  underReviewCount: number;
  amountAtRisk: number;
  responseDueSoon: number;
  winRate: number;
  totalWon: number;
  totalLost: number;
  totalAccepted: number;
  averageResolutionDays: number;
}

export interface DisputeFilters {
  status?: DisputeStatus | 'all';
  paymentMethod?: PaymentMethod | 'all';
  urgency?: UrgencyLevel | 'all';
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  providerId?: string;
}

export interface CreateDisputeInput {
  paymentId: string;
  stripeDisputeId?: string;
  paypalDisputeId?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  reason: string;
  reasonCode: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  providerId?: string;
  providerName?: string;
  callSessionId?: string;
  dueDate: Date;
}

export interface SubmitEvidenceInput {
  type: DisputeEvidence['type'];
  name: string;
  description?: string;
  textContent?: string;
  file?: File;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const toDate = (val: unknown): Date => {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  return new Date();
};

const mapDocToDispute = (docSnap: QueryDocumentSnapshot<DocumentData>): Dispute => {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    paymentId: data.paymentId || '',
    stripeDisputeId: data.stripeDisputeId,
    paypalDisputeId: data.paypalDisputeId,
    paymentMethod: data.paymentMethod || 'stripe',
    amount: data.amount || 0,
    currency: data.currency || 'EUR',
    status: data.status || 'open',
    reason: data.reason || 'general',
    reasonCode: data.reasonCode || '',
    clientId: data.clientId || '',
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    providerId: data.providerId,
    providerName: data.providerName,
    callSessionId: data.callSessionId,
    createdAt: toDate(data.createdAt),
    dueDate: toDate(data.dueDate),
    resolvedAt: data.resolvedAt ? toDate(data.resolvedAt) : undefined,
    evidenceSubmitted: data.evidenceSubmitted || false,
    evidence: (data.evidence || []).map((e: Record<string, unknown>) => ({
      id: e.id as string || '',
      type: e.type as DisputeEvidence['type'] || 'document',
      name: e.name as string || '',
      description: e.description as string,
      fileUrl: e.fileUrl as string,
      textContent: e.textContent as string,
      uploadedAt: toDate(e.uploadedAt),
      uploadedBy: e.uploadedBy as string || '',
    })),
    notes: (data.notes || []).map((n: Record<string, unknown>) => ({
      id: n.id as string || '',
      content: n.content as string || '',
      createdAt: toDate(n.createdAt),
      createdBy: n.createdBy as string || '',
      createdByName: n.createdByName as string,
    })),
    timeline: (data.timeline || []).map((t: Record<string, unknown>) => ({
      id: t.id as string || '',
      type: t.type as DisputeEventType || 'created',
      description: t.description as string || '',
      timestamp: toDate(t.timestamp),
      userId: t.userId as string,
      userName: t.userName as string,
      metadata: t.metadata as Record<string, unknown>,
    })),
  };
};

export const getUrgencyLevel = (dueDate: Date): UrgencyLevel => {
  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue <= 48) return 'urgent';
  if (hoursUntilDue <= 168) return 'medium'; // 7 days
  return 'normal';
};

export const formatTimeRemaining = (dueDate: Date): string => {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();

  if (diff < 0) return 'Overdue';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

// =============================================================================
// MAIN HOOK
// =============================================================================

interface UseDisputesOptions {
  pageSize?: number;
  realtime?: boolean;
  filters?: DisputeFilters;
}

interface UseDisputesReturn {
  disputes: Dispute[];
  stats: DisputeStats;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;

  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // CRUD Operations
  getDispute: (id: string) => Promise<Dispute | null>;
  createDispute: (input: CreateDisputeInput) => Promise<string>;
  updateDisputeStatus: (id: string, status: DisputeStatus, userId?: string, userName?: string) => Promise<void>;
  submitEvidence: (disputeId: string, evidence: SubmitEvidenceInput[], userId?: string, userName?: string) => Promise<void>;
  addNote: (disputeId: string, content: string, userId?: string, userName?: string) => Promise<void>;
  acceptDispute: (disputeId: string, userId?: string, userName?: string) => Promise<void>;

  // Queries
  getDisputesByClient: (clientId: string) => Promise<Dispute[]>;
  getDisputesByProvider: (providerId: string) => Promise<Dispute[]>;
  getDisputesByPayment: (paymentId: string) => Promise<Dispute[]>;
  getUrgentDisputes: () => Promise<Dispute[]>;
}

export function useDisputes(options: UseDisputesOptions = {}): UseDisputesReturn {
  const { pageSize = 25, realtime = false, filters = {} } = options;

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats>({
    openCount: 0,
    underReviewCount: 0,
    amountAtRisk: 0,
    responseDueSoon: 0,
    winRate: 0,
    totalWon: 0,
    totalLost: 0,
    totalAccepted: 0,
    averageResolutionDays: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Calculate stats from disputes
  const calculateStats = useCallback((disputeList: Dispute[]): DisputeStats => {
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const openDisputes = disputeList.filter(d => d.status === 'open');
    const underReviewDisputes = disputeList.filter(d => d.status === 'under_review');
    const activeDisputes = [...openDisputes, ...underReviewDisputes];

    const openCount = openDisputes.length;
    const underReviewCount = underReviewDisputes.length;
    const amountAtRisk = activeDisputes.reduce((sum, d) => sum + d.amount, 0);
    const responseDueSoon = activeDisputes.filter(d => d.dueDate <= fortyEightHoursFromNow).length;

    const resolved = disputeList.filter(d => d.status === 'won' || d.status === 'lost' || d.status === 'accepted');
    const totalWon = resolved.filter(d => d.status === 'won').length;
    const totalLost = resolved.filter(d => d.status === 'lost').length;
    const totalAccepted = resolved.filter(d => d.status === 'accepted').length;
    const winRate = resolved.length > 0 ? (totalWon / resolved.length) * 100 : 0;

    // Calculate average resolution time
    const resolvedWithDates = resolved.filter(d => d.resolvedAt);
    const totalResolutionDays = resolvedWithDates.reduce((sum, d) => {
      const days = (d.resolvedAt!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    const averageResolutionDays = resolvedWithDates.length > 0
      ? totalResolutionDays / resolvedWithDates.length
      : 0;

    return {
      openCount,
      underReviewCount,
      amountAtRisk,
      responseDueSoon,
      winRate,
      totalWon,
      totalLost,
      totalAccepted,
      averageResolutionDays,
    };
  }, []);

  // Build query constraints based on filters
  const buildQueryConstraints = useCallback(() => {
    const constraints: Parameters<typeof query>[1][] = [];

    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      constraints.push(where('paymentMethod', '==', filters.paymentMethod));
    }

    if (filters.clientId) {
      constraints.push(where('clientId', '==', filters.clientId));
    }

    if (filters.providerId) {
      constraints.push(where('providerId', '==', filters.providerId));
    }

    if (filters.startDate) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(endDate)));
    }

    // Sort by due date (urgent first)
    constraints.push(orderBy('dueDate', 'asc'));

    return constraints;
  }, [filters]);

  // Fetch disputes
  const fetchDisputes = useCallback(async (reset = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const colRef = collection(db, 'disputes');
      const constraints = buildQueryConstraints();

      if (!reset && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      constraints.push(limit(pageSize));

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      let items = snap.docs.map(mapDocToDispute);

      // Apply urgency filter locally
      if (filters.urgency && filters.urgency !== 'all') {
        items = items.filter(d => getUrgencyLevel(d.dueDate) === filters.urgency);
      }

      setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
      setHasMore(snap.docs.length === pageSize);

      if (reset) {
        setDisputes(items);
        setStats(calculateStats(items));
      } else {
        setDisputes(prev => {
          const allDisputes = [...prev, ...items];
          setStats(calculateStats(allDisputes));
          return allDisputes;
        });
      }
    } catch (err) {
      console.error('Error fetching disputes:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch disputes'));
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryConstraints, lastDoc, pageSize, filters.urgency, calculateStats]);

  // Set up realtime listener
  useEffect(() => {
    if (!realtime) {
      void fetchDisputes(true);
      return;
    }

    setIsLoading(true);
    const colRef = collection(db, 'disputes');
    const constraints = buildQueryConstraints();
    constraints.push(limit(pageSize));

    const q = query(colRef, ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        let items = snap.docs.map(mapDocToDispute);

        if (filters.urgency && filters.urgency !== 'all') {
          items = items.filter(d => getUrgencyLevel(d.dueDate) === filters.urgency);
        }

        setDisputes(items);
        setStats(calculateStats(items));
        setIsLoading(false);
        setHasMore(snap.docs.length === pageSize);
        setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
      },
      (err) => {
        console.error('Realtime dispute error:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [realtime, buildQueryConstraints, pageSize, filters.urgency, calculateStats]);

  // Load more
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchDisputes(false);
  }, [hasMore, isLoading, fetchDisputes]);

  // Refresh
  const refresh = useCallback(async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchDisputes(true);
  }, [fetchDisputes]);

  // Get single dispute
  const getDispute = useCallback(async (id: string): Promise<Dispute | null> => {
    try {
      const docRef = doc(db, 'disputes', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return mapDocToDispute(docSnap as QueryDocumentSnapshot<DocumentData>);
    } catch (err) {
      console.error('Error fetching dispute:', err);
      return null;
    }
  }, []);

  // Create dispute
  const createDispute = useCallback(async (input: CreateDisputeInput): Promise<string> => {
    const now = new Date();
    const initialEvent: DisputeEvent = {
      id: `evt_${Date.now()}`,
      type: 'created',
      description: 'Dispute created',
      timestamp: now,
    };

    const disputeData = {
      ...input,
      status: 'open' as DisputeStatus,
      evidenceSubmitted: false,
      evidence: [],
      notes: [],
      timeline: [initialEvent],
      createdAt: serverTimestamp(),
      dueDate: Timestamp.fromDate(input.dueDate),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'disputes'), disputeData);
    return docRef.id;
  }, []);

  // Update dispute status
  const updateDisputeStatus = useCallback(async (
    id: string,
    status: DisputeStatus,
    userId?: string,
    userName?: string
  ): Promise<void> => {
    const disputeRef = doc(db, 'disputes', id);
    const dispute = await getDispute(id);
    if (!dispute) throw new Error('Dispute not found');

    const newEvent: DisputeEvent = {
      id: `evt_${Date.now()}`,
      type: 'status_changed',
      description: `Status changed to ${status}`,
      timestamp: new Date(),
      userId,
      userName,
    };

    const updateData: Record<string, unknown> = {
      status,
      timeline: [...dispute.timeline, newEvent],
      updatedAt: serverTimestamp(),
    };

    if (status === 'won' || status === 'lost' || status === 'accepted') {
      updateData.resolvedAt = serverTimestamp();
    }

    await updateDoc(disputeRef, updateData);
  }, [getDispute]);

  // Submit evidence
  const submitEvidence = useCallback(async (
    disputeId: string,
    evidenceInputs: SubmitEvidenceInput[],
    userId?: string,
    userName?: string
  ): Promise<void> => {
    const dispute = await getDispute(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    const newEvidence: DisputeEvidence[] = [];

    for (const input of evidenceInputs) {
      const evidence: DisputeEvidence = {
        id: `ev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        type: input.type,
        name: input.name,
        description: input.description,
        textContent: input.textContent,
        uploadedAt: new Date(),
        uploadedBy: userId || 'system',
      };

      // Upload file if provided
      if (input.file) {
        const storageRef = ref(storage, `disputes/${disputeId}/evidence/${Date.now()}_${input.file.name}`);
        await uploadBytes(storageRef, input.file);
        evidence.fileUrl = await getDownloadURL(storageRef);
      }

      newEvidence.push(evidence);
    }

    const newEvent: DisputeEvent = {
      id: `evt_${Date.now()}`,
      type: 'evidence_submitted',
      description: `Evidence submitted: ${newEvidence.length} item(s)`,
      timestamp: new Date(),
      userId,
      userName,
    };

    await updateDoc(doc(db, 'disputes', disputeId), {
      evidence: [...dispute.evidence, ...newEvidence],
      evidenceSubmitted: true,
      timeline: [...dispute.timeline, newEvent],
      updatedAt: serverTimestamp(),
    });
  }, [getDispute]);

  // Add note
  const addNote = useCallback(async (
    disputeId: string,
    content: string,
    userId?: string,
    userName?: string
  ): Promise<void> => {
    const dispute = await getDispute(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    const newNote: DisputeNote = {
      id: `note_${Date.now()}`,
      content,
      createdAt: new Date(),
      createdBy: userId || 'system',
      createdByName: userName,
    };

    const newEvent: DisputeEvent = {
      id: `evt_${Date.now()}`,
      type: 'note_added',
      description: 'Internal note added',
      timestamp: new Date(),
      userId,
      userName,
    };

    await updateDoc(doc(db, 'disputes', disputeId), {
      notes: [...dispute.notes, newNote],
      timeline: [...dispute.timeline, newEvent],
      updatedAt: serverTimestamp(),
    });
  }, [getDispute]);

  // Accept dispute (concede)
  const acceptDispute = useCallback(async (
    disputeId: string,
    userId?: string,
    userName?: string
  ): Promise<void> => {
    await updateDisputeStatus(disputeId, 'accepted', userId, userName);
  }, [updateDisputeStatus]);

  // Get disputes by client
  const getDisputesByClient = useCallback(async (clientId: string): Promise<Dispute[]> => {
    const q = query(
      collection(db, 'disputes'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDocToDispute);
  }, []);

  // Get disputes by provider
  const getDisputesByProvider = useCallback(async (providerId: string): Promise<Dispute[]> => {
    const q = query(
      collection(db, 'disputes'),
      where('providerId', '==', providerId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDocToDispute);
  }, []);

  // Get disputes by payment
  const getDisputesByPayment = useCallback(async (paymentId: string): Promise<Dispute[]> => {
    const q = query(
      collection(db, 'disputes'),
      where('paymentId', '==', paymentId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDocToDispute);
  }, []);

  // Get urgent disputes
  const getUrgentDisputes = useCallback(async (): Promise<Dispute[]> => {
    const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const q = query(
      collection(db, 'disputes'),
      where('status', 'in', ['open', 'under_review']),
      where('dueDate', '<=', Timestamp.fromDate(fortyEightHoursFromNow)),
      orderBy('dueDate', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDocToDispute);
  }, []);

  return {
    disputes,
    stats,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    getDispute,
    createDispute,
    updateDisputeStatus,
    submitEvidence,
    addNote,
    acceptDispute,
    getDisputesByClient,
    getDisputesByProvider,
    getDisputesByPayment,
    getUrgentDisputes,
  };
}

// =============================================================================
// ADDITIONAL UTILITY HOOKS
// =============================================================================

/**
 * Hook to get dispute statistics only (lightweight)
 */
export function useDisputeStats(): { stats: DisputeStats; isLoading: boolean; error: Error | null; refresh: () => Promise<void> } {
  const [stats, setStats] = useState<DisputeStats>({
    openCount: 0,
    underReviewCount: 0,
    amountAtRisk: 0,
    responseDueSoon: 0,
    winRate: 0,
    totalWon: 0,
    totalLost: 0,
    totalAccepted: 0,
    averageResolutionDays: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all disputes for stats calculation
      const q = query(collection(db, 'disputes'));
      const snap = await getDocs(q);
      const disputes = snap.docs.map(mapDocToDispute);

      const now = new Date();
      const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const openDisputes = disputes.filter(d => d.status === 'open');
      const underReviewDisputes = disputes.filter(d => d.status === 'under_review');
      const activeDisputes = [...openDisputes, ...underReviewDisputes];

      const resolved = disputes.filter(d => d.status === 'won' || d.status === 'lost' || d.status === 'accepted');
      const totalWon = resolved.filter(d => d.status === 'won').length;
      const totalLost = resolved.filter(d => d.status === 'lost').length;
      const totalAccepted = resolved.filter(d => d.status === 'accepted').length;

      const resolvedWithDates = resolved.filter(d => d.resolvedAt);
      const totalResolutionDays = resolvedWithDates.reduce((sum, d) => {
        const days = (d.resolvedAt!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);

      setStats({
        openCount: openDisputes.length,
        underReviewCount: underReviewDisputes.length,
        amountAtRisk: activeDisputes.reduce((sum, d) => sum + d.amount, 0),
        responseDueSoon: activeDisputes.filter(d => d.dueDate <= fortyEightHoursFromNow).length,
        winRate: resolved.length > 0 ? (totalWon / resolved.length) * 100 : 0,
        totalWon,
        totalLost,
        totalAccepted,
        averageResolutionDays: resolvedWithDates.length > 0 ? totalResolutionDays / resolvedWithDates.length : 0,
      });
    } catch (err) {
      console.error('Error fetching dispute stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refresh: fetchStats };
}

/**
 * Hook for realtime urgent disputes notifications
 */
export function useUrgentDisputesAlert(onNewUrgent?: (dispute: Dispute) => void): {
  urgentCount: number;
  urgentDisputes: Dispute[];
} {
  const [urgentDisputes, setUrgentDisputes] = useState<Dispute[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fortyEightHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const q = query(
      collection(db, 'disputes'),
      where('status', 'in', ['open', 'under_review']),
      where('dueDate', '<=', Timestamp.fromDate(fortyEightHoursFromNow)),
      orderBy('dueDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const disputes = snap.docs.map(mapDocToDispute);
      setUrgentDisputes(disputes);

      // Check for new urgent disputes
      if (onNewUrgent) {
        disputes.forEach(d => {
          if (!seenIds.has(d.id)) {
            onNewUrgent(d);
          }
        });
      }

      setSeenIds(new Set(disputes.map(d => d.id)));
    });

    return () => unsubscribe();
  }, [onNewUrgent, seenIds]);

  return {
    urgentCount: urgentDisputes.length,
    urgentDisputes,
  };
}

export default useDisputes;
