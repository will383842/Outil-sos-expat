import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { useIntl } from "react-intl";
import { getLocaleString, parseLocaleFromPath, getRouteKeyFromSlug, getTranslatedRouteSlug, useLocaleNavigate } from "../../multilingual-system";
import {
  Menu,
  X,
  Phone,
  Shield,
  ChevronDown,
  Globe,
  User as UserIcon,
  UserPlus,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  CreditCard,
  Bot,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../contexts/AppContext";
import {
  doc,
  updateDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import type { User } from "../../contexts/types";
import { trackMetaLead } from "../../utils/metaPixel";

// ============================================================================
// TYPES
// ============================================================================

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

interface Language {
  readonly code: "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";
  readonly name: string;
  readonly nativeName: string;
  readonly flag: React.ReactNode;
}

interface NavigationItem {
  readonly path: string;
  readonly labelKey: string;
  readonly mobileIcon?: string;
  readonly desktopIcon?: string;
  readonly showInMobileMenu?: boolean;
}

type WithAuthExtras = User & {
  uid?: string;
  displayName?: string;
  profilePhoto?: string;
  photoURL?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  isApproved?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

// ============================================================================
// FLAG COMPONENTS
// ============================================================================

const FrenchFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex">
      <div className="w-1/3 h-full bg-blue-600" />
      <div className="w-1/3 h-full bg-white" />
      <div className="w-1/3 h-full bg-red-600" />
    </div>
  </div>
));
FrenchFlag.displayName = "FrenchFlag";

const BritishFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm relative bg-blue-800">
      <div className="absolute inset-0">
        <div className="absolute w-full h-0.5 bg-white rotate-45 top-1/2 left-0 -translate-y-1/2" />
        <div className="absolute w-full h-0.5 bg-white -rotate-45 top-1/2 left-0 -translate-y-1/2" />
      </div>
      <div className="absolute inset-0">
        <div
          className="absolute w-full h-px bg-red-600 rotate-45"
          style={{ top: "calc(50% - 1px)" }}
        />
        <div
          className="absolute w-full h-px bg-red-600 -rotate-45"
          style={{ top: "calc(50% + 1px)" }}
        />
      </div>
      <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-full h-0.5 bg-white -translate-y-1/2" />
      <div className="absolute top-0 left-1/2 w-px h-full bg-red-600 -translate-x-1/2" />
      <div className="absolute left-0 top-1/2 w-full h-px bg-red-600 -translate-y-1/2" />
    </div>
  </div>
));
BritishFlag.displayName = "BritishFlag";

const SpanishFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex flex-col">
      <div className="w-full h-1/4 bg-red-600" />
      <div className="w-full h-2/4 bg-yellow-400" />
      <div className="w-full h-1/4 bg-red-600" />
    </div>
  </div>
));
SpanishFlag.displayName = "SpanishFlag";

const GermanFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex flex-col">
      <div className="w-full h-1/3 bg-black" />
      <div className="w-full h-1/3 bg-red-600" />
      <div className="w-full h-1/3 bg-yellow-400" />
    </div>
  </div>
));
GermanFlag.displayName = "GermanFlag";

const RussianFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex flex-col">
      <div className="w-full h-1/3 bg-white" />
      <div className="w-full h-1/3 bg-blue-600" />
      <div className="w-full h-1/3 bg-red-600" />
    </div>
  </div>
));
RussianFlag.displayName = "RussianFlag";

const PortugueseFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex">
      <div className="w-2/5 h-full bg-green-600" />
      <div className="w-3/5 h-full bg-red-600 flex items-center justify-center">
        <div className="w-2 h-2 bg-yellow-300 rounded-full" />
      </div>
    </div>
  </div>
));
PortugueseFlag.displayName = "PortugueseFlag";

const ChineseFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm bg-red-600 flex items-start justify-start p-0.5">
      <div className="text-yellow-400 text-[6px]">★</div>
    </div>
  </div>
));
ChineseFlag.displayName = "ChineseFlag";

const HindiFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex flex-col">
      <div className="w-full h-1/3 bg-orange-500" />
      <div className="w-full h-1/3 bg-white flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full border border-blue-800" />
      </div>
      <div className="w-full h-1/3 bg-green-600" />
    </div>
  </div>
));
HindiFlag.displayName = "HindiFlag";

const ArabicFlag = memo(() => (
  <div
    className="relative p-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg ring-1 ring-white/20"
    role="img"
    aria-hidden="true"
  >
    <div className="w-6 h-4 rounded-md overflow-hidden shadow-sm flex flex-col relative">
      <div className="w-full h-1/3 bg-green-600" />
      <div className="w-full h-1/3 bg-white" />
      <div className="w-full h-1/3 bg-black" />
    </div>
  </div>
));
ArabicFlag.displayName = "ArabicFlag";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPPORTED_LANGUAGES: readonly Language[] = [
  { code: "fr", name: "French", nativeName: "Français", flag: <FrenchFlag /> },
  { code: "en", name: "English", nativeName: "English", flag: <BritishFlag /> },
  { code: "es", name: "Spanish", nativeName: "Español", flag: <SpanishFlag /> },
  { code: "de", name: "German", nativeName: "Deutsch", flag: <GermanFlag /> },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: <RussianFlag /> },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: <PortugueseFlag /> },
  { code: "ch", name: "Chinese", nativeName: "中文", flag: <ChineseFlag /> },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: <HindiFlag /> },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: <ArabicFlag /> },
] as const;

