/**
 * =============================================================================
 * UNIFIED USER CONTEXT - Context consolidé pour Auth, Subscription, Provider
 * =============================================================================
 *
 * OPTIMISATIONS:
 * - 1 seul onAuthStateChanged (au lieu de 3 contexts séparés)
 * - 1 seul onSnapshot sur users/{uid} (au lieu de multiples)
 * - Listeners conditionnels (provider uniquement si user.role === 'provider')
 * - Selectors avec useMemo pour re-renders granulaires
 *
 * MIGRATION:
 * - Utiliser useAuthUser() au lieu de useAuth()
 * - Utiliser useUserSubscription() au lieu de useSubscription()
 * - Utiliser useUserProvider() au lieu de useProvider()
 * - useUnifiedUser() pour accès complet (éviter si possible)
 *
 * =============================================================================
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { auth, db } from "../lib/firebase";
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  documentId,
  serverTimestamp,
} from "firebase/firestore";

// =============================================================================
// TYPES
// =============================================================================

export interface ProviderProfile {
  id: string;
  email: string;
  name: string;
  type: "lawyer" | "expat";
  active: boolean;
  country?: string;
  phone?: string;
  specialties?: string[];
  // Quota IA
  aiCallsLimit?: number;
  aiCallsUsed?: number;
  aiQuota?: number; // Legacy field
  // 🆕 Busy status fields for multi-provider sync
  availability?: "available" | "busy" | "offline";
  isOnline?: boolean;
  busyReason?: string;
  busyBySibling?: boolean;
  busySiblingProviderId?: string;
}

export interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  status: string | null;
  expiresAt: Date | null;
  planName: string | null;
}

interface UnifiedUserState {
  // Auth
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  isAdmin: boolean;

  // Subscription
  subscription: SubscriptionInfo;
  role: string | null;
  hasAllowedRole: boolean;

  // Provider
  isProvider: boolean;
  providerId: string | null;
  providerProfile: ProviderProfile | null;
  linkedProviders: ProviderProfile[];
  activeProvider: ProviderProfile | null;

  // Actions
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  switchProvider: (providerId: string) => void;
  refreshUser: () => Promise<void>;

  // Metadata
  error: string | null;
}

// Rôles autorisés
const ALLOWED_ROLES = [
  "lawyer",
  "expat",
  "avocat",
  "expat_aidant",
  "admin",
  "superadmin",
  "provider",
];

// =============================================================================
// CONTEXT
// =============================================================================

const UnifiedUserContext = createContext<UnifiedUserState | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function UnifiedUserProvider({ children }: { children: ReactNode }) {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Subscription
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    hasActiveSubscription: false,
    status: null,
    expiresAt: null,
    planName: null,
  });
  const [role, setRole] = useState<string | null>(null);

  // Provider
  const [isProvider, setIsProvider] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerProfile, setProviderProfile] =
    useState<ProviderProfile | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<ProviderProfile[]>([]);
  const [activeProvider, setActiveProvider] = useState<ProviderProfile | null>(
    null
  );

  // Error
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // SSO CLAIMS TRACKING (to avoid race conditions)
  // Ref is used because it's synchronous - state updates are async
  // ─────────────────────────────────────────────────────────────────────────
  const ssoClaimsRef = useRef<{
    hasActiveSubscription: boolean;
    role: string | null;
    processed: boolean;
  }>({
    hasActiveSubscription: false,
    role: null,
    processed: false,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setIsAdmin(false);
    setSubscription({
      hasActiveSubscription: false,
      status: null,
      expiresAt: null,
      planName: null,
    });
    setRole(null);
    setIsProvider(false);
    setProviderId(null);
    setProviderProfile(null);
    setLinkedProviders([]);
    setActiveProvider(null);
    setError(null);
    // Reset SSO ref
    ssoClaimsRef.current = { hasActiveSubscription: false, role: null, processed: false };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH LISTENER (unique)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Log auth changes only in development
      if (import.meta.env.DEV) {
        console.log("[UnifiedUser] 🔐 Auth changed:", {
          email: firebaseUser?.email,
          uid: firebaseUser?.uid,
          timestamp: new Date().toISOString(),
        });
      }

      setUser(firebaseUser);

      if (!firebaseUser?.email) {
        resetState();
        setLoading(false);
        return;
      }

      // Vérifier admin et subscription via Custom Claims (SSO depuis SOS)
      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const claims = tokenResult.claims;

        if (import.meta.env.DEV) {
          console.debug("[UnifiedUser] Token claims:", claims);
        }

        // 1. Vérifier admin
        const adminCheck =
          claims.admin === true ||
          claims.role === "admin";
        setIsAdmin(adminCheck);

        // Log admin check only in development
        if (import.meta.env.DEV) {
          console.log("[UnifiedUser] 👤 Admin check:", {
            isAdmin: adminCheck,
            claimsAdmin: claims.admin,
            claimsRole: claims.role,
          });
        }

        if (adminCheck) {
          // Admin a accès total
          setSubscription({
            hasActiveSubscription: true,
            status: "admin",
            expiresAt: null,
            planName: "Admin",
          });
          setRole("admin");

          // AUTO-CREATE USER DOCUMENT for admin if it doesn't exist
          // This prevents "Compte non trouvé" error for new admin accounts
          try {
            const adminUserRef = doc(db, "users", firebaseUser.uid);
            const adminUserSnap = await getDoc(adminUserRef);

            if (!adminUserSnap.exists()) {
              console.log("[UnifiedUser] Creating missing users document for admin:", firebaseUser.email);
              await setDoc(adminUserRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email?.toLowerCase() || "",
                displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Admin",
                photoURL: firebaseUser.photoURL || null,
                role: "admin",
                isAdmin: true,
                status: "active",
                subscriptionStatus: "admin",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                source: "auto-created-admin-login",
              }, { merge: true });
              console.log("[UnifiedUser] Admin users document created successfully");
            }
          } catch (adminDocErr) {
            console.error("[UnifiedUser] Failed to create admin users document:", adminDocErr);
            // Continue anyway - admin has access via claims
          }
        }
        // 2. Vérifier SSO subscription claims (générés par generateOutilToken dans SOS)
        else if (claims.subscriptionStatus || claims.subscriptionTier || claims.provider === true || claims.forcedAccess === true) {
          // Token SSO avec infos d'abonnement de SOS
          const ssoStatus = claims.subscriptionStatus as string | undefined;
          const ssoTier = claims.subscriptionTier as string | undefined;
          const hasForcedAccess = claims.forcedAccess === true;
          const freeTrialUntil = claims.freeTrialUntil as string | undefined;

          // Statuts qui donnent accès
          const activeStatuses = ["active", "trialing", "past_due"];
          const isActive = hasForcedAccess ||
            (ssoStatus && activeStatuses.includes(ssoStatus)) ||
            (freeTrialUntil && new Date(freeTrialUntil) > new Date());

          // Log SSO subscription only in development
          if (import.meta.env.DEV) {
            console.log("[UnifiedUser] 📜 SSO subscription from token:", {
              ssoStatus,
              ssoTier,
              hasForcedAccess,
              freeTrialUntil,
              isActive,
              allClaims: claims
            });
          }

          // IMPORTANT: Update ref SYNCHRONOUSLY before setState
          // This prevents race condition with the user document listener
          const ssoRole = claims.provider === true ? "provider" : null;
          ssoClaimsRef.current = {
            hasActiveSubscription: isActive || false,
            role: ssoRole,
            processed: true,
          };

          setSubscription({
            hasActiveSubscription: isActive || false,
            status: hasForcedAccess ? "active" : (ssoStatus || null),
            expiresAt: freeTrialUntil ? new Date(freeTrialUntil) : null,
            planName: ssoTier || null,
          });

          // Si provider claim est présent, définir le rôle
          if (ssoRole) {
            setRole(ssoRole);
          }
        }
      } catch (err) {
        console.error("[UnifiedUser] Erreur vérification admin:", err);
      }

      // Chercher le provider - PRIORITÉ: UID d'abord, puis email (fallback legacy)
      try {
        const emailLower = firebaseUser.email.toLowerCase();
        let providerDoc = null;
        let providerData = null;

        // 1. PRIORITÉ: Chercher par UID (document ID = Firebase UID)
        const providerByUidRef = doc(db, "providers", firebaseUser.uid);
        const providerByUidSnap = await getDoc(providerByUidRef);

        if (providerByUidSnap.exists()) {
          providerDoc = { id: providerByUidSnap.id, ...providerByUidSnap.data() };
          providerData = providerByUidSnap.data();
          console.log("[UnifiedUser] Provider trouvé par UID:", firebaseUser.uid);
        } else {
          // 2. FALLBACK: Chercher par email (pour compatibilité legacy)
          const providersQuery = query(
            collection(db, "providers"),
            where("email", "==", emailLower)
          );
          const snapshot = await getDocs(providersQuery);

          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            providerDoc = { id: doc.id, ...doc.data() };
            providerData = doc.data();
            console.log("[UnifiedUser] Provider trouvé par email (legacy):", emailLower);
          }
        }

        if (providerDoc && providerData) {
          const data = providerData;

          if (data.active !== false) {
            setProviderId(providerDoc.id);
            setProviderProfile({
              id: providerDoc.id,
              email: data.email || emailLower,
              name: data.name || "Sans nom",
              type: data.type || "lawyer",
              active: data.active !== false,
              country: data.country,
              phone: data.phone,
              specialties: data.specialties,
              // Quota IA
              aiCallsLimit: data.aiCallsLimit,
              aiCallsUsed: data.aiCallsUsed,
              aiQuota: data.aiQuota,
            });
            setIsProvider(true);

            // AUTO-CREATE USER DOCUMENT if it doesn't exist
            // Required for Firestore rules (isAssignedProvider checks users/{uid})
            const userRef = doc(db, "users", firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
              console.log("[UnifiedUser] Creating missing users document for provider:", providerDoc.id);
              try {
                await setDoc(userRef, {
                  linkedProviderIds: [providerDoc.id],
                  activeProviderId: providerDoc.id,
                  subscriptionStatus: subscription.hasActiveSubscription ? "active" : "inactive",
                  subscriptionTier: subscription.planName || "free",
                  role: "provider",
                  email: emailLower,
                  name: data.name || "Provider",
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  source: "auto-created-on-sso-login",
                }, { merge: true });
                console.log("[UnifiedUser] Users document created successfully");
              } catch (createErr) {
                console.error("[UnifiedUser] Failed to create users document:", createErr);
              }
            } else {
              // Update linkedProviderIds if provider not already linked
              const userData = userSnap.data();
              const linkedIds = userData.linkedProviderIds || [];
              if (!linkedIds.includes(providerDoc.id)) {
                console.log("[UnifiedUser] Adding provider to linkedProviderIds:", providerDoc.id);
                await updateDoc(userRef, {
                  linkedProviderIds: [...linkedIds, providerDoc.id],
                  activeProviderId: providerDoc.id,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("[UnifiedUser] Erreur recherche provider:", err);
      }

      // Log final auth state only in development
      if (import.meta.env.DEV) {
        console.log("[UnifiedUser] ✅ Auth processing complete:", {
          email: firebaseUser?.email,
          isAdmin,
          isProvider,
          providerId,
          hasSubscription: subscription.hasActiveSubscription,
          subscriptionStatus: subscription.status,
          role,
        });
      }

      setLoading(false);
    });

    return () => unsub();
  }, [resetState]);

  // ─────────────────────────────────────────────────────────────────────────
  // USER DOCUMENT LISTENER (subscription + linked providers)
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return;
    if (isAdmin) return; // Admin n'a pas besoin de listener subscription

    const userRef = doc(db, "users", user.uid);

    const unsub = onSnapshot(
      userRef,
      async (snapshot) => {
        // Log Firestore user document status only in development
        if (import.meta.env.DEV) {
          console.log("[UnifiedUser] 📄 Firestore users/{uid} snapshot:", {
            exists: snapshot.exists(),
            uid: user.uid,
            ssoHasActive: ssoClaimsRef.current.hasActiveSubscription,
            stateHasActive: subscription.hasActiveSubscription,
          });
        }

        if (!snapshot.exists()) {
          // Si l'utilisateur a déjà une subscription valide via SSO token, pas d'erreur
          // IMPORTANT: Use ref instead of state to avoid race condition
          // The state might not be updated yet when this callback runs
          if (subscription.hasActiveSubscription || ssoClaimsRef.current.hasActiveSubscription) {
            console.log("[UnifiedUser] ℹ️ User doc not found but SSO subscription active - no error");
            return;
          }

          // P1 FIX: Fallback - Check providers/{uid} for forcedAIAccess
          // This handles cases where syncProvider wrote to providers but not users
          console.log("[UnifiedUser] ⚠️ User doc not found, checking providers fallback...");
          try {
            const providerRef = doc(db, "providers", user.uid);
            const providerSnap = await getDoc(providerRef);

            if (providerSnap.exists()) {
              const providerData = providerSnap.data();
              const hasForcedAccess = providerData.forcedAIAccess === true;
              const hasSubActive = providerData.hasActiveSubscription === true;

              // Check freeTrialUntil
              let hasFreeTrialAccess = false;
              let expiresAt: Date | null = null;
              const freeTrialData = providerData.freeTrialUntil;
              if (freeTrialData) {
                const trialDate = freeTrialData.toDate?.() || new Date(freeTrialData);
                if (trialDate > new Date()) {
                  hasFreeTrialAccess = true;
                  expiresAt = trialDate;
                }
              }

              console.log("[UnifiedUser] Provider fallback check:", {
                hasForcedAccess,
                hasFreeTrialAccess,
                hasSubActive,
              });

              if (hasForcedAccess || hasFreeTrialAccess || hasSubActive) {
                setSubscription({
                  hasActiveSubscription: true,
                  status: hasForcedAccess ? "active" : (hasFreeTrialAccess ? "trialing" : "active"),
                  expiresAt,
                  planName: hasForcedAccess ? "Admin Access" : null,
                });
                setRole("provider");
                setError(null);
                return;
              }
            }
          } catch (err) {
            console.error("[UnifiedUser] Provider fallback error:", err);
          }

          setError("Compte non trouvé. Veuillez vous inscrire sur sos-expat.com");
          return;
        }

        const data = snapshot.data();

        // ───────────────────────────────────────────────────────────────────
        // SUBSCRIPTION
        // ───────────────────────────────────────────────────────────────────
        // NE PAS écraser la subscription si elle vient déjà du token SSO
        // IMPORTANT: Check both state AND ref to handle race condition
        const hasValidSsoSubscription = subscription.hasActiveSubscription || ssoClaimsRef.current.hasActiveSubscription;
        if (!hasValidSsoSubscription) {
          const status =
            data.subscriptionStatus || data.subscription_status || null;

          // P1 FIX: Check forcedAIAccess and freeTrialUntil from Firestore
          // These are synced from SOS via syncProvider endpoint
          const hasForcedAccess = data.forcedAIAccess === true;
          let hasFreeTrialAccess = false;
          let expiresAt: Date | null = null;

          // Check freeTrialUntil
          const freeTrialData = data.freeTrialUntil;
          if (freeTrialData) {
            const trialDate = freeTrialData.toDate?.() || new Date(freeTrialData);
            if (trialDate > new Date()) {
              hasFreeTrialAccess = true;
              expiresAt = trialDate;
            }
          }

          // Check subscription expiry
          if (!expiresAt && data.subscriptionExpiresAt) {
            expiresAt =
              data.subscriptionExpiresAt.toDate?.() ||
              new Date(data.subscriptionExpiresAt);
          } else if (!expiresAt && data.subscription_expires_at) {
            expiresAt = new Date(data.subscription_expires_at);
          }

          // Determine if access is active
          const isActive =
            hasForcedAccess ||
            hasFreeTrialAccess ||
            data.hasActiveSubscription === true ||
            status === "active" ||
            status === "trialing" ||
            status === "past_due";

          console.log("[UnifiedUser] Firestore subscription check:", {
            hasForcedAccess,
            hasFreeTrialAccess,
            hasActiveSubscription: data.hasActiveSubscription,
            status,
            isActive,
          });

          setSubscription({
            hasActiveSubscription: isActive,
            status: hasForcedAccess ? "active" : (hasFreeTrialAccess ? "trialing" : status),
            expiresAt,
            planName: hasForcedAccess ? "Admin Access" : (data.planName || data.plan_name || null),
          });
        } else if (import.meta.env.DEV) {
          console.debug("[UnifiedUser] Subscription already set from SSO token, skipping Firestore override", {
            stateHasActive: subscription.hasActiveSubscription,
            refHasActive: ssoClaimsRef.current.hasActiveSubscription,
          });
        }

        // ───────────────────────────────────────────────────────────────────
        // ROLE
        // ───────────────────────────────────────────────────────────────────
        // NE PAS écraser le rôle s'il vient déjà du token SSO
        const ssoRole = ssoClaimsRef.current.role;
        if (!ssoRole) {
          const userRole = data.role || data.userRole || null;
          setRole(userRole);
        } else if (import.meta.env.DEV) {
          console.debug("[UnifiedUser] Role already set from SSO token, skipping Firestore override", {
            ssoRole,
            firestoreRole: data.role || data.userRole,
          });
        }

        // Admin fallback
        if (
          !isAdmin &&
          (data.isAdmin === true ||
            data.role === "admin" ||
            data.role === "superadmin")
        ) {
          setIsAdmin(true);
        }

        // ───────────────────────────────────────────────────────────────────
        // LINKED PROVIDERS (batch load)
        // ───────────────────────────────────────────────────────────────────
        const linkedIds: string[] = data.linkedProviderIds || [];
        if (data.providerId && !linkedIds.includes(data.providerId)) {
          linkedIds.push(data.providerId);
        }

        // Filtrer les IDs déjà chargés
        const existingIds = new Set([providerProfile?.id].filter(Boolean));
        const idsToLoad = linkedIds.filter(
          (id) => !existingIds.has(id)
        );

        if (idsToLoad.length > 0) {
          try {
            const providers: ProviderProfile[] = providerProfile
              ? [providerProfile]
              : [];

            // Chunker par 10
            const chunks: string[][] = [];
            for (let i = 0; i < idsToLoad.length; i += 10) {
              chunks.push(idsToLoad.slice(i, i + 10));
            }

            const results = await Promise.all(
              chunks.map(async (chunk) => {
                const q = query(
                  collection(db, "providers"),
                  where(documentId(), "in", chunk)
                );
                return getDocs(q);
              })
            );

            for (const snapshot of results) {
              for (const providerDoc of snapshot.docs) {
                const pData = providerDoc.data();
                if (pData.active !== false) {
                  providers.push({
                    id: providerDoc.id,
                    name: pData.name || "Sans nom",
                    type: pData.type || "lawyer",
                    email: pData.email,
                    country: pData.country,
                    phone: pData.phone,
                    specialties: pData.specialties,
                    active: pData.active !== false,
                  });
                }
              }
            }

            setLinkedProviders(providers);

            // Définir provider actif
            if (providers.length > 0 && !activeProvider) {
              const savedId = localStorage.getItem(
                `activeProvider_${user.uid}`
              );
              const saved = savedId
                ? providers.find((p) => p.id === savedId)
                : null;
              setActiveProvider(saved || providers[0]);
            }
          } catch (err) {
            console.error(
              "[UnifiedUser] Erreur chargement providers liés:",
              err
            );
          }
        } else if (providerProfile && linkedProviders.length === 0) {
          // Un seul provider (détecté par email)
          setLinkedProviders([providerProfile]);
          setActiveProvider(providerProfile);
        }

        setError(null);
      },
      (err) => {
        console.error("[UnifiedUser] Erreur listener user:", err);
        setError("Erreur de vérification. Réessayez plus tard.");
      }
    );

    return () => unsub();
  }, [user?.uid, isAdmin, providerProfile, activeProvider, linkedProviders.length, subscription.hasActiveSubscription]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    resetState();
  }, [resetState]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }, []);

  const switchProvider = useCallback(
    async (newProviderId: string) => {
      const provider = linkedProviders.find((p) => p.id === newProviderId);
      if (!provider) return;

      setActiveProvider(provider);

      if (user?.uid) {
        localStorage.setItem(`activeProvider_${user.uid}`, newProviderId);

        try {
          await updateDoc(doc(db, "users", user.uid), {
            activeProviderId: newProviderId,
          });
        } catch (err) {
          console.debug("[UnifiedUser] Erreur sauvegarde activeProviderId:", err);
        }
      }
    },
    [linkedProviders, user?.uid]
  );

  const refreshUser = useCallback(async () => {
    if (!user) return;
    await user.reload();
    await user.getIdToken(true);
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  const authenticated = !!user;
  const hasAllowedRole = role ? ALLOWED_ROLES.includes(role) : false;

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE (memoized)
  // ─────────────────────────────────────────────────────────────────────────

  const contextValue = useMemo<UnifiedUserState>(
    () => ({
      // Auth
      user,
      loading,
      authenticated,
      isAdmin,

      // Subscription
      subscription,
      role,
      hasAllowedRole,

      // Provider
      isProvider,
      providerId,
      providerProfile,
      linkedProviders,
      activeProvider,

      // Actions
      signOut,
      signInWithGoogle,
      switchProvider,
      refreshUser,

      // Metadata
      error,
    }),
    [
      user,
      loading,
      authenticated,
      isAdmin,
      subscription,
      role,
      hasAllowedRole,
      isProvider,
      providerId,
      providerProfile,
      linkedProviders,
      activeProvider,
      signOut,
      signInWithGoogle,
      switchProvider,
      refreshUser,
      error,
    ]
  );

  return (
    <UnifiedUserContext.Provider value={contextValue}>
      {children}
    </UnifiedUserContext.Provider>
  );
}

// =============================================================================
// HOOKS - SELECTORS (re-render optimisés)
// =============================================================================

/**
 * Hook complet - éviter si possible, préférer les selectors
 */
