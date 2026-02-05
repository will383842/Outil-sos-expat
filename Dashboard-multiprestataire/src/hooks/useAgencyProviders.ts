/**
 * Hook to fetch and manage agency providers
 * Uses the linkedProviderIds from the agency manager's user document
 */
import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  documentId,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { normalizeProvider, type Provider, type ProviderSummary, toProviderSummary } from '../types';

interface UseAgencyProvidersResult {
  providers: Provider[];
  summaries: ProviderSummary[];
  isLoading: boolean;
  error: string | null;
  activeCount: number;
  onlineCount: number;
}

export function useAgencyProviders(): UseAgencyProvidersResult {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.linkedProviderIds?.length) {
      setProviders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Firestore 'in' queries support max 30 items
    // For larger teams, we'd need to batch queries
    const providerIds = user.linkedProviderIds.slice(0, 30);

    const q = query(
      collection(db, 'sos_profiles'),
      where(documentId(), 'in', providerIds)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const providerList: Provider[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          providerList.push(normalizeProvider({ ...data, id: doc.id }));
        });

        // Sort by name
        providerList.sort((a, b) => a.name.localeCompare(b.name));

        setProviders(providerList);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching providers:', err);
        setError('Erreur lors du chargement des prestataires');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.linkedProviderIds]);

  const summaries = useMemo(
    () => providers.map(toProviderSummary),
    [providers]
  );

  const activeCount = useMemo(
    () => providers.filter((p) => p.isActive).length,
    [providers]
  );

  const onlineCount = useMemo(
    () => providers.filter((p) => p.isOnline).length,
    [providers]
  );

  return {
    providers,
    summaries,
    isLoading,
    error,
    activeCount,
    onlineCount,
  };
}

export default useAgencyProviders;
