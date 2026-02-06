/**
 * Authentication Context for Dashboard Multiprestataire
 * Handles Firebase Auth state and user data for agency_manager role
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import i18n from '../i18n/config';
import type { AuthUser, AuthState } from '../types';

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Track if signIn already resolved auth (avoid duplicate fetch in onAuthStateChanged)
  const signInResolvedRef = useRef(false);

  // Fetch user data from Firestore
  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser): Promise<AuthUser | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        console.error('User document not found');
        return null;
      }

      const data = userDoc.data();

      // Verify role is agency_manager or admin
      if (data.role !== 'agency_manager' && data.role !== 'admin') {
        console.error('User does not have agency_manager role');
        return null;
      }

      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || data.email || '',
        displayName: data.displayName || firebaseUser.displayName || '',
        photoURL: data.photoURL || firebaseUser.photoURL,
        role: data.role,
        linkedProviderIds: data.linkedProviderIds || [],
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If signIn() already fetched user data, skip duplicate fetch
        if (signInResolvedRef.current) {
          signInResolvedRef.current = false;
          return;
        }

        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const userData = await fetchUserData(firebaseUser);

        if (userData) {
          setState({
            user: userData,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        } else {
          // User exists but doesn't have correct role
          await firebaseSignOut(auth);
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: i18n.t('auth.unauthorized'),
          });
        }
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  // Real-time listener for user data updates (linkedProviderIds changes)
  useEffect(() => {
    if (!state.user?.id) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', state.user.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setState((prev) => ({
            ...prev,
            user: prev.user
              ? {
                  ...prev.user,
                  linkedProviderIds: data.linkedProviderIds || [],
                  displayName: data.displayName || prev.user.displayName,
                }
              : null,
          }));
        }
      },
      (error) => {
        console.error('User snapshot error:', error);
      }
    );

    return () => unsubscribe();
  }, [state.user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      signInResolvedRef.current = true;
      // Fetch user data directly instead of relying solely on onAuthStateChanged
      // This avoids race conditions on mobile where the async listener + Firestore
      // getDoc can be delayed by slow networks or service worker interference
      const userData = await fetchUserData(userCredential.user);

      if (userData) {
        setState({
          user: userData,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        await firebaseSignOut(auth);
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: i18n.t('auth.unauthorized'),
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t('auth.login_error');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message.includes('auth/')
          ? i18n.t('auth.wrong_credentials')
          : message,
      }));
      throw error;
    }
  }, [fetchUserData]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