export function useUnifiedUser(): UnifiedUserState {
  const context = useContext(UnifiedUserContext);
  if (!context) {
    throw new Error(
      "useUnifiedUser doit être utilisé dans UnifiedUserProvider"
    );
  }
  return context;
}

/**
 * Selector Auth - re-render UNIQUEMENT si auth change
 */
export function useAuthUser() {
  const context = useContext(UnifiedUserContext);
  if (!context) {
    throw new Error("useAuthUser doit être utilisé dans UnifiedUserProvider");
  }

  return useMemo(
    () => ({
      user: context.user,
      loading: context.loading,
      authenticated: context.authenticated,
      isAdmin: context.isAdmin,
      signOut: context.signOut,
      signInWithGoogle: context.signInWithGoogle,
    }),
    [
      context.user,
      context.loading,
      context.authenticated,
      context.isAdmin,
      context.signOut,
      context.signInWithGoogle,
    ]
  );
}

/**
 * Selector Subscription - re-render UNIQUEMENT si subscription change
 */
export function useUserSubscription() {
  const context = useContext(UnifiedUserContext);
  if (!context) {
    throw new Error(
      "useUserSubscription doit être utilisé dans UnifiedUserProvider"
    );
  }

  return useMemo(
    () => ({
      ...context.subscription,
      role: context.role,
      hasAllowedRole: context.hasAllowedRole,
      loading: context.loading,
      error: context.error,
    }),
    [
      context.subscription,
      context.role,
      context.hasAllowedRole,
      context.loading,
      context.error,
    ]
  );
}

