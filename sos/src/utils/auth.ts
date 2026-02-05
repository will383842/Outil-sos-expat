import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithRedirect,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import { auth, db, functions } from "../config/firebase";
import { httpsCallable } from "firebase/functions";
import { logError } from "./logging";
import { getErrorMessage } from "./errors";
import type { User } from "../contexts/types";

/* -------------------------------------------------------------------------- */
/*                          Config i18n SMS (typée)                            */
/* -------------------------------------------------------------------------- */

const verificationSmsConfig = {
  fr: {
    message:
      "Votre code de vérification SOS Expats est: {CODE}. Ne le partagez avec personne.",
  },
  en: {
    message:
      "Your SOS Expats verification code is: {CODE}. Do not share it with anyone.",
  },
} as const;

type Lang = keyof typeof verificationSmsConfig; // 'fr' | 'en'

/* -------------------------------------------------------------------------- */
/*                         reCAPTCHA (invisible) init                         */
/* -------------------------------------------------------------------------- */

const initRecaptcha = (elementId: string = "recaptcha-container") => {
  try {
    const recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: "invisible",
      callback: () => {
        // OK
      },
      "expired-callback": () => {
        // expiré
      },
    });
    return recaptchaVerifier;
  } catch (err: unknown) {
    console.error("Error initializing reCAPTCHA:", err);
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                               Register user                                */
/* -------------------------------------------------------------------------- */

const registerUser = async (
  userData: Partial<User>,
  password: string
): Promise<FirebaseUser> => {
  try {
    if (
      !userData.role ||
      !["client", "lawyer", "expat"].includes(userData.role)
    ) {
      throw new Error("Rôle utilisateur invalide ou manquant");
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email!,
      password
    );
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, {
      displayName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
      photoURL: userData.profilePhoto || null,
    });

    const baseUser = {
      ...userData,
      uid: firebaseUser.uid,
      id: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      isVerifiedEmail: firebaseUser.emailVerified,
      displayName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
      photoURL: userData.profilePhoto || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true,
      // Seuls les clients sont approuvés par défaut - lawyers et expats nécessitent validation admin
      isApproved: userData.role === "client",
      isBanned: false,
      isVerified: userData.role === "client",
      isAdmin: false,
      isOnline: false,
      isVisibleOnMap: true,
      isVisible: true,
      fullName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
      lang: userData.preferredLanguage || "fr",
      phoneNumber: userData.phone || "",
      country: userData.currentCountry || "",
      avatar: userData.profilePhoto || null,
      isSOS: userData.role !== "client",
      points: 0,
      affiliateCode: `SOS-${firebaseUser.uid.substring(0, 6).toUpperCase()}`,
      referralBy: userData.referralBy || null,
      registrationIP: "",
      deviceInfo: "",
      userAgent: navigator.userAgent || "",
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
      },
    };

    // 🔒 Prestataires (avocats ET expats) non approuvés/online par défaut - validation admin requise
    const userDocData = {
      ...baseUser,
      isOnline: (userData.role === "lawyer" || userData.role === "expat") ? false : baseUser.isOnline,
      isApproved: (userData.role === "lawyer" || userData.role === "expat") ? false : baseUser.isApproved,
    };

    await setDoc(doc(db, "users", firebaseUser.uid), userDocData);

    // Profil SOS pour prestataires
    if (userData.role === "lawyer" || userData.role === "expat") {
      // D. city n’existe pas sur Partial<User> → accès sécurisé sans any
      const city =
        (userData as { city?: string }).city && typeof (userData as { city?: string }).city === "string"
          ? (userData as { city?: string }).city!
          : "";

      const sosProfileData = {
        uid: firebaseUser.uid,
        type: userData.role,
        fullName: `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim(),
        firstName: userData.firstName ?? "",
        lastName: userData.lastName ?? "",
        email: userData.email ?? "",
        phone: userData.phone || "",
        phoneCountryCode: userData.phoneCountryCode || "+33",
        languages: userData.languages || ["fr"],
        country: userData.currentCountry || userData.country || "",
        city,
        description: userData.bio || "",
        profilePhoto: userData.profilePhoto || null,
        photoURL: userData.profilePhoto || null,
        avatar: userData.profilePhoto || null,
        isActive: true,
        // 🔒 Tous les prestataires (lawyers ET expats) nécessitent validation admin
        isApproved: false,
        isVerified: false,
        approvalStatus: "pending",
        isVisible: false,
        isVisibleOnMap: true,
        isOnline: false,
        availability: "offline",
        rating: 5.0,
        reviewCount: 0,
        specialties:
          userData.role === "lawyer"
            ? userData.specialties || []
            : userData.helpTypes || [],
        yearsOfExperience:
          userData.role === "lawyer"
            ? userData.yearsOfExperience || 0
            : userData.yearsAsExpat || 0,
        price: userData.role === "lawyer" ? 49 : 19,
        duration: userData.role === "lawyer" ? 20 : 30,
        documents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp(),  // ✅ Ajouté pour éviter les problèmes avec orderBy
      };

      await setDoc(doc(db, "sos_profiles", firebaseUser.uid), sosProfileData);
    }

    await addDoc(collection(db, "logs"), {
      type: "registration",
      userId: firebaseUser.uid,
      userEmail: firebaseUser.email,
      userRole: userData.role,
      timestamp: serverTimestamp(),
    });

    return firebaseUser;
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error registering user:", err);
    logError({
      origin: "frontend",
      error: `Registration error: ${msg}`,
      context: { email: userData.email, role: userData.role },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                                   Login                                    */
/* -------------------------------------------------------------------------- */

const loginUser = async (
  email: string,
  password: string
): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    const userRef = doc(db, "users", firebaseUser.uid);
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      isActive: true,
    });

    await addDoc(collection(db, "logs"), {
      type: "login",
      userId: firebaseUser.uid,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    });

    return firebaseUser;
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error logging in:", err);
    logError({
      origin: "frontend",
      error: `Login error: ${msg}`,
      context: { email },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                              Login with Google                             */
/* -------------------------------------------------------------------------- */

/**
 * Initiates Google login via redirect (not popup) to avoid COOP errors.
 * The result will be handled by getRedirectResult in AuthContext.
 * @deprecated Use loginWithGoogle from AuthContext instead
 */
const loginWithGoogle = async (): Promise<void> => {
  try {
    const provider = new GoogleAuthProvider();
    // Use redirect to avoid COOP (Cross-Origin-Opener-Policy) errors
    await signInWithRedirect(auth, provider);
    // Note: User will be redirected to Google, result handled by getRedirectResult
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error initiating Google login:", err);
    logError({
      origin: "frontend",
      error: `Google login error: ${msg}`,
      context: {},
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                                  Logout                                    */
/* -------------------------------------------------------------------------- */

const logoutUser = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        isOnline: false,
        availability: "offline",
        lastLogoutAt: serverTimestamp(),
      });

      const userDoc = await getDoc(userRef);
      const role = userDoc.exists()
        ? (userDoc.data().role as string | undefined)
        : undefined;

      if (role === "lawyer" || role === "expat") {
        const sosProfileRef = doc(db, "sos_profiles", currentUser.uid);
        await updateDoc(sosProfileRef, {
          isOnline: false,
          availability: "offline",
          updatedAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, "logs"), {
        type: "logout",
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
      });
    }

    await signOut(auth);
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error logging out:", err);
    logError({
      origin: "frontend",
      error: `Logout error: ${msg}`,
      context: { userId: auth.currentUser?.uid },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                                Reset password                              */
/* -------------------------------------------------------------------------- */

const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);

    await addDoc(collection(db, "logs"), {
      type: "password_reset_request",
      userEmail: email,
      timestamp: serverTimestamp(),
    });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error resetting password:", err);
    logError({
      origin: "frontend",
      error: `Password reset error: ${msg}`,
      context: { email },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                           SMS Verification (i18n)                           */
/* -------------------------------------------------------------------------- */

const sendVerificationSMS = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
  userLanguage?: string
): Promise<ConfirmationResult> => {
  try {
    // B. Indexation i18n sûre
    let lang: Lang = "fr";
    if (userLanguage === "en") lang = "en";

    // Si non fourni, on tente de récupérer la langue depuis Firestore
    if (!userLanguage && auth.currentUser) {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const fromDb =
        userDoc.exists() &&
        (userDoc.data().preferredLanguage || userDoc.data().lang);
      if (fromDb === "en") lang = "en";
      else lang = "fr";
    }

    // On peut inclure le template dans le log pour éviter un "unused var"
    const smsTemplate = verificationSmsConfig[lang].message;

    // C. Appel à la fonction SMS → 3 arguments (Firebase)
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );

    // Log
    if (auth.currentUser) {
      await addDoc(collection(db, "logs"), {
        type: "verification_sms_sent",
        userId: auth.currentUser.uid,
        phoneNumber,
        language: lang,
        template: smsTemplate,
        timestamp: serverTimestamp(),
      });
    }

    return confirmationResult;
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("Error sending verification SMS:", err);
    logError({
      origin: "frontend",
      error: `Verification SMS error: ${msg}`,
      context: { phoneNumber, userId: auth.currentUser?.uid },
    });
    throw err;
  }
};

/* -------------------------------------------------------------------------- */
/*                             Role / Admin / Data                             */
/* -------------------------------------------------------------------------- */

export const checkUserRole = (
  user: { role?: string },
  allowedRoles: string | string[]
): boolean => {
  if (!user || !user.role) return false;
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return rolesArray.includes(user.role);
};

export const isUserBanned = async (userId: string): Promise<boolean> => {
  try {
    // Timeout court (3s) pour ne pas bloquer si Firestore est lent
    // En cas de timeout, on assume que l'utilisateur n'est pas banni
    const timeoutPromise = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), 3000)
    );
    const checkPromise = (async () => {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) return false;
      return userDoc.data().isBanned === true;
    })();

    return await Promise.race([checkPromise, timeoutPromise]);
  } catch (err: unknown) {
    console.error("Error checking if user is banned:", err);
    return false; // En cas d'erreur, on laisse passer
  }
};

const getUserData = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
      ...data,
      id: userDoc.id,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      lastLoginAt: data.lastLoginAt?.toDate?.() ?? new Date(),
    } as User;
  } catch (err: unknown) {
    console.error("Error getting user data:", err);
    return null;
  }
};

const isUserApproved = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    return userDoc.data().isApproved === true;
  } catch (err: unknown) {
    console.error("Error checking if user is approved:", err);
    return false;
  }
};

const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return false;
    return userDoc.data().role === "admin";
  } catch (err: unknown) {
    console.error("Error checking if user is admin:", err);
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/*                         Refresh Admin Custom Claims                          */
/* -------------------------------------------------------------------------- */

/**
 * Refreshes admin custom claims for the current user.
 * This is needed because Firestore security rules check request.auth.token.role
 * which must be set via Cloud Functions.
 *
 * Call this function:
 * - After admin login if claims are missing
 * - If admin operations fail with permission errors
 *
 * @returns true if claims were refreshed successfully, false otherwise
 */
const refreshAdminClaims = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("[refreshAdminClaims] No current user");
      return false;
    }

    // Check if user is admin in Firestore
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      console.warn("[refreshAdminClaims] User is not admin in Firestore");
      return false;
    }

    // Call Cloud Function to set admin claims
    const setAdminClaimsFn = httpsCallable(functions, "setAdminClaims");
    await setAdminClaimsFn();
    console.log("[refreshAdminClaims] Admin claims set via Cloud Function");

    // Force token refresh to get new claims
    await currentUser.getIdToken(true);
    console.log("[refreshAdminClaims] Token refreshed with new claims");

    return true;
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("[refreshAdminClaims] Error:", msg);
    logError({
      origin: "frontend",
      error: `Refresh admin claims error: ${msg}`,
      context: { userId: auth.currentUser?.uid },
    });
    return false;
  }
};

export {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  resetPassword,
  initRecaptcha,
  sendVerificationSMS,
  getUserData,
  isUserApproved,
  isUserAdmin,
  refreshAdminClaims,
};
