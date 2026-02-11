// src/contexts/AuthContext.tsx
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  reload,
  fetchSignInMethodsForEmail,
  deleteUser,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  getDocs,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { auth, db, storage, functions } from '../config/firebase';
import type { User } from './types';
import type { AuthContextType } from './AuthContextBase';
import { AuthContext as BaseAuthContext } from './AuthContextBase';

/* =========================================================
   Types utilitaires
   ========================================================= */
type ConnectionSpeed = 'slow' | 'medium' | 'fast';
type DeviceType = 'mobile' | 'tablet' | 'desktop';

type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g';
interface NetworkInformation {
  effectiveType?: NetworkEffectiveType;
}
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

interface DeviceInfo {
  type: DeviceType;
  os: string;
  browser: string;
  isOnline: boolean;
  connectionSpeed: ConnectionSpeed;
}

interface AuthMetrics {
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

interface AppError extends Error {
  code?: string;
}

/* =========================================================
   SECURITY: Redirect URL validation
   ========================================================= */
/**
 * Validates that a redirect URL is safe (prevents Open Redirect attacks)
 * Only allows relative paths starting with / (but not //) and same-origin URLs
 */
const isAllowedRedirect = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith('/')) return !url.startsWith('//');
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
};

/* =========================================================
   Helpers d'environnement / device
   ========================================================= */
const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      type: 'desktop',
      os: 'unknown',
      browser: 'unknown',
      isOnline: true,
      connectionSpeed: 'fast',
    };
  }

  const ua = navigator.userAgent;
  const nav = navigator as NavigatorWithConnection;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  const type: DeviceType =
    /Android|iPhone|iPod/i.test(ua) ? 'mobile' :
    /iPad|Android.*tablet/i.test(ua) ? 'tablet' : 'desktop';

  let os = 'unknown';
  if (/Android/i.test(ua)) os = 'android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'ios';
  else if (/Windows/i.test(ua)) os = 'windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'mac';
  else if (/Linux/i.test(ua)) os = 'linux';

  let browser = 'unknown';
  if (/Edg\//i.test(ua)) browser = 'edge';
  else if (/Chrome\//i.test(ua)) browser = 'chrome';
  else if (/Firefox\//i.test(ua)) browser = 'firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'safari';

  let connectionSpeed: ConnectionSpeed = 'fast';
  const eff = conn?.effectiveType;
  if (eff === 'slow-2g' || eff === '2g') connectionSpeed = 'slow';
  else if (eff === '3g') connectionSpeed = 'medium';

  return { type, os, browser, isOnline: navigator.onLine, connectionSpeed };
};

/* =========================================================
   Timeout adaptatif selon la vitesse de connexion
   ========================================================= */
const getAdaptiveTimeout = (): number => {
  // Timeout très généreux pour éviter les faux positifs après vidage de cache
  return 60000; // 60 secondes - le spinner restera mais pas de fausse erreur
};

/* =========================================================
   🔧 MOBILE AUTH HELPERS - Compatibilité maximale
   ========================================================= */

/**
 * Détecte si on est dans un WebView in-app (Instagram, Facebook, TikTok, etc.)
 * Ces WebViews ne supportent généralement pas Google Auth via popup/redirect
 */
const isInAppBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';

  // Liste des WebViews in-app connus
  const inAppPatterns = [
    /FBAN|FBAV/i,           // Facebook App
    /Instagram/i,            // Instagram
    /Twitter/i,              // Twitter/X
    /Line\//i,               // Line
    /KAKAOTALK/i,            // KakaoTalk
    /Snapchat/i,             // Snapchat
    /TikTok/i,               // TikTok
    /BytedanceWebview/i,     // TikTok WebView
    /Musical_ly/i,           // Musical.ly (old TikTok)
    /LinkedIn/i,             // LinkedIn
    /Pinterest/i,            // Pinterest
    /Telegram/i,             // Telegram
    /WhatsApp/i,             // WhatsApp (rare mais possible)
    /WeChat|MicroMessenger/i, // WeChat
  ];

  return inAppPatterns.some(pattern => pattern.test(ua));
};

/**
 * Détecte si on doit forcer le mode redirect au lieu de popup
 *
 * Avec le custom authDomain (www.sosexpats.com), le redirect OAuth reste sur
 * le même domaine, ce qui élimine les problèmes ITP de Safari.
 * On force donc le redirect pour TOUS les appareils iOS (Safari inclus)
 * et les autres navigateurs mobiles problématiques.
 * Les popups sur mobile sont globalement peu fiables (bloqués par Safari,
 * problèmes de focus, etc.), le redirect est la méthode recommandée.
 */
const shouldForceRedirectAuth = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;

  // Tous les appareils iOS → redirect (Safari, Chrome iOS, Firefox iOS, etc.)
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isIOS) {
    console.log('[Auth] iOS détecté - mode REDIRECT (custom authDomain, pas de problème ITP)');
    return true;
  }

  // Les WebViews Android peuvent aussi avoir des problèmes
  const isAndroidWebView = /wv/.test(ua) && /Android/i.test(ua);

  // Samsung Internet a parfois des problèmes
  const isSamsungBrowser = /SamsungBrowser/i.test(ua);

  // UC Browser et autres navigateurs alternatifs
  const isAlternativeBrowser = /UCBrowser|Opera Mini|OPR/i.test(ua);

  return isInAppBrowser() || isAndroidWebView || isSamsungBrowser || isAlternativeBrowser;
};

/**
 * Storage sécurisé avec fallback
 * Certains navigateurs (iOS Safari privé) bloquent sessionStorage/localStorage
 */
const safeStorage = {
  _memoryStorage: {} as Record<string, string>,

  setItem: (key: string, value: string): void => {
    try {
      // Essayer sessionStorage d'abord (préféré pour la sécurité)
      sessionStorage.setItem(key, value);
    } catch {
      try {
        // Fallback vers localStorage
        localStorage.setItem(key, value);
      } catch {
        // Dernier recours: mémoire (perdu au refresh mais mieux que rien)
        safeStorage._memoryStorage[key] = value;
        console.warn('[Auth] Storage unavailable, using memory fallback for:', key);
      }
    }
  },

  getItem: (key: string): string | null => {
    try {
      // Essayer sessionStorage d'abord
      const sessionValue = sessionStorage.getItem(key);
      if (sessionValue) return sessionValue;
    } catch { /* ignore */ }

    try {
      // Essayer localStorage
      const localValue = localStorage.getItem(key);
      if (localValue) return localValue;
    } catch { /* ignore */ }

    // Dernier recours: mémoire
    return safeStorage._memoryStorage[key] || null;
  },

  removeItem: (key: string): void => {
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    delete safeStorage._memoryStorage[key];
  }
};

/* =========================================================
   Helpers email (locaux)
   ========================================================= */
const normalizeEmail = (s: string): string =>
  (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\u00A0/g, '')            // NBSP
    .replace(/[\u2000-\u200D]/g, '');  // espaces fines / zero-width

const isValidEmail = (e: string): boolean => {
  if (!e || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
};

type LogPayload = Record<string, unknown>;
const logAuthEvent = async (type: string, data: LogPayload = {}): Promise<void> => {
  try {
    await addDoc(collection(db, 'logs'), {
      type,
      category: 'authentication',
      ...data,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 120) : '',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
      screenSize: typeof window !== 'undefined' ? `${window.screen?.width}x${window.screen?.height}` : '',
      device: getDeviceInfo(),
    });
  } catch (e) {
    console.warn('[Auth] logAuthEvent error', e);
  }
};

/* =========================================================
   Utils helpers
   ========================================================= */
/**
 * Split displayName into firstName and lastName
 */
const splitDisplayName = (displayName: string | null | undefined): { firstName: string; lastName: string } => {
  if (!displayName || displayName.trim() === '') {
    return { firstName: '', lastName: '' };
  }
  
  const parts = displayName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  // First part is firstName, rest is lastName
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  
  return { firstName, lastName };
};

/* =========================================================
   Utils photo de profil
   ========================================================= */
const processProfilePhoto = async (
  photoUrl: string | undefined,
  uid: string,
  provider: 'google' | 'manual'
): Promise<string> => {
  try {
    if (!photoUrl) return '/default-avatar.png';

    if (provider === 'google' && photoUrl.includes('googleusercontent.com')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(photoUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const size = getDeviceInfo().type === 'mobile' ? 's150-c' : 's300-c';
          return photoUrl.replace(/s\d+-c/, size);
        }
      } catch {
        /* no-op */ void 0;
      }
      return '/default-avatar.png';
    }

    if (photoUrl.startsWith('data:image')) {
      if (typeof document === 'undefined') return '/default-avatar.png';
      
      // Use image optimizer to standardize size and convert to WebP
      const { optimizeProfileImage, getOptimalFormat, getFileExtension } = await import('../utils/imageOptimizer');
      
      try {
        const format = await getOptimalFormat();
        const optimized = await optimizeProfileImage(photoUrl, {
          targetSize: 512,
          quality: 0.85,
          format,
        });

        const extension = getFileExtension(format);
        const storageRef = ref(storage, `profilePhotos/${uid}/${Date.now()}${extension}`);
        const upload = await uploadString(storageRef, optimized.dataUrl, 'data_url');
        const url = await getDownloadURL(upload.ref);
        
        console.log(`[Auth] Profile photo optimized: ${(optimized.originalSize / 1024).toFixed(1)}KB → ${(optimized.optimizedSize / 1024).toFixed(1)}KB (${optimized.compressionRatio.toFixed(1)}x compression)`);
        
        return url;
      } catch (error) {
        console.error('[Auth] Image optimization failed, falling back to default:', error);
        return '/default-avatar.png';
      }
    }

    if (photoUrl.startsWith('http')) return photoUrl;
    return '/default-avatar.png';
  } catch {
    return '/default-avatar.png';
  }
};

/* =========================================================
   Création / lecture du user Firestore
   ========================================================= */

/**
 * Interface pour les données de création d'utilisateur via Cloud Function
 */
interface CreateUserDocumentData {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  photoURL?: string;
  role: 'client' | 'lawyer' | 'expat';
  provider: string;
  isVerified?: boolean;
  preferredLanguage?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  currentCountry?: string;
  practiceCountries?: string[];
  interventionCountries?: string[];
  bio?: string;
  specialties?: string[];
  languages?: string[];
  barNumber?: string;
  barAssociation?: string;
  yearsOfExperience?: number;
  hourlyRate?: number;
  profilePhoto?: string;
}

interface CreateUserDocumentResponse {
  success: boolean;
  action: 'created' | 'updated';
  uid: string;
  role?: string;
}

/**
 * Crée un document utilisateur via Cloud Function (Admin SDK)
 * Cette méthode contourne les règles de sécurité Firestore et est
 * plus fiable pour les nouveaux utilisateurs Google OAuth.
 *
 * ✅ Inclut retry avec backoff exponentiel pour réseau lent
 */