const LEFT_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    path: "/",
    labelKey: "header.nav.home",
    mobileIcon: "🏠",
    desktopIcon: "🏠",
    showInMobileMenu: true,
  },
  {
    path: "/providers",
    labelKey: "header.nav.viewProfiles",
    mobileIcon: "👥",
    desktopIcon: "👥",
    showInMobileMenu: false,
  },
  {
    path: "/testimonials",
    labelKey: "header.nav.testimonials",
    mobileIcon: "💬",
    desktopIcon: "💬",
    showInMobileMenu: false,
  },
] as const;

const RIGHT_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    path: "/how-it-works",
    labelKey: "header.nav.howItWorks",
    mobileIcon: "⚡",
    desktopIcon: "⚡",
    showInMobileMenu: false,
  },
  {
    path: "/pricing",
    labelKey: "header.nav.pricing",
    mobileIcon: "💎",
    desktopIcon: "💎",
    showInMobileMenu: true,
  },
] as const;

const ALL_NAVIGATION_ITEMS = [
  ...LEFT_NAVIGATION_ITEMS,
  ...RIGHT_NAVIGATION_ITEMS,
] as const;

const MOBILE_NAVIGATION_ITEMS = ALL_NAVIGATION_ITEMS.filter(
  (item) => item.showInMobileMenu !== false
);

// ============================================================================
// HOOKS
// ============================================================================

const useScrolled = (): boolean => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 120);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return scrolled;
};

