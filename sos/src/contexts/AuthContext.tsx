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
   Timeout adaptatif selon la vitesse de connexion
   ========================================================= */
const getAdaptiveTimeout = (): number => {
  // Timeout très généreux pour éviter les faux positifs après vidage de cache
  return 60000; // 60 secondes - le spinner restera mais pas de fausse erreur
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
 *
 * ⚠️ CORRECTION: Cette fonction ne doit JAMAIS créer un document avec role='client'
 * car cela corromprait le rôle des prestataires (lawyers/expats).
 */
const getUserDocument = async (firebaseUser: FirebaseUser): Promise<User | null> => {
  const refUser = doc(db, 'users', firebaseUser.uid);

  let snap: any;
  try {
    snap = await getDoc(refUser);
  } catch (e: any) {
    // ⚠️ CORRECTION: Ne pas créer de document en cas d'erreur de permission
    // Retourner null pour signaler que l'utilisateur n'a pas de profil
    console.error('[Auth] getUserDocument permission error:', e);
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
    if (!authInitialized) return false;
    // If loading user data, not ready
    if (isLoading) return false;
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

  // onAuthStateChanged → ne fait que stocker l'utilisateur auth
  useEffect(() => {
    console.log("🔐 [AuthContext] Initialisation onAuthStateChanged...");
    console.log("🔐 [AuthContext] auth.currentUser au boot:", auth.currentUser?.uid || "null");
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      const timestamp = new Date().toISOString();
      console.log(`🔐 [AuthContext] [${timestamp}] onAuthStateChanged triggered:`, {
        hasUser: !!u,
        uid: u?.uid,
        email: u?.email,
        emailVerified: u?.emailVerified,
        providerId: u?.providerId,
        previousUid: previousAuthUserUidRef.current,
      });

      // ✅ FIX: Si l'utilisateur change (login après logout ou nouveau login),
      // NE PAS reset authInitialized car cela cause des redirections vers /login
      // pendant que Firestore charge les données. À la place, on reset seulement
      // les refs de subscription pour que le nouveau listener démarre proprement.
      const isNewUser = u && u.uid !== previousAuthUserUidRef.current;
      if (isNewUser) {
        console.log("🔐 [AuthContext] 🔄 Nouvel utilisateur détecté, reset des refs de subscription");
        // Reset les refs pour permettre un nouveau listener Firestore
        subscribed.current = false;
        firstSnapArrived.current = false;
        // NE PAS faire setAuthInitialized(false) - cela cause le bug de redirection!
        // authInitialized reste true pour éviter que ProtectedRoute redirige prématurément
      }
      previousAuthUserUidRef.current = u?.uid ?? null;

      setIsLoading(true);
      console.log("🔐 [AuthContext] setAuthUser() appelé avec uid:", u?.uid || "null");
      setAuthUser(u);
      setFirebaseUser(u ?? null);
      if (!u) {
        console.log("🔐 [AuthContext] Pas d'utilisateur connecté, nettoyage état");
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
    const effectTimestamp = new Date().toISOString();
    console.log(`🔐 [AuthContext] [${effectTimestamp}] useEffect users listener TRIGGERED`);
    console.log("🔐 [AuthContext] État actuel:", {
      authUserUid: authUser?.uid || "null",
      subscribedCurrent: subscribed.current,
      firstSnapArrivedCurrent: firstSnapArrived.current,
      signingOut: signingOutRef.current,
    });

    if (!authUser) {
      console.log("🔐 [AuthContext] ⏸️ Pas d'authUser, skip listener - attente connexion");
      return;               // attendre l'auth
    }
    if (subscribed.current) {
      console.log("🔐 [AuthContext] ⏸️ Déjà abonné (subscribed.current=true), skip - probablement StrictMode");
      return;      // éviter double abonnement en StrictMode
    }

    console.log("🔐 [AuthContext] ▶️ Démarrage du listener Firestore...");
    subscribed.current = true;
    firstSnapArrived.current = false;
    setIsLoading(true);

    const uid = authUser.uid;
    const refUser = doc(db, 'users', uid);
    console.log("🔐 [AuthContext] 📡 Création référence Firestore: users/" + uid);

    let unsubUser: undefined | (() => void);
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let restFallbackTimeoutId: ReturnType<typeof setTimeout> | null = null; // ✅ FIX: Variable pour REST API fallback

    // OPTIMISATION: Utiliser UNIQUEMENT onSnapshot() qui retourne les données initiales
    // au premier callback. Évite la double lecture (getDoc + onSnapshot).
    // Si le premier callback n'arrive pas dans 15s, on initialise avec les données Auth minimales.

    const listenerStartTime = Date.now();
    console.log("🔐 [AuthContext] 🎯 Setting up onSnapshot listener for users/" + uid);
    console.log("🔐 [AuthContext] ⏱️ Chrono démarré pour mesurer le temps de réponse Firestore");

    // 🚀 FALLBACK: Si onSnapshot ne répond pas en 5s, essayer getDoc directement
    fallbackTimeoutId = setTimeout(async () => {
      const elapsed = Date.now() - listenerStartTime;
      console.warn(`🔐 [AuthContext] ⚠️ [${elapsed}ms] onSnapshot n'a pas répondu en 5s, tentative getDoc directe...`);
      if (!firstSnapArrived.current && !cancelled) {
        try {
          console.log("🔐 [AuthContext] 📥 Exécution getDoc(users/" + uid + ")...");
          const directSnap = await getDoc(refUser);
          const getDocElapsed = Date.now() - listenerStartTime;
          console.log(`🔐 [AuthContext] 📥 getDoc terminé en ${getDocElapsed}ms, exists=${directSnap.exists()}`);
          if (directSnap.exists() && !firstSnapArrived.current && !cancelled) {
            console.log("✅ [AuthContext] getDoc réussi, données:", directSnap.data());
            const data = directSnap.data() as Partial<User>;
            setUser({
              ...(data as User),
              id: uid,
              uid,
              email: data.email || authUser.email || null,
              isVerifiedEmail: authUser.emailVerified,
            } as User);
            firstSnapArrived.current = true;
            setIsLoading(false);
            setAuthInitialized(true);
            console.log("✅ [AuthContext] 🏁 User chargé via fallback getDoc - isLoading=false");
          } else if (!directSnap.exists()) {
            console.warn("⚠️ [AuthContext] getDoc: document users/" + uid + " n'existe pas!");
          }
        } catch (e) {
          const errorElapsed = Date.now() - listenerStartTime;
          console.error(`❌ [AuthContext] [${errorElapsed}ms] getDoc fallback échoué:`, e);
        }
      }
    }, 5000);

    // 🚀 FALLBACK REST API: Si le SDK est complètement bloqué après 10s, utiliser l'API REST directement
    restFallbackTimeoutId = setTimeout(async () => {
      const elapsed = Date.now() - listenerStartTime;
      if (!firstSnapArrived.current && !cancelled) {
        console.warn(`🔐 [AuthContext] ⚠️ [${elapsed}ms] SDK Firestore bloqué, tentative REST API...`);
        try {
          // Obtenir le token d'authentification
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

          if (response.ok) {
            const restData = await response.json();
            console.log("✅ [AuthContext] REST API réponse:", restData);

            // Convertir le format REST API vers notre format User
            const fields = restData.fields || {};
            const userData: Partial<User> = {};

            // Mapper les champs Firestore REST vers notre type User
            for (const [key, value] of Object.entries(fields)) {
              const fieldValue = value as { stringValue?: string; integerValue?: string; booleanValue?: boolean; timestampValue?: string };
              if (fieldValue.stringValue !== undefined) userData[key as keyof User] = fieldValue.stringValue as any;
              else if (fieldValue.integerValue !== undefined) userData[key as keyof User] = parseInt(fieldValue.integerValue) as any;
              else if (fieldValue.booleanValue !== undefined) userData[key as keyof User] = fieldValue.booleanValue as any;
              else if (fieldValue.timestampValue !== undefined) userData[key as keyof User] = new Date(fieldValue.timestampValue) as any;
            }

            if (!firstSnapArrived.current && !cancelled) {
              setUser({
                ...(userData as User),
                id: uid,
                uid,
                email: userData.email || authUser.email || null,
                isVerifiedEmail: authUser.emailVerified,
              } as User);
              firstSnapArrived.current = true;
              setIsLoading(false);
              setAuthInitialized(true);
              console.log("✅ [AuthContext] 🏁 User chargé via REST API fallback - isLoading=false");
              console.log("💡 [AuthContext] Le SDK Firestore est bloqué mais l'app fonctionne via REST API");
            }
          } else if (response.status === 404) {
            console.warn("⚠️ [AuthContext] REST API: document users/" + uid + " n'existe pas");
          } else {
            console.error("❌ [AuthContext] REST API erreur:", response.status, await response.text());
          }
        } catch (e) {
          console.error("❌ [AuthContext] REST API fallback échoué:", e);
        }
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
      }
    }, authTimeout);

    // Un seul listener qui gère TOUT : données initiales + mises à jour temps réel
    console.log("🔐 [AuthContext] 📡 onSnapshot() appelé, en attente du premier callback...");
    unsubUser = onSnapshot(
      refUser,
      async (docSnap) => {
        const snapshotElapsed = Date.now() - listenerStartTime;
        console.log(`🔐 [AuthContext] 📨 [${snapshotElapsed}ms] onSnapshot CALLBACK REÇU!`);

        if (signingOutRef.current || cancelled) {
          console.log("🔐 [AuthContext] ⏸️ Callback ignoré (signingOut=" + signingOutRef.current + ", cancelled=" + cancelled + ")");
          return;
        }

        // Annuler le timeout et fallback car on a reçu une réponse
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
          console.log("🔐 [AuthContext] ⏰ Timeout annulé - réponse reçue à temps");
        }
        if (fallbackTimeoutId) {
          clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
          console.log("🔐 [AuthContext] ⏰ Fallback timeout annulé");
        }
        if (restFallbackTimeoutId) {
          clearTimeout(restFallbackTimeoutId);
          console.log("🔐 [AuthContext] ⏰ REST API fallback timeout annulé");
        }

        // Document n'existe pas → c'est une ANOMALIE car le document devrait exister après inscription
        // ⚠️ CORRECTION: Ne PAS créer un document avec role='client' par défaut
        // Cela corromprait le rôle des prestataires (lawyers/expats) si leur document
        // n'a pas encore été répliqué ou s'il y a une erreur de timing
        if (!docSnap.exists()) {
          console.warn("🔐 [AuthContext] Document users/" + uid + " n'existe pas - ANOMALIE");
          console.warn("🔐 [AuthContext] L'utilisateur s'est connecté mais son document Firestore est absent.");
          console.warn("🔐 [AuthContext] Cela peut arriver si l'inscription n'a pas terminé correctement.");

          // ✅ CORRECTION: Garder l'état loading et afficher une erreur
          // plutôt que de créer un faux document avec role='client'
          if (!firstSnapArrived.current) {
            setError('Votre profil est en cours de création. Veuillez patienter quelques secondes et rafraîchir la page.');
            // NE PAS définir setUser avec role='client' !
            // Le document sera créé par le processus d'inscription qui définit le bon rôle
            firstSnapArrived.current = true;
            setIsLoading(false);
            setAuthInitialized(true);
          }

          // ⚠️ NE PAS créer le document ici avec role='client'
          // Le document doit être créé par le flow d'inscription (register) avec le BON rôle
          // Si on arrive ici, c'est une erreur de synchronisation - l'utilisateur doit rafraîchir

          return;
        }

        // Document existe → utiliser les données
        const data = docSnap.data() as Partial<User>;
        const isFromCache = docSnap.metadata.fromCache;
        const hasPendingWrites = docSnap.metadata.hasPendingWrites;

        // 🔍 DEBUG COMPLET: Afficher TOUTES les données reçues de Firestore
        console.log("🔐 [AuthContext] 📊 Snapshot reçu:", {
          uid,
          fromCache: isFromCache,
          hasPendingWrites,
          // Champs critiques
          role: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: data.fullName,
          email: data.email,
          isApproved: data.isApproved,
          // Liste toutes les clés pour diagnostiquer les champs manquants
          allKeys: Object.keys(data),
        });

        // ⚠️ ALERTE si les données critiques sont manquantes
        if (!data.role) {
          console.error("❌ [AuthContext] ERREUR CRITIQUE: role est undefined/null dans Firestore!");
        }
        if (!data.firstName && !data.lastName && !data.fullName) {
          console.warn("⚠️ [AuthContext] firstName, lastName et fullName sont tous vides/undefined!");
        }

        setUser((prev) => {
          // 🔍 DEBUG: Afficher l'état précédent avant merge
          console.log("🔐 [AuthContext] 🔄 Merge - État précédent (prev):", {
            prevRole: prev?.role,
            prevFirstName: prev?.firstName,
            prevEmail: prev?.email,
            hasPrev: !!prev,
          });

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

          // 🔍 DEBUG COMPLET: Afficher le rôle final après merge
          console.log("🔐 [AuthContext] ✅ User merged - résultat final:", {
            role: merged.role,
            firstName: merged.firstName,
            lastName: merged.lastName,
            email: merged.email,
            isApproved: merged.isApproved,
          });

          return merged;
        });

        if (!firstSnapArrived.current) {
          const finalElapsed = Date.now() - listenerStartTime;
          console.log(`✅ [AuthContext] 🏁 [${finalElapsed}ms] First snapshot received for users/${uid}`);
          console.log("✅ [AuthContext] 🏁 setIsLoading(false), setAuthInitialized(true)");
          firstSnapArrived.current = true;
          setIsLoading(false);
          setAuthInitialized(true);
        } else {
          console.log("🔐 [AuthContext] 🔄 Snapshot de mise à jour reçu (pas le premier)");
        }
      },
      (err) => {
        const errorElapsed = Date.now() - listenerStartTime;
        // Annuler le timeout en cas d'erreur
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (fallbackTimeoutId) {
          clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
        }

        console.error(`❌ [AuthContext] [${errorElapsed}ms] [users/${uid}] Erreur listener:`, err);
        console.error(`❌ [AuthContext] Error details:`, {
          name: (err as Error)?.name,
          message: (err as Error)?.message,
          code: (err as any)?.code,
          stack: (err as Error)?.stack,
        });

        // ⚠️ CORRECTION: En cas d'erreur, NE PAS définir role='client' par défaut
        // Cela corromprait le rôle des prestataires si Firestore a une erreur temporaire
        if (!firstSnapArrived.current) {
          // ✅ Afficher une erreur au lieu d'écraser le rôle
          const errorCode = (err as any)?.code || 'unknown';
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
      console.log("🔐 [AuthContext] 🧹 Cleanup: annulation de l'abonnement users/" + uid);
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
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [deviceInfo]);

  const loginWithGoogle = useCallback(async (rememberMe: boolean = false): Promise<void> => {
    // VERSION 9 - TRY POPUP FIRST, FALLBACK TO REDIRECT
    console.log("[DEBUG] " + "🔵 GOOGLE LOGIN: Début (v9 - popup first)");

    setIsLoading(true);
    setError(null);
    setAuthMetrics((m) => ({
      ...m,
      loginAttempts: m.loginAttempts + 1,
      googleAttempts: m.googleAttempts + 1,
      lastAttempt: new Date(),
    }));
    try {
      console.log("[DEBUG] " + "🔵 GOOGLE LOGIN: setPersistence...");
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);

      console.log("[DEBUG] " + "🔵 GOOGLE LOGIN: Création provider...");
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });

      // Try popup first (works better with cross-origin)
      console.log("[DEBUG] " + "🔵 GOOGLE LOGIN: Tentative POPUP...");
      try {
        const result = await signInWithPopup(auth, provider);
        console.log("[DEBUG] " + "✅ GOOGLE POPUP: Succès! UID: " + result.user.uid);

        // Process the user directly (same logic as redirect handler)
        const googleUser = result.user;
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
          // Create new client user
          await createUserDocumentInFirestore(googleUser, {
            role: 'client',
            email: googleUser.email || '',
            preferredLanguage: 'fr',
            isApproved: true,
            approvalStatus: 'approved',
            isVisible: true,
            isActive: true,
            provider: 'google.com',
            isVerified: googleUser.emailVerified,
            ...(googleUser.photoURL && { profilePhoto: googleUser.photoURL, photoURL: googleUser.photoURL }),
          });
        }

        console.log("[DEBUG] " + "✅ GOOGLE POPUP: Utilisateur traité avec succès");
        await logAuthEvent('successful_google_login', { userId: googleUser.uid, userEmail: googleUser.email, deviceInfo });

        // Check for saved redirect URL
        const savedRedirect = sessionStorage.getItem('googleAuthRedirect');
        if (savedRedirect) {
          sessionStorage.removeItem('googleAuthRedirect');
          console.log('[Auth] Google popup: navigating to saved URL:', savedRedirect);
          window.location.href = savedRedirect;
        }
        return;
      } catch (popupError: any) {
        // If popup was blocked or closed, try redirect as fallback
        const popupErrorCode = popupError?.code || '';
        console.log("[DEBUG] " + "⚠️ GOOGLE POPUP échoué: " + popupErrorCode);

        if (popupErrorCode === 'auth/popup-closed-by-user' ||
            popupErrorCode === 'auth/cancelled-popup-request') {
          // User closed popup, don't fallback
          throw popupError;
        }

        if (popupErrorCode === 'auth/popup-blocked') {
          console.log("[DEBUG] " + "🔄 Popup bloqué, fallback vers REDIRECT...");
          // Save current URL for redirect after Google login
          const currentPath = window.location.pathname + window.location.search;
          sessionStorage.setItem('googleAuthRedirect', currentPath);
          await signInWithRedirect(auth, provider);
          return;
        }

        // For other errors, try redirect as fallback
        console.log("[DEBUG] " + "🔄 Erreur popup, fallback vers REDIRECT...");
        const currentPath = window.location.pathname + window.location.search;
        sessionStorage.setItem('googleAuthRedirect', currentPath);
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

        // VERSION 8 - DEBUG GOOGLE REDIRECT RESULT
        console.log("[DEBUG] " + "🔵 GOOGLE REDIRECT: Vérification du retour...");

        const result = await getRedirectResult(auth);

        if (!result?.user) {
          console.log("[DEBUG] " + "🔵 GOOGLE REDIRECT: Pas de résultat (normal si pas de redirect en cours)");
          return;
        }

        console.log("[DEBUG] " + "✅ GOOGLE REDIRECT: User reçu!\n\nUID: " + result.user.uid + "\nEmail: " + result.user.email);

        redirectHandledRef.current = true;
        const googleUser = result.user;

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

        // Check for saved redirect URL after Google login
        const savedRedirect = sessionStorage.getItem('googleAuthRedirect');
        if (savedRedirect) {
          sessionStorage.removeItem('googleAuthRedirect');
          console.log('[Auth] Google redirect: navigating to saved URL:', savedRedirect);
          // Use window.location for navigation to ensure full page reload with auth state
          window.location.href = savedRedirect;
        }
      } catch (e) {
        console.warn('[Auth] getRedirectResult error', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [deviceInfo]);

  // P1-2 FIX: Écouter les événements de logout des autres onglets
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
        // Firebase signOut en arrière-plan
        firebaseSignOut(auth).catch(() => { /* ignoré */ });
        signingOutRef.current = false;
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
      if (!userData.role || !['client', 'lawyer', 'expat', 'admin'].includes(userData.role)) {
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
      if (password.length < 6) {
        console.log("[DEBUG] " + "❌ REGISTER: Password trop court (<6 chars)");
        const err = new Error('Le mot de passe doit contenir au moins 6 caractères') as AppError;
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

      await sendEmailVerification(firebaseUser);

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
      // Log en arrière-plan (ne pas bloquer le UI)
      logAuthEvent('verification_email_failed', {
        userId: firebaseUser.uid,
        error: error instanceof Error ? error.message : String(error),
        deviceInfo
      }).catch(() => { /* ignoré */ });
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
export const useAuth = () => {
  const ctx = useContext(BaseAuthContext);

  // CRITIQUE: Vérifier que le contexte est initialisé
  // Si authInitialized est false ET user est null ET isLoading est true,
  // c'est probablement le defaultContext - on avertit mais on ne crash pas
  if (!ctx.authInitialized && ctx.user === null && ctx.isLoading) {
    console.warn('[useAuth] ⚠️ Contexte non initialisé - attendre authInitialized=true avant d\'utiliser les données');
  }

  return ctx;
};