const createUserDocumentViaCloudFunction = async (
  firebaseUser: FirebaseUser,
  additionalData: Partial<User> = {}
): Promise<CreateUserDocumentResponse> => {
  const createUserDoc = httpsCallable<CreateUserDocumentData, CreateUserDocumentResponse>(
    functions,
    'createUserDocument'
  );

  const { firstName, lastName } = additionalData.firstName && additionalData.lastName
    ? { firstName: additionalData.firstName, lastName: additionalData.lastName }
    : splitDisplayName(firebaseUser.displayName);

  const fullName = additionalData.fullName || `${firstName} ${lastName}`.trim() || firebaseUser.displayName || '';

  const requestData: CreateUserDocumentData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || fullName || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    fullName: fullName || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    role: (additionalData.role as 'client' | 'lawyer' | 'expat') || 'client',
    provider: additionalData.provider || 'google.com',
    isVerified: firebaseUser.emailVerified,
    preferredLanguage: additionalData.preferredLanguage || 'fr',
    profilePhoto: additionalData.profilePhoto || firebaseUser.photoURL || undefined,
    ...(additionalData.phone && { phone: additionalData.phone }),
    ...(additionalData.phoneCountryCode && { phoneCountryCode: additionalData.phoneCountryCode }),
    ...(additionalData.country && { country: additionalData.country }),
    ...(additionalData.currentCountry && { currentCountry: additionalData.currentCountry }),
    ...(additionalData.practiceCountries && { practiceCountries: additionalData.practiceCountries }),
    ...(additionalData.interventionCountries && { interventionCountries: additionalData.interventionCountries }),
    ...(additionalData.bio && { bio: additionalData.bio }),
    ...(additionalData.specialties && { specialties: additionalData.specialties }),
    ...(additionalData.languages && { languages: additionalData.languages }),
  };

  // ✅ Retry avec backoff exponentiel (3 tentatives max)
  const MAX_RETRIES = 3;
  const BASE_DELAY = 1000; // 1s, 2s, 4s

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 [CloudFunction] Tentative ${attempt}/${MAX_RETRIES} de création du document...`);
      const result = await createUserDoc(requestData);
      console.log(`✅ [CloudFunction] Document créé avec succès (tentative ${attempt})`);
      return result.data;
    } catch (error) {
      lastError = error as Error;
      const errorCode = (error as any)?.code || 'unknown';
      console.warn(`⚠️ [CloudFunction] Échec tentative ${attempt}/${MAX_RETRIES}:`, errorCode, (error as Error).message);

      // Ne pas retry si c'est une erreur de permission ou d'authentification
      if (errorCode === 'permission-denied' || errorCode === 'unauthenticated') {
        console.error(`❌ [CloudFunction] Erreur fatale (${errorCode}), pas de retry`);
        throw error;
      }

      // Attendre avant le prochain retry (sauf si c'est la dernière tentative)
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.log(`⏳ [CloudFunction] Attente ${delay}ms avant retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Si toutes les tentatives ont échoué
  console.error(`❌ [CloudFunction] Échec après ${MAX_RETRIES} tentatives`);
  throw lastError || new Error('Cloud Function failed after all retries');
};

/**
 * Fonction pour créer un document utilisateur dans Firestore
 * @deprecated Utilisez createUserDocumentViaCloudFunction pour les nouveaux utilisateurs Google OAuth
 */
