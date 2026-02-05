/**
 * Hook to subscribe to real-time provider status updates
 */
import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  documentId,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import type { AvailabilityStatus } from '../types';

interface ProviderStatus {
  id: string;
  availability: AvailabilityStatus;
  isOnline: boolean;
  lastUpdate: Date;
}

interface UseRealtimeStatusResult {
  statuses: Map<string, ProviderStatus>;
  getStatus: (providerId: string) => ProviderStatus | undefined;
  isConnected: boolean;
}

export function useRealtimeStatus(): UseRealtimeStatusResult {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Map<string, ProviderStatus>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.linkedProviderIds?.length) {
      setStatuses(new Map());
      setIsConnected(false);
      return;
    }

    // Firestore 'in' queries support max 30 items
    const providerIds = user.linkedProviderIds.slice(0, 30);

    const q = query(
      collection(db, 'sos_profiles'),
      where(documentId(), 'in', providerIds)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newStatuses = new Map<string, ProviderStatus>();

        snapshot.forEach((doc) => {
          const data = doc.data();
          newStatuses.set(doc.id, {
            id: doc.id,
            availability: data.availability || 'offline',
            isOnline: data.isOnline ?? false,
            lastUpdate: new Date(),
          });
        });

        setStatuses(newStatuses);
        setIsConnected(true);
      },
      (error) => {
        console.error('Status subscription error:', error);
        setIsConnected(false);
      }
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [user?.linkedProviderIds]);

  const getStatus = useCallback(
    (providerId: string) => statuses.get(providerId),
    [statuses]
  );

  return {
    statuses,
    getStatus,
    isConnected,
  };
}

export default useRealtimeStatus;
