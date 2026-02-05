/**
 * Hook for real-time booking requests
 * Uses Firestore onSnapshot for live updates + browser notifications
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { classifyBooking, FIVE_MINUTES, type BookingRequest } from '../types';

interface UseBookingRequestsResult {
  bookings: BookingRequest[];
  newBookings: BookingRequest[];
  activeBookings: BookingRequest[];
  historyBookings: BookingRequest[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;
}

/** Convert Firestore Timestamp or object to Date */
function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as Timestamp).toDate();
  }
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') return new Date(val);
  return new Date();
}

/** Play a short notification beep using Web Audio API */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);

    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.7);
  } catch {
    // Audio not available — ignore
  }
}

/** Request browser notification permission */
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/** Show browser notification */
function showBrowserNotification(booking: BookingRequest) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Nouvelle demande SOS-Expat!', {
      body: `${booking.clientName} — ${booking.serviceType}`,
      icon: '/icons/icon-192x192.png',
      requireInteraction: true,
    });
  }
}

export function useBookingRequests(): UseBookingRequestsResult {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track known booking IDs so we only notify for truly new ones
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Re-classify bookings periodically (new → active after 5 min)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Firestore real-time listener
  useEffect(() => {
    if (!user?.linkedProviderIds?.length) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Firestore 'in' queries support max 30 items — batch into chunks
    const allIds = user.linkedProviderIds;
    const chunks: string[][] = [];
    for (let i = 0; i < allIds.length; i += 30) {
      chunks.push(allIds.slice(i, i + 30));
    }

    const bookingMap = new Map<string, BookingRequest>();
    let loadedChunks = 0;

    function parseBooking(doc: { id: string; data: () => Record<string, unknown> }): BookingRequest {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        providerId: (data.providerId as string) || '',
        providerName: data.providerName as string | undefined,
        providerType: data.providerType as BookingRequest['providerType'],
        clientId: (data.clientId as string) || '',
        clientName: (data.clientName as string) || 'Client inconnu',
        clientEmail: data.clientEmail as string | undefined,
        clientPhone: data.clientPhone as string | undefined,
        clientWhatsapp: data.clientWhatsapp as string | undefined,
        clientCurrentCountry: data.clientCurrentCountry as string | undefined,
        clientNationality: data.clientNationality as string | undefined,
        clientLanguages: data.clientLanguages as string[] | undefined,
        serviceType: (data.serviceType as string) || 'other',
        title: data.title as string | undefined,
        description: (data.description as string) || '',
        status: (data.status as BookingRequest['status']) || 'pending',
        createdAt: toDate(data.createdAt),
        updatedAt: data.updatedAt ? toDate(data.updatedAt) : undefined,
        aiResponse: data.aiResponse
          ? {
              content: (data.aiResponse as Record<string, unknown>).content as string || '',
              generatedAt: toDate((data.aiResponse as Record<string, unknown>).generatedAt),
              model: (data.aiResponse as Record<string, unknown>).model as string || '',
              tokensUsed: (data.aiResponse as Record<string, unknown>).tokensUsed as number | undefined,
              source: (data.aiResponse as Record<string, unknown>).source as string || '',
            }
          : undefined,
        aiProcessedAt: data.aiProcessedAt ? toDate(data.aiProcessedAt) : undefined,
        aiError: data.aiError as string | undefined,
      };
    }

    function onAllChunksLoaded() {
      const list = Array.from(bookingMap.values());
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Detect new bookings for notifications (skip first load)
      if (!isFirstLoadRef.current) {
        const now = Date.now();
        for (const b of list) {
          if (
            !knownIdsRef.current.has(b.id) &&
            b.status === 'pending' &&
            now - b.createdAt.getTime() < FIVE_MINUTES
          ) {
            playNotificationSound();
            showBrowserNotification(b);
            break; // Only one notification per batch
          }
        }
      }
      isFirstLoadRef.current = false;

      knownIdsRef.current = new Set(list.map((b) => b.id));
      setBookings(list);
      setIsLoading(false);
    }

    const unsubscribes = chunks.map((chunk) => {
      const q = query(
        collection(db, 'booking_requests'),
        where('providerId', 'in', chunk),
        orderBy('createdAt', 'desc'),
        limit(200)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          // Clear previous entries for this chunk's providers
          for (const pid of chunk) {
            for (const [bid, b] of bookingMap) {
              if (b.providerId === pid) bookingMap.delete(bid);
            }
          }

          snapshot.forEach((doc) => {
            bookingMap.set(doc.id, parseBooking(doc));
          });

          loadedChunks++;
          if (loadedChunks >= chunks.length) {
            onAllChunksLoaded();
          }
        },
        (err) => {
          console.error('Error fetching booking requests:', err);
          setError('Erreur lors du chargement des demandes');
          setIsLoading(false);
        }
      );
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [user?.linkedProviderIds]);

  const classified = useMemo(() => {
    const newB: BookingRequest[] = [];
    const activeB: BookingRequest[] = [];
    const historyB: BookingRequest[] = [];

    for (const b of bookings) {
      const cat = classifyBooking(b);
      if (cat === 'new') newB.push(b);
      else if (cat === 'active') activeB.push(b);
      else historyB.push(b);
    }

    return { newB, activeB, historyB };
  }, [bookings]);

  const pendingCount = useMemo(
    () => classified.newB.length + classified.activeB.length,
    [classified]
  );

  return {
    bookings,
    newBookings: classified.newB,
    activeBookings: classified.activeB,
    historyBookings: classified.historyB,
    pendingCount,
    isLoading,
    error,
  };
}

export default useBookingRequests;
