// Base auth context: types + context only. No JSX/Provider here.
import { createContext } from 'react';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { User } from './types';

export type ConnectionSpeed = 'slow' | 'medium' | 'fast';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  type: DeviceType;
  os: string;
  browser: string;
  isOnline: boolean;
  connectionSpeed: ConnectionSpeed;
}

export interface AuthMetrics {
  loginAttempts: number;
  lastAttempt: Date;
  successfulLogins: number;
  failedLogins: number;
  googleAttempts: number;
  roleRestrictionBlocks: number;
  passwordResetRequests: number;
  emailUpdateAttempts: number;
  profileUpdateAttempts: number;
}

export interface AuthContextType {
  // État utilisateur
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  isUserLoggedIn: () => boolean;

  // État de chargement et erreurs
  isLoading: boolean;
  authInitialized: boolean;
  /** P0 FIX: isFullyReady = authInitialized AND (user loaded OR no user) */
  isFullyReady: boolean;
  error: string | null;

  // Métriques et informations device
  authMetrics: AuthMetrics;
  deviceInfo: DeviceInfo;

  // Méthodes d'authentification principales
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: (rememberMe?: boolean) => Promise<void>;
  register: (userData: Partial<User>, password: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // Gestion des erreurs et rafraîchissement
  clearError: () => void;
  refreshUser: () => Promise<void>;
  getLastLoginInfo: () => { date: Date | null; device: string | null };

  // Gestion complète du profil utilisateur
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  updateUserEmail: (newEmail: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  reauthenticateUser: (password: string) => Promise<void>;
  
  // Gestion des mots de passe et vérifications
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  
  // Gestion avancée du compte
  deleteUserAccount: () => Promise<void>;
  getUsersByRole: (role: User['role'], limit?: number) => Promise<User[]>;
  setUserAvailability: (availability: 'available' | 'busy' | 'offline') => Promise<void>;
}

// Default values for AuthContext to prevent white screens when used outside provider
const defaultDeviceInfo: DeviceInfo = {
  type: 'desktop',
  os: 'unknown',
  browser: 'unknown',
  isOnline: true,
  connectionSpeed: 'fast',
};

const defaultAuthMetrics: AuthMetrics = {
  loginAttempts: 0,
  lastAttempt: new Date(),
  successfulLogins: 0,
  failedLogins: 0,
  googleAttempts: 0,
  roleRestrictionBlocks: 0,
  passwordResetRequests: 0,
  emailUpdateAttempts: 0,
  profileUpdateAttempts: 0,
};

// No-op async function for default context
const noopAsync = async () => {
  console.warn('[AuthContext] Called outside of AuthProvider - no operation performed');
};

const noopAsyncUsers = async (): Promise<User[]> => {
  console.warn('[AuthContext] Called outside of AuthProvider - returning empty array');
  return [];
};

export const defaultAuthContext: AuthContextType = {
  user: null,
  firebaseUser: null,
  isUserLoggedIn: () => false,
  isLoading: true,
  authInitialized: false,
  isFullyReady: false,
  error: null,
  authMetrics: defaultAuthMetrics,
  deviceInfo: defaultDeviceInfo,
  login: noopAsync,
  loginWithGoogle: noopAsync,
  register: noopAsync,
  logout: noopAsync,
  clearError: () => {},
  refreshUser: noopAsync,
  getLastLoginInfo: () => ({ date: null, device: null }),
  updateUserProfile: noopAsync,
  updateUserEmail: noopAsync,
  updateUserPassword: noopAsync,
  reauthenticateUser: noopAsync,
  sendPasswordReset: noopAsync,
  sendVerificationEmail: noopAsync,
  deleteUserAccount: noopAsync,
  getUsersByRole: noopAsyncUsers,
  setUserAvailability: noopAsync,
};

// Named export expected by AuthContext.tsx
// Using default context to prevent crashes when used outside provider
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);