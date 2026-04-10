/**
 * Hook to fetch conversation history from Outil-sos-expat backend.
 * Calls getProviderConversations cloud function with Firebase ID token auth.
 */
import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { outilFunctions, auth } from '../config/firebase';

// =============================================================================
// TYPES
// =============================================================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  createdAt: string;
  model?: string;
}

export interface Conversation {
  id: string;
  providerId: string;
  providerType?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
  messages: ConversationMessage[];
  bookingContext?: {
    clientName?: string;
    country?: string;
    category?: string;
  };
}

interface GetConversationsResponse {
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useProviderConversations(providerId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!providerId) return;

    const user = auth.currentUser;
    if (!user) {
      setError('Non connecté');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const firebaseIdToken = await user.getIdToken();

      const fn = httpsCallable<
        { firebaseIdToken: string; providerId: string; limit?: number },
        GetConversationsResponse
      >(outilFunctions, 'getProviderConversations');

      const result = await fn({
        firebaseIdToken,
        providerId,
        limit: 10,
      });

      if (result.data.success && result.data.conversations) {
        setConversations(result.data.conversations);
      } else {
        setError(result.data.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('[useProviderConversations] Error:', err);
      setError('Impossible de charger les conversations');
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  return {
    conversations,
    isLoading,
    error,
    fetchConversations,
  };
}
