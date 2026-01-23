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
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { initializeApp, getApps } from 'firebase/app';
import { db } from '../config/firebase';

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

function timestampToDate(ts: Timestamp | Date | unknown): Date {
  if (ts instanceof Timestamp) {
    return ts.toDate();
  }
  if (ts instanceof Date) {
    return ts;
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

  // Refs
  const isMounted = useRef(true);
  const unsubscribersRef = useRef<Array<() => void>>([]);

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
      // Cleanup all Firestore subscriptions
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
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

    // Cleanup subscriptions
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
  }, []);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadAccounts = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Load all users with linkedProviderIds
      const usersSnap = await getDocs(collection(db, 'users'));

      const accountsWithProviders: MultiProviderAccount[] = [];
      const providerIdsToWatch: string[] = [];

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const linkedIds: string[] = userData.linkedProviderIds || [];

        // Only include users with at least one linked provider
        if (linkedIds.length === 0) continue;

        // Load provider details
        const providers: Provider[] = [];
        for (const pid of linkedIds) {
          const profileDoc = await getDoc(doc(db, 'sos_profiles', pid));
          if (profileDoc.exists()) {
            const profile = profileDoc.data();
            providers.push({
              id: pid,
              name: profile.displayName || profile.firstName || 'N/A',
              email: profile.email || '',
              type: profile.type || 'lawyer',
              isActive: userData.activeProviderId === pid,
              isOnline: profile.isOnline === true,
              availability: profile.availability || 'offline',
              country: profile.country,
              avatar: profile.photoURL || profile.avatar,
            });
            providerIdsToWatch.push(pid);
          }
        }

        accountsWithProviders.push({
          userId: userDoc.id,
          email: userData.email || '',
          displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'N/A',
          shareBusyStatus: userData.shareBusyStatus === true,
          providers,
          bookingRequests: [],
          activeProviderId: userData.activeProviderId,
        });
      }

      // Sort by number of providers (descending)
      accountsWithProviders.sort((a, b) => b.providers.length - a.providers.length);

      if (!isMounted.current) return;
      setAccounts(accountsWithProviders);

      // 2. Setup real-time listeners for booking_requests
      // Cleanup old subscriptions first
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];

      // Create a listener for each provider
      for (const account of accountsWithProviders) {
        for (const provider of account.providers) {
          const bookingsQuery = query(
            collection(db, 'booking_requests'),
            where('providerId', '==', provider.id),
            orderBy('createdAt', 'desc'),
            limit(50)
          );

          const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
            if (!isMounted.current) return;

            const bookings: BookingRequestWithAI[] = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                providerId: data.providerId,
                providerName: data.providerName,
                providerType: data.providerType,
                clientId: data.clientId,
                clientName: data.clientName || `${data.clientFirstName || ''} ${data.clientLastName || ''}`.trim() || 'Client',
                clientFirstName: data.clientFirstName,
                clientLastName: data.clientLastName,
                clientEmail: data.clientEmail,
                clientPhone: data.clientPhone,
                clientWhatsapp: data.clientWhatsapp,
                clientCurrentCountry: data.clientCurrentCountry,
                clientNationality: data.clientNationality,
                clientLanguages: data.clientLanguages,
                serviceType: data.serviceType,
                title: data.title,
                description: data.description,
                status: data.status || 'pending',
                createdAt: timestampToDate(data.createdAt),
                updatedAt: data.updatedAt ? timestampToDate(data.updatedAt) : undefined,
                aiResponse: data.aiResponse ? {
                  content: data.aiResponse.content,
                  generatedAt: timestampToDate(data.aiResponse.generatedAt),
                  model: data.aiResponse.model,
                  tokensUsed: data.aiResponse.tokensUsed,
                  source: data.aiResponse.source || 'manual',
                } : undefined,
                aiProcessedAt: data.aiProcessedAt ? timestampToDate(data.aiProcessedAt) : undefined,
              };
            });

            // Update the specific account with new bookings
            setAccounts(prevAccounts =>
              prevAccounts.map(acc => {
                if (acc.userId !== account.userId) return acc;

                // Merge bookings: replace those for this provider, keep others
                const otherBookings = acc.bookingRequests.filter(b => b.providerId !== provider.id);
                const allBookings = [...otherBookings, ...bookings];

                // Sort by createdAt descending
                allBookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                return {
                  ...acc,
                  bookingRequests: allBookings,
                };
              })
            );
          }, (err) => {
            console.error(`[useMultiProviderDashboard] Booking listener error for ${provider.id}:`, err);
          });

          unsubscribersRef.current.push(unsubscribe);
        }
      }

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
  };
}

export default useMultiProviderDashboard;
