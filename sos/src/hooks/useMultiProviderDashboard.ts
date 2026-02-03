/**
 * useMultiProviderDashboard Hook
 *
 * Gestion des données pour le dashboard multi-prestataires:
 * - Chargement des comptes avec linkedProviderIds
 * - Chargement des prestataires associés
 * - Chargement des booking requests en QUASI TEMPS RÉEL
 * - Gestion des réponses IA auto-générées
 *
 * ADAPTIVE SMART POLLING (2025-02) - Optimisé pour PWA/usage permanent:
 *
 * Stratégie de polling adaptatif:
 * - Heures de bureau (8h-20h) avec activité: 30 secondes
 * - Heures de bureau sans activité récente: 1 minute
 * - Nuit (20h-8h): 2 minutes
 * - Onglet caché/minimisé: ARRÊT COMPLET
 *
 * Coûts estimés (page ouverte 24h/24):
 * - Ancien système (10s constant): ~8,640 appels/jour
 * - Nouveau système adaptatif: ~1,500-2,500 appels/jour
 * - Économie: 70-80%
 *
 * Fonctionnalités:
 * - Notification sonore pour nouvelles demandes
 * - Notification browser (si autorisé)
 * - Accélération automatique quand nouvelle activité détectée
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
  triggerAiGeneration: (bookingRequestId: string) => Promise<{ success: boolean; bookingId?: string; error?: string }>;

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
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Play a notification sound when new booking arrives
 */
function playNotificationSound(): void {
  try {
    // Try to play notification.mp3 first
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Fallback: use Web Audio API beep
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Create a pleasant notification tone
        oscillator.frequency.value = 880; // A5 note
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

        // Second beep
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 1100; // Higher note
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          osc2.start(audioContext.currentTime);
          osc2.stop(audioContext.currentTime + 0.3);
        }, 150);
      } catch {
        // Audio not available
      }
    });
  } catch {
    // Audio not available
  }
}

/**
 * Show browser notification for new bookings
 */
