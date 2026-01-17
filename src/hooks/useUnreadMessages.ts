/**
 * =============================================================================
 * USE UNREAD MESSAGES - Hook pour compter les messages non lus
 * =============================================================================
 *
 * Fournit un compteur en temps réel des messages non lus pour l'utilisateur.
 * Utilisé principalement pour les badges de notification dans la navigation.
 *
 * @example
 * const { unreadCount, hasUnread, markAsRead } = useUnreadMessages();
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useProvider } from '@/contexts/UnifiedUserContext';

// =============================================================================
// TYPES
// =============================================================================

export interface UnreadMessagesResult {
  /** Nombre de messages non lus */
  unreadCount: number;
  /** Y a-t-il des messages non lus ? */
  hasUnread: boolean;
  /** Chargement en cours */
  loading: boolean;
  /** Erreur éventuelle */
  error: Error | null;
  /** Forcer le refresh */
  refresh: () => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook pour suivre les messages non lus en temps réel
 */
export function useUnreadMessages(): UnreadMessagesResult {
  const { activeProvider } = useProvider();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Forcer un refresh
  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!activeProvider?.id) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Query pour les conversations avec des messages non lus
    // On cherche les conversations du provider avec hasUnreadMessages = true
    const conversationsRef = collection(db, 'conversations');
    const unreadQuery = query(
      conversationsRef,
      where('providerId', '==', activeProvider.id),
      where('hasUnreadMessages', '==', true)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        // Chaque conversation avec hasUnreadMessages = true compte comme 1
        // On pourrait aussi compter le nombre total de messages non lus
        setUnreadCount(snapshot.size);
        setLoading(false);
      },
      (err) => {
        console.error('[useUnreadMessages] Erreur:', err);
        setError(err as Error);
        setLoading(false);
        // En cas d'erreur, on met à 0 plutôt que de laisser un mauvais compteur
        setUnreadCount(0);
      }
    );

    return () => unsubscribe();
  }, [activeProvider?.id, refreshKey]);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    loading,
    error,
    refresh,
  };
}

// =============================================================================
// HOOK ALTERNATIF - Basé sur les bookings récents
// =============================================================================

/**
 * Hook alternatif qui compte les bookings avec de nouvelles réponses IA
 * Utile si la structure de données ne supporte pas hasUnreadMessages
 */
export function useNewAIResponses(): UnreadMessagesResult {
  const { activeProvider } = useProvider();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!activeProvider?.id) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Query pour les bookings actifs (non expirés) avec réponse IA
    const now = Timestamp.now();
    const bookingsRef = collection(db, 'bookings');
    const activeBookingsQuery = query(
      bookingsRef,
      where('providerId', '==', activeProvider.id),
      where('status', 'in', ['pending', 'in_progress']),
      where('aiProcessed', '==', true)
    );

    const unsubscribe = onSnapshot(
      activeBookingsQuery,
      (snapshot) => {
        // Compter les bookings non expirés
        const activeCount = snapshot.docs.filter((doc) => {
          const data = doc.data();
          if (!data.aiProcessedAt) return false;

          const providerType = data.providerType || 'lawyer';
          const durationMinutes = providerType === 'lawyer' ? 25 : 35;
          const expirationTime =
            data.aiProcessedAt.toMillis() + durationMinutes * 60 * 1000;

          return Date.now() < expirationTime;
        }).length;

        setUnreadCount(activeCount);
        setLoading(false);
      },
      (err) => {
        console.error('[useNewAIResponses] Erreur:', err);
        setError(err as Error);
        setLoading(false);
        setUnreadCount(0);
      }
    );

    return () => unsubscribe();
  }, [activeProvider?.id, refreshKey]);

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    loading,
    error,
    refresh,
  };
}

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

export default useUnreadMessages;