const createUserDocumentInFirestore = async (
  firebaseUser: FirebaseUser, 
  additionalData: Partial<User> = {}
): Promise<void> => {
  if (!firebaseUser) return;

  const userRef = doc(db, 'users', firebaseUser.uid);
  
  const { firstName, lastName } = additionalData.firstName && additionalData.lastName 
    ? { firstName: additionalData.firstName, lastName: additionalData.lastName }
    : splitDisplayName(firebaseUser.displayName);
  
  const fullName = additionalData.fullName || `${firstName} ${lastName}`.trim() || firebaseUser.displayName || '';

  // Auto-approve ALL client accounts (Google AND email/password)
  // Lawyers/expats still require manual approval
  const isClientRole = additionalData.role === 'client';
  const shouldAutoApprove = isClientRole;
  
  const approvalFields = shouldAutoApprove 
    ? {
        isApproved: true,
        approvalStatus: 'approved' as const,
        isVisible: true,
        verificationStatus: 'verified' as const,
      }
    : {
        isApproved: false,
        approvalStatus: 'pending' as const,
        isVisible: false,
        verificationStatus: 'pending' as const,
      };
  
  try {
    // 1️⃣ Créer dans users (tous les utilisateurs)
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email || null,
      emailLower: (firebaseUser.email || '').toLowerCase(),
      displayName: firebaseUser.displayName || null,
      firstName: firstName || '',
      lastName: lastName || '',
      fullName,
      photoURL: firebaseUser.photoURL || null,
      profilePhoto: firebaseUser.photoURL || '/default-avatar.png',
      avatar: firebaseUser.photoURL || '/default-avatar.png',
      isVerified: firebaseUser.emailVerified,
      isVerifiedEmail: firebaseUser.emailVerified,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      ...additionalData,
      ...approvalFields,
    });

    // 2️⃣ Si lawyer/expat → créer AUSSI dans sos_profiles avec TOUS les champs
    if (additionalData.role === 'lawyer' || additionalData.role === 'expat') {
      const sosRef = doc(db, 'sos_profiles', firebaseUser.uid);
      
      // ✅ COPIER TOUS LES CHAMPS IMPORTANTS
      await setDoc(sosRef, {
        // ===== IDENTIFIANTS =====
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        type: additionalData.role,
        role: additionalData.role, // Garder aussi 'role' pour compatibilité
        
        // ===== IDENTITÉ =====
        email: firebaseUser.email || null,
        emailLower: (firebaseUser.email || '').toLowerCase(),
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: fullName,
        name: fullName, // Alias utilisé par SOSCall.tsx
        displayName: fullName,
        
        // ===== PHOTO =====
        profilePhoto: additionalData.profilePhoto || firebaseUser.photoURL || '/default-avatar.png',
        photoURL: additionalData.profilePhoto || firebaseUser.photoURL || '/default-avatar.png',
        avatar: additionalData.profilePhoto || firebaseUser.photoURL || '/default-avatar.png',
        
        // ===== CONTACT =====
        phone: additionalData.phone || null,
        phoneNumber: additionalData.phone || null,
        phoneCountryCode: additionalData.phoneCountryCode || null,
        
        // ===== LOCALISATION =====
        country: additionalData.country || additionalData.currentCountry || '',
        currentCountry: additionalData.currentCountry || additionalData.country || '',
        currentPresenceCountry: additionalData.currentCountry || additionalData.country || '',
        // ✅ Support des 3 formats de pays d'intervention (tableau ou singulier)
        practiceCountries: ((): string[] => {
          if (Array.isArray(additionalData.practiceCountries) && additionalData.practiceCountries.length > 0) return additionalData.practiceCountries;
          if (Array.isArray(additionalData.operatingCountries) && additionalData.operatingCountries.length > 0) return additionalData.operatingCountries;
          if (Array.isArray(additionalData.interventionCountries) && additionalData.interventionCountries.length > 0) return additionalData.interventionCountries;
          if (additionalData.interventionCountry) return [additionalData.interventionCountry];
          return [];
        })(),
        interventionCountries: ((): string[] => {
          if (Array.isArray(additionalData.interventionCountries) && additionalData.interventionCountries.length > 0) return additionalData.interventionCountries;
          if (Array.isArray(additionalData.practiceCountries) && additionalData.practiceCountries.length > 0) return additionalData.practiceCountries;
          if (Array.isArray(additionalData.operatingCountries) && additionalData.operatingCountries.length > 0) return additionalData.operatingCountries;
          if (additionalData.interventionCountry) return [additionalData.interventionCountry];
          return [];
        })(),
        operatingCountries: ((): string[] => {
          if (Array.isArray(additionalData.operatingCountries) && additionalData.operatingCountries.length > 0) return additionalData.operatingCountries;
          if (Array.isArray(additionalData.practiceCountries) && additionalData.practiceCountries.length > 0) return additionalData.practiceCountries;
          if (Array.isArray(additionalData.interventionCountries) && additionalData.interventionCountries.length > 0) return additionalData.interventionCountries;
          if (additionalData.interventionCountry) return [additionalData.interventionCountry];
          return [];
        })(),
        
        // ===== LANGUES =====
        languages: additionalData.languages || additionalData.languagesSpoken || [],
        languagesSpoken: additionalData.languagesSpoken || additionalData.languages || [],
        
        // ===== EXPERTISE =====
        specialties: additionalData.specialties || [],
        yearsOfExperience: additionalData.yearsOfExperience || 0,
        yearsAsExpat: additionalData.yearsAsExpat || additionalData.yearsOfExperience || 0,
        graduationYear: additionalData.graduationYear || null,
        education: additionalData.education || [],
        
        // ===== DESCRIPTION =====
        bio: additionalData.bio || additionalData.description || '',
        description: additionalData.description || additionalData.bio || '',
        
        // ===== NOTATION =====
        rating: additionalData.rating || 4.5,
        reviewCount: additionalData.reviewCount || 0,
        
        // ===== DISPONIBILITÉ =====
        isActive: true,
        isOnline: false,  // ⚠️ HORS LIGNE PAR DÉFAUT
        availability: 'offline',  // ⚠️ offline par défaut
        autoOfflineEnabled: true,  
        inactivityTimeoutMinutes: 60,  
        lastActivity: serverTimestamp(),  
        lastActivityCheck: serverTimestamp(),  
        lastStatusChange: serverTimestamp(),  
                
        // ===== VISIBILITÉ & APPROBATION =====
        isVisible: false,
        isVisibleOnMap: false,
        isApproved: false,
        approvalStatus: 'pending' as const,
        verificationStatus: 'pending' as const,
        status: 'pending' as const,
        
        // ===== TARIFICATION (si présent) =====
        price: additionalData.price || null,
        duration: additionalData.duration || null,
        
        // ===== PRÉFÉRENCES =====
        preferredLanguage: additionalData.preferredLanguage || 'fr',

        // ===== TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD) =====
        termsAccepted: additionalData.termsAccepted || false,
        termsAcceptedAt: additionalData.termsAcceptedAt || null,
        termsVersion: additionalData.termsVersion || null,
        termsType: additionalData.termsType || null,
        paymentTermsAccepted: additionalData.paymentTermsAccepted || false,
        paymentTermsAcceptedAt: additionalData.paymentTermsAcceptedAt || null,
        paymentTermsVersion: additionalData.paymentTermsVersion || null,
        termsAcceptanceMeta: additionalData.termsAcceptanceMeta || null,

        // ===== TIMESTAMPS =====
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ [Auth] Profil créé dans sos_profiles avec tous les champs:', {
        uid: firebaseUser.uid,
        type: additionalData.role,
        specialties: additionalData.specialties?.length || 0,
        languages: additionalData.languages?.length || 0,
        countries: additionalData.practiceCountries?.length || 0,
      });

      // 3️⃣ CRÉER AUSSI dans lawyers/expats pour compatibilité avec getAccountSession
      // Cette collection est attendue par la vérification Stripe KYC
      // ✅ FIX: Non-bloquant - l'inscription ne doit pas échouer si cette écriture échoue
      const providerCollectionName = additionalData.role === 'lawyer' ? 'lawyers' : 'expats';
      const providerRef = doc(db, providerCollectionName, firebaseUser.uid);

      try { await setDoc(providerRef, {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        type: additionalData.role,
        email: firebaseUser.email || null,
        emailLower: (firebaseUser.email || '').toLowerCase(),
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: fullName,
        name: fullName,
        profilePhoto: additionalData.profilePhoto || firebaseUser.photoURL || '/default-avatar.png',
        phone: additionalData.phone || null,
        phoneCountryCode: additionalData.phoneCountryCode || null,
        country: additionalData.country || additionalData.currentCountry || '',
        currentCountry: additionalData.currentCountry || additionalData.country || '',
        practiceCountries: ((): string[] => {
          if (Array.isArray(additionalData.practiceCountries) && additionalData.practiceCountries.length > 0) return additionalData.practiceCountries;
          if (Array.isArray(additionalData.operatingCountries) && additionalData.operatingCountries.length > 0) return additionalData.operatingCountries;
          if (Array.isArray(additionalData.interventionCountries) && additionalData.interventionCountries.length > 0) return additionalData.interventionCountries;
          if (additionalData.interventionCountry) return [additionalData.interventionCountry];
          return [];
        })(),
        languages: additionalData.languages || additionalData.languagesSpoken || [],
        specialties: additionalData.specialties || [],
        yearsOfExperience: additionalData.yearsOfExperience || 0,
        bio: additionalData.bio || additionalData.description || '',
        isActive: true,
        isApproved: false,
        isVisible: false,
        // ===== TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD) =====
        termsAccepted: additionalData.termsAccepted || false,
        termsAcceptedAt: additionalData.termsAcceptedAt || null,
        termsVersion: additionalData.termsVersion || null,
        termsType: additionalData.termsType || null,
        paymentTermsAccepted: additionalData.paymentTermsAccepted || false,
        paymentTermsAcceptedAt: additionalData.paymentTermsAcceptedAt || null,
        paymentTermsVersion: additionalData.paymentTermsVersion || null,
        termsAcceptanceMeta: additionalData.termsAcceptanceMeta || null,
        // Champs Stripe (seront remplis plus tard par createStripeAccount)
        stripeAccountId: null,
        stripeAccountStatus: null,
        kycStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ [Auth] Profil créé dans ${providerCollectionName}/${firebaseUser.uid} pour KYC Stripe`);
      } catch (providerCollErr) {
        // ✅ FIX: Ne pas bloquer l'inscription si l'écriture dans lawyers/expats échoue
        // Le document sera créé par Cloud Function lors du KYC Stripe si nécessaire
        console.warn(`⚠️ [Auth] Écriture non-bloquante dans ${providerCollectionName} échouée:`, providerCollErr);
      }
    }
    
    console.log('✅ User document created with verificationStatus:', approvalFields.verificationStatus);
  } catch (error) {
    console.error('Erreur création document utilisateur:', error);
    throw error;
  }
};

/**
 * getUserDocument : version existante conservée (utile à refreshUser),
 * mais ⚠️ la lecture initiale ne s'appuie PLUS dessus — elle passe par le flux 2 temps plus bas.
 *
 * ⚠️ CORRECTION: Cette fonction ne doit JAMAIS créer un document avec role='client'
 * car cela corromprait le rôle des prestataires (lawyers/expats).
 */
const getUserDocument = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  const refUser = doc(db, 'users', firebaseUser.uid);

  let snap: any;
  try {
    snap = await getDoc(refUser);
  } catch (error) {
    // ⚠️ CORRECTION: Ne pas créer de document en cas d'erreur de permission
    // Retourner null pour signaler que l'utilisateur n'a pas de profil
    console.error('[Auth] getUserDocument permission error:', error);
    return null;
  }

  // ⚠️ CORRECTION: Si le document n'existe pas, retourner null
  // Ne JAMAIS créer un document avec role='client' par défaut
  if (!snap.exists()) {
    console.warn('[Auth] getUserDocument: document does not exist for uid:', firebaseUser.uid);
    return null;
  }

  const data = snap.data() as Partial<User>;

  setDoc(refUser, {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
  }, { merge: true }).catch(() => { /* no-op */ });

  return {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    isVerifiedEmail: firebaseUser.emailVerified,
    isOnline: data.isOnline ?? (data.role === 'client'),
  } as User;
};

/* =========================================================
   Mise à jour présence (sos_profiles = source de vérité)
   ========================================================= */
const writeSosPresence = async (
  userId: string,
  role: User['role'] | undefined,
  isOnline: boolean
): Promise<void> => {
  const sosRef = doc(db, 'sos_profiles', userId);
  const payload = {
    isOnline,
    availability: isOnline ? 'available' : 'unavailable',
    lastStatusChange: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Ne pas modifier isVisible/isVisibleOnMap ici - c'est géré par l'approbation
  };

  try {
    await updateDoc(sosRef, payload);
  } catch {
    await setDoc(
      sosRef,
      {
        id: userId,
        fullName: '',
        rating: 5,
        reviewCount: 0,
        isActive: true,
        isApproved: false,
        approvalStatus: 'pending',
        isVisible: false,
        isVisibleOnMap: false,
        createdAt: serverTimestamp(),
        ...payload,
      },
      { merge: true }
    );
  }
};

const writeUsersPresenceBestEffort = async (
  userId: string,
  isOnline: boolean
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      isOnline,
      availability: isOnline ? 'available' : 'unavailable',
      lastStatusChange: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[Presence] update users ignoré (règles):', e);
  }
};

/* =========================================================
   Provider
   ========================================================= */
interface Props {
  children: ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  /** ================================
   * 1) Écouter l'auth et stocker l'utilisateur
   * ================================ */
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /** P0 FIX: isFullyReady = authInitialized AND (user loaded OR no user logged in)
   * Cet état est le seul à utiliser pour les protections de routes
   * car il garantit que toutes les données utilisateur sont chargées */
  const isFullyReady = useMemo(() => {
    // Not ready if auth not initialized
    if (!authInitialized) {
      return false;
    }
    // If loading user data, not ready
    if (isLoading) {
      return false;
    }
    // Ready: either we have a user, or there's no authUser (no login)
    return true;
  }, [authInitialized, isLoading]);
  const [authMetrics, setAuthMetrics] = useState<AuthMetrics>({
    loginAttempts: 0,
    lastAttempt: new Date(),
    successfulLogins: 0,
    failedLogins: 0,
    googleAttempts: 0,
    roleRestrictionBlocks: 0,
    passwordResetRequests: 0,
    emailUpdateAttempts: 0,
    profileUpdateAttempts: 0,
  });

  const deviceInfo = useMemo(getDeviceInfo, []);

  // Flag déconnexion pour éviter les réinjections via snapshot
  const signingOutRef = useRef<boolean>(false);

  // Garder trace de l'ancien uid pour détecter les changements d'utilisateur
  const previousAuthUserUidRef = useRef<string | null>(null);

  // Ref pour tracker si onAuthStateChanged a répondu (évite problème de closure)
  const authStateReceivedRef = useRef(false);

  // onAuthStateChanged → ne fait que stocker l'utilisateur auth
  useEffect(() => {
    authStateReceivedRef.current = false;

    // Timeout de sécurité: si onAuthStateChanged ne répond pas en 3s,
    // on considère l'utilisateur comme déconnecté pour éviter une page blanche infinie
    const safetyTimeoutId = setTimeout(() => {
      if (!authStateReceivedRef.current) {
        console.warn('🔐 [AuthContext] ⚠️ onAuthStateChanged timeout (3s) - forçant authInitialized=true');
        setUser(null);
        setIsLoading(false);
        setAuthInitialized(true);
      }
    }, 3000);

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      authStateReceivedRef.current = true;
      clearTimeout(safetyTimeoutId);

      // Si l'utilisateur change (login après logout ou nouveau login),
      // reset les refs de subscription pour que le nouveau listener démarre proprement
      const isNewUser = u && u.uid !== previousAuthUserUidRef.current;
      const isSameUser = u && u.uid === previousAuthUserUidRef.current;

      if (isNewUser) {
        subscribed.current = false;
        firstSnapArrived.current = false;
      }
      previousAuthUserUidRef.current = u?.uid ?? null;

      // P0 FIX: Only set loading=true for actual user changes (login/logout)
      // NOT for token refreshes or focus events with the same user
      // This prevents unnecessary component unmounting via ProtectedRoute
      if (!isSameUser) {
        setIsLoading(true);
      }

      setAuthUser(u);
      setFirebaseUser(u ?? null);
      if (!u) {
        // Pas d'utilisateur → on nettoie l'état applicatif
        setUser(null);
        signingOutRef.current = false;
        setIsLoading(false);
        setAuthInitialized(true);
      }
    });
    return () => {
      clearTimeout(safetyTimeoutId);
      unsubAuth();
    };
  }, []);

  /** ============================================================
   * 2) Accéder à /users/{uid} UNIQUEMENT quand on a un authUser
   *    + protection StrictMode (double montage) pour éviter 2 abonnements
   * ============================================================ */
  const subscribed = useRef(false);
  const firstSnapArrived = useRef(false);

  useEffect(() => {
    if (!authUser) {
      return;               // attendre l'auth
    }
    if (subscribed.current) {
      return;      // éviter double abonnement en StrictMode
    }

    subscribed.current = true;
    firstSnapArrived.current = false;
    setIsLoading(true);

    const uid = authUser.uid;
    const refUser = doc(db, 'users', uid);

    let unsubUser: undefined | (() => void);
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let restFallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // OPTIMISATION: Utiliser UNIQUEMENT onSnapshot() qui retourne les données initiales
    // au premier callback. Évite la double lecture (getDoc + onSnapshot).
    // Si le premier callback n'arrive pas dans 15s, on initialise avec les données Auth minimales.

    const listenerStartTime = Date.now();

    // 🚀 FIX RACE CONDITION: Fallbacks séquentiels avec annulation centralisée
    // Au lieu de lancer tous les timeouts en parallèle, on utilise une chaîne séquentielle
    // Chaque fallback vérifie d'abord si les données sont déjà arrivées avant d'agir

    const cancelAllFallbacks = () => {
      if (fallbackTimeoutId) { clearTimeout(fallbackTimeoutId); fallbackTimeoutId = null; }
      if (restFallbackTimeoutId) { clearTimeout(restFallbackTimeoutId); restFallbackTimeoutId = null; }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    };

    // Fallback 1: getDoc après 5s si onSnapshot n'a pas répondu
    fallbackTimeoutId = setTimeout(async () => {
      // Double-check avant d'agir (protection contre race condition)
      if (firstSnapArrived.current || cancelled) {
        console.log("🔐 [AuthContext] Fallback getDoc annulé - données déjà reçues");
        return;
      }

      const elapsed = Date.now() - listenerStartTime;
      console.warn(`🔐 [AuthContext] ⚠️ [${elapsed}ms] onSnapshot n'a pas répondu en 5s, tentative getDoc directe...`);

      try {
        console.log("🔐 [AuthContext] 📥 Exécution getDoc(users/" + uid + ")...");
        const directSnap = await getDoc(refUser);
        const getDocElapsed = Date.now() - listenerStartTime;
        console.log(`🔐 [AuthContext] 📥 getDoc terminé en ${getDocElapsed}ms, exists=${directSnap.exists()}`);

        // Re-vérifier après l'await (onSnapshot peut avoir répondu entre temps)
        if (firstSnapArrived.current || cancelled) {
          console.log("🔐 [AuthContext] getDoc ignoré - données déjà reçues via onSnapshot");
          return;
        }

        if (directSnap.exists()) {
          console.log("✅ [AuthContext] getDoc réussi, données:", directSnap.data());
          const data = directSnap.data() as Partial<User>;
          cancelAllFallbacks(); // Annuler les autres fallbacks
          firstSnapArrived.current = true; // Marquer AVANT setUser pour éviter les doublons
          setUser({
            ...(data as User),
            id: uid,
            uid,
            email: data.email || authUser.email || null,
            isVerifiedEmail: authUser.emailVerified,
          } as User);
          setIsLoading(false);
          setAuthInitialized(true);
          console.log("✅ [AuthContext] 🏁 User chargé via fallback getDoc - isLoading=false");
        } else {
          console.warn("⚠️ [AuthContext] getDoc: document users/" + uid + " n'existe pas!");
          // Ne pas annuler les autres fallbacks - laisser le REST API essayer
        }
      } catch (e) {
        const errorElapsed = Date.now() - listenerStartTime;
        console.error(`❌ [AuthContext] [${errorElapsed}ms] getDoc fallback échoué:`, e);
        // Ne pas annuler les autres fallbacks - laisser le REST API essayer
      }
    }, 5000);

    // Fallback 2: REST API après 10s si tout le SDK Firestore est bloqué
    restFallbackTimeoutId = setTimeout(async () => {
      // Double-check avant d'agir
      if (firstSnapArrived.current || cancelled) {
        console.log("🔐 [AuthContext] Fallback REST API annulé - données déjà reçues");
        return;
      }

      const elapsed = Date.now() - listenerStartTime;
      console.warn(`🔐 [AuthContext] ⚠️ [${elapsed}ms] SDK Firestore bloqué, tentative REST API...`);

      try {
        const token = await authUser.getIdToken();
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

        console.log("🔐 [AuthContext] 🌐 Appel REST API:", restUrl);
        const response = await fetch(restUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        // Re-vérifier après l'await
        if (firstSnapArrived.current || cancelled) {
          console.log("🔐 [AuthContext] REST API ignoré - données déjà reçues");
          return;
        }

        if (response.ok) {
          const restData = await response.json();
          console.log("✅ [AuthContext] REST API réponse:", restData);

          const fields = restData.fields || {};
          const userData: Partial<User> = {};

          for (const [key, value] of Object.entries(fields)) {
            const fieldValue = value as { stringValue?: string; integerValue?: string; booleanValue?: boolean; timestampValue?: string };
            if (fieldValue.stringValue !== undefined) userData[key as keyof User] = fieldValue.stringValue as any;
            else if (fieldValue.integerValue !== undefined) userData[key as keyof User] = parseInt(fieldValue.integerValue) as any;
            else if (fieldValue.booleanValue !== undefined) userData[key as keyof User] = fieldValue.booleanValue as any;
            else if (fieldValue.timestampValue !== undefined) userData[key as keyof User] = new Date(fieldValue.timestampValue) as any;
          }

          cancelAllFallbacks(); // Annuler les autres fallbacks
          firstSnapArrived.current = true; // Marquer AVANT setUser
          setUser({
            ...(userData as User),
            id: uid,
            uid,
            email: userData.email || authUser.email || null,
            isVerifiedEmail: authUser.emailVerified,
          } as User);
          setIsLoading(false);
          setAuthInitialized(true);
          console.log("✅ [AuthContext] 🏁 User chargé via REST API fallback - isLoading=false");
          console.log("💡 [AuthContext] Le SDK Firestore est bloqué mais l'app fonctionne via REST API");
        } else if (response.status === 404) {
          console.warn("⚠️ [AuthContext] REST API: document users/" + uid + " n'existe pas");
        } else {
          console.error("❌ [AuthContext] REST API erreur:", response.status, await response.text());
        }
      } catch (e) {
        console.error("❌ [AuthContext] REST API fallback échoué:", e);
      }
    }, 10000);

    // Timeout de secours final si rien ne fonctionne
    const authTimeout = 30000; // 30 secondes max
    console.log(`🔐 [AuthContext] ⏰ Timeout final configuré: ${authTimeout}ms`);
    timeoutId = setTimeout(() => {
      const elapsed = Date.now() - listenerStartTime;
      if (!firstSnapArrived.current && !cancelled) {
        console.error(`❌ [AuthContext] 💀 TIMEOUT FATAL [${elapsed}ms] - Firestore complètement inaccessible!`);
        console.error(`❌ [AuthContext] Diagnostic:`, {
          authUserUid: authUser?.uid,
          subscribedCurrent: subscribed.current,
          firstSnapArrivedCurrent: firstSnapArrived.current,
          cancelled,
          navigator_online: typeof navigator !== 'undefined' ? navigator.onLine : 'N/A',
        });
        setError('Impossible de charger votre profil. Vérifiez votre connexion et rafraîchissez.');
        setIsLoading(false);
        setAuthInitialized(true); // FIX CRITIQUE: Permet à isFullyReady de devenir true même en cas de timeout
        firstSnapArrived.current = true; // Éviter les doubles timeouts
      }
    }, authTimeout);

    // Un seul listener qui gère TOUT : données initiales + mises à jour temps réel
    unsubUser = onSnapshot(
      refUser,
      async (docSnap) => {
        if (signingOutRef.current || cancelled) {
          return;
        }

        // ✅ FIX: Annuler TOUS les fallbacks car onSnapshot a répondu
        cancelAllFallbacks();

        // Document n'existe pas → peut être une race condition avec la Cloud Function
        // ⚠️ CORRECTION: Ne PAS créer un document avec role='client' par défaut
        // Cela corromprait le rôle des prestataires (lawyers/expats) si leur document
        // n'a pas encore été répliqué ou s'il y a une erreur de timing
        if (!docSnap.exists()) {
          console.warn("🔐 [AuthContext] Document users/" + uid + " n'existe pas - possible race condition");
          console.warn("🔐 [AuthContext] Cloud Function peut encore être en cours d'exécution...");

          // ✅ FIX RACE CONDITION: Retry polling avec backoff progressif
          // La Cloud Function peut prendre jusqu'à 10-15s sur réseau lent
          if (!firstSnapArrived.current) {
            const MAX_RETRIES = 20; // 20 retries
            const BASE_DELAY = 300; // Commence à 300ms
            const MAX_DELAY = 1500; // Max 1.5s entre retries
            // Total max: ~15-20 secondes

            console.log("🔄 [AuthContext] Démarrage du polling avec backoff progressif...");

            let totalWaitTime = 0;
            for (let retry = 1; retry <= MAX_RETRIES; retry++) {
              // Backoff progressif: 300ms, 450ms, 675ms, 1000ms, 1500ms, 1500ms...
              const delay = Math.min(BASE_DELAY * Math.pow(1.5, retry - 1), MAX_DELAY);
              await new Promise(resolve => setTimeout(resolve, delay));
              totalWaitTime += delay;

              if (cancelled) {
                console.log("🔄 [AuthContext] Polling annulé (cancelled=true)");
                return;
              }

              console.log(`🔄 [AuthContext] Retry ${retry}/${MAX_RETRIES} (${Math.round(totalWaitTime/1000)}s écoulées)...`);

              try {
                const retrySnap = await getDoc(refUser);

                if (retrySnap.exists()) {
                  console.log(`✅ [AuthContext] Document trouvé après ${retry} retry(s) (${Math.round(totalWaitTime/1000)}s)!`);
                  // Document trouvé! Traiter les données
                  const data = retrySnap.data() as Partial<User>;

                  setUser((prev) => {
                    const merged: User = {
                      ...(prev ?? ({} as User)),
                      ...(data as Partial<User>),
                      id: uid,
                      uid,
                      email: data.email || authUser.email || prev?.email || null,
                      createdAt:
                        data.createdAt instanceof Timestamp
                          ? data.createdAt.toDate()
                          : prev?.createdAt || new Date(),
                      updatedAt:
                        data.updatedAt instanceof Timestamp
                          ? data.updatedAt.toDate()
                          : new Date(),
                      lastLoginAt:
                        (data as any).lastLoginAt instanceof Timestamp
                          ? (data as any).lastLoginAt.toDate()
                          : new Date(),
                      isVerifiedEmail: authUser.emailVerified,
                    } as User;
                    return merged;
                  });

                  cancelAllFallbacks(); // ✅ FIX: Annuler tous les timeouts
                  firstSnapArrived.current = true;
                  setIsLoading(false);
                  setAuthInitialized(true);
                  return;
                }
              } catch (pollError) {
                console.warn(`⚠️ [AuthContext] Erreur polling retry ${retry}:`, pollError);
                // Continuer le polling malgré l'erreur
              }
            }

            // Après tous les retries (~15-20s), le document n'existe toujours pas
            console.error("❌ [AuthContext] Document toujours absent après " + MAX_RETRIES + " retries (~" + Math.round(totalWaitTime/1000) + "s)");
            cancelAllFallbacks(); // ✅ FIX: Annuler tous les timeouts même en cas d'échec

            // ✅ FIX: Tenter de réparer le compte orphelin via Cloud Function
            console.log("🔧 [AuthContext] Tentative de réparation du compte orphelin...");
            try {
              const repairFn = httpsCallable(functions, 'repairOrphanedUser');
              const result = await repairFn({});
              const repairData = result.data as { success: boolean; repaired: boolean; role?: string; message: string };

              if (repairData.success && repairData.repaired) {
                console.log("✅ [AuthContext] Compte réparé avec succès:", repairData);
                // Relire le document maintenant qu'il existe
                const repairedSnap = await getDoc(refUser);
                if (repairedSnap.exists()) {
                  const data = repairedSnap.data() as Partial<User>;
                  setUser((prev) => ({
                    ...(prev ?? ({} as User)),
                    ...(data as Partial<User>),
                    id: uid,
                    uid,
                    email: data.email || authUser.email || prev?.email || null,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : prev?.createdAt || new Date(),
                    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
                    isVerifiedEmail: authUser.emailVerified,
                  } as User));
                  firstSnapArrived.current = true;
                  setIsLoading(false);
                  setAuthInitialized(true);
                  return;
                }
              }
            } catch (repairError) {
              console.error("❌ [AuthContext] Échec de la réparation:", repairError);
            }

            // Si la réparation échoue, afficher l'erreur originale
            setError('La création de votre profil prend plus de temps que prévu. Veuillez rafraîchir la page dans quelques secondes.');
            firstSnapArrived.current = true;
            setIsLoading(false);
            setAuthInitialized(true);
          }

          return;
        }

        // Document existe → utiliser les données
        const data = docSnap.data() as Partial<User>;

        setUser((prev) => {
          const merged: User = {
            ...(prev ?? ({} as User)),
            ...(data as Partial<User>),
            id: uid,
            uid,
            // S'assurer que l'email vient de authUser si absent de Firestore
            email: data.email || authUser.email || prev?.email || null,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : prev?.createdAt || new Date(),
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : new Date(),
            lastLoginAt:
              (data as any).lastLoginAt instanceof Timestamp
                ? (data as any).lastLoginAt.toDate()
                : new Date(),
            isVerifiedEmail: authUser.emailVerified,
          } as User;

          // P0 FIX: Avoid unnecessary re-renders by checking if important fields changed
          // Only compare fields that actually affect UI to prevent infinite loops
          if (prev) {
            const importantFieldsUnchanged =
              prev.role === merged.role &&
              prev.kycStatus === merged.kycStatus &&
              prev.stripeOnboardingComplete === merged.stripeOnboardingComplete &&
              prev.chargesEnabled === merged.chargesEnabled &&
              prev.paymentGateway === merged.paymentGateway &&
              prev.paypalOnboardingComplete === merged.paypalOnboardingComplete &&
              prev.paypalAccountStatus === merged.paypalAccountStatus &&
              prev.isOnline === merged.isOnline &&
              prev.approvalStatus === merged.approvalStatus &&
              prev.email === merged.email &&
              prev.profilePhoto === merged.profilePhoto;

            if (importantFieldsUnchanged) {
              // Return previous state to avoid re-render
              return prev;
            }
          }

          return merged;
        });

        if (!firstSnapArrived.current) {
          console.log(`✅ [AuthContext] First snapshot for users/${uid}`);

          firstSnapArrived.current = true;
          setIsLoading(false);
          setAuthInitialized(true);
        }
      },
      (err) => {
        // ✅ FIX: Ignorer les erreurs si déconnexion en cours ou listener annulé
        // Cela évite les erreurs "permission-denied" qui apparaissent lors de la déconnexion
        if (signingOutRef.current || cancelled) {
          console.log(`🔐 [AuthContext] Erreur listener ignorée (déconnexion en cours ou annulé)`);
          return;
        }

        const errorElapsed = Date.now() - listenerStartTime;
        // ✅ FIX: Annuler TOUS les fallbacks en cas d'erreur
        cancelAllFallbacks();

        const errorCode = (err as any)?.code || 'unknown';

        // ✅ FIX: Ne pas logger comme erreur critique si c'est juste une permission expirée après longtemps
        // (session expirée naturellement après > 60s d'inactivité)
        if (errorCode === 'permission-denied' && errorElapsed > 60000) {
          console.warn(`⚠️ [AuthContext] [${errorElapsed}ms] Session expirée pour users/${uid} - déconnexion silencieuse`);
          // Déconnecter proprement l'utilisateur au lieu d'afficher une erreur
          setUser(null);
          setIsLoading(false);
          setAuthInitialized(true);
          return;
        }

        console.error(`❌ [AuthContext] [${errorElapsed}ms] [users/${uid}] Erreur listener:`, err);
        console.error(`❌ [AuthContext] Error details:`, {
          name: (err as Error)?.name,
          message: (err as Error)?.message,
          code: errorCode,
          stack: (err as Error)?.stack,
        });

        // ⚠️ CORRECTION: En cas d'erreur, NE PAS définir role='client' par défaut
        // Cela corromprait le rôle des prestataires si Firestore a une erreur temporaire
        if (!firstSnapArrived.current) {
          // ✅ Afficher une erreur au lieu d'écraser le rôle
          if (errorCode === 'permission-denied') {
            setError('Accès refusé à votre profil. Veuillez vous reconnecter.');
          } else {
            setError('Erreur de connexion au serveur. Veuillez rafraîchir la page.');
          }
          // NE PAS définir setUser avec role='client' !
          firstSnapArrived.current = true;
        }

        setIsLoading(false);
        setAuthInitialized(true);
      }
    );

    // cleanup (StrictMode monte/démonte 2x)
    return () => {
      cancelled = true;
      subscribed.current = false;
      // ✅ FIX: Nettoyer TOUS les timeouts pour éviter les race conditions
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (fallbackTimeoutId) {
        clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = null;
      }
      // ✅ FIX: Nettoyer aussi le REST API fallback timeout
      if (restFallbackTimeoutId) {
        clearTimeout(restFallbackTimeoutId);
        restFallbackTimeoutId = null;
      }
      unsubUser?.();
    };
  }, [authUser?.uid]);

  /* ============================
     Méthodes d'auth (useCallback)
     ============================ */

  const isUserLoggedIn = useCallback(() => !!user || !!firebaseUser, [user, firebaseUser]);

  const updateUserState = useCallback(async (fbUser: FirebaseUser) => {
    // Conserve pour refreshUser : lecture manuelle ponctuelle
    try {
      const u = await getUserDocument(fbUser);
      if (u) {
        setUser({ ...u, isVerifiedEmail: fbUser.emailVerified });
        setAuthMetrics((m) => ({
          ...m,
          successfulLogins: m.successfulLogins + 1,
          lastAttempt: new Date(),
        }));
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('[Auth] updateUserState error:', e);
      setUser(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false): Promise<void> => {
    // VERSION 8 - DEBUG AUTH
    console.log("[DEBUG] " + "🔐 LOGIN: Début\n\nEmail: " + email + "\nRemember: " + rememberMe);

    setIsLoading(true);
    setError(null);
    setAuthMetrics((m) => ({ ...m, loginAttempts: m.loginAttempts + 1, lastAttempt: new Date() }));

    if (!email || !password) {
      const msg = 'Email et mot de passe sont obligatoires';
      console.log("[DEBUG] " + "❌ LOGIN: Email ou mot de passe manquant");
      setError(msg);
      setIsLoading(false);
      setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
      throw new Error(msg);
    }

    try {
      console.log("[DEBUG] " + "🔐 LOGIN: setPersistence...");
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      console.log("[DEBUG] " + "🔐 LOGIN: signInWithEmailAndPassword...");

      const timeout = deviceInfo.connectionSpeed === 'slow' ? 15000 : 10000;
      const loginPromise = signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      const cred = await Promise.race([
        loginPromise,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('auth/timeout')), timeout)),
      ]);

      console.log("[DEBUG] " + "✅ LOGIN RÉUSSI!\n\nUID: " + cred.user.uid + "\nEmail: " + cred.user.email);

      logAuthEvent('successful_login', {
        userId: cred.user.uid,
        provider: 'email',
        rememberMe,
        deviceInfo
      }).catch(() => {});

      // ✅ FIX: Signaler le login aux autres onglets via localStorage
      try {
        localStorage.setItem('sos_login_event', Date.now().toString());
        setTimeout(() => localStorage.removeItem('sos_login_event'), 100);
      } catch { /* Ignorer si localStorage n'est pas disponible */ }
    } catch (e) {
      const errorCode = (e as any)?.code || (e instanceof Error ? e.message : '');
      console.log("[DEBUG] " + "❌ LOGIN ERREUR!\n\nCode: " + errorCode + "\nMessage: " + (e instanceof Error ? e.message : String(e)));
      console.error("❌ [AuthContext] login() Error code:", errorCode);

      // Mapping des erreurs Firebase Auth vers des messages utilisateur explicites
      const errorMessages: Record<string, string> = {
        'auth/timeout': 'Connexion trop lente, réessayez.',
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/user-disabled': 'Ce compte a été désactivé. Contactez le support.',
        'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
        'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
        'auth/internal-error': 'Erreur serveur. Réessayez plus tard.',
        'auth/popup-closed-by-user': 'Connexion annulée.',
      };

      const msg = errorMessages[errorCode] || 'Email ou mot de passe invalide.';
      setError(msg);
      setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('login_failed', {
        error: errorCode,
        email: normalizeEmail(email),
        deviceInfo
      }).catch(() => { /* ignoré */ });
      // ✅ FIX: Conserver le code d'erreur Firebase pour que QuickAuthWizard puisse le lire
      const authError = new Error(msg) as Error & { code?: string };
      authError.code = errorCode;
      throw authError;
    } finally {
      setIsLoading(false);
    }
  }, [deviceInfo]);

  const loginWithGoogle = useCallback(async (rememberMe: boolean = false): Promise<void> => {
    // VERSION 10 - PRODUCTION READY: Mobile + Desktop compatible
    console.log("[DEBUG] " + "🔵 GOOGLE LOGIN: Début (v10 - production ready)");

    // 🚫 BLOQUER les WebViews in-app (Instagram, Facebook, TikTok, etc.)
    // Ces navigateurs ne supportent pas Google Auth correctement
    if (isInAppBrowser()) {
      console.log("[DEBUG] " + "❌ GOOGLE LOGIN: WebView in-app détecté - bloqué");
      const browserName = /Instagram/i.test(navigator.userAgent) ? 'Instagram' :
                          /FBAN|FBAV/i.test(navigator.userAgent) ? 'Facebook' :
                          /TikTok/i.test(navigator.userAgent) ? 'TikTok' :
                          /Twitter/i.test(navigator.userAgent) ? 'Twitter' :
                          /LinkedIn/i.test(navigator.userAgent) ? 'LinkedIn' :
                          'cette application';
      setError(`La connexion Google n'est pas supportée depuis ${browserName}. Veuillez ouvrir le site dans Safari ou Chrome.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAuthMetrics((m) => ({
      ...m,
      loginAttempts: m.loginAttempts + 1,
      googleAttempts: m.googleAttempts + 1,
      lastAttempt: new Date(),
    }));

    // Détecter si on doit forcer redirect (iOS, Samsung, etc.)
    const forceRedirect = shouldForceRedirectAuth();
    console.log("[DEBUG] " + "🔵 GOOGLE LOGIN: forceRedirect=" + forceRedirect + " (iOS/WebView/Samsung)");

    try {
      console.log("[DEBUG] " + "🔵 GOOGLE LOGIN: Création provider...");
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });

      // FIX iOS Safari: setPersistence SANS await pour ne pas casser le lien
      // avec le geste utilisateur (tap). Safari bloque les popups si un await
      // asynchrone s'intercale entre le tap et le window.open() interne.
      // setPersistence est fire-and-forget: Firebase l'applique avant le prochain signIn.
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      setPersistence(auth, persistenceType).catch((err) =>
        console.warn("[DEBUG] setPersistence error (non-blocking):", err)
      );

      // 📱 Sur iOS et navigateurs problématiques: forcer redirect directement
      if (forceRedirect) {
        console.log("[DEBUG] " + "🔄 GOOGLE LOGIN: Mode REDIRECT forcé (mobile/iOS)...");
        // If a booking is in progress, save the booking target instead of current page
        let redirectTarget = window.location.pathname + window.location.search;
        try {
          const loginRedirect = sessionStorage.getItem('loginRedirect');
          if (loginRedirect) {
            redirectTarget = loginRedirect;
          }
        } catch {}
        safeStorage.setItem('googleAuthRedirect', redirectTarget);
        await signInWithRedirect(auth, provider);
        return;
      }

      // 💻 Sur Desktop: essayer popup d'abord
      console.log("[DEBUG] " + "🔵 GOOGLE LOGIN: Tentative POPUP (desktop)...");
      try {
        const result = await signInWithPopup(auth, provider);
        console.log("[DEBUG] " + "✅ GOOGLE POPUP: Succès! UID: " + result.user.uid);

        // Process the user directly (same logic as redirect handler)
        const googleUser = result.user;

        // 🔧 FIX: Force token refresh to ensure Firestore rules recognize the new user
        // Without this, Firestore may reject writes because the auth token isn't propagated yet
        console.log("[DEBUG] " + "🔄 GOOGLE POPUP: Rafraîchissement du token...");
        await googleUser.getIdToken(true);
        // ✅ Délai adaptatif selon la connexion (500ms rapide, 1500ms lent, 1000ms par défaut)
        const tokenPropagationDelay = deviceInfo.connectionSpeed === 'slow' ? 1500 :
                                       deviceInfo.connectionSpeed === 'fast' ? 500 : 1000;
        console.log("[DEBUG] " + "⏳ GOOGLE POPUP: Attente propagation token (" + tokenPropagationDelay + "ms)...");
        await new Promise(resolve => setTimeout(resolve, tokenPropagationDelay));
        console.log("[DEBUG] " + "✅ GOOGLE POPUP: Token rafraîchi");

        const userRef = doc(db, 'users', googleUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const existing = userDoc.data() as Partial<User>;
          if (existing.role && existing.role !== 'client') {
            console.log("[DEBUG] " + "❌ GOOGLE POPUP: Rôle non-client - " + existing.role);
            await firebaseSignOut(auth);
            setError('Les comptes Google sont réservés aux clients.');
            throw new Error('Role restriction');
          }
          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: true,
          });
        } else {
          // Create new client user via Cloud Function (bypasses Firestore security rules)
          console.log("[DEBUG] " + "🔵 GOOGLE POPUP: Création du document via Cloud Function...");

          // ✅ FIX ORPHAN USERS: Retry avec backoff exponentiel
          const MAX_RETRIES = 3;
          let lastError: Error | null = null;

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              const result = await createUserDocumentViaCloudFunction(googleUser, {
                role: 'client',
                email: googleUser.email || '',
                preferredLanguage: 'fr',
                provider: 'google.com',
                ...(googleUser.photoURL && { profilePhoto: googleUser.photoURL, photoURL: googleUser.photoURL }),
              });
              console.log("[DEBUG] " + "✅ GOOGLE POPUP: Document " + result.action + " via Cloud Function (tentative " + attempt + ")");
              lastError = null; // Succès, pas d'erreur
              break; // Sortir de la boucle de retry
            } catch (createError) {
              lastError = createError instanceof Error ? createError : new Error(String(createError));
              console.error("[DEBUG] " + "❌ GOOGLE POPUP: Échec Cloud Function (tentative " + attempt + "/" + MAX_RETRIES + "):", createError);

              if (attempt < MAX_RETRIES) {
                // Attendre avant le prochain retry (backoff exponentiel: 1s, 2s, 4s)
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log("[DEBUG] " + "🔄 GOOGLE POPUP: Retry dans " + delay + "ms...");
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          // Si tous les retries ont échoué, essayer la création directe en fallback
          if (lastError) {
            console.error("[DEBUG] " + "❌ GOOGLE POPUP: Échec Cloud Function après " + MAX_RETRIES + " tentatives");
            console.log("[DEBUG] " + "🔄 GOOGLE POPUP: Tentative fallback création directe Firestore...");

            // ✅ FIX ORPHAN USERS: Fallback vers création directe si Cloud Function échoue
            try {
              await createUserDocumentInFirestore(googleUser, {
                role: 'client',
                email: googleUser.email || '',
                preferredLanguage: 'fr',
                provider: 'google.com',
                ...(googleUser.photoURL && { profilePhoto: googleUser.photoURL, photoURL: googleUser.photoURL }),
              });
              console.log("[DEBUG] " + "✅ GOOGLE POPUP: Document créé via fallback Firestore direct");
            } catch (fallbackError) {
              console.error("[DEBUG] " + "❌ GOOGLE POPUP: Échec fallback Firestore:", fallbackError);
              // Vérifier si le document existe malgré tout (race condition possible)
              const checkRef = doc(db, 'users', googleUser.uid);
              const checkDoc = await getDoc(checkRef);
              if (!checkDoc.exists()) {
                // Document vraiment absent - afficher erreur mais ne pas bloquer
                console.error("[DEBUG] " + "❌ GOOGLE POPUP: Document utilisateur non créé - orphan user possible");
                setError("Votre compte a été créé mais le profil prend plus de temps. Veuillez rafraîchir la page.");
              } else {
                console.log("[DEBUG] " + "✅ GOOGLE POPUP: Document existait déjà (race condition résolue)");
              }
            }
          }
        }

        console.log("[DEBUG] " + "✅ GOOGLE POPUP: Utilisateur traité avec succès");
        await logAuthEvent('successful_google_login', { userId: googleUser.uid, userEmail: googleUser.email, deviceInfo });

        // ✅ FIX: Signaler le login aux autres onglets via localStorage
        try {
          localStorage.setItem('sos_login_event', Date.now().toString());
          setTimeout(() => localStorage.removeItem('sos_login_event'), 100);
        } catch { /* Ignorer si localStorage n'est pas disponible */ }

        // Check for saved redirect URL
        // SECURITY: Defense-in-depth validation before redirect
        const savedRedirect = safeStorage.getItem('googleAuthRedirect');
        if (savedRedirect) {
          safeStorage.removeItem('googleAuthRedirect');
          if (isAllowedRedirect(savedRedirect)) {
            console.log('[Auth] Google popup: navigating to validated URL:', savedRedirect);
            window.location.href = savedRedirect;
          } else {
            console.warn('[Auth] Google popup: blocked invalid redirect URL:', savedRedirect);
            window.location.href = '/dashboard';
          }
        }
        return;
      } catch (popupError) {
        // If popup was blocked or closed, try redirect as fallback
        const popupErrorCode = (popupError as { code?: string })?.code || '';
        console.log("[DEBUG] " + "⚠️ GOOGLE POPUP échoué: " + popupErrorCode);

        if (popupErrorCode === 'auth/popup-closed-by-user' ||
            popupErrorCode === 'auth/cancelled-popup-request') {
          // User closed popup, don't fallback
          throw popupError;
        }

        if (popupErrorCode === 'auth/popup-blocked') {
          console.log("[DEBUG] " + "🔄 Popup bloqué, fallback vers REDIRECT...");
          // If a booking is in progress, save the booking target instead of current page
          let redirectTarget = window.location.pathname + window.location.search;
          try {
            const loginRedirect = sessionStorage.getItem('loginRedirect');
            if (loginRedirect) {
              redirectTarget = loginRedirect;
            }
          } catch {}
          safeStorage.setItem('googleAuthRedirect', redirectTarget);
          await signInWithRedirect(auth, provider);
          return;
        }

        // For other errors, try redirect as fallback
        console.log("[DEBUG] " + "🔄 Erreur popup, fallback vers REDIRECT...");
        // If a booking is in progress, save the booking target instead of current page
        let redirectTarget = window.location.pathname + window.location.search;
        try {
          const loginRedirect = sessionStorage.getItem('loginRedirect');
          if (loginRedirect) {
            redirectTarget = loginRedirect;
          }
        } catch {}
        safeStorage.setItem('googleAuthRedirect', redirectTarget);
        await signInWithRedirect(auth, provider);
        return;
      }
    } catch (e) {
      const errorCode = (e as any)?.code || 'unknown';
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.log("[DEBUG] " + "❌ GOOGLE LOGIN ERREUR!\n\nCode: " + errorCode + "\nMessage: " + errorMessage);

      let msg = 'Connexion Google impossible.';
      if (errorCode === 'auth/unauthorized-domain') {
        msg = 'Domaine non autorisé. Contactez le support.';
      } else if (errorCode === 'auth/operation-not-allowed') {
        msg = 'Connexion Google non activée. Contactez le support.';
      } else if (errorCode === 'auth/network-request-failed') {
        msg = 'Erreur réseau. Vérifiez votre connexion.';
      } else if (errorCode === 'auth/account-exists-with-different-credential') {
        // ✅ FIX: Gérer le cas où l'email existe déjà avec une autre méthode de connexion
        msg = 'Cet email est déjà associé à un compte. Connectez-vous avec votre mot de passe, puis liez votre compte Google depuis les paramètres.';
      } else if (errorCode === 'auth/credential-already-in-use') {
        msg = 'Ce compte Google est déjà utilisé par un autre utilisateur.';
      } else if (errorCode === 'auth/user-disabled') {
        msg = 'Votre compte a été désactivé. Contactez le support.';
      } else if (errorCode === 'auth/timeout' || errorCode === 'auth/web-storage-unsupported') {
        msg = 'Problème de connexion. Essayez de rafraîchir la page ou utilisez un autre navigateur.';
      }

      setError(msg);
      setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
      logAuthEvent('google_login_failed', { error: errorMessage, errorCode, deviceInfo }).catch(() => {});
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [deviceInfo]);

  // Récupération redirect Google (toujours actif pour éviter erreurs COOP)
  const redirectHandledRef = useRef<boolean>(false);

  // ✅ FIX: Reset redirectHandledRef quand l'utilisateur change (logout/login)
  // Cela permet de réessayer Google Sign-In après un échec ou logout
  useEffect(() => {
    redirectHandledRef.current = false;
  }, [authUser?.uid]);

  useEffect(() => {
    (async () => {
      try {
        if (redirectHandledRef.current) return;

        // VERSION 10 - PRODUCTION READY: avec timeout
        console.log("[DEBUG] " + "🔵 GOOGLE REDIRECT: Vérification du retour...");

        // ⏱️ Timeout pour éviter blocage infini sur certains navigateurs
        // ✅ Augmenté à 60s pour les réseaux lents (3G, pays émergents, Afrique, Asie)
        const REDIRECT_TIMEOUT = 60000; // 60 secondes
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const resultPromise = getRedirectResult(auth);
        const timeoutPromise = new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('REDIRECT_TIMEOUT'));
          }, REDIRECT_TIMEOUT);
        });

        let result;
        try {
          result = await Promise.race([resultPromise, timeoutPromise]);
          if (timeoutId) clearTimeout(timeoutId);
        } catch (raceError) {
          if (timeoutId) clearTimeout(timeoutId);
          if ((raceError as Error).message === 'REDIRECT_TIMEOUT') {
            console.warn("[DEBUG] " + "⚠️ GOOGLE REDIRECT: Timeout après " + REDIRECT_TIMEOUT + "ms - abandon");
            return;
          }
          throw raceError;
        }

        if (!result?.user) {
          console.log("[DEBUG] " + "🔵 GOOGLE REDIRECT: Pas de résultat (normal si pas de redirect en cours)");
          return;
        }

        console.log("[DEBUG] " + "✅ GOOGLE REDIRECT: User reçu!\n\nUID: " + result.user.uid + "\nEmail: " + result.user.email);

        redirectHandledRef.current = true;
        const googleUser = result.user;

        // 🔧 FIX: Force token refresh to ensure Firestore rules recognize the new user
        console.log("[DEBUG] " + "🔄 GOOGLE REDIRECT: Rafraîchissement du token...");
        await googleUser.getIdToken(true);
        // ✅ Délai adaptatif selon la connexion (500ms rapide, 1500ms lent, 1000ms par défaut)
        const tokenPropagationDelayRedirect = deviceInfo.connectionSpeed === 'slow' ? 1500 :
                                               deviceInfo.connectionSpeed === 'fast' ? 500 : 1000;
        console.log("[DEBUG] " + "⏳ GOOGLE REDIRECT: Attente propagation token (" + tokenPropagationDelayRedirect + "ms)...");
        await new Promise(resolve => setTimeout(resolve, tokenPropagationDelayRedirect));
        console.log("[DEBUG] " + "✅ GOOGLE REDIRECT: Token rafraîchi");

        const userRef = doc(db, 'users', googleUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const existing = userDoc.data() as Partial<User>;
          if (existing.role && existing.role !== 'client') {
            console.log("[DEBUG] " + "❌ GOOGLE REDIRECT: Rôle non-client détecté - " + existing.role);
            await firebaseSignOut(auth);
            setAuthMetrics((m) => ({
              ...m,
              failedLogins: m.failedLogins + 1,
              roleRestrictionBlocks: m.roleRestrictionBlocks + 1,
            }));
            setError('Les comptes Google sont réservés aux clients. En tant que prestataire, connectez-vous avec votre email et mot de passe.');
            // Log en arrière-plan (ne pas bloquer le UI)
            logAuthEvent('google_login_role_restriction', {
              userId: googleUser.uid,
              role: existing.role,
              email: googleUser.email,
              deviceInfo
            }).catch(() => { /* ignoré */ });
            return;
          }
          // Split displayName if firstName/lastName are missing
          const needsNameSplit = !existing.firstName || !existing.lastName;
          const { firstName, lastName } = needsNameSplit 
            ? splitDisplayName(googleUser.displayName)
            : { firstName: existing.firstName, lastName: existing.lastName };
          
          // Always update photo from Google to ensure it's current
          const photoUpdates = googleUser.photoURL ? {
            photoURL: googleUser.photoURL,
            profilePhoto: googleUser.photoURL,
            avatar: googleUser.photoURL,
          } : {};
          
          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: true,
            ...(needsNameSplit && {
              firstName: firstName || '',
              lastName: lastName || '',
              fullName: `${firstName} ${lastName}`.trim() || googleUser.displayName || '',
            }),
            ...photoUpdates,
          });
        } else {
          // Create new user via Cloud Function (bypasses Firestore security rules)
          console.log("[DEBUG] " + "🔵 GOOGLE REDIRECT: Création du document via Cloud Function...");

          // ✅ FIX ORPHAN USERS: Retry avec backoff exponentiel
          const MAX_RETRIES = 3;
          let lastError: Error | null = null;

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              const result = await createUserDocumentViaCloudFunction(googleUser, {
                role: 'client',
                email: googleUser.email || '',
                preferredLanguage: 'fr',
                provider: 'google.com',
                ...(googleUser.photoURL && { profilePhoto: googleUser.photoURL, photoURL: googleUser.photoURL }),
              });
              console.log("[DEBUG] " + "✅ GOOGLE REDIRECT: Document " + result.action + " via Cloud Function (tentative " + attempt + ")");
              lastError = null;
              break;
            } catch (createError) {
              lastError = createError instanceof Error ? createError : new Error(String(createError));
              console.error("[DEBUG] " + "❌ GOOGLE REDIRECT: Échec Cloud Function (tentative " + attempt + "/" + MAX_RETRIES + "):", createError);

              if (attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt - 1) * 1000;
                console.log("[DEBUG] " + "🔄 GOOGLE REDIRECT: Retry dans " + delay + "ms...");
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          // Si tous les retries ont échoué, essayer la création directe en fallback
          if (lastError) {
            console.error("[DEBUG] " + "❌ GOOGLE REDIRECT: Échec Cloud Function après " + MAX_RETRIES + " tentatives");
            console.log("[DEBUG] " + "🔄 GOOGLE REDIRECT: Tentative fallback création directe Firestore...");

            // ✅ FIX ORPHAN USERS: Fallback vers création directe si Cloud Function échoue
            try {
              await createUserDocumentInFirestore(googleUser, {
                role: 'client',
                email: googleUser.email || '',
                preferredLanguage: 'fr',
                provider: 'google.com',
                ...(googleUser.photoURL && { profilePhoto: googleUser.photoURL, photoURL: googleUser.photoURL }),
              });
              console.log("[DEBUG] " + "✅ GOOGLE REDIRECT: Document créé via fallback Firestore direct");
            } catch (fallbackError) {
              console.error("[DEBUG] " + "❌ GOOGLE REDIRECT: Échec fallback Firestore:", fallbackError);
              // Vérifier si le document existe malgré tout (race condition possible)
              const checkRef = doc(db, 'users', googleUser.uid);
              const checkDoc = await getDoc(checkRef);
              if (!checkDoc.exists()) {
                console.error("[DEBUG] " + "❌ GOOGLE REDIRECT: Document utilisateur non créé - orphan user possible");
                setError("Votre compte a été créé mais le profil prend plus de temps. Veuillez rafraîchir la page.");
              } else {
                console.log("[DEBUG] " + "✅ GOOGLE REDIRECT: Document existait déjà (race condition résolue)");
              }
            }
          }
        }

        await logAuthEvent('successful_google_login', {
          userId: googleUser.uid,
          userEmail: googleUser.email,
          deviceInfo
        });

        // ✅ FIX: Signaler le login aux autres onglets via localStorage
        try {
          localStorage.setItem('sos_login_event', Date.now().toString());
          setTimeout(() => localStorage.removeItem('sos_login_event'), 100);
        } catch { /* Ignorer si localStorage n'est pas disponible */ }

        // Log photo URL for debugging
        console.log('[Auth] Google redirect login successful. Photo URL:', googleUser.photoURL);

        // Check for saved redirect URL after Google login
        // SECURITY: Defense-in-depth validation before redirect
        const savedRedirect = safeStorage.getItem('googleAuthRedirect');
        if (savedRedirect) {
          safeStorage.removeItem('googleAuthRedirect');
          if (isAllowedRedirect(savedRedirect)) {
            console.log('[Auth] Google redirect: navigating to validated URL:', savedRedirect);
            // Use window.location for navigation to ensure full page reload with auth state
            window.location.href = savedRedirect;
          } else {
            console.warn('[Auth] Google redirect: blocked invalid redirect URL:', savedRedirect);
            window.location.href = '/dashboard';
          }
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn('[Auth] getRedirectResult error:', errorMessage);
        // Ne pas afficher d'erreur à l'utilisateur pour les erreurs de redirect
        // Car getRedirectResult retourne souvent des erreurs sur page normale
      } finally {
        setIsLoading(false);
      }
    })();
  }, [deviceInfo]);

  // ✅ FIX P1-2: Écouter les événements de login/logout des autres onglets
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Détecter le logout depuis un autre onglet
      if (event.key === 'sos_logout_event' && event.newValue) {
        console.log('🔐 [Auth] Logout détecté depuis un autre onglet, déconnexion...');
        // Nettoyer les states sans re-signaler (éviter boucle infinie)
        signingOutRef.current = true;
        setUser(null);
        setFirebaseUser(null);
        setAuthUser(null);
        setError(null);
        setAuthInitialized(true);
        setIsLoading(false);
        // Firebase signOut en arrière-plan
        firebaseSignOut(auth).catch(() => { /* ignoré */ });
        signingOutRef.current = false;
      }

      // ✅ FIX: Détecter le login depuis un autre onglet
      if (event.key === 'sos_login_event' && event.newValue) {
        console.log('🔐 [Auth] Login détecté depuis un autre onglet, rechargement de l\'état...');
        // Recharger la page pour synchroniser l'état d'authentification
        // C'est la méthode la plus fiable car Firebase Auth gère la session
        const currentUser = auth.currentUser;
        if (!currentUser && !signingOutRef.current) {
          // L'autre onglet s'est connecté, mais ce n'est pas reflété ici
          // Forcer un rechargement pour obtenir le bon état
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // REGISTER - VERSION 8 DEBUG
  const register = useCallback(async (userData: Partial<User>, password: string): Promise<void> => {
    console.log("[DEBUG] " + "🔵 REGISTER: Début\n\nEmail: " + userData.email + "\nRole: " + userData.role);

    setIsLoading(true);
    setError(null);

    try {
      if (!userData.role || !['client', 'lawyer', 'expat', 'admin', 'chatter', 'blogger', 'influencer', 'groupAdmin'].includes(userData.role)) {
        console.log("[DEBUG] " + "❌ REGISTER: Rôle invalide - " + userData.role);
        const err = new Error('Rôle utilisateur invalide ou manquant.') as AppError;
        err.code = 'sos/invalid-role';
        throw err;
      }
      if (!userData.email || !password) {
        console.log("[DEBUG] " + "❌ REGISTER: Email ou password manquant");
        const err = new Error('Email et mot de passe sont obligatoires') as AppError;
        err.code = 'sos/missing-credentials';
        throw err;
      }
      if (password.length < 8) {
        console.log("[DEBUG] " + "❌ REGISTER: Password trop court (<8 chars)");
        const err = new Error('Le mot de passe doit contenir au moins 8 caractères') as AppError;
        err.code = 'auth/weak-password';
        throw err;
      }

      const email = normalizeEmail(userData.email);
      if (!isValidEmail(email)) {
        console.log("[DEBUG] " + "❌ REGISTER: Email invalide");
        const err = new Error('Adresse email invalide') as AppError;
        err.code = 'auth/invalid-email';
        throw err;
      }

      console.log("[DEBUG] " + "🔵 REGISTER: createUserWithEmailAndPassword...");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      console.log("[DEBUG] " + "✅ REGISTER: User créé!\n\nUID: " + cred.user.uid);

      // ✅ FIX: Force token refresh pour que Firestore reconnaisse le nouvel utilisateur
      // Sans cela, les règles Firestore voient request.auth == null → permission-denied
      console.log("[DEBUG] " + "🔄 REGISTER: Token refresh pour Firestore...");
      await cred.user.getIdToken(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      let finalProfilePhotoURL = '/default-avatar.png';
      if (userData.profilePhoto?.startsWith('data:image')) {
        finalProfilePhotoURL = await processProfilePhoto(userData.profilePhoto, cred.user.uid, 'manual');
      } else if (userData.profilePhoto?.startsWith('http')) {
        finalProfilePhotoURL = userData.profilePhoto;
      }

      // Déterminer l'approbation selon le rôle
      // Seuls les clients par email sont auto-approuvés
      // Les lawyers et expats nécessitent une approbation manuelle
      const isClientRole = userData.role === 'client';
      const approvalData = isClientRole 
        ? {
            isApproved: true,
            approvalStatus: 'approved' as const,
            isVisible: true,
          }
        : {
            isApproved: false,
            approvalStatus: 'pending' as const,
            isVisible: false,
          };

      try {
        await createUserDocumentInFirestore(cred.user, {
          ...userData,
          email,
          role: userData.role as User['role'],
          profilePhoto: finalProfilePhotoURL,
          photoURL: finalProfilePhotoURL,
          avatar: finalProfilePhotoURL,
          provider: 'password',
          ...approvalData,
        });
      } catch (docErr) {
        try { await deleteUser(cred.user); } catch { /* no-op */ }
        throw docErr;
      }

      if (userData.firstName || userData.lastName) {
        const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        await updateProfile(cred.user, {
          displayName,
          photoURL: finalProfilePhotoURL || null,
        }).catch(() => { /* no-op */ });
      }

      console.log("[DEBUG] " + "✅ REGISTER RÉUSSI!\n\nUID: " + cred.user.uid + "\nRole: " + userData.role);
      await logAuthEvent('registration_success', {
        userId: cred.user.uid,
        role: userData.role,
        email,
        hasProfilePhoto: !!finalProfilePhotoURL && finalProfilePhotoURL !== '/default-avatar.png',
        isApproved: approvalData.isApproved,
        approvalStatus: approvalData.approvalStatus,
        deviceInfo
      });
    } catch (err) {
      const e = err as AppError;
      console.log("[DEBUG] " + "❌ REGISTER ERREUR!\n\nCode: " + (e?.code || "unknown") + "\nMessage: " + (e?.message || String(err)));
      let msg = 'Inscription impossible. Réessayez.';
      switch (e?.code) {
        case 'auth/email-already-in-use':
          msg = 'Cet email est déjà associé à un compte. Connectez-vous ou réinitialisez votre mot de passe.';
          break;
        case 'sos/email-linked-to-google':
          msg = 'Cet email est lié à un compte Google. Utilisez « Se connecter avec Google » puis complétez votre profil.';
          break;
        case 'auth/invalid-email':
          msg = 'Adresse email invalide.';
          break;
        case 'auth/weak-password':
          msg = 'Le mot de passe doit contenir au moins 8 caractères.';
          break;
        case 'sos/invalid-role':
        case 'sos/missing-credentials':
          msg = e.message || msg;
          break;
        default:
          break;
      }
      setError(msg);
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('registration_error', {
        errorCode: e?.code ?? 'unknown',
        errorMessage: e?.message ?? String(e),
        email: userData.email,
        role: userData.role,
        deviceInfo
      }).catch(() => { /* ignoré */ });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [deviceInfo]);

  const logout = useCallback(async (): Promise<void> => {
    console.log('🔐 [Auth] logout() appelé');
    signingOutRef.current = true;

    // Capturer les infos AVANT de nettoyer les states
    const uid = user?.id || user?.uid;
    const role = user?.role;

    // 1. Nettoyer immédiatement les states locaux (ne pas attendre Firestore)
    setUser(null);
    setFirebaseUser(null);
    setAuthUser(null);
    setError(null);
    setAuthMetrics({
      loginAttempts: 0,
      lastAttempt: new Date(),
      successfulLogins: 0,
      failedLogins: 0,
      googleAttempts: 0,
      roleRestrictionBlocks: 0,
      passwordResetRequests: 0,
      emailUpdateAttempts: 0,
      profileUpdateAttempts: 0,
    });

    // 2. Firebase signOut (avec timeout court)
    try {
      const signOutPromise = firebaseSignOut(auth);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SignOut timeout')), 3000)
      );
      await Promise.race([signOutPromise, timeoutPromise]);
      console.log('✅ [Auth] Firebase signOut réussi');
    } catch (e) {
      console.warn('[Auth] Firebase signOut error (ignoré):', e);
      // Continuer même si signOut échoue - les states sont déjà nettoyés
    }

    // 3. Opérations Firestore en arrière-plan (fire and forget - ne PAS attendre)
    if (uid && (role === 'lawyer' || role === 'expat')) {
      Promise.allSettled([
        writeSosPresence(uid, role, false),
        writeUsersPresenceBestEffort(uid, false)
      ]).catch(() => { /* ignoré */ });
    }

    // Log en arrière-plan (ne pas attendre)
    logAuthEvent('logout', { userId: uid, role, deviceInfo }).catch(() => { /* ignoré */ });

    // P1-2 FIX: Signaler le logout aux autres onglets via localStorage
    try {
      localStorage.setItem('sos_logout_event', Date.now().toString());
      // Nettoyer immédiatement pour permettre de futurs logouts
      setTimeout(() => localStorage.removeItem('sos_logout_event'), 100);
    } catch {
      // Ignorer si localStorage n'est pas disponible
    }

    // ✅ FIX: Nettoyer l'état OAuth pour éviter les problèmes de reconnexion
    try {
      // Supprimer les données de redirect Google
      safeStorage.removeItem('googleAuthRedirect');
      // Supprimer "Remember Me" pour des raisons de sécurité (nouvel utilisateur sur même appareil)
      localStorage.removeItem('savedEmail');
      localStorage.removeItem('rememberMe');
      // Reset le flag de redirect pour permettre une nouvelle connexion
      redirectHandledRef.current = false;
      console.log('✅ [Auth] État OAuth nettoyé');
    } catch {
      // Ignorer si storage n'est pas disponible
    }

    signingOutRef.current = false;
    console.log('✅ [Auth] logout() terminé');
  }, [user, deviceInfo]);

  const clearError = useCallback((): void => setError(null), []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!firebaseUser) return;
    try {
      setIsLoading(true);
      await reload(firebaseUser);
      await updateUserState(firebaseUser);
    } catch (e) {
      console.error('[Auth] refreshUser error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser, updateUserState]);

  const getLastLoginInfo = useCallback((): { date: Date | null; device: string | null } => {
    if (!user) return { date: null, device: null };
    const deviceType = deviceInfo.type;
    const os = deviceInfo.os;
    let lastLogin: Date | null = null;
    if (user.lastLoginAt) {
      if (user.lastLoginAt instanceof Date) {
        lastLogin = user.lastLoginAt;
      } else if (typeof (user.lastLoginAt as any).toDate === 'function') {
        lastLogin = (user.lastLoginAt as Timestamp).toDate();
      }
    }
    return { date: lastLogin, device: `${deviceType} (${os})` };
  }, [user, deviceInfo]);

  const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    if (!firebaseUser || !user) throw new Error('Utilisateur non connecté');

    setAuthMetrics((m) => ({ ...m, profileUpdateAttempts: m.profileUpdateAttempts + 1 }));

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);

      const allowedFields = [
        "firstName", "lastName", "fullName", "displayName",
        "profilePhoto", "photoURL", "avatar",
        "phone", "phoneNumber", "phoneCountryCode",
        "whatsapp", "whatsappNumber", "whatsappCountryCode",
        "languages", "languagesSpoken", "bio", "description"
      ];

      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedFields.includes(key))
      );

      if (updates.profilePhoto && updates.profilePhoto.startsWith('data:image')) {
        const processed = await processProfilePhoto(updates.profilePhoto, firebaseUser.uid, 'manual');
        (safeUpdates as any).profilePhoto = processed;
        (safeUpdates as any).photoURL = processed;
        (safeUpdates as any).avatar = processed;
      }

      await updateDoc(userRef, {
        ...safeUpdates,
        updatedAt: serverTimestamp(),
      });

      if (updates.firstName || updates.lastName || updates.profilePhoto) {
        const displayName = `${updates.firstName || user.firstName || ''} ${updates.lastName || user.lastName || ''}`.trim();
        await updateProfile(firebaseUser, {
          displayName,
          photoURL: (safeUpdates as any).profilePhoto || user.profilePhoto || null,
        });
      }

      if (user.role === 'lawyer' || user.role === 'expat') {
        const sosRef = doc(db, 'sos_profiles', firebaseUser.uid);
        await updateDoc(sosRef, {
          ...safeUpdates,
          updatedAt: serverTimestamp(),
        });
      }

      await logAuthEvent('profile_updated', {
        userId: firebaseUser.uid,
        updatedFields: Object.keys(safeUpdates),
        deviceInfo
      });

    } catch (error) {
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('profile_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      }).catch(() => { /* ignoré */ });
      throw error;
    }
  }, [firebaseUser, user, deviceInfo]);

  const updateUserEmail = useCallback(async (newEmail: string): Promise<void> => {
    if (!firebaseUser) throw new Error('Utilisateur non connecté');

    setAuthMetrics((m) => ({ ...m, emailUpdateAttempts: m.emailUpdateAttempts + 1 }));

    try {
      const normalizedEmail = normalizeEmail(newEmail);
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Adresse email invalide');
      }

      const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      if (methods.length > 0) {
        throw new Error('Cette adresse email est déjà utilisée');
      }

      await updateEmail(firebaseUser, normalizedEmail);

      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, {
        email: normalizedEmail,
        emailLower: normalizedEmail,
        updatedAt: serverTimestamp(),
      });

      await logAuthEvent('email_updated', {
        userId: firebaseUser.uid,
        oldEmail: user?.email,
        newEmail: normalizedEmail,
        deviceInfo
      });

    } catch (error) {
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('email_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      }).catch(() => { /* ignoré */ });
      throw error;
    }
  }, [firebaseUser, user?.email, deviceInfo]);

  const updateUserPassword = useCallback(async (newPassword: string): Promise<void> => {
    if (!firebaseUser) throw new Error('Utilisateur non connecté');

    if (newPassword.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    try {
      await updatePassword(firebaseUser, newPassword);

      await logAuthEvent('password_updated', {
        userId: firebaseUser.uid,
        deviceInfo
      });

    } catch (error) {
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('password_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      }).catch(() => { /* ignoré */ });
      throw error;
    }
  }, [firebaseUser, deviceInfo]);

  const reauthenticateUser = useCallback(async (password: string): Promise<void> => {
    if (!firebaseUser || !user?.email) throw new Error('Utilisateur non connecté');

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(firebaseUser, credential);

      await logAuthEvent('reauthentication_success', {
        userId: firebaseUser.uid,
        deviceInfo
      });

    } catch (error) {
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('reauthentication_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      }).catch(() => { /* ignoré */ });
      throw error;
    }
  }, [firebaseUser, user?.email, deviceInfo]);

  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    setAuthMetrics((m) => ({ ...m, passwordResetRequests: m.passwordResetRequests + 1 }));

    try {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Adresse email invalide');
      }

      await sendPasswordResetEmail(auth, normalizedEmail);

      await logAuthEvent('password_reset_sent', {
        email: normalizedEmail,
        deviceInfo
      });

    } catch (error) {
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('password_reset_failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      }).catch(() => { /* ignoré */ });
      throw error;
    }
  }, [deviceInfo]);

  // Email verification disabled - no-op function kept for interface compatibility
  const sendVerificationEmail = useCallback(async (): Promise<void> => {
    // Email verification is disabled
    console.log('[AUTH] Email verification is disabled');
  }, []);

  const deleteUserAccount = useCallback(async (): Promise<void> => {
    if (!firebaseUser || !user) throw new Error('Utilisateur non connecté');

    try {
      const userId = firebaseUser.uid;
      const userRole = user.role;

      const promises: Promise<unknown>[] = [
        deleteDoc(doc(db, 'users', userId))
      ];

      if (userRole === 'lawyer' || userRole === 'expat') {
        promises.push(deleteDoc(doc(db, 'sos_profiles', userId)));
      }

      if (user.profilePhoto && user.profilePhoto.includes('firebase')) {
        try {
          const photoRef = ref(storage, user.profilePhoto);
          promises.push(deleteObject(photoRef));
        } catch (e) {
          console.warn('Erreur suppression photo:', e);
        }
      }

      await Promise.allSettled(promises);

      await logAuthEvent('account_deleted', {
        userId,
        userRole,
        deviceInfo
      });

      await deleteUser(firebaseUser);

      setUser(null);
      setFirebaseUser(null);
      setAuthUser(null);
      setError(null);

    } catch (error) {
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('account_deletion_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      }).catch(() => { /* ignoré */ });
      throw error;
    }
  }, [firebaseUser, user, deviceInfo]);

  const getUsersByRole = useCallback(async (role: User['role'], limit_count: number = 10): Promise<User[]> => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('role', '==', role),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limit_count)
      );

      const snapshot = await getDocs(usersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        uid: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate() || new Date(),
        updatedAt: (doc.data() as any).updatedAt?.toDate() || new Date(),
        lastLoginAt: (doc.data() as any).lastLoginAt?.toDate() || new Date(),
      })) as User[];
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      return [];
    }
  }, []);

  // Version batch atomique
  const setUserAvailability = useCallback(async (availability: 'available' | 'busy' | 'offline'): Promise<void> => {
    if (!user || !firebaseUser) throw new Error('Utilisateur non connecté');
    if (user.role !== 'lawyer' && user.role !== 'expat') return;

    // 🔒 Vérifier l'approbation depuis DEUX sources: users (AuthContext) ET sos_profiles
    const isApprovedFromUsers = user.isApproved && user.approvalStatus === 'approved';

    // Charger le statut depuis sos_profiles (source de vérité pour les anciens prestataires)
    let isApprovedFromSosProfiles = false;
    try {
      const sosProfileDoc = await getDoc(doc(db, 'sos_profiles', firebaseUser.uid));
      if (sosProfileDoc.exists()) {
        const sosData = sosProfileDoc.data();
        isApprovedFromSosProfiles = sosData?.isApproved === true && sosData?.approvalStatus === 'approved';
      }
    } catch (e) {
      console.warn('Erreur lecture sos_profiles pour vérification approval:', e);
    }

    // Bloquer si AUCUNE source n'indique l'approbation
    if (!isApprovedFromUsers && !isApprovedFromSosProfiles) {
      throw new Error('APPROVAL_REQUIRED_SHORT');
    }

    try {
      const isOnline = availability === 'available';
      const now = serverTimestamp();

      const usersRef = doc(db, 'users', firebaseUser.uid);
      const sosRef = doc(db, 'sos_profiles', firebaseUser.uid);

      const batch = writeBatch(db);

      // P0 FIX: Si on passe à "available", nettoyer TOUS les champs de statut d'appel
      // pour éviter les incohérences si Cloud Tasks a échoué
      // ✅ BUG FIX: Ajouter lastActivity quand on passe à "available" pour éviter
      // que checkProviderInactivity ne mette le prestataire hors ligne immédiatement
      const baseUpdate = {
        availability,
        isOnline,
        updatedAt: now,
        lastStatusChange: now,
        ...(availability === 'available' ? { lastActivity: now } : {}),
      };

      const cleanupFields = availability === 'available' ? {
        busyReason: deleteField(),
        currentCallSessionId: deleteField(),
        busySince: deleteField(),
        busyBySibling: deleteField(),
        busySiblingProviderId: deleteField(),
        busySiblingCallSessionId: deleteField(),
      } : {};

      batch.update(usersRef, { ...baseUpdate, ...cleanupFields });
      batch.set(
        sosRef,
        {
          isOnline,
          availability: isOnline ? 'available' : 'unavailable',
          updatedAt: now,
          lastStatusChange: now,
          // ✅ BUG FIX: Initialiser lastActivity à la mise en ligne
          ...(isOnline ? { lastActivity: now } : {}),
          ...cleanupFields,
          // isVisible reste inchangé - géré par l'approbation
        },
        { merge: true }
      );

      await batch.commit();

      // ✅ CRITICAL FIX: Update local state immediately after batch.commit()
      // Without this, the UI waits for onSnapshot listener (100-500ms delay)
      // which can cause race conditions and stale state issues
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          availability,
          isOnline,
          updatedAt: new Date(),
          lastStatusChange: new Date(),
        };
      });

      await logAuthEvent('availability_changed', {
        userId: firebaseUser.uid,
        oldAvailability: (user as any).availability,
        newAvailability: availability,
        deviceInfo
      });

    } catch (error) {
      console.error('Erreur mise à jour disponibilité:', error);
      throw error;
    }
  }, [firebaseUser, user, deviceInfo]);

  const value: AuthContextType = useMemo(() => ({
    user,
    firebaseUser,
    isUserLoggedIn,
    isLoading,
    authInitialized,
    isFullyReady,
    error,
    authMetrics,
    deviceInfo,
    login,
    loginWithGoogle,
    register,
    logout,
    clearError,
    refreshUser,
    getLastLoginInfo,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    reauthenticateUser,
    sendPasswordReset,
    sendVerificationEmail,
    deleteUserAccount,
    getUsersByRole,
    setUserAvailability,
  }), [
    user,
    firebaseUser,
    isUserLoggedIn,
    isLoading,
    authInitialized,
    isFullyReady,
    error,
    authMetrics,
    deviceInfo,
    login,
    loginWithGoogle,
    register,
    logout,
    clearError,
    refreshUser,
    getLastLoginInfo,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    reauthenticateUser,
    sendPasswordReset,
    sendVerificationEmail,
    deleteUserAccount,
    getUsersByRole,
    setUserAvailability
  ]);

  return <BaseAuthContext.Provider value={value}>{children}</BaseAuthContext.Provider>;
};

export default AuthProvider;

/* =========================================================
   Compat : re-export d'un hook useAuth ici aussi
   RESTAURÉ: Vérification du contexte pour éviter les bugs silencieux
   ========================================================= */
// Flag pour éviter de spammer la console avec le même warning
let _hasWarnedUninitializedContext = false;

export const useAuth = () => {
  const ctx = useContext(BaseAuthContext);

  // CRITIQUE: Vérifier que le contexte est initialisé
  // Si authInitialized est false ET user est null ET isLoading est true,
  // c'est probablement le defaultContext - on avertit UNE SEULE FOIS
  if (!ctx.authInitialized && ctx.user === null && ctx.isLoading && !_hasWarnedUninitializedContext) {
    _hasWarnedUninitializedContext = true;
    console.warn('[useAuth] ⚠️ Contexte non initialisé - attendre authInitialized=true avant d\'utiliser les données');
  }

  // Reset le flag quand le contexte est initialisé (pour permettre de re-détecter après logout/login)
  if (ctx.authInitialized) {
    _hasWarnedUninitializedContext = false;
  }

  return ctx;
};