/**
 * Selector Provider - re-render UNIQUEMENT si provider change
 */
export function useUserProvider() {
  const context = useContext(UnifiedUserContext);
  if (!context) {
    throw new Error(
      "useUserProvider doit être utilisé dans UnifiedUserProvider"
    );
  }

  return useMemo(
    () => ({
      isProvider: context.isProvider,
      providerId: context.providerId,
      providerProfile: context.providerProfile,
      linkedProviders: context.linkedProviders,
      activeProvider: context.activeProvider,
      switchProvider: context.switchProvider,
      loading: context.loading,
      error: context.error,
    }),
    [
      context.isProvider,
      context.providerId,
      context.providerProfile,
      context.linkedProviders,
      context.activeProvider,
      context.switchProvider,
      context.loading,
      context.error,
    ]
  );
}

// =============================================================================
// BACKWARD COMPATIBILITY HOOKS
// =============================================================================

/**
 * @deprecated Utiliser useAuthUser() à la place
 */
export function useAuth() {
  const ctx = useAuthUser();
  const unified = useContext(UnifiedUserContext);

  return {
    ...ctx,
    isProvider: unified?.isProvider ?? false,
    providerId: unified?.providerId ?? null,
    providerProfile: unified?.providerProfile ?? null,
  };
}

/**
 * @deprecated Utiliser useUserSubscription() à la place
 */
export function useSubscription() {
  return useUserSubscription();
}

/**
 * @deprecated Utiliser useUserProvider() à la place
 */
export function useProvider() {
  return useUserProvider();
}

export default UnifiedUserContext;