function showBrowserNotification(count: number): void {
  if (typeof Notification === 'undefined') return;

  if (Notification.permission === 'granted') {
    try {
      new Notification('🚨 Nouvelle demande SOS-Expat!', {
        body: count === 1
          ? 'Une nouvelle demande client vient d\'arriver!'
          : `${count} nouvelles demandes clients!`,
        icon: '/favicon.ico',
        tag: 'new-booking-' + Date.now(),
        requireInteraction: true, // Keep notification visible until user interacts
      });
    } catch {
      // Notification not available
    }
  }
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
  // Track previous booking IDs to detect new ones
  // ============================================================================
  const prevBookingIdsRef = useRef<Set<string>>(new Set());
  const lastPollTimeRef = useRef<number>(0);
  const lastNewBookingTimeRef = useRef<number>(Date.now());
  const currentIntervalRef = useRef<number>(30000);

  // ============================================================================
  // ADAPTIVE SMART POLLING - Économique pour usage permanent (PWA)
  //
  // STRATÉGIE DE COÛTS:
  // - Heures de bureau (8h-20h): polling toutes les 30s
  // - Nuit (20h-8h): polling toutes les 2 minutes
  // - Pas d'activité depuis 30 min: ralentit à 2 minutes
  // - Onglet caché: ARRÊT COMPLET
  //
  // COÛTS ESTIMÉS (page ouverte 24h/24):
  // - Ancien système (10s): ~8,640 appels/jour
  // - Nouveau système adaptatif: ~1,500-2,500 appels/jour (70-80% d'économie)
  // ============================================================================
  useEffect(() => {
    if (!isAuthenticated) return;

    // Polling intervals based on context
    const FAST_INTERVAL = 30000;      // 30 seconds - heures de bureau avec activité
    const MEDIUM_INTERVAL = 60000;    // 1 minute - heures de bureau sans activité récente
    const SLOW_INTERVAL = 120000;     // 2 minutes - nuit ou longue inactivité

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isTabVisible = !document.hidden;

    // Determine optimal polling interval based on time and activity
    const getOptimalInterval = (): number => {
      const now = new Date();
      const hour = now.getHours();
      const isBusinessHours = hour >= 8 && hour < 20; // 8h-20h
      const timeSinceLastNewBooking = Date.now() - lastNewBookingTimeRef.current;
      const hasRecentActivity = timeSinceLastNewBooking < 30 * 60 * 1000; // 30 minutes

      if (!isBusinessHours) {
        // Night time - slow polling
        return SLOW_INTERVAL;
      }

      if (hasRecentActivity) {
        // Business hours with recent activity - fast polling
        return FAST_INTERVAL;
      }

      // Business hours but no recent activity - medium polling
      return MEDIUM_INTERVAL;
    };

    const checkForNewBookings = async () => {
      // Skip if tab is not visible (major cost saver!)
      if (document.hidden) {
        console.debug('[useMultiProviderDashboard] Tab hidden, skipping poll');
        return;
      }

      // Skip if already loading or component unmounted
      if (isLoading || !isMounted.current) return;

      // Throttle: minimum 25 seconds between polls
      const now = Date.now();
      if (now - lastPollTimeRef.current < 25000) {
        return;
      }
      lastPollTimeRef.current = now;

      // Check if we need to adjust polling interval
      const optimalInterval = getOptimalInterval();
      if (optimalInterval !== currentIntervalRef.current) {
        currentIntervalRef.current = optimalInterval;
        startPolling(optimalInterval);
        console.log(`[useMultiProviderDashboard] 📊 Adjusted polling to ${optimalInterval/1000}s`);
      }

      console.log(`[useMultiProviderDashboard] ⚡ Polling check (interval: ${currentIntervalRef.current/1000}s)...`);

      try {
        const session = getSession();
        if (!session?.token) return;

        // Use Cloud Function to fetch latest data
        const getMultiDashboardData = httpsCallable<
          { sessionToken: string },
          { success: boolean; accounts?: MultiProviderAccount[]; error?: string }
        >(outilsFunctions, 'getMultiDashboardData');

        const result = await getMultiDashboardData({ sessionToken: session.token });

        if (!result.data.success || !result.data.accounts || !isMounted.current) return;

        // Convert dates and get all booking IDs
        const newAccounts: MultiProviderAccount[] = result.data.accounts.map(account => ({
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
          })),
        }));

        // Get all current booking IDs
        const currentBookingIds = new Set(
          newAccounts.flatMap(a => a.bookingRequests.map(b => b.id))
        );

        // Find truly new bookings (not in previous set)
        // Only check if we have previous data (not first load)
        if (prevBookingIdsRef.current.size > 0) {
          const newBookingIds = Array.from(currentBookingIds).filter(id => !prevBookingIdsRef.current.has(id));

          // Check if any new bookings are recent (created in last 5 minutes)
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          const recentNewBookings = newAccounts
            .flatMap(a => a.bookingRequests)
            .filter(b =>
              newBookingIds.includes(b.id) &&
              b.status === 'pending' &&
              b.createdAt.getTime() > fiveMinutesAgo
            );

          if (recentNewBookings.length > 0) {
            console.log('[useMultiProviderDashboard] 🚨 NEW REQUEST(S) DETECTED!', recentNewBookings.length);

            // Update last activity time - this will speed up polling
            lastNewBookingTimeRef.current = Date.now();

            // Play notification sound
            playNotificationSound();

            // Show browser notification
            showBrowserNotification(recentNewBookings.length);

            // Speed up polling after detecting new booking
            if (currentIntervalRef.current > FAST_INTERVAL) {
              currentIntervalRef.current = FAST_INTERVAL;
              startPolling(FAST_INTERVAL);
              console.log('[useMultiProviderDashboard] ⚡ Accelerated polling to 30s due to new activity');
            }
          }
        }

        // Update state and tracking
        prevBookingIdsRef.current = currentBookingIds;
        setAccounts(newAccounts);

      } catch (err) {
        // Silent fail - don't spam errors for polling
        console.debug('[useMultiProviderDashboard] Smart polling error:', err);
      }
    };

    // Start/stop polling based on tab visibility
    const startPolling = (interval: number) => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(checkForNewBookings, interval);
      console.log(`[useMultiProviderDashboard] 🟢 Polling started (${interval/1000}s interval)`);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[useMultiProviderDashboard] 🔴 Polling stopped (tab hidden)');
      }
    };

    // Handle visibility change - MAJOR COST SAVER
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;

      if (isTabVisible) {
        // Tab became visible - start polling with optimal interval
        const interval = getOptimalInterval();
        currentIntervalRef.current = interval;
        startPolling(interval);
        checkForNewBookings(); // Immediate refresh when tab becomes visible
      } else {
        // Tab hidden - stop polling completely
        stopPolling();
      }
    };

    // Initial setup
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start polling only if tab is visible
    if (isTabVisible) {
      const initialInterval = getOptimalInterval();
      currentIntervalRef.current = initialInterval;
      startPolling(initialInterval);
    }

    // Request notification permission on mount
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [isAuthenticated, isLoading]);

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
   * Trigger AI generation for a booking request
   * Uses the full AI system (GPT-4o + Perplexity research)
   * Creates booking in Outil which triggers aiOnBookingCreated
   */
  const triggerAiGeneration = useCallback(async (bookingRequestId: string): Promise<{ success: boolean; bookingId?: string; error?: string }> => {
    const session = getSession();
    if (!session?.token) {
      setError('Session invalide. Veuillez vous reconnecter.');
      return { success: false, error: 'Session invalide' };
    }

    try {
      const triggerAi = httpsCallable<
        { sessionToken: string; bookingRequestId: string },
        { success: boolean; bookingId?: string; message?: string; error?: string }
      >(outilsFunctions, 'triggerAiFromBookingRequest');

      const result = await triggerAi({
        sessionToken: session.token,
        bookingRequestId,
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Erreur lors de la génération IA');
      }

      // Refresh data after AI generation is triggered
      // Note: AI response will be available after a few seconds (async processing)
      setTimeout(() => {
        loadAccounts();
      }, 5000); // Wait 5 seconds for AI to process

      return {
        success: true,
        bookingId: result.data.bookingId,
      };

    } catch (err) {
      console.error('[useMultiProviderDashboard] triggerAiGeneration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la génération IA';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [loadAccounts]);

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
    triggerAiGeneration,
    // Chat
    conversations,
    chatLoading,
    loadConversations,
    sendMessage,
    clearConversations,
  };
}

export default useMultiProviderDashboard;
