// src/utils/firestore.ts

// ========================= Imports =========================
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  startAfter,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  QuerySnapshot,
  runTransaction,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import { db, storage, auth } from "../config/firebase";

// Import correct du type User depuis contexts/types
import type { User } from "../contexts/types";
import type { CallRecord, Payment, Review, CallSession } from "../types";

// ========================= Helpers (type-safe) =========================
type Dict = Record<string, unknown>;

const asDict = (v: unknown): Dict =>
  v && typeof v === "object" ? (v as Dict) : {};

const getStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const getBool = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;

const getNum = (v: unknown, fallback = 0): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const getArr = <T = unknown>(v: unknown, fallback: T[] = []): T[] =>
  Array.isArray(v) ? (v as T[]) : fallback;

// ========================= Utils =========================
const toDate = (v: unknown): Date | null => {
  try {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v instanceof Timestamp) return v.toDate();
    const maybe = v as { toDate?: () => Date };
    if (typeof maybe?.toDate === "function") return maybe.toDate();
    const d = new Date(v as string | number);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const truthy = (v: unknown) => v !== undefined && v !== null;

// Pagination helper for fetching all documents in batches (max 500 per batch)
const PAGINATION_BATCH_SIZE = 500;

const fetchAllDocsPaginated = async (
  collectionRef: ReturnType<typeof collection>,
  constraints: QueryConstraint[] = []
): Promise<QueryDocumentSnapshot<DocumentData>[]> => {
  const allDocs: QueryDocumentSnapshot<DocumentData>[] = [];
  let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  let hasMore = true;

  while (hasMore) {
    const baseConstraints: QueryConstraint[] = [...constraints, fsLimit(PAGINATION_BATCH_SIZE)];
    let currentQuery;
    if (lastDoc) {
      currentQuery = query(collectionRef, ...baseConstraints, startAfter(lastDoc));
    } else {
      currentQuery = query(collectionRef, ...baseConstraints);
    }

    const snapshot: QuerySnapshot<DocumentData> = await getDocs(currentQuery);

    if (snapshot.empty || snapshot.docs.length === 0) {
      hasMore = false;
    } else {
      allDocs.push(...snapshot.docs);
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.docs.length === PAGINATION_BATCH_SIZE;
    }
  }

  return allDocs;
};

export const firstString = (
  val: unknown,
  preferredLang: string = "fr"
): string | undefined => {
  if (!val) return;
  if (typeof val === "string") return val.trim() || undefined;
  if (Array.isArray(val)) {
    const joined = (val as unknown[])
      .map((x) => firstString(x, preferredLang))
      .filter(Boolean)
      .join(", ");
    return joined || undefined;
  }
  if (typeof val === "object") {
    const obj = asDict(val);
    const byLang = obj[preferredLang];
    if (typeof byLang === "string" && byLang.trim()) return byLang.trim();
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return;
};

// ========================= Normalization =========================
export const normalizeUserData = (
  userData: Record<string, unknown>,
  docId: string
): User => {
  return {
    id: docId,
    uid: (userData?.uid as string) || docId,
    role: (userData?.role as string) || "client",
    country:
      (userData?.country as string) ||
      (userData?.currentCountry as string) ||
      "",
    fullName:
      (userData?.fullName as string) ||
      `${(userData?.firstName as string) || ""} ${(userData?.lastName as string) || ""}`.trim() ||
      "Utilisateur",
    updatedAt: toDate(userData?.updatedAt) || new Date(),
    lastLoginAt: toDate(userData?.lastLoginAt) || new Date(),
    createdAt: toDate(userData?.createdAt) || new Date(),
    firstName: (userData?.firstName as string) || "",
    lastName: (userData?.lastName as string) || "",
    email: (userData?.email as string) || "",
    phone: (userData?.phone as string) || "",
    phoneCountryCode: (userData?.phoneCountryCode as string) || "+33",
    currentCountry: (userData?.currentCountry as string) || "",
    preferredLanguage: (userData?.preferredLanguage as string) || "fr",
    profilePhoto:
      (userData?.profilePhoto as string) ||
      (userData?.photoURL as string) ||
      (userData?.avatar as string) ||
      "/default-avatar.png",
    isActive: userData?.isActive !== false,
    isApproved: !!userData?.isApproved,
    isVerified: !!userData?.isVerified,
    isVisibleOnMap: userData?.isVisibleOnMap !== false,
    isAvailable: !!userData?.isAvailable,
    isBanned: !!userData?.isBanned,
    banReason: (userData?.banReason as string) || "",
    profileCompleted: !!userData?.profileCompleted,
    stripeCustomerId: (userData?.stripeCustomerId as string) || "",
    stripeAccountId: (userData?.stripeAccountId as string) || "",
    notificationPreferences: (userData?.notificationPreferences as {
      email: boolean;
      push: boolean;
      sms: boolean;
    }) || {
      email: true,
      push: true,
      sms: false,
    },
    deviceTokens: Array.isArray(userData?.deviceTokens)
      ? (userData.deviceTokens as string[])
      : [],
    marketingConsent: !!userData?.marketingConsent,
    lastActive: toDate(userData?.lastActive) || new Date(),
    createdByAdmin: !!userData?.createdByAdmin,
    isTestProfile: !!userData?.isTestProfile,
    isCallable: userData?.isCallable !== false,

    // Nouveaux champs requis
    lang:
      (userData?.lang as string) ||
      (userData?.preferredLanguage as string) ||
      "fr",
    avatar:
      (userData?.avatar as string) ||
      (userData?.profilePhoto as string) ||
      (userData?.photoURL as string) ||
      "/default-avatar.png",
    isSOS:
      (userData?.isSOS as boolean) ||
      (userData?.role as string) === "lawyer" ||
      (userData?.role as string) === "expat",
    points: Number(userData?.points ?? 0),
    affiliateCode:
      (userData?.affiliateCode as string) ||
      `SOS-${docId.substring(0, 6).toUpperCase()}`,
    referralBy: truthy(userData?.referralBy)
      ? (userData?.referralBy as string)
      : null,

    // Champs pour production
    bio: (userData?.bio as string) || "",
    hourlyRate: Number(
      userData?.hourlyRate ??
        ((userData?.role as string) === "lawyer" ? 49 : 19)
    ),
    responseTime: (userData?.responseTime as string) || "< 5 minutes",
    availability: (userData?.availability as string) || "available",
    totalCalls: Number(userData?.totalCalls ?? 0),
    totalEarnings: Number(userData?.totalEarnings ?? 0),
    averageRating: Number(userData?.averageRating ?? 5.0),

    // Champs supplémentaires
    mainLanguage: userData?.mainLanguage as string | undefined,
    languages: Array.isArray(userData?.languages)
      ? (userData.languages as string[])
      : [],
    city: (userData?.city as string) || "",
    interventionCountries: Array.isArray(userData?.interventionCountries)
      ? (userData.interventionCountries as string[])
      : [],
    certifications: Array.isArray(userData?.certifications)
  ? (userData.certifications as string[])
  : typeof userData?.certifications === 'string'
    ? [userData.certifications]
    : undefined,
    education: userData?.education as string | string[] | undefined,
    lawSchool: userData?.lawSchool as string | undefined,
    graduationYear: truthy(userData?.graduationYear)
      ? Number(userData.graduationYear)
      : undefined,
    successRate: truthy(userData?.successRate)
      ? Number(userData.successRate)
      : undefined,
    duration: truthy(userData?.duration)
      ? Number(userData.duration)
      : undefined,
    price: truthy(userData?.price)
      ? Number(userData.price)
      : (userData?.role as string) === "lawyer"
        ? 49
        : 19,
    rating: Number(userData?.rating ?? userData?.averageRating ?? 5),
    reviewCount: Number(userData?.reviewCount ?? 0),
    lastSeen: toDate(userData?.lastSeen),

    // champs riches
    description: userData?.description as string | undefined,
    professionalDescription: userData?.professionalDescription as
      | string
      | undefined,
    experienceDescription: userData?.experienceDescription as
      | string
      | undefined,
    motivation: userData?.motivation as string | undefined,
    slug: userData?.slug as string | undefined,
    countrySlug: userData?.countrySlug as string | undefined,
    photoURL: userData?.photoURL as string | undefined,
    approvalStatus: (userData?.approvalStatus as 'pending' | 'approved' | 'rejected') || 'pending',
  } as unknown as User;
};

// ========================= Collections bootstrapping =========================
export const ensureCollectionsExist = async () => {
  try {
    const collections = [
      "users",
      "calls",
      "payments",
      "reviews",
      "documents",
      "notifications",
      "testimonials",
      "call_sessions",
      "sos_profiles",
      "invoices",
      "logs",
      "app_settings",
      "admin_settings",
      "help_articles",
      "countries",
      "analytics",
      "affiliate_codes",
      "referrals",
      "booking_requests",
      "call_records",
      "refund_requests",
      "promo_codes",
      "review_reports",
      "call_logs",
      "faqs",
    ];
    for (const collectionName of collections) {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(query(colRef, fsLimit(1)));
      if (snapshot.empty) {
        await addDoc(colRef, {
          _placeholder: true,
          _created: serverTimestamp(),
          _description: `Placeholder document for ${collectionName} collection`,
        });
      }
    }
    return true;
  } catch (error) {
    console.error("Error ensuring collections exist:", error);
    return false;
  }
};

export const createInitialAppSettings = async () => {
  try {
    const settingsRef = doc(db, "app_settings", "main");
    const settingsDoc = await getDoc(settingsRef);
    if (!settingsDoc.exists()) {
      await setDoc(settingsRef, {
        servicesEnabled: { lawyerCalls: true, expatCalls: true },
        pricing: { lawyerCall: 49, expatCall: 19 },
        // REMOVED: platformCommission hardcoded value
        // Commission amounts are now centralized in admin_config/pricing (Firestore)
        // Use pricingService.getPricingConfig() to get connectionFeeAmount
        maxCallDuration: 30,
        callTimeout: 30,
        supportedCountries: [
          "CA",
          "UK",
          "DE",
          "ES",
          "IT",
          "BE",
          "CH",
          "LU",
          "NL",
          "AT",
        ],
        supportedLanguages: ["fr", "en"],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    console.error("Error creating initial app settings:", error);
    return false;
  }
};

// ========================= User =========================
export const createUserProfile = async (userData: Partial<User>) => {
  try {
    if (!userData.id) throw new Error("User ID is required");

    // Photo de profil (support base64 et URL)
    let finalProfilePhoto = "/default-avatar.png";
    if (userData.profilePhoto) {
      if (userData.profilePhoto.startsWith("data:image")) {
        // Use image optimizer to standardize size and convert to WebP
        const { optimizeProfileImage, getOptimalFormat, getFileExtension } = await import('./imageOptimizer');
        
        try {
          const format = await getOptimalFormat();
          const optimized = await optimizeProfileImage(userData.profilePhoto, {
            targetSize: 512,
            quality: 0.85,
            format,
          });

          console.log(`[Firestore] Profile photo optimized: ${(optimized.originalSize / 1024).toFixed(1)}KB → ${(optimized.optimizedSize / 1024).toFixed(1)}KB`);

          const extension = getFileExtension(format);
          console.log(`💾 [Firestore] Saving to Firebase Storage as: ${format.toUpperCase()} format (${extension} extension)`);
          const storageRef = ref(
            storage,
            `profilePhotos/${userData.id}/${Date.now()}${extension}`
          );
          const uploadResult = await uploadString(
            storageRef,
            optimized.dataUrl,
            "data_url"
          );
          finalProfilePhoto = await getDownloadURL(uploadResult.ref);
        } catch (error) {
          console.error('[Firestore] Image optimization failed:', error);
          // Fallback to original upload without optimization
          const storageRef = ref(
            storage,
            `profilePhotos/${userData.id}/${Date.now()}.jpg`
          );
          const uploadResult = await uploadString(
            storageRef,
            userData.profilePhoto,
            "data_url"
          );
          finalProfilePhoto = await getDownloadURL(uploadResult.ref);
        }
      } else if (userData.profilePhoto.startsWith("http")) {
        finalProfilePhoto = userData.profilePhoto;
      }
    }

    // Créer un slug à partir du nom
    const fullName =
      `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
    let slug = fullName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-");
    if (userData.id) slug = `${slug}-${userData.id.substring(0, 6)}`;

    const userRef = doc(db, "users", userData.id);
    const userDocData = {
      ...userData,
      profilePhoto: finalProfilePhoto,
      photoURL: finalProfilePhoto,
      avatar: finalProfilePhoto,
      slug,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, userDocData, { merge: true });

    // Créer automatiquement le profil SOS si prestataire
    if (userData.role === "lawyer" || userData.role === "expat") {
      const sosProfileRef = doc(db, "sos_profiles", userData.id);
      const mainLanguage =
        Array.isArray(userData.languages) && userData.languages.length > 0
          ? userData.languages[0]
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "-")
          : "francais";
      const country = userData.currentCountry || userData.country || "";
      const countrySlug = country
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-");

      const extra = asDict(userData);

      await setDoc(
        sosProfileRef,
        {
          uid: userData.id,
          type: userData.role,
          fullName:
            userData.fullName ||
            `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
            "Expert",
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          slug,
          mainLanguage,
          countrySlug,
          email: userData.email || "",
          phone: userData.phone || "",
          phoneCountryCode: userData.phoneCountryCode || "+33",
          languages: Array.isArray(userData.languages)
            ? userData.languages
            : ["Français"],
          country,
          city: getStr(extra.city, ""),
          description: userData.bio || "",
          profilePhoto: finalProfilePhoto,
          photoURL: finalProfilePhoto,
          avatar: finalProfilePhoto,
          isActive: true,
          isOnline: true,
          // ✅ BUG FIX: Initialiser lastActivity à la création du profil
          // pour que checkProviderInactivity puisse calculer l'inactivité
          lastActivity: serverTimestamp(),
          availability: "available",
          motivation: getStr(extra.motivation, ""),
          isApproved: !!userData.isApproved,
          specialties:
            userData.role === "lawyer"
              ? getArr<string>(extra.specialties) || []
              : getArr<string>(extra.helpTypes) || [],
          yearsOfExperience:
            userData.role === "lawyer"
              ? getNum(extra.yearsOfExperience, 0)
              : getNum(extra.yearsAsExpat, 0),
          price: userData.role === "lawyer" ? 49 : 19,
          graduationYear: truthy(extra.graduationYear)
            ? getNum(extra.graduationYear)
            : new Date().getFullYear() - 5,
          certifications: getArr<string>(extra.certifications, []),
          responseTime: "< 5 minutes",
          successRate: userData.role === "lawyer" ? 95 : 90,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          interventionCountries: Array.isArray(extra.interventionCountries)
            ? (extra.interventionCountries as string[])
            : country
              ? [country]
              : [],
        },
        { merge: true }
      );
    }

    return true;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

export const updateUserProfile = async (
  userId: string,
  userData: Partial<User>
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { ...userData, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

type EnhancedSettings = {
  theme: "light" | "dark" | "auto";
  language: string;
  notifications: { email: boolean; push: boolean; sms: boolean };
  privacy: { profileVisible: boolean; showOnMap: boolean };
};

export const updateUserEnhancedSettings = async (
  userId: string,
  settings: Partial<EnhancedSettings>
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      enhancedSettings: settings,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating user enhanced settings:", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists())
      return normalizeUserData(userDoc.data() as DocumentData, userDoc.id);
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// ========================= Online status =========================
export const updateUserOnlineStatus = async (
  userId: string,
  isOnline: boolean
) => {
  try {
    const batch = writeBatch(db);
    const userRef = doc(db, "users", userId);
    batch.update(userRef, {
      isOnline,
      availability: isOnline ? "available" : "unavailable",
      lastStatusChange: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const sosProfileRef = doc(db, "sos_profiles", userId);
    const sosDoc = await getDoc(sosProfileRef);
    if (sosDoc.exists()) {
      batch.update(sosProfileRef, {
        isOnline,
        availability: isOnline ? "available" : "unavailable",
        isVisible: true,
        isVisibleOnMap: true,
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const u = asDict(userSnap.data());
        await setDoc(sosProfileRef, {
          uid: userId,
          type: getStr(u.role, "") || "expat",
          fullName:
            getStr(u.fullName) ||
            `${getStr(u.firstName) || ""} ${getStr(u.lastName) || ""}`.trim() ||
            "Expert",
          firstName: getStr(u.firstName),
          lastName: getStr(u.lastName),
          email: getStr(u.email),
          phone: getStr(u.phone),
          phoneCountryCode: getStr(u.phoneCountryCode, "+33"),
          languages: getArr<string>(u.languages, ["fr"]),
          country: getStr(u.currentCountry) || getStr(u.country),
          description: getStr(u.bio),
          profilePhoto:
            getStr(u.profilePhoto) ||
            getStr(u.photoURL) ||
            getStr(u.avatar, "/default-avatar.png"),
          isActive: true,
          isApproved: getBool(u.isApproved, false),
          isVerified: getBool(u.isVerified, false),
          isVisible: true,
          isVisibleOnMap: true,
          isOnline,
          availability: isOnline ? "available" : "unavailable",
          rating: 5.0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastStatusChange: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error updating online status for ${userId}:`, error);
    throw error;
  }
};

export const listenToUserOnlineStatus = (
  userId: string,
  callback: (isOnline: boolean) => void
) => {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = asDict(snap.data());
      callback(!!data.isOnline);
    }
  });
};

// ========================= Calls =========================
export const createCallRecord = async (callData: Partial<CallRecord>) => {
  const callsRef = collection(db, "calls");
  const callDoc = await addDoc(callsRef, {
    ...callData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return callDoc.id;
};

export const updateCallRecord = async (
  callId: string,
  callData: Partial<CallRecord>
) => {
  const callRef = doc(db, "calls", callId);
  await updateDoc(callRef, { ...callData, updatedAt: serverTimestamp() });
  return true;
};

// Fetch call sessions for a user (from call_sessions collection)
export const getUserCallSessions = async (
  userId: string,
  userRole: "client" | "lawyer" | "expat" | "admin"
) => {
  try {
    const callSessionsRef = collection(db, "call_sessions");

    // Admin users can see all sessions, others filter by their ID
    let q;
    if (userRole === "admin") {
      // Admin: get all recent sessions without user filter
      q = query(
        callSessionsRef,
        orderBy("metadata.createdAt", "desc"),
        fsLimit(50)
      );
    } else {
      // Determine which field to query based on role
      const fieldName = userRole === "client" ? "metadata.clientId" : "metadata.providerId";
      q = query(
        callSessionsRef,
        where(fieldName, "==", userId),
        orderBy("metadata.createdAt", "desc"),
        fsLimit(50)
      );
    }

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => {
      const data = asDict(docSnap.data());
      const metadata = asDict(data.metadata || {});
      const payment = asDict(data.payment || {});
      const participants = asDict(data.participants || {});
      const clientParticipant = asDict(participants.client || {});
      const providerParticipant = asDict(participants.provider || {});
      
      const createdAt = toDate(metadata.createdAt) || new Date();
      const updatedAt = toDate(metadata.updatedAt) || new Date();
      
      return {
        id: docSnap.id,
        sessionId: String(data.id || docSnap.id),
        clientId: String(metadata.clientId || ""),
        providerId: String(metadata.providerId || ""),
        clientName: String(clientParticipant.name || "Client"),
        providerName: String(providerParticipant.name || "Provider"),
        serviceType: String(metadata.serviceType || "expat_call") as "lawyer_call" | "expat_call",
        providerType: String(metadata.providerType || "expat"),
        title: `${metadata.serviceType === "lawyer_call" ? "Lawyer" : "Expat"} Call`,
        description: `Call session - ${data.status || "pending"}`,
        status: String(data.status || "pending") as "completed" | "pending" | "in_progress" | "failed",
        duration: Number(metadata.maxDuration || 0) / 60, // Convert seconds to minutes
        price: Number(payment.amount || 0),
        amount: Number(payment.amount || 0),
        paymentStatus: String(payment.status || ""),
        paymentIntentId: String(payment.intentId || ""),
        clientPhone: String(clientParticipant.phone || ""),
        providerPhone: String(providerParticipant.phone || ""),
        clientStatus: String(clientParticipant.status || ""),
        providerStatus: String(providerParticipant.status || ""),
        createdAt,
        updatedAt,
        startedAt: createdAt, // Use createdAt as fallback for startedAt
        endedAt: updatedAt, // Use updatedAt as fallback for endedAt
        clientRating: undefined,
      };
    });
  } catch (error) {
    console.error("Error fetching user call sessions:", error);
    return [];
  }
};

// ========================= Payments =========================
export const createPaymentRecord = async (paymentData: Partial<Payment>) => {
  const paymentsRef = collection(db, "payments");
  const paymentDoc = await addDoc(paymentsRef, {
    ...paymentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return paymentDoc.id;
};

export const updatePaymentRecord = async (
  paymentId: string,
  paymentData: Partial<Payment>
) => {
  const paymentRef = doc(db, "payments", paymentId);
  await updateDoc(paymentRef, { ...paymentData, updatedAt: serverTimestamp() });
  return true;
};

// ========================= Reviews =========================
// A) Remplacement complet de createReviewRecord (AUTO-PUBLISH ≥4★ + synchro)
// export const createReviewRecord = async (reviewData: Partial<Review>) => {
//   // Auto-publication si note >= 4
//   const auto = (Number(reviewData.rating) || 0) >= 4;
//   const currentUser = auth.currentUser;

//   const payload: Dict = {
//     ...(reviewData as Dict),
//     // IMPORTANT: c'est ici que l'on force le statut et la visibilité
//     status: auto ? "published" : "pending",
//     clientId: currentUser.uid,
//     isPublic: auto,
//     createdAt: serverTimestamp(),
//     ...(auto ? { publishedAt: serverTimestamp() } : {}),
//   };

//   console.log("paylod is sent");

//   // Création du document dans "reviews"
//   const reviewsRef = collection(db, "reviews");
//   const reviewDoc = await addDoc(reviewsRef, payload as DocumentData);

//   // Mise à jour des agrégats prestataire
//   if (reviewData.providerId && truthy(reviewData.rating)) {
//     const providerId = reviewData.providerId as string;
//     const sosRef = doc(db, "sos_profiles", providerId);
//     const sosSnap = await getDoc(sosRef);
//     if (sosSnap.exists()) {
//       const p = asDict(sosSnap.data());
//       const currentRating = getNum(p.rating, 0);
//       const currentCount = getNum(p.reviewCount, 0);
//       const newRating =
//         (currentRating * currentCount + Number(reviewData.rating)) /
//         (currentCount + 1);
//       await updateDoc(sosRef, {
//         rating: newRating,
//         reviewCount: increment(1),
//         updatedAt: serverTimestamp(),
//       });
//       const userRef = doc(db, "users", providerId);
//       await updateDoc(userRef, {
//         rating: newRating,
//         reviewCount: increment(1),
//         updatedAt: serverTimestamp(),
//       });
//     }
//   }

//   return reviewDoc.id;
// };

export const createReviewRecord = async (reviewData: Partial<Review>) => {
  // Auto-publication de TOUS les avis (toutes notes confondues)
  const auto = true;
  const currentUser = auth.currentUser;

  // Check authentication first
  if (!currentUser) {
    throw new Error("User is not authenticated");
  }

  // Check if review already exists for this call BEFORE transaction (unicité)
  if (reviewData.callId) {
    const existingReviewQuery = query(
      collection(db, "reviews"),
      where("callId", "==", reviewData.callId),
      where("clientId", "==", currentUser.uid),
      fsLimit(1)
    );
    const existingReviewSnap = await getDocs(existingReviewQuery);

    if (!existingReviewSnap.empty) {
      throw new Error("You have already submitted a review for this call");
    }
  }

  // Use transaction for atomicity
  // CRITICAL: All reads MUST happen BEFORE all writes in Firestore transactions
  return await runTransaction(db, async (transaction) => {
    // === PHASE 1: ALL READS FIRST ===
    let sosSnap = null;
    let userSnap = null;
    const providerId = reviewData.providerId as string | undefined;

    // Only read provider docs if we need to update stats (auto-publish + has rating)
    if (auto && providerId && truthy(reviewData.rating)) {
      const sosRef = doc(db, "sos_profiles", providerId);
      sosSnap = await transaction.get(sosRef);

      if (sosSnap.exists()) {
        const userRef = doc(db, "users", providerId);
        userSnap = await transaction.get(userRef);
      }
    }

    // === PHASE 2: ALL WRITES AFTER ===
    const payload: Dict = {
      ...(reviewData as Dict),
      status: auto ? "published" : "pending",
      clientId: currentUser.uid,
      isPublic: auto,
      createdAt: serverTimestamp(),
      ...(auto ? { publishedAt: serverTimestamp() } : {}),
    };

    // Create review document
    const reviewsRef = collection(db, "reviews");
    const reviewDocRef = doc(reviewsRef);
    transaction.set(reviewDocRef, payload as DocumentData);

    // Update provider aggregates ONLY for auto-published reviews (rating >= 4)
    // Pending reviews will have their stats updated when admin approves them
    if (auto && providerId && truthy(reviewData.rating) && sosSnap?.exists()) {
      const p = asDict(sosSnap.data());
      const currentRating = getNum(p.rating, 0);
      const currentCount = getNum(p.reviewCount, 0);
      const newRating =
        (currentRating * currentCount + Number(reviewData.rating)) /
        (currentCount + 1);

      // Update sos_profiles
      const sosRef = doc(db, "sos_profiles", providerId);
      transaction.update(sosRef, {
        rating: newRating,
        reviewCount: currentCount + 1,
        updatedAt: serverTimestamp(),
      });

      // Update users document
      if (userSnap?.exists()) {
        const userRef = doc(db, "users", providerId);
        transaction.update(userRef, {
          rating: newRating,
          reviewCount: currentCount + 1,
          updatedAt: serverTimestamp(),
        });
      }
    }

    return reviewDocRef.id;
  });
};

// B) Remplacement complet de updateReviewStatus (synchronise status <-> isPublic)
export const updateReviewStatus = async (
  reviewId: string,
  status: "published" | "pending" | "hidden"
) => {
  const reviewRef = doc(db, "reviews", reviewId);
  await updateDoc(reviewRef, {
    status,
    isPublic: status === "published",
    moderatedAt: serverTimestamp(),
    ...(status === "published" ? { publishedAt: serverTimestamp() } : {}),
  });
  return true;
};

export const incrementReviewHelpfulCount = async (reviewId: string) => {
  const reviewRef = doc(db, "reviews", reviewId);
  await updateDoc(reviewRef, { helpfulVotes: increment(1) });
  return true;
};

export const reportReview = async (
  reviewId: string,
  reason: string,
  reporterId?: string
) => {
  const reviewRef = doc(db, "reviews", reviewId);
  await updateDoc(reviewRef, { reportedCount: increment(1) });
  await addDoc(collection(db, "review_reports"), {
    reviewId,
    reason: (reason || "").trim(),
    reporterId: reporterId || null,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return true;
};

/**
 * Recalculate provider stats (rating average and review count) from all published reviews
 * Called after review modification or deletion to ensure stats are accurate
 */
export const recalculateProviderStats = async (providerId: string): Promise<void> => {
  try {
    // Get all published reviews for this provider (with pagination for safety)
    const reviewsCol = collection(db, "reviews");
    const reviewDocs = await fetchAllDocsPaginated(reviewsCol, [
      where("providerId", "==", providerId),
      where("status", "==", "published"),
      where("isPublic", "==", true)
    ]);

    // Calculate new stats
    let totalRating = 0;
    let reviewCount = 0;

    reviewDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const rating = getNum(data.rating, 0);
      if (rating >= 1 && rating <= 5) {
        totalRating += rating;
        reviewCount++;
      }
    });

    const newRating = reviewCount > 0 ? totalRating / reviewCount : 0;

    // Update sos_profiles
    const sosRef = doc(db, "sos_profiles", providerId);
    const sosSnap = await getDoc(sosRef);
    if (sosSnap.exists()) {
      await updateDoc(sosRef, {
        rating: newRating,
        reviewCount,
        updatedAt: serverTimestamp(),
      });
    }

    // Update users
    const userRef = doc(db, "users", providerId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      await updateDoc(userRef, {
        rating: newRating,
        reviewCount,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error recalculating provider stats:", error);
    throw error;
  }
};

export const getAllReviews = async (options?: {
  status?: "published" | "pending" | "hidden";
  providerId?: string;
  minRating?: number;
  limit?: number;
}) => {
  const base = collection(db, "reviews");
  const constraints: QueryConstraint[] = [];

  if (options?.status) constraints.push(where("status", "==", options.status));
  if (options?.providerId)
    constraints.push(where("providerId", "==", options.providerId));
  if (typeof options?.minRating === "number")
    constraints.push(where("rating", ">=", options.minRating));

  constraints.push(orderBy("createdAt", "desc"));

  // Always apply a limit to prevent loading too many documents (default 500)
  const limitValue = typeof options?.limit === "number" ? options.limit : 500;
  constraints.push(fsLimit(limitValue));

  const q = query(base, ...constraints);

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = asDict(d.data());
    return {
      id: d.id,
      ...(data as Dict),
      createdAt: toDate(data?.createdAt) || new Date(),
    } as Review;
  });
};

// IMPORTANT FIX: tolerant fetch by providerId or providerUid, with subcollection fallback + filtrage isPublic
export const getProviderReviews = async (
  providerIdOrUid: string
): Promise<Review[]> => {
  try {
    const reviewsCol = collection(db, "reviews");

    // Ajout du filtre isPublic == true dans les deux requêtes principales
    const q1 = query(
      reviewsCol,
      where("providerId", "==", providerIdOrUid),
      where("status", "==", "published"),
      where("isPublic", "==", true),
      orderBy("createdAt", "desc"),
      fsLimit(100)
    );
    let snap = await getDocs(q1);

    if (snap.empty) {
      const q2 = query(
        reviewsCol,
        where("providerUid", "==", providerIdOrUid),
        where("status", "==", "published"),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        fsLimit(100)
      );
      snap = await getDocs(q2);
    }

    if (snap.empty) {
      // fallback sous-collection - on filtre côté client pour isPublic
      try {
        const subRef = collection(db, "sos_profiles", providerIdOrUid, "reviews");
        const sub = await getDocs(query(subRef, fsLimit(500)));
        return sub.docs
          .map((d) => {
            const data = asDict(d.data());
            return {
              id: d.id,
              ...(data as Dict),
              createdAt: toDate(data?.createdAt) || new Date(0),
              helpfulVotes:
                typeof data?.helpfulVotes === "number"
                  ? (data.helpfulVotes as number)
                  : 0,
            } as Review;
          })
          .filter((review) => {
            // FIX: Utiliser AND (pas OR) pour cohérence avec les requêtes principales
            // Ne garder que les avis publiés ET publics
            return review.isPublic === true && review.status === "published";
          })
          .sort((a, b) => {
            const aTime =
              a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const bTime =
              b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return bTime - aTime;
          });
      } catch {
        // ignore error
      }
    }

    return snap.docs.map((d) => {
      const data = asDict(d.data());
      return {
        id: d.id,
        ...(data as Dict),
        createdAt: toDate(data?.createdAt) || new Date(0),
        helpfulVotes:
          typeof data?.helpfulVotes === "number"
            ? (data.helpfulVotes as number)
            : 0,
      } as Review;
    });
  } catch (error) {
    console.error("[getProviderReviews] error:", error);
    return [];
  }
};

// ========================= Documents =========================
export const uploadDocument = async (
  userId: string,
  file: File,
  type: string,
  metadata?: Record<string, unknown>
) => {
  const storageRef = ref(
    storage,
    `documents/${userId}/${Date.now()}_${file.name}`
  );
  const uploadResult = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(uploadResult.ref);

  const documentsRef = collection(db, "documents");
  const documentDoc = await addDoc(documentsRef, {
    userId,
    type,
    filename: file.name,
    url: downloadURL,
    mimeType: file.type,
    fileSize: file.size,
    status: "pending",
    uploadedAt: serverTimestamp(),
    ...metadata,
  });
  return documentDoc.id;
};

export const uploadImage = async (file: File, folder: string = "images") => {
  const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const uploadResult = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(uploadResult.ref);
  return downloadURL;
};

export const resizeImage = async (
  imageUrl: string,
  _maxWidth: number,
  _maxHeight: number
) => {
  // éviter warning vars non utilisées
  void _maxWidth;
  void _maxHeight;
  // Placeholder: use a real image service if needed
  return imageUrl;
};

// ========================= Call sessions & logs =========================
export const createCallSession = async (sessionData: Partial<CallSession>) => {
  const sessionId =
    sessionData.id ||
    `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const callSessionRef = doc(db, "call_sessions", sessionId);
  await setDoc(callSessionRef, {
    ...sessionData,
    id: sessionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, "call_logs"), {
    callSessionId: sessionId,
    type: "session_created",
    status: "initiating",
    timestamp: serverTimestamp(),
    details: {
      clientId: (sessionData as Dict).clientId,
      providerId: (sessionData as Dict).providerId,
      providerType: (sessionData as Dict).providerType,
    },
  });
  return sessionId;
};

export const updateCallSession = async (
  sessionId: string,
  sessionData: Partial<CallSession>
) => {
  const sessionRef = doc(db, "call_sessions", sessionId);
  const updateWithTimestamp = { ...sessionData, updatedAt: serverTimestamp() };
  await updateDoc(sessionRef, updateWithTimestamp);

  // simple log if status changes
  if ((sessionData as Dict).status) {
    await addDoc(collection(db, "call_logs"), {
      callSessionId: sessionId,
      type: "status_change",
      newStatus: (sessionData as Dict).status,
      timestamp: serverTimestamp(),
      details: sessionData,
    });
  }
  return true;
};

export const createCallLog = async (
  callSessionId: string,
  logData: { type: string; status: string; details?: unknown }
) => {
  await addDoc(collection(db, "call_logs"), {
    callSessionId,
    ...logData,
    timestamp: serverTimestamp(),
  });
  return true;
};

// ========================= Booking requests =========================
export const createBookingRequest = async (
  requestData: Record<string, unknown>
) => {
  const bookingRequestsRef = collection(db, "booking_requests");
  const cleanData = Object.fromEntries(
    Object.entries(requestData).filter(([, v]) => v !== undefined)
  );
  const finalData = {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const requestDoc = await addDoc(bookingRequestsRef, finalData);
  return requestDoc.id;
};

// ========================= Invoices =========================
export const createInvoiceRecord = async (
  invoiceData: Record<string, unknown>
) => {
  const invoicesRef = collection(db, "invoices");
  const invoiceDoc = await addDoc(invoicesRef, {
    ...invoiceData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return invoiceDoc.id;
};

export const getInvoicesForPayment = async (
  paymentId: string
): Promise<Record<string, unknown>[]> => {
  const invoicesRef = collection(db, "invoices");
  const q = query(invoicesRef, where("paymentId", "==", paymentId));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return [];
  return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ========================= Analytics & Audit =========================
export const logAnalyticsEvent = async (eventData: {
  eventType: string;
  userId?: string;
  eventData: Record<string, unknown>;
}) => {
  try {
    const analyticsRef = collection(db, "analytics_events");
    await addDoc(analyticsRef, {
      ...eventData,
      timestamp: serverTimestamp(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "server",
      url: typeof window !== "undefined" ? window.location.href : "",
    });
    return true;
  } catch (error) {
    console.error("Error logging analytics event:", error);
    return false;
  }
};

export const logAuditEvent = async (
  userId: string,
  action: string,
  details?: Record<string, unknown>
) => {
  try {
    const logsRef = collection(db, "logs");
    await addDoc(logsRef, {
      userId,
      action,
      details,
      timestamp: serverTimestamp(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "server",
      ip: "client-side",
    });
    return true;
  } catch (error) {
    console.error("Error logging audit event:", error);
    return false;
  }
};

// ========================= Admin bulk updates =========================
export const updateExistingProfiles = async () => {
  try {
    const sosProfilesRef = collection(db, "sos_profiles");
    // Use pagination to avoid loading 10,000+ documents at once
    const sosDocs = await fetchAllDocsPaginated(sosProfilesRef);
    if (sosDocs.length > 0) {
      let count = 0;
      let batch = writeBatch(db);
      for (const profileDoc of sosDocs) {
        const profileData = asDict(profileDoc.data());
        const updates: Record<string, unknown> = {};

        if (!("language" in profileData))
          updates.language = (profileData.preferredLanguage as string) || "fr";

        if (!("countrySlug" in profileData) && profileData.country) {
          updates.countrySlug = String(profileData.country)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-");
        }

        if (
          !("mainLanguage" in profileData) &&
          Array.isArray(profileData.languages) &&
          (profileData.languages as unknown[]).length
        ) {
          const first = String((profileData.languages as string[])[0] ?? "");
          updates.mainLanguage = first
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-");
        }

        if (
          !("slug" in profileData) &&
          profileData.firstName &&
          profileData.lastName
        ) {
          const s =
            `${String(profileData.firstName)}-${String(profileData.lastName)}`
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "-");
          updates.slug = s;
        }

        if (!("uid" in profileData)) updates.uid = profileDoc.id;

        const rating = getNum(profileData.rating, NaN);
        if (!Number.isFinite(rating) || rating < 0 || rating > 5)
          updates.rating = 5.0;

        if (!truthy(profileData.reviewCount)) updates.reviewCount = 0;
        if (!truthy(profileData.price))
          updates.price = (profileData.type as string) === "lawyer" ? 49 : 19;
        if (!truthy(profileData.duration))
          updates.duration =
            (profileData.type as string) === "lawyer" ? 20 : 30;
        if (!("isApproved" in profileData)) {
          updates.isApproved =
            (profileData.type as string) === "lawyer"
              ? !!profileData.isVerified
              : true;
        }

        if (Object.keys(updates).length) {
          batch.update(profileDoc.ref, {
            ...updates,
            updatedAt: serverTimestamp(),
          });
          count++;
          if (count >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) await batch.commit();
    }

    const usersRef = collection(db, "users");
    // Use pagination to avoid loading 10,000+ documents at once
    const usersDocs = await fetchAllDocsPaginated(usersRef);
    if (usersDocs.length > 0) {
      let count = 0;
      let batch = writeBatch(db);
      for (const userDoc of usersDocs) {
        const u = asDict(userDoc.data());
        const updates: Record<string, unknown> = {};

        if (!u.fullName)
          updates.fullName =
            `${getStr(u.firstName) || ""} ${getStr(u.lastName) || ""}`.trim();
        if (!u.lang) updates.lang = getStr(u.preferredLanguage, "fr");
        if (!u.language) updates.language = getStr(u.preferredLanguage, "fr");
        if (!u.country) updates.country = getStr(u.currentCountry, "");
        if (!u.avatar && u.profilePhoto)
          updates.avatar = getStr(u.profilePhoto);
        (updates as Dict).isSOS =
          getStr(u.role) === "lawyer" || getStr(u.role) === "expat";
        if (!truthy(u.points)) updates.points = 0;
        if (!u.affiliateCode)
          updates.affiliateCode = `ULIX-${userDoc.id.substring(0, 6).toUpperCase()}`;

        if (Object.keys(updates).length) {
          batch.update(userDoc.ref, {
            ...updates,
            updatedAt: serverTimestamp(),
          });
          count++;
          if (count >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) await batch.commit();
    }

    return true;
  } catch (error) {
    console.error("Error updating existing profiles:", error);
    throw error;
  }
};

export const fixAllProfiles = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Utilisateur non authentifié");
    const adminDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (
      !adminDoc.exists() ||
      (asDict(adminDoc.data()).role as string) !== "admin"
    ) {
      throw new Error("Accès non autorisé - Admin requis");
    }

    const sosProfilesRef = collection(db, "sos_profiles");
    // Use pagination to avoid loading 10,000+ documents at once
    const sosDocs = await fetchAllDocsPaginated(sosProfilesRef);
    const usersRef = collection(db, "users");
    // Use pagination to avoid loading 10,000+ documents at once
    const usersDocs = await fetchAllDocsPaginated(usersRef);

    if (sosDocs.length === 0 || usersDocs.length === 0) return false;

    let batch = writeBatch(db);
    let count = 0;

    for (const profileDoc of sosDocs) {
      const profileData = asDict(profileDoc.data());
      const updates: Record<string, unknown> = {
        isVisible: true,
        isVisibleOnMap: true,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (!profileData.type) {
        const pair = usersDocs.find((d) => d.id === profileDoc.id);
        const pairData = pair ? asDict(pair.data()) : {};
        updates.type = (
          getStr(pairData.role) === "lawyer" ? "lawyer" : "expat"
        ) as string;
      }
      if (!profileData.uid) updates.uid = profileDoc.id;

      const rating = getNum(profileData.rating, NaN);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5)
        updates.rating = 5.0;

      if (!truthy(profileData.reviewCount)) updates.reviewCount = 0;
      if (!truthy(profileData.price))
        updates.price = (updates.type as string) === "lawyer" ? 49 : 19;
      if (!truthy(profileData.duration))
        updates.duration = (updates.type as string) === "lawyer" ? 20 : 30;
      if (!("isApproved" in profileData)) {
        updates.isApproved =
          (updates.type as string) === "lawyer"
            ? !!profileData.isVerified
            : true;
      }

      batch.update(profileDoc.ref, updates);
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    for (const userDoc of usersDocs) {
      const u = asDict(userDoc.data());
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      const role = getStr(u.role);
      if (role === "lawyer" || role === "expat") {
        (updates as Dict).isVisible = true;
        (updates as Dict).isVisibleOnMap = true;
        (updates as Dict).isActive = true;
        if (role === "lawyer" && u.isApproved === undefined)
          (updates as Dict).isApproved = !!u.isVerified;
        if (role === "expat" && u.isApproved === undefined)
          (updates as Dict).isApproved = true;
      }
      batch.update(userDoc.ref, updates);
      count++;
      if (count >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }

    if (count > 0) await batch.commit();
    return true;
  } catch (error) {
    console.error("Error fixing profiles:", error);
    return false;
  }
};

export const validateDataIntegrity = async (): Promise<{
  isValid: boolean;
  issues: string[];
  fixes: unknown[];
}> => {
  try {
    const issues: string[] = [];
    const fixes: unknown[] = [];

    // Use pagination to avoid loading 10,000+ documents at once
    const usersDocs = await fetchAllDocsPaginated(collection(db, "users"));
    const sosProfilesDocs = await fetchAllDocsPaginated(collection(db, "sos_profiles"));

    const users = new Map<string, unknown>();
    const sosProfiles = new Map<string, unknown>();

    usersDocs.forEach((d) => users.set(d.id, d.data()));
    sosProfilesDocs.forEach((d) => sosProfiles.set(d.id, d.data()));

    for (const [uid, userData] of users) {
      const userDataObj = userData as { role?: string };
      if (
        (userDataObj.role === "lawyer" || userDataObj.role === "expat") &&
        !sosProfiles.has(uid)
      ) {
        issues.push(`Prestataire ${uid} sans profil SOS`);
        fixes.push({ type: "create_sos_profile", uid, userData });
      }
    }

    for (const [uid] of sosProfiles) {
      if (!users.has(uid)) {
        issues.push(`Profil SOS ${uid} orphelin`);
        fixes.push({ type: "delete_orphan_sos", uid });
      }
    }

    return { isValid: issues.length === 0, issues, fixes };
  } catch (error) {
    console.error("Error validating data integrity:", error);
    return {
      isValid: false,
      issues: ["Erreur lors de la validation"],
      fixes: [],
    };
  }
};

// ========================= Cleanup =========================
export const cleanupObsoleteData = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Utilisateur non authentifié");
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (
      !userDoc.exists() ||
      (asDict(userDoc.data()).role as string) !== "admin"
    ) {
      throw new Error("Accès non autorisé - Admin requis");
    }

    let batch = writeBatch(db);
    let operationCount = 0;

    // Use pagination to handle potentially large datasets
    const oldSessionsDocs = await fetchAllDocsPaginated(
      collection(db, "call_sessions"),
      [where("createdAt", "<", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))]
    );
    for (const d of oldSessionsDocs) {
      batch.delete(d.ref);
      operationCount++;
      // Commit in batches of 450 to avoid Firestore limits
      if (operationCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }

    // Use pagination to handle potentially large datasets
    const oldLogsDocs = await fetchAllDocsPaginated(
      collection(db, "logs"),
      [where("timestamp", "<", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))]
    );
    for (const d of oldLogsDocs) {
      batch.delete(d.ref);
      operationCount++;
      // Commit in batches of 450 to avoid Firestore limits
      if (operationCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }

    if (operationCount > 0) await batch.commit();
    return true;
  } catch (error) {
    console.error("Error cleaning up obsolete data:", error);
    return false;
  }
};