const useAvailabilityToggle = () => {
  const { user } = useAuth();
  const typedUser = user as WithAuthExtras | null;

  const [isOnline, setIsOnline] = useState<boolean>(!!typedUser?.isOnline);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 🔒 Etat d'approbation charge depuis sos_profiles (source de verite)
  const [sosProfileApproval, setSosProfileApproval] = useState<{
    isApproved: boolean;
    approvalStatus: string;
  } | null>(null);
  const sosSnapshotSubscribed = useRef(false);

  const isProvider =
    typedUser?.role === "lawyer" || typedUser?.role === "expat";

  const userId = useMemo<string | undefined>(() => {
    if (!typedUser) return undefined;
    return typedUser.uid ?? typedUser.id;
  }, [typedUser]);

  const writeSosProfile = useCallback(
    async (newStatus: boolean) => {
      if (!typedUser || !isProvider || !userId) return;

      // 🔒 Verification approval: check BOTH sources (users via AuthContext AND sos_profiles)
      // Approuve si AU MOINS UNE source indique l'approbation
      const isApprovedFromUsers = typedUser.isApproved && typedUser.approvalStatus === 'approved';
      const isApprovedFromSosProfiles = sosProfileApproval?.isApproved && sosProfileApproval?.approvalStatus === 'approved';

      if (newStatus && !isApprovedFromUsers && !isApprovedFromSosProfiles) {
        console.error('Compte non approuve - toggle en ligne bloque');
        throw new Error('APPROVAL_REQUIRED');
      }

      const sosRef = doc(db, "sos_profiles", userId);
      const updateData = {
        isOnline: newStatus,
        availability: newStatus ? "available" : "unavailable",
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isVisible: true,
        isVisibleOnMap: true,
      };

      try {
        await updateDoc(sosRef, updateData);
        return;
      } catch {
        /* document might not exist */
      }

      try {
        const snap = await getDoc(sosRef);
        if (!snap.exists()) {
          const newProfileData = {
            type: typedUser.role,
            fullName:
              typedUser.fullName ||
              `${typedUser.firstName || ""} ${typedUser.lastName || ""}`.trim() ||
              "Expert",
            ...updateData,
            isActive: true,
            // 🔒 Tous les prestataires necessitent validation admin
            isApproved: false,
            approvalStatus: "pending",
            isVerified: false,
            rating: 5.0,
            reviewCount: 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(sosRef, newProfileData, { merge: true });
          return;
        }
      } catch {
        /* ignore */
      }

      const q = query(
        collection(db, "sos_profiles"),
        where("uid", "==", userId)
      );
      const found = await getDocs(q);

      if (!found.empty) {
        const batch = writeBatch(db);
        found.docs.forEach((d) => batch.update(d.ref, updateData));
        await batch.commit();
        return;
      }

      await setDoc(
        sosRef,
        {
          type: typedUser.role,
          fullName:
            typedUser.fullName ||
            `${typedUser.firstName || ""} ${typedUser.lastName || ""}`.trim() ||
            "Expert",
          ...updateData,
          isActive: true,
          // 🔒 Tous les prestataires necessitent validation admin
          isApproved: false,
          approvalStatus: "pending",
          isVerified: false,
          rating: 5.0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [typedUser, isProvider, userId, sosProfileApproval]
  );

  const writeUsersPresenceBestEffort = useCallback(
    async (newStatus: boolean) => {
      if (!typedUser || !userId) return;

      const userRef = doc(db, "users", userId);
      const payload = {
        isOnline: newStatus,
        availability: newStatus ? "available" : "unavailable",
        lastStatusChange: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await updateDoc(userRef, payload);
      } catch {
        try {
          await setDoc(userRef, { uid: userId, ...payload }, { merge: true });
        } catch (e2) {
          console.warn("Users presence update ignored:", e2);
        }
      }
    },
    [typedUser, userId]
  );

  // ✅ OPTIMISATION COÛTS GCP: Polling 30s au lieu de onSnapshot pour le status provider
  useEffect(() => {
    if (!typedUser || !isProvider || !userId) return;
    if (sosSnapshotSubscribed.current) return;
    sosSnapshotSubscribed.current = true;

    let isMounted = true;

    const loadSosProfile = async () => {
      try {
        const sosRef = doc(db, "sos_profiles", userId);
        const snap = await getDoc(sosRef);
        if (!isMounted) return;

        if (!snap.exists()) return;
        const data = snap.data();
        if (!data) return;
        const next = data.isOnline === true;
        setIsOnline((prev) => (prev !== next ? next : prev));

        // 🔒 Charger le statut d'approbation depuis sos_profiles (source de verite)
        setSosProfileApproval({
          isApproved: data.isApproved === true,
          approvalStatus: data.approvalStatus || 'pending',
        });
      } catch (err) {
        console.error("Error loading sos_profiles:", err);
      }
    };

    loadSosProfile();
    const intervalId = setInterval(loadSosProfile, 30000); // Poll every 30s

    return () => {
      isMounted = false;
      sosSnapshotSubscribed.current = false;
      clearInterval(intervalId);
    };
  }, [typedUser, isProvider, userId]);

  useEffect(() => {
    if (typeof typedUser?.isOnline !== "undefined") {
      setIsOnline(!!typedUser.isOnline);
    }
  }, [typedUser?.isOnline]);

  const toggle = useCallback(async () => {
    if (!typedUser || isUpdating) return;

    const newStatus = !isOnline;
    setIsUpdating(true);
    setErrorMessage(null); // Clear previous error

    try {
      await writeSosProfile(newStatus);
      await writeUsersPresenceBestEffort(newStatus);

      setIsOnline(newStatus);

      window.dispatchEvent(
        new CustomEvent("availability:changed", {
          detail: { isOnline: newStatus },
        })
      );
      window.dispatchEvent(
        new CustomEvent("availabilityChanged", {
          detail: { isOnline: newStatus },
        })
      );

      window.gtag?.("event", "online_status_change", {
        event_category: "engagement",
        event_label: newStatus ? "online" : "offline",
      });
    } catch (e) {
      console.error("Online/offline toggle error:", e);
      // 🔒 Capture error code for translation in UI
      if (e instanceof Error) {
        // Use error code for i18n translation
        setErrorMessage(e.message === 'APPROVAL_REQUIRED' ? 'APPROVAL_REQUIRED' : 'ERROR_OCCURRED');
      } else {
        setErrorMessage('ERROR_OCCURRED');
      }
    } finally {
      setIsUpdating(false);
    }
  }, [
    isOnline,
    isUpdating,
    typedUser,
    writeSosProfile,
    writeUsersPresenceBestEffort,
  ]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return { isOnline, isUpdating, isProvider, toggle, errorMessage, clearError };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface HeaderAvailabilityToggleProps {
  readonly className?: string;
}

const HeaderAvailabilityToggle = memo<HeaderAvailabilityToggleProps>(
  function HeaderAvailabilityToggle({ className = "" }) {
    const intl = useIntl();
    const { isOnline, isUpdating, isProvider, toggle, errorMessage, clearError } = useAvailabilityToggle();

    if (!isProvider) return null;

    const statusText = isOnline
      ? intl.formatMessage({ id: "header.status.online" })
      : intl.formatMessage({ id: "header.status.offline" });

    const toggleAriaLabel = intl.formatMessage(
      { id: "header.status.toggleAria" },
      {
        status: isOnline
          ? intl.formatMessage({ id: "header.status.offline" })
          : intl.formatMessage({ id: "header.status.online" }),
      }
    );

    return (
      <div className="relative">
        <button
          onClick={toggle}
          disabled={isUpdating}
          type="button"
          className={`group flex items-center px-4 py-2.5 rounded-xl font-semibold text-sm
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 min-h-[44px]
            border-2 border-white box-border
            ${isOnline
              ? "bg-green-500 hover:bg-green-600 text-white shadow-lg"
              : "bg-gray-500 hover:bg-gray-600 text-white shadow-lg"
            }
            ${isUpdating ? "opacity-75 cursor-not-allowed" : ""}
            ${className}`}
          aria-label={toggleAriaLabel}
          aria-pressed={isOnline}
        >
          {isUpdating ? (
            <div
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"
              aria-hidden="true"
            />
          ) : isOnline ? (
            <Wifi className="w-4 h-4 mr-2" aria-hidden="true" />
          ) : (
            <WifiOff className="w-4 h-4 mr-2" aria-hidden="true" />
          )}
          <span>
            {isOnline ? "🟢" : "🔴"} {statusText}
          </span>
        </button>

        {/* 🔒 Message d'erreur visible pour prestataire non approuve */}
        {errorMessage && (
          <div
            className="absolute top-full left-0 right-0 mt-2 z-50 min-w-[280px]"
            role="alert"
            aria-live="assertive"
          >
            <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl border border-red-400 flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {errorMessage === 'APPROVAL_REQUIRED'
                    ? intl.formatMessage({ id: "header.status.approvalRequired" })
                    : intl.formatMessage({ id: "header.status.errorOccurred" })}
                </p>
              </div>
              <button
                onClick={clearError}
                className="text-white/80 hover:text-white ml-2"
                aria-label={intl.formatMessage({ id: "header.status.close" })}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

interface UserAvatarProps {
  readonly user: User | null;
  readonly size?: "sm" | "md";
}

const UserAvatar = memo<UserAvatarProps>(function UserAvatar({
  user,
  size = "md",
}) {
  const intl = useIntl();
  const [imageError, setImageError] = useState(false);

  const sizeClasses = size === "sm" ? "w-10 h-10" : "w-12 h-12";
  const u = user as WithAuthExtras | null;
  const photoUrl = u?.profilePhoto || u?.photoURL;
  const fallbackUser = intl.formatMessage({ id: "header.auth.user" });
  const displayName = u?.firstName || u?.displayName || u?.email || fallbackUser;

  const onError = useCallback(() => setImageError(true), []);

  const avatarAriaLabel = intl.formatMessage(
    { id: "header.avatar.aria" },
    { name: displayName }
  );

  if (!photoUrl || imageError) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br from-red-500 to-orange-500
          flex items-center justify-center text-white font-bold text-base ring-2 ring-white/30`}
        aria-label={avatarAriaLabel}
        role="img"
      >
        {displayName?.charAt(0).toUpperCase?.()}
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={photoUrl}
        alt={avatarAriaLabel}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-white/30`}
        onError={onError}
        loading="lazy"
      />
      <div
        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
        aria-hidden="true"
      />
    </div>
  );
});

interface LanguageDropdownProps {
  readonly isMobile?: boolean;
}

const LanguageDropdown = memo<LanguageDropdownProps>(function LanguageDropdown({
  isMobile = false,
}) {
  const intl = useIntl();
  const { language, setLanguage } = useApp();
  const location = useLocation();
  const navigate = useLocaleNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = useCallback(
    (langCode: "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar") => {
      setLanguage(langCode);
      setOpen(false);

      // Update the route to reflect the new language
      // CRITICAL: Decode URL to handle Unicode characters (Arabic, etc.)
      // Browser may encode Unicode in pathname, so we need to decode it
      let decodedPathname: string;
      try {
        decodedPathname = decodeURIComponent(location.pathname);
      } catch (_e) {
        // If decoding fails (invalid encoding), use original
        decodedPathname = location.pathname;
      }

      const { pathname } = location;

      if (pathname.startsWith("/admin") || pathname.startsWith("/marketing")) {
        window.gtag?.("event", "language_change", {
          event_category: "engagement",
          event_label: langCode,
        });
        return;
      }

      // Get current path without locale - use DECODED pathname for Unicode support
      const { pathWithoutLocale } = parseLocaleFromPath(decodedPathname);
      const newLocale = getLocaleString(langCode);

      // Translate the slug if it's a translatable route
      let translatedPath = pathWithoutLocale;
      if (pathWithoutLocale && pathWithoutLocale !== "/") {
        const pathSegments = pathWithoutLocale.split("/").filter(Boolean);
        if (pathSegments.length > 0) {
          // Try to match multi-segment paths first (e.g., "register/client")
          // This is important for routes like /register/client, /register/lawyer, etc.
          let routeKey = null;
          let matchedSegments = 0;

          if (pathSegments.length >= 2) {
            // Try matching first two segments as a compound route
            const twoSegmentPath = `${pathSegments[0]}/${pathSegments[1]}`;
            routeKey = getRouteKeyFromSlug(twoSegmentPath);
            if (routeKey) {
              matchedSegments = 2;
            }
          }

          // If no multi-segment match, try just the first segment
          if (!routeKey) {
            const firstSegment = pathSegments[0];
            routeKey = getRouteKeyFromSlug(firstSegment);
            if (routeKey) {
              matchedSegments = 1;
            }
          }

          // If we found a route key, translate it
          if (routeKey) {
            const translatedSlug = getTranslatedRouteSlug(routeKey, langCode);
            const restOfPath = pathSegments.slice(matchedSegments).join("/");
            translatedPath = `/${translatedSlug}${restOfPath ? `/${restOfPath}` : ""}`;
          }
        }
      }

      // Build new path with new locale and translated slug
      const newPath = translatedPath === "/"
        ? `/${newLocale}`
        : `/${newLocale}${translatedPath}`;

      // Only navigate if the path actually changed
      if (newPath !== decodedPathname) {
        navigate(newPath, { replace: true });
      }

      window.gtag?.("event", "language_change", {
        event_category: "engagement",
        event_label: langCode,
      });
    },
    [setLanguage, location, navigate]
  );

  const selectLanguageLabel = intl.formatMessage({
    id: "header.language.selectAria",
  });
  const currentLanguageLabel = intl.formatMessage({
    id: "header.language.currentAria",
  });

  if (isMobile) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium
            bg-white/20 backdrop-blur-xl text-white hover:bg-white/30 border border-white/20
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={selectLanguageLabel}
        >
          <div className="flex items-center">
            <Globe className="w-4 h-4 mr-2 text-white" aria-hidden="true" />
            <div className="mr-2">{currentLanguage.flag}</div>
            <span className="text-sm font-semibold">
              {currentLanguage.nativeName}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 mt-2 rounded-xl shadow-2xl py-1 z-50
              max-h-60 overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-white/10"
            role="listbox"
            aria-label={selectLanguageLabel}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`group flex items-center w-full px-4 py-2.5 text-sm
                  focus:outline-none focus-visible:bg-white/20
                  ${
                    language === lang.code
                      ? "bg-white/20 text-white font-semibold"
                      : "text-gray-300 hover:bg-white/10"
                  }`}
                role="option"
                aria-selected={language === lang.code}
              >
                <div className="mr-3">{lang.flag}</div>
                <span>{lang.nativeName}</span>
                {language === lang.code && (
                  <div
                    className="ml-auto w-2 h-2 bg-red-500 rounded-full"
                    aria-label={currentLanguageLabel}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="group flex items-center space-x-2 text-white hover:text-yellow-200
          p-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
          min-h-[44px] min-w-[44px] justify-center"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={selectLanguageLabel}
      >
        <div>{currentLanguage.flag}</div>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? "rotate-180 text-yellow-300" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl
            rounded-2xl shadow-2xl py-2 z-50 border border-gray-100"
          role="listbox"
          aria-label={selectLanguageLabel}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`group flex items-center w-full px-4 py-3 text-sm text-left
                hover:bg-gray-50 rounded-xl mx-1 focus:outline-none focus-visible:bg-gray-50
                ${
                  language === lang.code
                    ? "bg-red-50 text-red-600 font-semibold"
                    : "text-gray-700"
                }`}
              role="option"
              aria-selected={language === lang.code}
            >
              <div className="mr-3">{lang.flag}</div>
              <span>{lang.nativeName}</span>
              {language === lang.code && (
                <div
                  className="ml-auto w-2 h-2 bg-red-500 rounded-full"
                  aria-label={currentLanguageLabel}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

interface PWAInstallAreaProps {
  readonly scrolled: boolean;
}

const PWAInstallArea = memo<PWAInstallAreaProps>(function PWAInstallArea({
  scrolled,
}) {
  const intl = useIntl();

  const homeAriaLabel = intl.formatMessage({ id: "header.logo.homeAria" });
  const byUlixai = intl.formatMessage({ id: "header.logo.byUlixai" });
  const logoAlt = intl.formatMessage({ id: "header.logo.alt" });

  return (
    <Link
      to="/"
      className="flex items-center select-none group"
      aria-label={homeAriaLabel}
    >
      <div className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden bg-transparent shrink-0">
        <img
          src="/icons/icon-72x72.png"
          alt={logoAlt}
          className="w-full h-full object-cover"
          width={72}
          height={72}
          loading="eager"
          decoding="async"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.includes("icon-72x72.png")) {
              img.src = "/sos-logo.webp";
            }
          }}
        />
      </div>

      <div className="ml-3">
        <div className="flex flex-col leading-tight text-center">
          <span
            className={`font-extrabold text-sm ${
              scrolled ? "text-white" : "text-gray-900"
            }`}
          >
            SOS Expat
          </span>
          <span className="text-sm font-semibold">
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              {byUlixai}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
});

const PWAIconButton = memo(function PWAIconButton() {
  const intl = useIntl();
  const homeAriaLabel = intl.formatMessage({ id: "header.logo.homeAria" });
  const logoAlt = intl.formatMessage({ id: "header.logo.alt" });

  return (
    <Link
      to="/"
      className="w-16 h-16 rounded-2xl overflow-hidden bg-transparent
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
      aria-label={homeAriaLabel}
    >
      <img
        src="/icons/icon-72x72.png"
        alt={logoAlt}
        className="w-full h-full object-cover"
        width={64}
        height={64}
        loading="eager"
        decoding="async"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src.includes("icon-72x72.png")) {
            img.src = "/sos-logo.webp";
          }
        }}
      />
    </Link>
  );
});

interface UserMenuProps {
  readonly isMobile?: boolean;
  readonly scrolled?: boolean;
}

const UserMenu = memo<UserMenuProps>(function UserMenu({
  isMobile = false,
  scrolled = false,
}) {
  const intl = useIntl();
  const { user, logout } = useAuth();
  const typedUser = user as WithAuthExtras | null;
  const navigate = useLocaleNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ne pas fermer le menu si logout en cours
      if (loggingOut) return;
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [loggingOut]);

  const handleLogout = useCallback(async (e?: React.MouseEvent) => {
    // Empêcher la propagation et le comportement par défaut
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Éviter les double-clics
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logout();
      setOpen(false);
      window.gtag?.("event", "logout", { event_category: "engagement" });
      try {
        navigate("/", { replace: true });
      } catch {
        window.location.assign("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      try {
        navigate("/", { replace: true });
      } catch {
        window.location.assign("/");
      }
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate, loggingOut]);

  // Traductions
  const t = useMemo(
    () => ({
      login: intl.formatMessage({ id: "header.auth.login" }),
      signup: intl.formatMessage({ id: "header.auth.signup" }),
      dashboard: intl.formatMessage({ id: "header.auth.dashboard" }),
      adminConsole: intl.formatMessage({ id: "header.auth.adminConsole" }),
      admin: intl.formatMessage({ id: "header.auth.admin" }),
      logout: intl.formatMessage({ id: "header.auth.logout" }),
      profile: intl.formatMessage({ id: "header.auth.profile" }),
      userMenu: intl.formatMessage({ id: "header.auth.userMenuAria" }),
      user: intl.formatMessage({ id: "header.auth.user" }),
    }),
    [intl]
  );

  // NON CONNECTE
  if (!typedUser) {
    const loginBtnDesktop = scrolled
      ? "group relative p-3 rounded-full hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 min-h-[44px] min-w-[44px] flex items-center justify-center"
      : "group relative p-3 rounded-full hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 min-h-[44px] min-w-[44px] flex items-center justify-center border border-gray-200";
    const loginIconDesktop = scrolled
      ? "w-5 h-5 text-white group-hover:text-yellow-200"
      : "w-5 h-5 text-red-600";

    const registerBtnDesktop = scrolled
      ? "group relative p-3 rounded-full bg-white hover:bg-gray-50 shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 min-h-[44px] min-w-[44px] flex items-center justify-center"
      : "group relative p-3 rounded-full bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 min-h-[44px] min-w-[44px] flex items-center justify-center";
    const registerIconDesktop = scrolled
      ? "w-5 h-5 text-red-600"
      : "w-5 h-5 text-white";

    const authLinks = (
      <>
        <Link
          to="/login"
          className={
            isMobile
              ? "group flex items-center justify-center w-full bg-white text-red-600 px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 font-semibold min-h-[44px]"
              : loginBtnDesktop
          }
          aria-label={t.login}
        >
          {isMobile ? (
            <>
              <UserIcon className="w-5 h-5 mr-3" aria-hidden="true" />
              <span>{t.login}</span>
            </>
          ) : (
            <UserIcon className={loginIconDesktop} aria-hidden="true" />
          )}
        </Link>
        <Link
          to="/register"
          className={
            isMobile
              ? "group flex items-center justify-center w-full bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-bold shadow min-h-[44px]"
              : registerBtnDesktop
          }
          aria-label={t.signup}
        >
          {isMobile ? (
            <>
              <UserPlus className="w-5 h-5 mr-3" aria-hidden="true" />
              <span>{t.signup}</span>
            </>
          ) : (
            <UserPlus className={registerIconDesktop} aria-hidden="true" />
          )}
        </Link>
      </>
    );

    return isMobile ? (
      <div className="flex gap-3">{authLinks}</div>
    ) : (
      <div className="flex items-center space-x-4">{authLinks}</div>
    );
  }

  // CONNECTE MOBILE
  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-xl">
          <div className="flex items-center gap-3">
            <UserAvatar user={typedUser} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white text-sm truncate">
                {typedUser.firstName ||
                  typedUser.displayName ||
                  typedUser.email}
              </div>
              <div className="text-xs text-white/70 capitalize">
                {typedUser.role || t.user}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {typedUser.role === "admin" && (
            <Link
              to="/admin/dashboard"
              className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium
                bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 min-h-[44px]"
              aria-label={t.adminConsole}
            >
              <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
              <span>{t.admin}</span>
            </Link>
          )}
          <Link
            to="/dashboard"
            className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium
              bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 min-h-[44px]"
            aria-label={t.dashboard}
          >
            <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
            <span>{t.profile}</span>
          </Link>
        </div>

        {/* AI Subscription links for providers - Mobile */}
        {(typedUser.role === "lawyer" || typedUser.role === "expat") && (
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/dashboard/ai-assistant"
              className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium
                bg-gradient-to-r from-indigo-500/30 to-purple-500/30 backdrop-blur-sm text-white hover:from-indigo-500/40 hover:to-purple-500/40 min-h-[44px]"
            >
              <Bot className="w-4 h-4 mr-2" aria-hidden="true" />
              <span>IA</span>
              <span className="ml-1 text-[8px] px-1 py-0.5 rounded-full bg-pink-500 font-bold">NEW</span>
            </Link>
            <Link
              to="/dashboard/subscription"
              className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium
                bg-gradient-to-r from-indigo-500/30 to-purple-500/30 backdrop-blur-sm text-white hover:from-indigo-500/40 hover:to-purple-500/40 min-h-[44px]"
            >
              <CreditCard className="w-4 h-4 mr-2" aria-hidden="true" />
              <span>{intl.formatMessage({ id: "dashboard.subscription", defaultMessage: "Abo" })}</span>
            </Link>
          </div>
        )}

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium
            w-full min-h-[44px] transition-all ${
              loggingOut
                ? "bg-red-400 text-white cursor-not-allowed opacity-70"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          aria-label={t.logout}
        >
          {loggingOut ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Déconnexion...</span>
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
              <span>{t.logout}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // CONNECTE DESKTOP
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`group flex items-center space-x-3 p-2 rounded-full min-h-[44px]
          focus:outline-none focus-visible:ring-2
          ${scrolled
            ? "text-white focus-visible:ring-white/50"
            : "text-black focus-visible:ring-black/50"
          }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t.userMenu}
      >
        <UserAvatar user={typedUser} />
        <span className="text-sm font-medium hidden md:inline">
          {typedUser.firstName || typedUser.displayName || t.user}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            open ? "rotate-180 text-yellow-300" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl
            rounded-2xl shadow-2xl py-2 z-50 border border-gray-100"
          role="menu"
          aria-label={t.userMenu}
        >
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <UserAvatar user={typedUser} />
              <div>
                <div className="font-semibold text-gray-900">
                  {typedUser.firstName ||
                    typedUser.displayName ||
                    typedUser.email}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {typedUser.role || t.user}
                </div>
              </div>
            </div>
          </div>

          <div className="py-1">
            {typedUser.role === "admin" && (
              <Link
                to="/admin/dashboard"
                className="group flex items-center px-4 py-3 text-sm text-gray-700
                  hover:bg-red-50 hover:text-red-600 rounded-xl mx-1
                  focus:outline-none focus-visible:bg-red-50"
                onClick={() => setOpen(false)}
                role="menuitem"
              >
                <Shield className="w-4 h-4 mr-3" aria-hidden="true" />
                {t.adminConsole}
              </Link>
            )}
            <Link
              to="/dashboard"
              className="group flex items-center px-4 py-3 text-sm text-gray-700
                hover:bg-red-50 hover:text-red-600 rounded-xl mx-1
                focus:outline-none focus-visible:bg-red-50"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              <Settings className="w-4 h-4 mr-3" aria-hidden="true" />
              {t.dashboard}
            </Link>
            {/* AI Subscription links for providers */}
            {(typedUser.role === "lawyer" || typedUser.role === "expat") && (
              <>
                <Link
                  to="/dashboard/ai-assistant"
                  className="group flex items-center px-4 py-3 text-sm text-gray-700
                    hover:bg-indigo-50 hover:text-indigo-600 rounded-xl mx-1
                    focus:outline-none focus-visible:bg-indigo-50"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <Bot className="w-4 h-4 mr-3 text-indigo-500" aria-hidden="true" />
                  {intl.formatMessage({ id: "dashboard.aiAssistant", defaultMessage: "AI Assistant" })}
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
                    NEW
                  </span>
                </Link>
                <Link
                  to="/dashboard/subscription"
                  className="group flex items-center px-4 py-3 text-sm text-gray-700
                    hover:bg-indigo-50 hover:text-indigo-600 rounded-xl mx-1
                    focus:outline-none focus-visible:bg-indigo-50"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <CreditCard className="w-4 h-4 mr-3 text-indigo-500" aria-hidden="true" />
                  {intl.formatMessage({ id: "dashboard.subscription", defaultMessage: "My Subscription" })}
                </Link>
              </>
            )}
            <hr className="my-1 border-gray-100" />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={`group flex items-center w-full px-4 py-3 text-sm rounded-xl mx-1
                focus:outline-none focus-visible:bg-red-50 transition-all ${
                  loggingOut
                    ? "text-red-400 cursor-not-allowed opacity-70"
                    : "text-red-600 hover:bg-red-50"
                }`}
              role="menuitem"
            >
              {loggingOut ? (
                <>
                  <div className="w-4 h-4 mr-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  Déconnexion...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-3" aria-hidden="true" />
                  {t.logout}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Header: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const { isLoading } = useAuth();
  const scrolled = useScrolled();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { isOnline, isUpdating, isProvider, toggle } = useAvailabilityToggle();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Fermer le menu lors de la navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Bloquer le scroll quand le menu est ouvert
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // Traductions
  const t = useMemo(
    () => ({
      sosCall: intl.formatMessage({ id: "header.nav.sosCall" }),
      loading: intl.formatMessage({ id: "header.loading" }),
      menuToggle: intl.formatMessage({ id: "header.menu.toggleAria" }),
      mobileNav: intl.formatMessage({ id: "header.menu.mobileNavAria" }),
      goOnline: intl.formatMessage({ id: "header.status.goOnline" }),
      goOffline: intl.formatMessage({ id: "header.status.goOffline" }),
    }),
    [intl]
  );

  // Fonction pour obtenir le label traduit d'un item de navigation
  const getNavigationLabel = useCallback(
    (labelKey: string): string => {
      return intl.formatMessage({ id: labelKey });
    },
    [intl]
  );

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 md:select-none"
        role="banner"
      >
        {/* ============================================================ */}
        {/* DESKTOP HEADER */}
        {/* ============================================================ */}
        <div
          className={`hidden lg:block transition-colors duration-300 ${
            scrolled
              ? "bg-gray-900/95 backdrop-blur-xl shadow-xl"
              : "bg-white border-b border-gray-200"
          }`}
        >
          <div className="w-full px-6">
            <div className="flex items-center justify-between h-20">
              <PWAInstallArea scrolled={scrolled} />

              <div className="flex-1 flex items-center justify-center">
                <nav
                  className="flex items-center space-x-2"
                  aria-label={intl.formatMessage({
                    id: "header.nav.mainNavAria",
                  })}
                >
                  {LEFT_NAVIGATION_ITEMS.slice(0, 2).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors
                        ${scrolled ? "hover:bg-white/10" : "hover:bg-gray-100"}
                        ${isActive(item.path)
                          ? scrolled
                            ? "bg-white/20"
                            : "bg-gray-100"
                          : ""
                        }`}
                      aria-current={isActive(item.path) ? "page" : undefined}
                    >
                      {item.desktopIcon && (
                        <span
                          className={`text-[15px] ${
                            scrolled ? "text-gray-200" : "text-gray-700"
                          }`}
                          aria-hidden="true"
                        >
                          {item.desktopIcon}
                        </span>
                      )}
                      <span
                        className={`font-semibold text-[15px] tracking-wide ${
                          scrolled ? "text-gray-200" : "text-gray-700"
                        }`}
                      >
                        {getNavigationLabel(item.labelKey)}
                      </span>
                    </Link>
                  ))}

                  {/* SOS CALL CTA */}
                  <div className="mx-6">
                    <Link
                      to="/sos-appel"
                      onClick={() => trackMetaLead({ content_name: 'header_sos_call', content_category: 'general' })}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800
                        text-white px-3 py-1 rounded-2xl font-bold flex items-center space-x-2
                        shadow-lg border-2 border-white/20 transition-all"
                      aria-label={t.sosCall}
                    >
                      <Phone
                        className="size-3 text-white"
                        aria-hidden="true"
                      />
                      <span className="tracking-wide">
                        {t.sosCall.toUpperCase()}
                      </span>
                    </Link>
                  </div>

                  {RIGHT_NAVIGATION_ITEMS.concat(
                    LEFT_NAVIGATION_ITEMS.slice(2)
                  ).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors
                        ${scrolled ? "hover:bg-white/10" : "hover:bg-gray-100"}
                        ${isActive(item.path)
                          ? scrolled
                            ? "bg-white/20"
                            : "bg-gray-100"
                          : ""
                        }`}
                      aria-current={isActive(item.path) ? "page" : undefined}
                    >
                      {item.desktopIcon && (
                        <span
                          className={`text-[15px] ${
                            scrolled ? "text-gray-200" : "text-gray-700"
                          }`}
                          aria-hidden="true"
                        >
                          {item.desktopIcon}
                        </span>
                      )}
                      <span
                        className={`font-semibold text-[15px] tracking-wide ${
                          scrolled ? "text-gray-200" : "text-gray-700"
                        }`}
                      >
                        {getNavigationLabel(item.labelKey)}
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="flex items-center space-x-4">
                <HeaderAvailabilityToggle />
                <LanguageDropdown />
                {isLoading ? (
                  <div
                    className={`w-8 h-8 border-2 rounded-full animate-spin ${
                      scrolled
                        ? "border-white/30 border-t-white"
                        : "border-gray-300 border-t-gray-600"
                    }`}
                    role="status"
                    aria-label={t.loading}
                  />
                ) : (
                  <UserMenu scrolled={scrolled} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MOBILE HEADER */}
        {/* ============================================================ */}
        <div className="lg:hidden bg-gray-900 shadow-xl">
          <div className="px-4 py-3 flex items-center justify-between">
            <PWAIconButton />

            <div className="flex items-center gap-3">
              <Link
                to="/sos-appel"
                onClick={() => trackMetaLead({ content_name: 'mobile_header_sos_call', content_category: 'general' })}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-7 py-2.5
                  rounded-2xl font-bold text-base flex items-center space-x-2 border border-white/20"
                aria-label={t.sosCall}
              >
                <Phone className="w-4 h-4 text-white" aria-hidden="true" />
                <span>SOS</span>
              </Link>

              {isProvider && (
                <button
                  onClick={() => !isUpdating && toggle()}
                  disabled={isUpdating}
                  className="relative w-7 h-7 rounded-full border-2 border-white/40
                    flex items-center justify-center focus:outline-none
                    focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label={isOnline ? t.goOffline : t.goOnline}
                  aria-pressed={isOnline}
                >
                  {isUpdating ? (
                    <div
                      className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className={`block w-4 h-4 rounded-full ${
                        isOnline ? "bg-green-500" : "bg-red-500"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              )}
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white
                transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={t.menuToggle}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* MOBILE MENU */}
          {isMenuOpen && (
            <div
              id="mobile-menu"
              className="fixed inset-x-0 top-[76px] bottom-0 overflow-hidden bg-gray-900"
              role="dialog"
              aria-modal="true"
              aria-label={t.mobileNav}
            >
              <div className="h-full overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
                <nav aria-label={t.mobileNav}>
                  <ul className="space-y-2" role="list">
                    {MOBILE_NAVIGATION_ITEMS.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={`flex items-center space-x-3 p-3 rounded-xl text-gray-300
                            hover:bg-white/10 transition-colors
                            ${location.pathname === item.path ? "bg-white/10" : ""}`}
                          onClick={() => setIsMenuOpen(false)}
                          aria-current={
                            location.pathname === item.path ? "page" : undefined
                          }
                        >
                          {item.mobileIcon && (
                            <span className="text-xl" aria-hidden="true">
                              {item.mobileIcon}
                            </span>
                          )}
                          <span className="font-semibold text-base">
                            {getNavigationLabel(item.labelKey)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className="border-t border-white/10" aria-hidden="true" />

                <div>
                  <LanguageDropdown isMobile />
                </div>

                <div className="border-t border-white/10" aria-hidden="true" />

                <div>
                  <UserMenu isMobile scrolled />
                </div>

                <div className="h-8" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Spacer pour compenser le header fixed */}
      <div className="h-20" aria-hidden="true" />
    </>
  );
};

Header.displayName = "Header";

export default memo(Header);
