/**
 * useMultiProviderDashboard Hook
 *
 * Gestion des données pour le dashboard multi-prestataires:
 * - Chargement des comptes avec linkedProviderIds
 * - Chargement des prestataires associés
 * - Chargement des booking requests en temps réel
 * - Gestion des réponses IA auto-générées
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { initializeApp, getApps } from 'firebase/app';

// ============================================================================
// SECONDARY FIREBASE APP FOR OUTILS-SOS-EXPAT FUNCTIONS
// The validateDashboardPassword function is deployed on outils-sos-expat project
// ============================================================================
const OUTILS_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDYNx6T8GquHFx-eQOz94wqZTkxYGzQQk0",
  authDomain: "outils-sos-expat.firebaseapp.com",
  projectId: "outils-sos-expat",
  storageBucket: "outils-sos-expat.appspot.com",
  messagingSenderId: "694506867593",
  appId: "1:694506867593:web:8c4a3f5e7b2d1a9c"
};

// Initialize secondary app for outils functions (only if not already initialized)
const outilsApp = getApps().find(app => app.name === 'outils-sos-expat')
  || initializeApp(OUTILS_FIREBASE_CONFIG, 'outils-sos-expat');

// Functions instance pointing to outils-sos-expat project
const outilsFunctions = getFunctions(outilsApp, 'europe-west1');

// ============================================================================
// TYPES
// ============================================================================

export interface Provider {
  id: string;
  name: string;
  email: string;
  type: 'lawyer' | 'expat';
  isActive: boolean;
  isOnline: boolean;
  availability: 'available' | 'busy' | 'offline';
  country?: string;
  avatar?: string;
}

export interface AiResponse {
  content: string;
  generatedAt: Date;
  model: string;
  tokensUsed?: number;
  source: 'multi_dashboard_auto' | 'manual';
}

export interface BookingRequestWithAI {
  id: string;
  providerId: string;
  providerName?: string;
  providerType?: 'lawyer' | 'expat';
  clientId: string;
  clientName: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];
  serviceType: string;
  title?: string;
  description?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt?: Date;
  aiResponse?: AiResponse;
  aiProcessedAt?: Date;
  aiError?: string;
}

export interface MultiProviderAccount {
  userId: string;
  email: string;
  displayName: string;
  shareBusyStatus: boolean;
  providers: Provider[];
  bookingRequests: BookingRequestWithAI[];
  activeProviderId?: string;
}

export interface DashboardStats {
  totalAccounts: number;
  totalProviders: number;
  totalBookings: number;
  pendingBookings: number;
  aiGeneratedResponses: number;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  createdAt: string;
  model?: string;
}

export interface ChatConversation {
  id: string;
  providerId: string;
  providerType?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  messagesCount: number;
  messages: ChatMessage[];
  bookingContext?: {
    clientName?: string;
    country?: string;
    category?: string;
  };
}

interface UseMultiProviderDashboardReturn {
  // Data
  accounts: MultiProviderAccount[];
  stats: DashboardStats;

  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Auth
  authenticate: (password: string) => Promise<boolean>;
  logout: () => void;

  // Actions
  refresh: () => Promise<void>;
  openAiTool: (providerId: string, bookingId?: string) => Promise<void>;
  migrateOldBookings: (dryRun?: boolean) => Promise<{ migrated: number; message: string } | null>;

  // Chat
  conversations: ChatConversation[];
  chatLoading: boolean;
  loadConversations: (providerId: string) => Promise<void>;
  sendMessage: (providerId: string, message: string, conversationId?: string, bookingRequestId?: string) => Promise<void>;
  clearConversations: () => void;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

const SESSION_KEY = 'multi_dashboard_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface Session {
  authenticated: boolean;
  expiresAt: number;
  token: string;
}

function getSession(): Session | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session: Session = JSON.parse(stored);

    // Check expiration
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function setSession(token: string): void {
  const session: Session = {
    authenticated: true,
    expiresAt: Date.now() + SESSION_DURATION_MS,
    token,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function timestampToDate(ts: Date | string | unknown): Date {
  if (ts instanceof Date) {
    return ts;
  }
  if (typeof ts === 'string') {
    return new Date(ts);
  }
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000);
  }
  return new Date();
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useMultiProviderDashboard(): UseMultiProviderDashboardReturn {
  // State
  const [accounts, setAccounts] = useState<MultiProviderAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Refs
  const isMounted = useRef(true);

  // Check session on mount
  useEffect(() => {
    const session = getSession();
    if (session?.authenticated) {
      setIsAuthenticated(true);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  const authenticate = useCallback(async (password: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      // Call Cloud Function to validate password (secure - password never stored in Firestore)
      const validatePassword = httpsCallable<
        { password: string },
        { success: boolean; token?: string; expiresAt?: number; error?: string }
      >(outilsFunctions, 'validateDashboardPassword');

      const result = await validatePassword({ password });

      if (!result.data.success) {
        setError(result.data.error || 'Mot de passe incorrect.');
        setIsLoading(false);
        return false;
      }

      // Store session token from server
      if (result.data.token) {
        setSession(result.data.token);
      }

      setIsAuthenticated(true);
      setIsLoading(false);
      return true;

    } catch (err: unknown) {
      console.error('[useMultiProviderDashboard] Auth error:', err);

      // Handle specific Firebase errors
      const error = err as { code?: string; message?: string };
      if (error.code === 'functions/unavailable') {
        setError('Le dashboard est temporairement désactivé.');
      } else if (error.code === 'functions/not-found') {
        setError('Configuration non trouvée. Contactez l\'administrateur.');
      } else {
        setError('Erreur de connexion. Veuillez réessayer.');
      }

      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setIsAuthenticated(false);
    setAccounts([]);
  }, []);

  // ============================================================================
  // DATA LOADING (via Cloud Function to bypass Firestore rules)
  // ============================================================================

  const loadAccounts = useCallback(async () => {
    if (!isAuthenticated) return;

    const session = getSession();
    if (!session?.token) {
      setError('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use Cloud Function to fetch data (bypasses Firestore rules)
      const getMultiDashboardData = httpsCallable<
        { sessionToken: string },
        { success: boolean; accounts?: MultiProviderAccount[]; error?: string }
      >(outilsFunctions, 'getMultiDashboardData');

      const result = await getMultiDashboardData({ sessionToken: session.token });

      if (!result.data.success || !result.data.accounts) {
        throw new Error(result.data.error || 'Erreur lors du chargement');
      }

      // Convert ISO date strings back to Date objects
      const accountsWithDates: MultiProviderAccount[] = result.data.accounts.map(account => ({
        ...account,
        bookingRequests: account.bookingRequests.map(booking => ({
          ...booking,
          createdAt: new Date(booking.createdAt as unknown as string),
          updatedAt: booking.updatedAt ? new Date(booking.updatedAt as unknown as string) : undefined,
          aiResponse: booking.aiResponse ? {
            ...booking.aiResponse,
            generatedAt: new Date(booking.aiResponse.generatedAt as unknown as string),
          } : undefined,
          aiProcessedAt: booking.aiProcessedAt ? new Date(booking.aiProcessedAt as unknown as string) : undefined,
          aiError: booking.aiError || undefined,
        })),
      }));

      if (!isMounted.current) return;
      setAccounts(accountsWithDates);
      setIsLoading(false);

    } catch (err) {
      console.error('[useMultiProviderDashboard] Load error:', err);
      if (isMounted.current) {
        setError('Erreur lors du chargement des données.');
        setIsLoading(false);
      }
    }
  }, [isAuthenticated]);

  // Load accounts when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAccounts();
    }
  }, [isAuthenticated, loadAccounts]);

  // ============================================================================
  // AUTO-REFRESH for new booking requests (every 30 seconds)
  // ============================================================================
  useEffect(() => {
    if (!isAuthenticated) return;

    const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
    const intervalId = setInterval(() => {
      // Only refresh if not currently loading
      if (!isLoading && isMounted.current) {
        console.log('[useMultiProviderDashboard] Auto-refreshing...');
        loadAccounts();
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, isLoading, loadAccounts]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const stats = useMemo<DashboardStats>(() => {
    const allBookings = accounts.flatMap(a => a.bookingRequests);

    return {
      totalAccounts: accounts.length,
      totalProviders: accounts.reduce((sum, a) => sum + a.providers.length, 0),
      totalBookings: allBookings.length,
      pendingBookings: allBookings.filter(b => b.status === 'pending').length,
      aiGeneratedResponses: allBookings.filter(b => b.aiResponse).length,
    };
  }, [accounts]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const refresh = useCallback(async () => {
    await loadAccounts();
  }, [loadAccounts]);

  /**
   * Opens the AI tool (ia.sos-expat.com) for a specific provider
   * Generates an SSO token via Cloud Function
   * @param providerId - The provider ID
   * @param bookingId - Optional booking ID to open directly the conversation
   */
  const openAiTool = useCallback(async (providerId: string, bookingId?: string) => {
    const session = getSession();
    if (!session?.token) {
      setError('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    try {
      const generateToken = httpsCallable<
        { sessionToken: string; providerId: string; bookingId?: string },
        { success: boolean; ssoUrl?: string; error?: string }
      >(outilsFunctions, 'generateMultiDashboardOutilToken');

      const result = await generateToken({
        sessionToken: session.token,
        providerId,
        bookingId,
      });

      if (!result.data.success || !result.data.ssoUrl) {
        throw new Error(result.data.error || 'Erreur lors de la génération du token');
      }

      // Open AI tool in new tab (directly to the conversation if bookingId was provided)
      window.open(result.data.ssoUrl, '_blank', 'noopener,noreferrer');

    } catch (err) {
      console.error('[useMultiProviderDashboard] openAiTool error:', err);
      setError('Erreur lors de l\'accès à l\'outil IA.');
    }
  }, []);

  /**
   * Migrate old pending bookings to completed status
   * One-time operation to fix historical data
   */
  const migrateOldBookings = useCallback(async (dryRun = false): Promise<{ migrated: number; message: string } | null> => {
    const session = getSession();
    if (!session?.token) {
      setError('Session invalide. Veuillez vous reconnecter.');
      return null;
    }

    try {
      const migrate = httpsCallable<
        { sessionToken: string; dryRun?: boolean },
        { success: boolean; migrated: number; skipped: number; errors: number; message: string }
      >(outilsFunctions, 'migrateOldPendingBookings');

      const result = await migrate({
        sessionToken: session.token,
        dryRun,
      });

      if (!result.data.success) {
        throw new Error('Migration failed');
      }

      // Refresh data after migration
      if (!dryRun) {
        await loadAccounts();
      }

      return {
        migrated: result.data.migrated,
        message: result.data.message,
      };

    } catch (err) {
      console.error('[useMultiProviderDashboard] migrateOldBookings error:', err);
      setError('Erreur lors de la migration.');
      return null;
    }
  }, [loadAccounts]);

  // ============================================================================
  // CHAT FUNCTIONS
  // ============================================================================

  /**
   * Load conversations for a specific provider
   */
  const loadConversations = useCallback(async (providerId: string) => {
    const session = getSession();
    if (!session?.token) {
      setError('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    setChatLoading(true);

    try {
      const getConversations = httpsCallable<
        { sessionToken: string; providerId: string; limit?: number },
        { success: boolean; conversations?: ChatConversation[]; error?: string }
      >(outilsFunctions, 'getProviderConversations');

      const result = await getConversations({
        sessionToken: session.token,
        providerId,
        limit: 20,
      });

      if (!result.data.success || !result.data.conversations) {
        throw new Error(result.data.error || 'Erreur lors du chargement');
      }

      if (!isMounted.current) return;
      setConversations(result.data.conversations);

    } catch (err) {
      console.error('[useMultiProviderDashboard] loadConversations error:', err);
      // Don't show error for chat loading failures
    } finally {
      if (isMounted.current) {
        setChatLoading(false);
      }
    }
  }, []);

  /**
   * Send a message in a conversation
   */
  const sendMessage = useCallback(async (
    providerId: string,
    message: string,
    conversationId?: string,
    bookingRequestId?: string
  ) => {
    const session = getSession();
    if (!session?.token) {
      setError('Session invalide. Veuillez vous reconnecter.');
      return;
    }

    try {
      const sendMsg = httpsCallable<
        { sessionToken: string; providerId: string; message: string; conversationId?: string; bookingRequestId?: string },
        { success: boolean; conversationId?: string; error?: string }
      >(outilsFunctions, 'sendMultiDashboardMessage');

      const result = await sendMsg({
        sessionToken: session.token,
        providerId,
        message,
        conversationId,
        bookingRequestId,
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Erreur lors de l\'envoi');
      }

    } catch (err) {
      console.error('[useMultiProviderDashboard] sendMessage error:', err);
      setError('Erreur lors de l\'envoi du message.');
    }
  }, []);

  /**
   * Clear conversations (when closing chat panel)
   */
  const clearConversations = useCallback(() => {
    setConversations([]);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    accounts,
    stats,
    isLoading,
    isAuthenticated,
    error,
    authenticate,
    logout,
    refresh,
    openAiTool,
    migrateOldBookings,
    // Chat
    conversations,
    chatLoading,
    loadConversations,
    sendMessage,
    clearConversations,
  };
}

export default useMultiProviderDashboard;
