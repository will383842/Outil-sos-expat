// src/contexts/AuthContext.tsx
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reload,
  sendEmailVerification,
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
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
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
   Helpers email (locaux)
   ========================================================= */
const normalizeEmail = (s: string): string =>
  (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\u00A0/g, '')            // NBSP
    .replace(/[\u2000-\u200D]/g, '');  // espaces fines / zero-width

const isValidEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

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
 * Fonction pour créer un document utilisateur dans Firestore
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

  const isClientRole = additionalData.role === 'client';
  const isGoogleProvider = additionalData.provider === 'google.com';
  const shouldAutoApprove = isClientRole && isGoogleProvider;
  
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
        practiceCountries: additionalData.practiceCountries || [],
        interventionCountries: additionalData.practiceCountries || [],
        
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
 */
const getUserDocument = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  const refUser = doc(db, 'users', firebaseUser.uid);

  const ensureUserDoc = async () => {
    await setDoc(refUser, {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? null,
      emailLower: (firebaseUser.email ?? '').toLowerCase(),
      role: 'client',
      isActive: true,
      isApproved: false,
      approvalStatus: 'pending',
      isVisible: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  let snap: any;
  try {
    snap = await getDoc(refUser);
  } catch (e: any) {
    if (e?.code === 'permission-denied') {
      await ensureUserDoc();
      snap = await getDoc(refUser);
    } else {
      throw e;
    }
  }

  if (!snap.exists()) {
    await ensureUserDoc();
    return {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      isVerifiedEmail: firebaseUser.emailVerified,
      isOnline: false,
      isApproved: false,
      approvalStatus: 'pending',
      isVisible: false,
    } as unknown as User;
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

  // onAuthStateChanged → ne fait que stocker l'utilisateur auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setIsLoading(true);
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
    return unsubAuth;
  }, []);

  /** ============================================================
   * 2) Accéder à /users/{uid} UNIQUEMENT quand on a un authUser
   *    + protection StrictMode (double montage) pour éviter 2 abonnements
   * ============================================================ */
  const subscribed = useRef(false);
  const firstSnapArrived = useRef(false);

  useEffect(() => {
    if (!authUser) return;               // attendre l'auth
    if (subscribed.current) return;      // éviter double abonnement en StrictMode
    subscribed.current = true;
    firstSnapArrived.current = false;
    setIsLoading(true);

    const uid = authUser.uid;
    const refUser = doc(db, 'users', uid);

    let unsubUser: undefined | (() => void);
    let cancelled = false;

    (async () => {
      try {
        // Créer le doc si absent
        const snap = await getDoc(refUser);
        if (!snap.exists()) {
          await setDoc(
            refUser,
            {
              uid,
              email: authUser.email || null,
              emailLower: (authUser.email || '').toLowerCase(),
              role: 'client',  // Rôle par défaut pour éviter undefined
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              isActive: true,
              isApproved: false,
              approvalStatus: 'pending',
              isVisible: false,
            },
            { merge: true }
          );
        }

        if (cancelled) return;

        // Ouvrir le listener après auth + doc présent
        unsubUser = onSnapshot(
          refUser,
          (docSnap) => {
            if (signingOutRef.current) return;
            if (!docSnap.exists()) return;

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
              return merged;
            });

            if (!firstSnapArrived.current) {
              firstSnapArrived.current = true;
              setIsLoading(false);
              setAuthInitialized(true);
            }
          },
          (err) => {
            console.error(`[users/${uid}] permission-denied ?`, err);
            setIsLoading(false);
            setAuthInitialized(true);
          }
        );
      } catch (e) {
        console.error('Init user doc failed', e);
        setIsLoading(false);
        setAuthInitialized(true);
      }
    })();

    // cleanup (StrictMode monte/démonte 2x)
    return () => {
      cancelled = true;
      subscribed.current = false;
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
    setIsLoading(true);
    setError(null);
    setAuthMetrics((m) => ({ ...m, loginAttempts: m.loginAttempts + 1, lastAttempt: new Date() }));

    if (!email || !password) {
      const msg = 'Email et mot de passe sont obligatoires';
      setError(msg);
      setIsLoading(false);
      setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
      throw new Error(msg);
    }

    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      const timeout = deviceInfo.connectionSpeed === 'slow' ? 15000 : 10000;
      const loginPromise = signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      const cred = await Promise.race([
        loginPromise,
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('auth/timeout')), timeout)),
      ]);

      await logAuthEvent('successful_login', {
        userId: cred.user.uid,
        provider: 'email',
        rememberMe,
        deviceInfo
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'auth/timeout'
          ? 'Connexion trop lente, réessayez.'
          : 'Email ou mot de passe invalide.';
      setError(msg);
      setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
      await logAuthEvent('login_failed', {
        error: e instanceof Error ? e.message : String(e),
        email: normalizeEmail(email),
        deviceInfo
      });
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [deviceInfo]);

  const loginWithGoogle = useCallback(async (rememberMe: boolean = false): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setAuthMetrics((m) => ({
      ...m,
      loginAttempts: m.loginAttempts + 1,
      googleAttempts: m.googleAttempts + 1,
      lastAttempt: new Date(),
    }));
    try {
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });

      if (window.crossOriginIsolated === true) {
        await signInWithRedirect(auth, provider);
        return;
      }

      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      const userRef = doc(db, 'users', googleUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const existing = snap.data() as Partial<User>;
        if (existing.role && existing.role !== 'client') {
          await firebaseSignOut(auth);
          setAuthMetrics((m) => ({
            ...m,
            failedLogins: m.failedLogins + 1,
            roleRestrictionBlocks: m.roleRestrictionBlocks + 1,
          }));
          setError('GOOGLE_ROLE_RESTRICTION');
          await logAuthEvent('google_login_role_restriction', {
            userId: googleUser.uid,
            role: existing.role,
            email: googleUser.email,
            deviceInfo
          });
          throw new Error('GOOGLE_ROLE_RESTRICTION');
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
        // Create new user - only include photo fields if Google provides them
        // Les clients Google sont auto-approuvés
        const newUserData: any = {
          role: 'client',
          email: googleUser.email || '',
          preferredLanguage: 'fr',
          isApproved: true,
          approvalStatus: 'approved',
          isVisible: true,
          isActive: true,
          provider: 'google.com',
          isVerified: googleUser.emailVerified,
          isVerifiedEmail: googleUser.emailVerified,
        };
        
        // Add photo fields if available from Google
        if (googleUser.photoURL) {
          newUserData.profilePhoto = googleUser.photoURL;
          newUserData.photoURL = googleUser.photoURL;
          newUserData.avatar = googleUser.photoURL;
        }
        
        await createUserDocumentInFirestore(googleUser, newUserData);
      }

      await logAuthEvent('successful_google_login', {
        userId: googleUser.uid,
        userEmail: googleUser.email,
        rememberMe,
        deviceInfo
      });
      
      // Log photo URL for debugging
      console.log('[Auth] Google login successful. Photo URL:', googleUser.photoURL);
    } catch (e) {
      if (!(e instanceof Error && e.message === 'GOOGLE_ROLE_RESTRICTION')) {
        // 🔍 Log détaillé pour debug
        const errorCode = (e as any)?.code || 'unknown';
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('❌ [Google Auth] Error details:', {
          code: errorCode,
          message: errorMessage,
          fullError: e
        });

        // Messages d'erreur plus spécifiques
        let msg = 'Connexion Google annulée ou impossible.';
        if (errorCode === 'auth/popup-blocked') {
          msg = 'Popup bloqué. Autorisez les popups pour ce site.';
        } else if (errorCode === 'auth/popup-closed-by-user') {
          msg = 'Connexion annulée.';
        } else if (errorCode === 'auth/unauthorized-domain') {
          msg = 'Domaine non autorisé. Contactez le support.';
        } else if (errorCode === 'auth/operation-not-allowed') {
          msg = 'Connexion Google non activée. Contactez le support.';
        } else if (errorCode === 'auth/network-request-failed') {
          msg = 'Erreur réseau. Vérifiez votre connexion.';
        }

        setError(msg);
        setAuthMetrics((m) => ({ ...m, failedLogins: m.failedLogins + 1 }));
        await logAuthEvent('google_login_failed', {
          error: errorMessage,
          errorCode,
          deviceInfo
        });
        throw new Error(msg);
      } else {
        throw e;
      }
    } finally {
      setIsLoading(false);
    }
  }, [deviceInfo]);

  // Récupération redirect Google en contexte crossOriginIsolated
  const redirectHandledRef = useRef<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        if (window.crossOriginIsolated !== true) return;
        if (redirectHandledRef.current) return;
        const result = await getRedirectResult(auth);
        if (!result?.user) return;
        redirectHandledRef.current = true;
        const googleUser = result.user;

        const userRef = doc(db, 'users', googleUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const existing = userDoc.data() as Partial<User>;
          if (existing.role && existing.role !== 'client') {
            await firebaseSignOut(auth);
            setAuthMetrics((m) => ({
              ...m,
              failedLogins: m.failedLogins + 1,
              roleRestrictionBlocks: m.roleRestrictionBlocks + 1,
            }));
            setError('GOOGLE_ROLE_RESTRICTION');
            await logAuthEvent('google_login_role_restriction', {
              userId: googleUser.uid,
              role: existing.role,
              email: googleUser.email,
              deviceInfo
            });
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
          // Create new user - only include photo fields if Google provides them
          // Les clients Google sont auto-approuvés
          const newUserData: any = {
            role: 'client',
            email: googleUser.email || '',
            preferredLanguage: 'fr',
            isApproved: true,
            approvalStatus: 'approved',
            isVisible: true,
            isActive: true,
            provider: 'google.com',
            isVerified: googleUser.emailVerified,
            isVerifiedEmail: googleUser.emailVerified,
          };
          
          // Add photo fields if available from Google
          if (googleUser.photoURL) {
            newUserData.profilePhoto = googleUser.photoURL;
            newUserData.photoURL = googleUser.photoURL;
            newUserData.avatar = googleUser.photoURL;
          }
          
          await createUserDocumentInFirestore(googleUser, newUserData);
        }

        await logAuthEvent('successful_google_login', {
          userId: googleUser.uid,
          userEmail: googleUser.email,
          deviceInfo
        });
        
        // Log photo URL for debugging
        console.log('[Auth] Google redirect login successful. Photo URL:', googleUser.photoURL);
      } catch (e) {
        console.warn('[Auth] getRedirectResult error', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [deviceInfo]);

  // REGISTER
  const register = useCallback(async (userData: Partial<User>, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!userData.role || !['client', 'lawyer', 'expat', 'admin'].includes(userData.role)) {
        const err = new Error('Rôle utilisateur invalide ou manquant.') as AppError;
        err.code = 'sos/invalid-role';
        throw err;
      }
      if (!userData.email || !password) {
        const err = new Error('Email et mot de passe sont obligatoires') as AppError;
        err.code = 'sos/missing-credentials';
        throw err;
      }
      if (password.length < 6) {
        const err = new Error('Le mot de passe doit contenir au moins 6 caractères') as AppError;
        err.code = 'auth/weak-password';
        throw err;
      }

      const email = normalizeEmail(userData.email);
      if (!isValidEmail(email)) {
        const err = new Error('Adresse email invalide') as AppError;
        err.code = 'auth/invalid-email';
        throw err;
      }

      // Note: fetchSignInMethodsForEmail est désactivé par Firebase pour la protection
      // contre l'énumération d'emails. On laisse createUserWithEmailAndPassword
      // gérer les erreurs d'email déjà utilisé directement.

      const cred = await createUserWithEmailAndPassword(auth, email, password);

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

      try {
        await sendEmailVerification(cred.user);
      } catch {
        /* no-op */ void 0;
      }

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
          msg = 'Le mot de passe doit contenir au moins 6 caractères.';
          break;
        case 'sos/invalid-role':
        case 'sos/missing-credentials':
          msg = e.message || msg;
          break;
        default:
          break;
      }
      setError(msg);
      await logAuthEvent('registration_error', {
        errorCode: e?.code ?? 'unknown',
        errorMessage: e?.message ?? String(e),
        email: userData.email,
        role: userData.role,
        deviceInfo
      });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [deviceInfo]);

  const logout = useCallback(async (): Promise<void> => {
    signingOutRef.current = true;
    try {
      const uid = user?.id || user?.uid;
      const role = user?.role;

      await logAuthEvent('logout', {
        userId: uid,
        role,
        deviceInfo
      });

      if (uid && (role === 'lawyer' || role === 'expat')) {
        await Promise.allSettled([
          writeSosPresence(uid, role, false),
          writeUsersPresenceBestEffort(uid, false)
        ]);
      }

      await firebaseSignOut(auth);
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
    } catch (e) {
      console.error('[Auth] logout error:', e);
    } finally {
      signingOutRef.current = false;
    }
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
      await logAuthEvent('profile_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
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

      await sendEmailVerification(firebaseUser);

      await logAuthEvent('email_updated', {
        userId: firebaseUser.uid,
        oldEmail: user?.email,
        newEmail: normalizedEmail,
        deviceInfo
      });

    } catch (error) {
      await logAuthEvent('email_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
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
      await logAuthEvent('password_update_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
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
      await logAuthEvent('reauthentication_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
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
      await logAuthEvent('password_reset_failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  }, [deviceInfo]);

  const sendVerificationEmail = useCallback(async (): Promise<void> => {
    if (!firebaseUser) throw new Error('Utilisateur non connecté');

    try {
      await sendEmailVerification(firebaseUser);

      await logAuthEvent('verification_email_sent', {
        userId: firebaseUser.uid,
        email: firebaseUser.email,
        deviceInfo
      });

    } catch (error) {
      await logAuthEvent('verification_email_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
      throw error;
    }
  }, [firebaseUser, deviceInfo]);

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
      await logAuthEvent('account_deletion_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      });
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
      batch.update(usersRef, {
        availability,
        isOnline,
        updatedAt: now,
        lastStatusChange: now,
      });
      batch.set(
        sosRef,
        {
          isOnline,
          availability: isOnline ? 'available' : 'unavailable',
          updatedAt: now,
          lastStatusChange: now,
          // isVisible reste inchangé - géré par l'approbation
        },
        { merge: true }
      );

      await batch.commit();

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
   Now returns default context instead of throwing to prevent white screens
   ========================================================= */
export const useAuth = () => {
  const ctx = useContext(BaseAuthContext);
  // Return context directly - BaseAuthContext now has default values
  // This prevents white screens when component is used outside provider
  return ctx;
};