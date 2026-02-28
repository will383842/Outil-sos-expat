// src/pages/Dashboard.tsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useLocaleNavigate } from "../multilingual-system/hooks/useLocaleNavigate";
import { getTranslatedRouteSlug, type RouteKey } from "../multilingual-system/core/routing/localeRoutes";
import {
  User,
  Settings,
  Phone,
  FileText,
  Bell,
  Shield,
  LogOut,
  Edit,
  CreditCard,
  Calendar,
  Mail,
  MessageSquare,
  Check,
  AlertTriangle,
  Clock,
  Star,
  Bookmark,
  Globe,
  Lock,
  Unlock,
  UserIcon,
  EyeOff,
  Eye,
  EyeOffIcon,
  Bot,
  Sparkles,
} from "lucide-react";

import Layout from "../components/layout/Layout";
import Button from "../components/common/Button";
import AvailabilityToggle from "../components/dashboard/AvailabilityToggle";
import NotificationSettings from "../notifications/notificationsDashboardProviders/NotificationSettings";
import UserInvoices from "../components/dashboard/UserInvoices";
import DashboardMessages from "../components/dashboard/DashboardMessages";
import ImageUploader from "../components/common/ImageUploader";
import MultiLanguageSelect from "../components/forms-data/MultiLanguageSelect";
import ProfileStatusAlert from "../components/common/ProfileStatusAlert";
import ReviewModal from "../components/review/ReviewModal";
import { useAiQuota } from "../hooks/useAiQuota";
import MobileBottomNav from "../components/dashboard/MobileBottomNav";
import MobileSideDrawer from "../components/dashboard/MobileSideDrawer";
import KYCBannerCompact from "../components/dashboard/KYCBannerCompact";
import DashboardAffiliateCard from "../components/dashboard/DashboardAffiliateCard";
import QuickActions from "../components/dashboard/QuickActions";
import ActivePromoBanner from "../components/dashboard/ActivePromoBanner";
import DashboardGDPR from "../components/dashboard/DashboardGDPR";
// RecentActivity removed - was causing layout issues

import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { updateUserProfile, logAuditEvent, getUserCallSessions } from "../utils/firestore";
import { formatDateTime } from "../utils/localeFormatters";

import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db, auth, functions } from "../config/firebase";
import {
  updateEmail as fbUpdateEmail,
  updateProfile as fbUpdateProfile,
} from "firebase/auth";
import { FormattedMessage, useIntl } from "react-intl";
// StripeKYC removed - now uses dedicated /dashboard/kyc page for better scroll UX
import PayPalOnboarding from "@/components/provider/PayPalOnboarding";
import IntlPhoneInput from "@/components/forms-data/IntlPhoneInput";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import dashboardLog from "../utils/dashboardLogger";
import { useForm, Controller } from "react-hook-form";
// ✅ FIX: ProviderOnlineManager est maintenant monté au niveau App.tsx pour tracking global
// import ProviderOnlineManager from '../components/providers/ProviderOnlineManager';
import { getProviderTranslation, type SupportedLanguage } from "../services/providerTranslationService";
import { getSpecialtyLabel, mapLanguageToLocale } from "../utils/specialtyMapper";

import { requestUpdateProviderTranslation } from '../services/providerTranslationService';

// ===============================
// 🎨 DESIGN TOKENS (UI only — aucune incidence métier)
// ===============================
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  sectionTitle: "text-lg font-semibold text-gray-900 dark:text-gray-100",
  text: "text-gray-700 dark:text-gray-200",
  textMuted: "text-gray-500 dark:text-gray-400",
  radiusSm: "rounded-lg",
  radiusFull: "rounded-full",
} as const;

const ROLE = {
  admin: {
    header:
      "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white",
    chip: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  lawyer: {
    header:
      "bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white",
    chip: "bg-red-100 text-red-700 border border-red-200",
  },
  expat: {
    header:
      "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white",
    chip: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  },
  client: {
    header:
      "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white",
    chip: "bg-purple-100 text-purple-700 border border-purple-200",
  },
  defaultHeader:
    "bg-gradient-to-r from-red-500 via-orange-500 to-purple-600 text-white",
} as const;


const getHeaderClassForRole = (role?: string): string => {
  if (role === "admin") return ROLE.admin.header;
  if (role === "lawyer") return ROLE.lawyer.header;
  if (role === "expat") return ROLE.expat.header;
  if (role === "client") return ROLE.client.header;
  return ROLE.defaultHeader;
};

// ===============================
// P0 FIX: Champs protégés par les règles Firestore
// Ces champs ne peuvent pas être modifiés par le client
// ===============================
const PROTECTED_SOS_FIELDS = [
  'stripeAccountId',
  'paypalMerchantId',
  'stripeCustomerId',
  'totalEarnings',
  'totalPayPalEarnings',
  'pendingBalance',
  'reservedBalance',
  'paypalEmailVerified',
  'paypalEmailVerifiedAt',
  'isApproved',
  'approvalStatus',
  'verificationStatus',
  'totalCalls',
  'rating',
  'reviewCount',
  'createdAt',
];

// ===============================
// Types
// ===============================
interface Call {
  id: string;
  clientId: string;
  providerId: string;
  providerName: string;
  clientName: string;
  serviceType: "lawyer_call" | "expat_call";
  title: string;
  description: string;
  duration: number;
  price: number;
  status: "completed" | "pending" | "in_progress" | "failed";
  createdAt: Date;
  startedAt: Date;
  endedAt: Date;
  clientRating?: number;
  hasReview?: boolean; // Indique si le client a déjà laissé un avis
}

interface Invoice {
  id: string;
  callId: string;
  number: string;
  amount: number;
  date: Date;
  status: "paid" | "pending" | "overdue";
  downloadUrl: string;
}

interface ProfileData {
  email: string;
  phone: string;
  phoneCountryCode: string;
  whatsappNumber?: string;
  whatsappCountryCode?: string;
  currentCountry: string;
  currentPresenceCountry?: string;
  residenceCountry?: string;
  profilePhoto: string;
  isOnline: boolean;

  // commun
  preferredLanguage?: "fr" | "en";
  languages?: string[];
  bio?: string;

  // lawyer
  yearsOfExperience?: number;
  specialties?: string[];
  practiceCountries?: string[];
  graduationYear?: number;
  educations?: string[];
  barNumber?: string;

  // expat
  helpTypes?: string[];
  yearsAsExpat?: number;
  interventionCountries?: string[];
}

type TabType =
  | "profile"
  | "settings"
  | "gdpr"
  | "calls"
  | "invoices"
  | "reviews"
  | "messages"
  | "favorites"
  | "translations";

type CallStatus = "completed" | "pending" | "in_progress" | "failed" | "scheduled" | "cancelled" | "no_show";



type ReviewStatus = "pending" | "published" | "hidden";

interface ProviderReview {
  id: string;
  clientName?: string;
  comment?: string;
  rating: number;
  status?: ReviewStatus;
  createdAt?: Date;
  moderatedAt?: Date;
  isPublic?: boolean;
}

// ===============================
// Sous-composants UI (logique inchangée, styles modernisés)
// ===============================
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "number";
}> = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-red-500 transition"
    />
  </div>
);

const ChipInput: React.FC<{
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  buttonLabel?: string;
}> = ({ value, onChange, placeholder, className, buttonLabel = "Add" }) => {
  const [input, setInput] = useState<string>("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (value.includes(v)) {
      setInput("");
      return;
    }
    onChange([...value, v]);
    setInput("");
  };
  const remove = (i: number) => {
    const next = [...value];
    next.splice(i, 1);
    onChange(next);
  };
  return (
    <div className={className ?? ""}>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 dark:bg-white/10 dark:text-white dark:border-white/10"
          >
            {v}
            <button
              type="button"
              className="hover:opacity-80"
              onClick={() => remove(i)}
              aria-label={`Supprimer ${v}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
        />
        <Button type="button" onClick={add} size="small">
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
      {value || "—"}
    </p>
  </div>
);

const PillsRow: React.FC<{
  label: string;
  items: string[];
  color: "blue" | "green" | "red";
  mapItem?: (item: string) => string;
}> = ({ label, items, color, mapItem }) => {
  const colorMap: Record<"blue" | "green" | "red", string> = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    green:
      "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
    red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {(items || []).length > 0 ? (
          items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className={`px-2 py-1 ${colorMap[color]} text-xs rounded-full`}
            >
              {mapItem ? mapItem(it) : it}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-900 dark:text-gray-100">—</span>
        )}
      </div>
    </div>
  );
};

const Alert: React.FC<{ type: "success" | "error"; message: string }> = ({
  type,
  message,
}) => {
  const cfg =
    type === "success"
      ? {
        bg: "bg-green-50 dark:bg-green-500/10",
        border: "border-green-200 dark:border-green-500/20",
        text: "text-green-800 dark:text-green-200",
        icon: <Check className="h-5 w-5 mr-2" />,
      }
      : {
        bg: "bg-red-50 dark:bg-red-500/10",
        border: "border-red-200 dark:border-red-500/20",
        text: "text-red-800 dark:text-red-200",
        icon: <AlertTriangle className="h-5 w-5 mr-2" />,
      };
  return (
    <div
      className={`mb-2 ${cfg.bg} ${cfg.border} ${cfg.text} rounded-xl p-4 shadow-sm transition`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        {cfg.icon}
        <span>{message}</span>
      </div>
    </div>
  );
};

// ===============================
// Composant principal
// ===============================
const Dashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user, firebaseUser, logout, refreshUser, isLoading: authLoading, authInitialized } = useAuth();
  const { language } = useApp();

  // ✅ Redirect non-provider roles to their specific dashboard
  useEffect(() => {
    if (!user?.role) return;
    const roleRedirects: Record<string, string> = {
      chatter: "/chatter/tableau-de-bord",
      influencer: "/influencer/tableau-de-bord",
      blogger: "/blogger/tableau-de-bord",
      groupAdmin: "/group-admin/tableau-de-bord",
    };
    const redirect = roleRedirects[user.role];
    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [user?.role, navigate]);

  // AI Quota for sidebar display (lawyers and expats only)
  const {
    currentUsage: aiCurrentUsage,
    limit: aiLimit,
    remaining: aiRemaining,
    isInTrial: aiIsInTrial,
    trialDaysRemaining: aiTrialDaysRemaining,
    trialCallsRemaining: aiTrialCallsRemaining,
    canMakeAiCall
  } = useAiQuota();

  // ✅ FIX: Calculate translated routes based on current language
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const translatedRoutes = useMemo(() => {
    const dashboardSlug = getTranslatedRouteSlug('dashboard' as RouteKey, langCode);
    const aiAssistantSlug = getTranslatedRouteSlug('dashboard-ai-assistant' as RouteKey, langCode);
    const subscriptionSlug = getTranslatedRouteSlug('dashboard-subscription' as RouteKey, langCode);
    const subscriptionPlansSlug = getTranslatedRouteSlug('dashboard-subscription-plans' as RouteKey, langCode);
    const kycSlug = getTranslatedRouteSlug('dashboard-kyc' as RouteKey, langCode);

    return {
      dashboard: `/${dashboardSlug}`,
      aiAssistant: `/${aiAssistantSlug}`,
      subscription: `/${subscriptionSlug}`,
      subscriptionPlans: `/${subscriptionPlansSlug}`,
      kyc: `/${kycSlug}`,
    };
  }, [langCode]);

  // ✅ P0 FIX: Remove debug logging to reduce console spam (was running on every auth state change)
  const [reviews, setReviews] = useState<ProviderReview[]>([]); //define the type here 


  const fetchProviderReviews = async (providerId: string) => {
    const q = query(
      collection(db, "reviews"),
      where("providerId", "==", providerId),
      // orderBy("createdAt", "desc")
    );
  
    const snap = await getDocs(q);
   
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  };

  // ✅ OPTIMISATION COÛTS GCP: Polling 60s au lieu de onSnapshot pour les reviews
  // P0 FIX: Load reviews based on user role - providers see reviews they received, clients see reviews they wrote
  useEffect(() => {
    if (!user?.id || !user?.role) return;
    let isMounted = true;

    const loadReviews = async () => {
      try {
        // P0 FIX: Filter by role - providers see reviews received, clients see reviews written
        const filterField = user.role === 'client' ? 'clientId' : 'providerId';
        const qRef = query(
          collection(db, "reviews"),
          where(filterField, "==", user.id),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(qRef);
        if (!isMounted) return;

        const items: ProviderReview[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            clientName: data.clientName || "",
            comment: data.comment || "",
            rating: data.rating || 0,
            status: (data.status || "pending") as ReviewStatus,
            createdAt: data.createdAt?.toDate?.(),
            moderatedAt: data.moderatedAt?.toDate?.(),
            isPublic: data.isPublic || false,
            clientId: data.clientId || "",
            providerId: data.providerId || "",
            providerUid: data.providerUid || "",
            providerName: data.providerName || "",
            providerEmail: data.providerEmail || "",
            providerPhone: data.providerPhone || "",
            providerCountry: data.providerCountry || "",
            providerCity: data.providerCity || "",
          };
        });
        setReviews(items);
      } catch (err) {
        console.error("Error loading reviews:", err);
        if (isMounted) setReviews([]);
      }
    };

    loadReviews();
    const intervalId = setInterval(loadReviews, 60000); // Poll every 60s

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [user?.id, user?.role]);

  // Helper to get user's full name safely
  const getUserFullName = useCallback(() => {
    if (!user) return '';

    // Try firstName + lastName
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }

    // Fallback to fullName
    if ((user as any).fullName) {
      return (user as any).fullName;
    }

    // Fallback to displayName
    if ((user as any).displayName) {
      return (user as any).displayName;
    }

    // Last resort
    return user.email || 'User';
  }, [user]);

  // Helper to get first name only
  const getUserFirstName = useCallback(() => {
    if (!user) return '';

    if (user.firstName) {
      return user.firstName;
    }

    // Try to extract from fullName or displayName
    const fullName = (user as any).fullName || (user as any).displayName || '';
    if (fullName) {
      return fullName.split(' ')[0];
    }

    return user.email?.split('@')[0] || 'User';
  }, [user]);

  //   const { control: phoneControl, setValue: setPhoneValue, watch: watchPhone } = useForm({
  //   defaultValues: {
  //     phone: profileData.phone || '',
  //     whatsappNumber: profileData.whatsappNumber || '',
  //   },
  //   mode: 'onChange',
  // });

  // const phoneValue = watchPhone('phone');
  // const whatsappValue = watchPhone('whatsappNumber');

  // const { control: phoneControl, setValue: setPhoneValue, watch: watchPhone } = useForm({
  //   defaultValues: {
  //     phone: profileData.phone || '',
  //     whatsappNumber: profileData.whatsappNumber || '',
  //   },
  //   mode: 'onChange',
  // });

  // const phoneValue = watchPhone('phone');
  // const whatsappValue = watchPhone('whatsappNumber');

  // URL query params for tab navigation - SINGLE SOURCE OF TRUTH
  const [searchParams, setSearchParams] = useSearchParams();

  // Valid tabs constant
  const VALID_TABS: TabType[] = ['profile', 'settings', 'gdpr', 'calls', 'invoices', 'reviews', 'messages', 'favorites', 'translations'];

  // ✅ P0 FIX: Compute tab from URL directly - not memoized to ensure fresh reads
  const getTabFromUrl = useCallback((): TabType => {
    const tabParam = searchParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as TabType)) {
      return tabParam as TabType;
    }
    return 'profile';
  }, [searchParams]);

  // Current tab from URL (recomputed on every searchParams change)
  const tabFromUrl = getTabFromUrl();

  // UI & feedback - initialize from URL to avoid flash
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Initial value from window.location.search (sync read at mount)
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam && VALID_TABS.includes(tabParam as TabType)) {
      return tabParam as TabType;
    }
    return 'profile';
  });
  const [isEditMode, setIsEditMode] = useState<boolean>(false); // Toggle Vue/Édition dans l'onglet Profil
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ✅ Track if user data is ready (for KYC component fix)
  const [userDataReady, setUserDataReady] = useState<boolean>(false);
const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
const [kycRefreshAttempted, setKycRefreshAttempted] = useState<boolean>(false);

  // ✅ P0 FIX: Stable state for KYC display - prevents flickering from Firestore updates
  // This is set ONCE on initial load and only changes when user explicitly completes KYC
  const [showStripeKycStable, setShowStripeKycStable] = useState<boolean | null>(null);
  const stripeKycInitializedRef = useRef(false);

  // data
  const [currentStatus, setCurrentStatus] = useState<boolean>(
    user?.isOnline ?? false
  );
  const [calls, setCalls] = useState<Call[]>([]);
  const [favorites, setFavorites] = useState<
    Array<{
      id: string;
      type: "lawyer" | "expat";
      name: string;
      country?: string;
      photo?: string;
    }>
  >([]);

  // Translations tab state
  const [selectedTranslationLang, setSelectedTranslationLang] = useState<SupportedLanguage | null>(null);
  const [translationDescription, setTranslationDescription] = useState<string>("");
  const [translationSpecialties, setTranslationSpecialties] = useState<string[]>([]);
  const [translationMotivation, setTranslationMotivation] = useState<string>("");
  const [isLoadingTranslation, setIsLoadingTranslation] = useState<boolean>(false);
  const [isSavingTranslation, setIsSavingTranslation] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [isFreezing, setIsFreezing] = useState<boolean>(false);

  // Review Modal state (pour laisser un avis depuis l'onglet "calls")
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [selectedCallForReview, setSelectedCallForReview] = useState<Call | null>(null);

  // P0 FIX: Stable photo version to prevent image flickering on re-renders
  // Date.now() in image src caused re-downloads on every render
  const [photoVersion, setPhotoVersion] = useState<number>(() => Date.now());

  // Profil (édition) pré-rempli
  const baseProfile: ProfileData = useMemo(
    () => ({
      email: user?.email || "",
      phone: (user as { phone?: string })?.phone || "",
      phoneCountryCode:
        (user as { phoneCountryCode?: string })?.phoneCountryCode || "+33",
      whatsappNumber:
        (user as { whatsappNumber?: string })?.whatsappNumber || "",
      whatsappCountryCode:
        (user as { whatsappCountryCode?: string })?.whatsappCountryCode ||
        "+33",
      currentCountry:
        (user as { currentCountry?: string })?.currentCountry || "",
      currentPresenceCountry:
        (user as { currentPresenceCountry?: string })?.currentPresenceCountry ||
        "",
      residenceCountry:
        (user as { residenceCountry?: string })?.residenceCountry || "",
      profilePhoto: user?.profilePhoto || user?.photoURL || "",
      isOnline: user?.isOnline ?? true,
      preferredLanguage:
        (user as { preferredLanguage?: "fr" | "en" })?.preferredLanguage ||
        "fr",
      languages: (user as { languages?: string[] })?.languages || [],
      bio: (user as { bio?: string })?.bio || "",
      yearsOfExperience:
        (user as { yearsOfExperience?: number })?.yearsOfExperience ?? 0,
      specialties: (user as { specialties?: string[] })?.specialties || [],
      practiceCountries:
        (user as { practiceCountries?: string[] })?.practiceCountries || [],
      graduationYear:
        (user as { graduationYear?: number })?.graduationYear ||
        new Date().getFullYear() - 5,
      // ✅ P0 FIX: Support both 'education' (string from registration) and 'educations' (array)
      educations: (() => {
        const educations = (user as { educations?: string[] })?.educations;
        const education = (user as { education?: string | string[] })?.education;
        if (Array.isArray(educations) && educations.length > 0) return educations;
        if (Array.isArray(education)) return education;
        if (typeof education === 'string' && education.trim()) return education.split(',').map(e => e.trim()).filter(Boolean);
        return [];
      })(),
      barNumber: (user as { barNumber?: string })?.barNumber || "",
      helpTypes: (user as { helpTypes?: string[] })?.helpTypes || [],
      yearsAsExpat: (user as { yearsAsExpat?: number })?.yearsAsExpat ?? 0,
      interventionCountries:
        (user as { interventionCountries?: string[] })?.interventionCountries ||
        [],
    }),
    [user]
  );
  const [profileData, setProfileData] = useState<ProfileData>(baseProfile);




  const {
    control: phoneControl,
    setValue: setPhoneValue,
    watch: watchPhone,
  } = useForm({
    defaultValues: {
      phone: baseProfile.phone || "",
      whatsappNumber: baseProfile.whatsappNumber || "",
    },
    mode: "onChange",
  });

  const phoneValue = watchPhone("phone");
  const whatsappValue = watchPhone("whatsappNumber");

  // Langues (sélecteur identique aux formulaires)
  const [selectedLanguages, setSelectedLanguages] = useState<
    Array<{ value: string; label: string }>
  >((baseProfile.languages || []).map((l) => ({ value: l, label: l })));

  // Redirect si pas loggé
  useEffect(() => {
    if (!user) navigate("/login");
    // ✅ P0 FIX: Remove verbose logging
  }, [user, navigate]);

  // ✅ Set userDataReady to true once user is loaded
  // Note: Only depend on user.role to prevent re-runs on every user property change
  useEffect(() => {
    if (user && (user.role === "lawyer" || user.role === "expat")) {
      setUserDataReady(true);
    }
  }, [user?.role]);

  // ✅ P0 FIX: Initialize stable KYC display state ONCE to prevent flickering
  // This effect runs only when userDataReady becomes true and sets the initial state
  // Subsequent Firestore updates will NOT change this state - only explicit user action will
  // Note: Dependencies narrowed to prevent excessive re-runs from Firestore updates
  useEffect(() => {
    if (userDataReady && user && !stripeKycInitializedRef.current) {
      const isProvider = user.role === "lawyer" || user.role === "expat";
      const isStripeGateway = user?.paymentGateway === "stripe" || !user?.paymentGateway;
      const needsKyc =
        user?.kycStatus === "not_started" ||
        user?.kycStatus === "in_progress" ||
        !user?.stripeOnboardingComplete;

      const shouldShowKyc = isProvider && isStripeGateway && needsKyc;

      // Only initialize once
      stripeKycInitializedRef.current = true;
      setShowStripeKycStable(shouldShowKyc);
    }
  }, [userDataReady, user?.role, user?.paymentGateway, user?.kycStatus, user?.stripeOnboardingComplete]);

// ✅ Force refresh user data on mount for lawyer/expat (fixes KYC loading issue after signup)
// ⚠️ Limited to ONE attempt to prevent infinite loops
// useEffect(() => {
//   const checkAndRefreshUserData = async () => {
//     if (!user) {
//       setUserDataReady(false);
//       return;
//     }

//     // If user is lawyer or expat, ensure KYC fields are loaded
//     if (user.role === "lawyer" || user.role === "expat") {
//       // Check if KYC fields are missing (happens right after signup)
//       const missingKycData = 
//         user.kycStatus === undefined || 
//         user.stripeOnboardingComplete === undefined ||
//         user.chargesEnabled === undefined;

//       // ✅ Only attempt refresh ONCE to prevent infinite loop
//       if (missingKycData && !kycRefreshAttempted && !isRefreshing) {
//         console.log("🔄 KYC data missing, refreshing user (one-time attempt)...");
//         setKycRefreshAttempted(true); // ← Mark as attempted BEFORE async call
//         setIsRefreshing(true);
//         try {
//           await refreshUser();
//           console.log("✅ User data refreshed");
//         } catch (error) {
//           console.error("❌ Error refreshing user:", error);
//         } finally {
//           setIsRefreshing(false);
//         }
//       } else if (missingKycData && kycRefreshAttempted) {
//         // KYC data still missing after refresh - this is expected for new signups
//         // The user needs to complete Stripe onboarding
//         console.log("ℹ️ KYC data still missing after refresh - awaiting Stripe onboarding");
//       }
//     }
    
//     // Mark as ready after check/refresh
//     setUserDataReady(true);
//   };

//   checkAndRefreshUserData();
// // }, [user?.uid, user?.role, kycRefreshAttempted]); // ← Added kycRefreshAttempted to deps
// }, [user?.id]); // ← Added kycRefreshAttempted to deps

  // ✅ P0 FIX: Sync activeTab with URL query params when URL changes
  // Always set activeTab from URL - this ensures the UI reflects the URL state
  useEffect(() => {
    const urlTab = getTabFromUrl();
    // Only update if actually different to avoid unnecessary re-renders
    setActiveTab(prev => {
      if (prev !== urlTab) {
        dashboardLog.tab(`Tab state changed: ${prev} -> ${urlTab}`);
        return urlTab;
      }
      return prev;
    });
  }, [searchParams, getTabFromUrl]);

  // ✅ OPTIMISATION COÛTS GCP: Polling 60s au lieu de onSnapshot pour le status
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;

    const loadStatus = async () => {
      try {
        const sosRef = doc(db, "sos_profiles", user.id);
        const sosSnap = await getDoc(sosRef);

        if (!isMounted) return;

        if (sosSnap.exists()) {
          const data = sosSnap.data() as { isOnline?: boolean };
          setCurrentStatus(data?.isOnline === true);
        } else {
          // Fallback to users collection
          const userRef = doc(db, "users", user.id);
          const userSnap = await getDoc(userRef);
          if (!isMounted) return;

          if (userSnap.exists()) {
            const udata = userSnap.data() as { isOnline?: boolean };
            setCurrentStatus(udata?.isOnline === true);
          }
        }
      } catch {
        /* silent */
      }
    };

    loadStatus();
    const intervalId = setInterval(loadStatus, 60000); // Poll every 60s

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [user?.id]);

  // Favoris
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const q = query(
          collection(db, "users", user.id, "favorites"),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        const items: Array<{
          id: string;
          type: "lawyer" | "expat";
          name: string;
          country?: string;
          photo?: string;
        }> = [];
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          items.push({
            id: d.id,
            type: (data.type as "lawyer" | "expat") || "lawyer",
            name: String(data.name || ""),
            country: (data.country as string) || "",
            photo: (data.photo as string) || "",
          });
        });
        setFavorites(items);
      } catch {
        /* silent */
      }
    })();
  }, [user?.id]);

  // Fetch call sessions from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchCallSessions = async () => {
      try {
        const sessions = await getUserCallSessions(user.id, user.role);

        // Pour les clients, vérifier si un avis existe déjà pour chaque appel terminé
        if (user.role === "client") {
          const callsWithReviewStatus = await Promise.all(
            (sessions as unknown as Call[]).map(async (call) => {
              if (call.status === "completed") {
                // Vérifier si un avis existe pour cet appel
                const reviewsQuery = query(
                  collection(db, "reviews"),
                  where("callId", "==", call.id),
                  where("clientId", "==", user.id),
                  limit(1)
                );
                const reviewSnap = await getDocs(reviewsQuery);
                return { ...call, hasReview: !reviewSnap.empty };
              }
              return call;
            })
          );
          setCalls(callsWithReviewStatus);
        } else {
          setCalls(sessions as unknown as Call[]);
        }
      } catch (error) {
        console.error("Error fetching call sessions:", error);
        setCalls([]);
      }
    };

    fetchCallSessions();
  }, [user]);

  // Helpers
  const formatDate = (date: Date): string => {
    const userCountry = (user as { currentCountry?: string; country?: string })?.currentCountry || 
                        (user as { currentCountry?: string; country?: string })?.country;
    return formatDateTime(date, {
      language,
      userCountry,
      dateFormat: 'long',
    });
  };

  const formatDuration = (minutes: number): string => `${minutes} min`;
  const formatPrice = (price: number): string => `${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  const getStatusBadge = (status: CallStatus): any => {
    const statusConfig: Record<
      CallStatus,
      { className: string; textId: string }
    > = {
      completed: {
        className:
          "px-2 py-1 bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300 rounded-full text-xs font-medium",
        textId: "status.completed",
      },
      pending: {
        className:
          "px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300 rounded-full text-xs font-medium",
        textId: "status.pending",
      },
      in_progress: {
        className:
          "px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 rounded-full text-xs font-medium",
        textId: "status.inProgress",
      },
      failed: {
        className:
          "px-2 py-1 bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 rounded-full text-xs font-medium",
        textId: "status.failed",
      },
      scheduled: {
        className:
          "px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300 rounded-full text-xs font-medium",
        textId: "status.scheduled",
      },
      cancelled: {
        className:
          "px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300 rounded-full text-xs font-medium",
        textId: "status.cancelled",
      },
      no_show: {
        className:
          "px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 rounded-full text-xs font-medium",
        textId: "status.noShow",
      },
    };
    const config = statusConfig[status];
    // Fallback pour les status inconnus
    if (!config) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300 rounded-full text-xs font-medium">{status}</span>;
    }
    return <span className={config.className}>{intl.formatMessage({ id: config.textId })}</span>;
  };

  // Palette alignée Home (fallback si rôle non défini)
  const headerGradient = getHeaderClassForRole(user?.role);
  const softCard = UI.card;

  // ===============================
  // PHOTO : persistance immédiate (users + sos_profiles + Auth)
  // ===============================
  const handleInstantPhotoPersist = useCallback(
    async (url: string) => {
      if (!user) return;
      try {
        // users/{uid}
        await updateDoc(doc(db, "users", user.id), {
          profilePhoto: url,
          photoURL: url,
          avatar: url,
          updatedAt: serverTimestamp(),
        });

        // sos_profiles/{uid} si prestataire
        if (user.role === "lawyer" || user.role === "expat") {
          await updateDoc(doc(db, "sos_profiles", user.id), {
            profilePhoto: url,
            photoURL: url,
            avatar: url,
            updatedAt: serverTimestamp(),
          }).catch(() => { });
        }

        // Auth photoURL
        if (auth.currentUser) {
          await fbUpdateProfile(auth.currentUser, { photoURL: url }).catch(
            () => { }
          );
        }

        // MAJ UI immédiate
        setProfileData((prev) => ({ ...prev, profilePhoto: url }));
        // P0 FIX: Update photo version to force image reload only when photo actually changes
        setPhotoVersion(Date.now());

        await logAuditEvent(user.id, "profile_photo_updated", { newUrl: url });
        await refreshUser?.(); // propage vers sidebar / profil

        setSuccessMessage(
          intl.formatMessage({ id: "dashboard.photoUpdated" })
          // language === "fr" ? "Photo mise à jour ✅" : "Photo updated ✅"
        );
        setTimeout(() => setSuccessMessage(null), 2000);
      } catch {
        setErrorMessage(
          intl.formatMessage({ id: "dashboard.errorPhotoUpdate" })
          // language === "fr"
          //   ? "Erreur lors de la mise à jour de la photo"
          //   : "Error updating photo"
        );
        setTimeout(() => setErrorMessage(null), 2500);
      }
    },
    [user, refreshUser, language]
  );

  // Sync phone field with profileData
  useEffect(() => {
    if (phoneValue !== undefined) {
      setProfileData((prev) => ({ ...prev, phone: phoneValue }));
    }
  }, [phoneValue]);

  // Sync whatsapp field with profileData
  useEffect(() => {
    if (whatsappValue !== undefined) {
      setProfileData((prev) => ({ ...prev, whatsappNumber: whatsappValue }));
    }
  }, [whatsappValue]);

  // Update form when baseProfile changes (initialization)
  useEffect(() => {
    setPhoneValue("phone", baseProfile.phone || "");
    setPhoneValue("whatsappNumber", baseProfile.whatsappNumber || "");
  }, [baseProfile.phone, baseProfile.whatsappNumber, setPhoneValue]);

  // ===============================
  // Sauvegarde des paramètres
  // ===============================
  const saveSettings = async (): Promise<void> => {
    if (!user) return;

    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      let validatedPhone = "";
      let validatedWhatsApp = "";

      if (profileData.phone) {
        try {
          const parsed = parsePhoneNumberFromString(profileData.phone);
          if (parsed && parsed.isValid()) {
            validatedPhone = parsed.number; // E.164 format
          }
        } catch {
          throw new Error(intl.formatMessage({ id: "dashboard.invalidPhone" }));
        }
      }

      if (profileData.whatsappNumber) {
        try {
          const parsed = parsePhoneNumberFromString(profileData.whatsappNumber);
          if (parsed && parsed.isValid()) {
            validatedWhatsApp = parsed.number; // E.164 format
          }
        } catch {
          throw new Error(
            intl.formatMessage({ id: "dashboard.invalidWhatsApp" })
          );
        }
      }

      // langues depuis le MultiLanguageSelect
      const languagesFromSelect = selectedLanguages.map((o) => o.value);

      const payload: Record<string, unknown> = {
        email: profileData.email.trim().toLowerCase(),
        phone: validatedPhone || "",
        phoneCountryCode: profileData.phoneCountryCode || "+33",
        whatsappNumber: validatedWhatsApp || "",

        whatsappCountryCode: profileData.whatsappCountryCode || "+33",
        currentCountry: profileData.currentCountry || "",
        currentPresenceCountry: profileData.currentPresenceCountry || "",
        residenceCountry: profileData.residenceCountry || "",
        preferredLanguage: profileData.preferredLanguage || "fr",
        languages: languagesFromSelect,
        bio: profileData.bio || "",
        profilePhoto: profileData.profilePhoto || "",
        photoURL: profileData.profilePhoto || "",
        avatar: profileData.profilePhoto || "",
        updatedAt: serverTimestamp() as Timestamp,
      };

      if (user.role === "lawyer") {
        const educationsArray = profileData.educations || [];
        Object.assign(payload, {
          practiceCountries: profileData.practiceCountries || [],
          yearsOfExperience:
            typeof profileData.yearsOfExperience === "number"
              ? profileData.yearsOfExperience
              : 0,
          specialties: profileData.specialties || [],
          graduationYear:
            typeof profileData.graduationYear === "number"
              ? profileData.graduationYear
              : new Date().getFullYear() - 5,
          educations: educationsArray,
          // ✅ P0 FIX: Also save 'education' (string) for backwards compatibility with registration format
          education: educationsArray.join(', '),
          barNumber: profileData.barNumber || "",
        });
      } else if (user.role === "expat") {
        Object.assign(payload, {
          helpTypes: profileData.helpTypes || [],
          yearsAsExpat:
            typeof profileData.yearsAsExpat === "number"
              ? profileData.yearsAsExpat
              : 0,
          interventionCountries: profileData.interventionCountries || [],
        });
      }

      // Si changement d'email => met à jour l'identifiant Auth
      const emailChanged =
        user.email.trim().toLowerCase() !==
        profileData.email.trim().toLowerCase();
      if (emailChanged && firebaseUser) {
        try {
          await fbUpdateEmail(
            firebaseUser,
            profileData.email.trim().toLowerCase()
          );
        } catch {
          throw new Error(
            intl.formatMessage({ id: "common.emailChangeError" })
          );
        }
      }

      // update Firestore user
      await updateUserProfile(user.id, payload);

      // sync SOS profile
      if (user.role === "lawyer" || user.role === "expat") {
        // P0 FIX: Construire l'objet de mise à jour
        const sosProfileUpdate: Record<string, unknown> = {
          profilePhoto: payload.profilePhoto,
          photoURL: payload.photoURL,
          avatar: payload.avatar,
          email: payload.email,
          emailLower: (payload.email as string)?.toLowerCase(),
          phone: payload.phone,
          phoneCountryCode: payload.phoneCountryCode,
          languages: payload.languages,
          country:
            user.role === "lawyer"
              ? profileData.currentCountry || ""
              : profileData.residenceCountry ||
              profileData.currentCountry ||
              "",
          description: payload.bio,
          bio: payload.bio,
          specialties:
            user.role === "lawyer"
              ? (payload as { specialties?: string[] }).specialties || []
              : (payload as { helpTypes?: string[] }).helpTypes || [],
          yearsOfExperience:
            user.role === "lawyer"
              ? (payload as { yearsOfExperience?: number }).yearsOfExperience ||
              0
              : (payload as { yearsAsExpat?: number }).yearsAsExpat || 0,
          interventionCountries:
            user.role === "lawyer"
              ? (payload as { practiceCountries?: string[] })
                .practiceCountries || []
              : (payload as { interventionCountries?: string[] })
                .interventionCountries || [],
          updatedAt: serverTimestamp(),
        };

        // P0 FIX: Filtrer les champs protégés avant d'envoyer à Firestore
        const safeSosProfileUpdate = Object.fromEntries(
          Object.entries(sosProfileUpdate).filter(
            ([key]) => !PROTECTED_SOS_FIELDS.includes(key)
          )
        );

        // P0 FIX: Gestion d'erreur appropriée (ne plus ignorer silencieusement)
        try {
          await updateDoc(doc(db, "sos_profiles", user.id), safeSosProfileUpdate);
        } catch (sosErr) {
          console.error("[Dashboard] Erreur mise à jour sos_profiles:", sosErr);
          // Afficher un avertissement mais ne pas bloquer (le profil users est déjà mis à jour)
          setErrorMessage(
            intl.formatMessage({ id: "dashboard.sosProfileSyncWarning" })
          );
          // Continuer malgré l'erreur de sync sos_profiles
        }
      }

      // ✅ Translation update (NEW)
      if (user.role === "lawyer" || user.role === "expat") {
        // Track fields that affect translations: description/bio, specialties, motivation
        const translationRelevantFields = [
          'bio',           // Description/bio
          'description',   // Also check for description field
          'specialties',   // For lawyers
          'helpTypes',     // For expats (equivalent to specialties)
          'summary',       // Motivation field (might be in translations)
          'motivation',    // Direct motivation field if exists
        ];
        
        // Get all updated fields, excluding non-translatable ones
        const allFieldsUpdated = Object.keys(payload).filter(
          (key) => key !== "email" && key !== "updatedAt" && key !== "profilePhoto" && key !== "photoURL" && key !== "avatar"
        );
        
        // Check if any translation-relevant fields were updated
        const hasTranslationRelevantChanges = allFieldsUpdated.some(
          field => translationRelevantFields.includes(field)
        ) || allFieldsUpdated.length > 0; // Update if any field changed
        
        if (hasTranslationRelevantChanges && allFieldsUpdated.length > 0) {
          // ✅ P0 FIX: Only log in development mode
          if (import.meta.env.DEV) {
            console.log('[saveSettings] Requesting translation update for fields:', allFieldsUpdated);
          }

          const translationResult = await requestUpdateProviderTranslation(
            user.id,
            allFieldsUpdated
          );

          // ✅ P0 FIX: Only log in development mode
          if (import.meta.env.DEV) {
            if (translationResult.success && translationResult.updatedLanguages.length > 0) {
              console.log('[saveSettings] ✓ Translations updated for languages:',
                translationResult.updatedLanguages);
            } else if (!translationResult.success) {
              console.warn('[saveSettings] ⚠ Translation update had issues:',
                translationResult.message);
            }
          }
          // Continue - profile was saved successfully, translation update is secondary
        }
      }

      // Audit & refresh
      await logAuditEvent(user.id, "settings_updated", {
        settings: JSON.stringify(payload),
      });
      await refreshUser?.();

      setSuccessMessage(
        intl.formatMessage({ id: "dashboard.settingsUpdated" })
      );
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch {
      setErrorMessage(
        intl.formatMessage({ id: "dashboard.errorSettingsUpdate" })
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Logout sans écran blanc
  const handleLogout = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }, [logout, navigate, loggingOut]);



  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={
              i < full
                ? "w-4 h-4 text-yellow-400 fill-yellow-400"
                : "w-4 h-4 text-gray-300"
            }
          />
        ))}
        <span className="ml-2 text-xs text-gray-500">{rating.toFixed(1)}/5</span>
      </div>
    );
  };

  

  // Load translation data when language changes
  useEffect(() => {
    if (!user || (user.role !== "lawyer" && user.role !== "expat")) return;
    if (!selectedTranslationLang) {
      // Reset form when no language selected
      setTranslationDescription("");
      setTranslationSpecialties([]);
      setTranslationMotivation("");
      setIsFrozen(false);
      return;
    }

    const loadTranslation = async () => {
      setIsLoadingTranslation(true);
      try {
        const result = await getProviderTranslation(user.id, selectedTranslationLang);
        if (result.translation) {
          setTranslationDescription(result.translation.description || "");
          setTranslationSpecialties(result.translation.specialties || []);
          // Motivation might be in summary or a separate field
          setTranslationMotivation(result.translation.summary || "");
        } else {
          // No translation exists yet, reset form
          setTranslationDescription("");
          setTranslationSpecialties([]);
          setTranslationMotivation("");
        }
        
        // Check frozen status
        const translationRef = doc(db, "providers_translations", user.id);
        const translationDoc = await getDoc(translationRef);
        if (translationDoc.exists()) {
          const data = translationDoc.data();
          const frozenLanguages = data.metadata?.frozenLanguages || [];
          setIsFrozen(frozenLanguages.includes(selectedTranslationLang));
        } else {
          setIsFrozen(false);
        }
      } catch (error) {
        console.error("Error loading translation:", error);
        setTranslationDescription("");
        setTranslationSpecialties([]);
        setTranslationMotivation("");
        setIsFrozen(false);
      } finally {
        setIsLoadingTranslation(false);
      }
    };

    loadTranslation();
  }, [selectedTranslationLang, user]);

  // Handle language change - reset form
  const handleLanguageChange = (lang: string) => {
    setSelectedTranslationLang(lang === "" ? null : (lang as SupportedLanguage));
    // Form will reset via useEffect
  };

  // Save translation
  const handleSaveTranslation = async () => {
    if (!user || !selectedTranslationLang) {
      setErrorMessage("Please select a language");
      return;
    }

    setIsSavingTranslation(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Update the translation in Firestore
      const translationRef = doc(db, "providers_translations", user.id);
      const translationDoc = await getDoc(translationRef);
      
      if (!translationDoc.exists()) {
        setErrorMessage("Translation document not found. Please create a translation first.");
        setIsSavingTranslation(false);
        return;
      }

      const currentData = translationDoc.data();
      const translations = currentData.translations || {};
      
      // Update the specific language translation
      if (translations[selectedTranslationLang]) {
        translations[selectedTranslationLang] = {
          ...translations[selectedTranslationLang],
          description: translationDescription,
          bio: translationDescription, // Also update bio with the same value as description
          specialties: translationSpecialties,
          summary: translationMotivation,
        };
      } else {
        // Create new translation entry
        translations[selectedTranslationLang] = {
          description: translationDescription,
          bio: translationDescription, // Also update bio with the same value as description
          specialties: translationSpecialties,
          summary: translationMotivation,
          title: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.email || "",
        };
      }

      // When provider manually saves, automatically freeze the translation
      const frozenLanguages = currentData.metadata?.frozenLanguages || [];
      const updateData: any = {
        [`translations.${selectedTranslationLang}`]: translations[selectedTranslationLang],
        [`metadata.lastUpdated`]: serverTimestamp(),
        [`metadata.translations.${selectedTranslationLang}.status`]: 'frozen',
        [`metadata.translations.${selectedTranslationLang}.updatedAt`]: serverTimestamp(),
      };

      // Add to frozen languages if not already frozen
      if (!frozenLanguages.includes(selectedTranslationLang)) {
        updateData[`metadata.frozenLanguages`] = [...frozenLanguages, selectedTranslationLang];
        setIsFrozen(true);
      }

      await updateDoc(translationRef, updateData);
      
      // Reload the translation data to reflect changes immediately
      const updatedDoc = await getDoc(translationRef);
      if (updatedDoc.exists()) {
        const updatedData = updatedDoc.data();
        const updatedTranslations = updatedData.translations || {};
        if (updatedTranslations[selectedTranslationLang]) {
          setTranslationDescription(updatedTranslations[selectedTranslationLang].description || "");
          setTranslationSpecialties(updatedTranslations[selectedTranslationLang].specialties || []);
          setTranslationMotivation(updatedTranslations[selectedTranslationLang].summary || "");
        }
      }

      setSuccessMessage("Translation saved and frozen successfully! It will not be overwritten by automatic updates.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      console.error("Error saving translation:", error);
      setErrorMessage("Failed to save translation. Please try again.");
    } finally {
      setIsSavingTranslation(false);
    }
  };

  // Handle freeze/unfreeze translation
  const handleFreezeUnfreeze = async () => {
    if (!user || !selectedTranslationLang) {
      setErrorMessage("Please select a language");
      return;
    }

    setIsFreezing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const translationRef = doc(db, "providers_translations", user.id);
      const translationDoc = await getDoc(translationRef);
      
      if (!translationDoc.exists()) {
        setErrorMessage("Translation document not found.");
        setIsFreezing(false);
        return;
      }

      const currentData = translationDoc.data();
      const frozenLanguages = currentData.metadata?.frozenLanguages || [];
      const isCurrentlyFrozen = frozenLanguages.includes(selectedTranslationLang);

      if (isCurrentlyFrozen) {
        // Unfreeze - mark as outdated so it will be regenerated from updated original
        await updateDoc(translationRef, {
          [`metadata.frozenLanguages`]: frozenLanguages.filter((lang: SupportedLanguage) => lang !== selectedTranslationLang),
          [`metadata.translations.${selectedTranslationLang}.status`]: 'outdated', // Mark as outdated to force regeneration
          [`metadata.translations.${selectedTranslationLang}.updatedAt`]: serverTimestamp(),
          [`metadata.lastUpdated`]: serverTimestamp(),
        });
        setIsFrozen(false);
        setSuccessMessage("Translation unfrozen. It can now be automatically updated.");
      } else {
        // Freeze
        await updateDoc(translationRef, {
          [`metadata.frozenLanguages`]: [...frozenLanguages, selectedTranslationLang],
          [`metadata.translations.${selectedTranslationLang}.status`]: 'frozen',
          [`metadata.translations.${selectedTranslationLang}.updatedAt`]: serverTimestamp(),
          [`metadata.lastUpdated`]: serverTimestamp(),
        });
        setIsFrozen(true);
        setSuccessMessage("Translation frozen. It will not be overwritten by automatic updates.");
      }
      
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      console.error("Error freezing/unfreezing translation:", error);
      setErrorMessage("Failed to update freeze status. Please try again.");
    } finally {
      setIsFreezing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        {/* {language === "fr" ? "Redirection…" : "Redirecting…"} */}
        {intl.formatMessage({ id: "dashboard.redirecting" })}
      </div>
    );
  }

  const handleShowReview = (reviewId: string) => {
    const reviewRef = doc(db, "reviews", reviewId);
    updateDoc(reviewRef, {
      isPublic: true,
      status: "published",
    });
  };

  const handleHideReview = (reviewId: string) => {
    const reviewRef = doc(db, "reviews", reviewId);
    updateDoc(reviewRef, {
      isPublic: false,
      status: "pending",
    });
  };


  
  

  // ===============================
  // Rendu
  // ===============================
  return (
    <Layout>
      {/* ✅ FIX: ProviderOnlineManager retiré - maintenant monté au niveau App.tsx */}
      {/* ✨ PROFILE COMPLETION ALERT */}
      {user && (user.role === 'lawyer' || user.role === 'expat') ? (
        <ProfileStatusAlert user={user} />
      ) : null}

      {/* ========================================== */}
      {/* ========================================== */}
      {/* LOADING STATE (while fetching user data) */}
      {/* ========================================== */}
      {!userDataReady && (user?.role === "lawyer" || user?.role === "expat") && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">
              <FormattedMessage
                id="dashboard.loading"
                defaultMessage="Loading your dashboard..."
              />
            </p>
            <p className="text-gray-400 text-sm mt-2">
              <FormattedMessage
                id="dashboard.loading.subtitle"
                defaultMessage="Preparing your profile and verification status..."
              />
            </p>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* KYC STATUS & VERIFICATION SECTION (STRIPE OR PAYPAL) */}
      {/* P0 FIX: Stable container with CSS transitions to prevent layout jumping */}
      {/* ========================================== */}
      <div
        className={`
          dashboard-banner-zone overflow-hidden
          transition-[max-height,opacity] duration-500 ease-out
          ${showStripeKycStable === true || (userDataReady && user && (user.role === "lawyer" || user.role === "expat") && user?.paymentGateway === "paypal" && (user?.paypalAccountStatus === "not_connected" || !user?.paypalOnboardingComplete))
            ? 'max-h-[800px] opacity-100'
            : 'max-h-0 opacity-0'
          }
        `}
      >
        {/* STRIPE KYC: Show CTA button to complete verification */}
        {/* P0 FIX: Redirect to dedicated KYC page instead of embedded form for better scroll UX */}
        {showStripeKycStable === true && user && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 lg:py-8">
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <CreditCard className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        <FormattedMessage
                          id="dashboard.kyc.banner.title"
                          defaultMessage="Complétez votre vérification"
                        />
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        <FormattedMessage
                          id="dashboard.kyc.banner.description"
                          defaultMessage="Pour recevoir des paiements, vous devez compléter la vérification d'identité Stripe."
                        />
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(translatedRoutes.kyc)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
                  >
                    <FormattedMessage
                      id="dashboard.kyc.banner.button"
                      defaultMessage="Compléter la vérification"
                    />
                    <AlertTriangle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* PAYPAL KYC: Show PayPal onboarding if PayPal provider and not connected */}
        {userDataReady &&
          user &&
          (user.role === "lawyer" || user.role === "expat") &&
          user?.paymentGateway === "paypal" &&
          (user?.paypalAccountStatus === "not_connected" || !user?.paypalOnboardingComplete) && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 lg:py-8 kyc-form-expanded">
              <KYCBannerCompact user={user} kycType="paypal">
                <PayPalOnboarding
                  providerId={user.id}
                  providerEmail={user.email}
                  providerType={user.role as "lawyer" | "expat"}
                  onStatusChange={(status) => {
                    // P1 FIX: No page reload - AuthContext listener will update user state
                    if (status === "active") {
                      dashboardLog.kyc("PayPal onboarding complete", { status });
                    }
                  }}
                />
              </KYCBannerCompact>
            </div>
          )}

        {/* Show success banner if KYC is verified and charges enabled */}
      {/* {user?.stripeOnboardingComplete && user?.chargesEnabled && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <svg
              className="h-6 w-6 text-green-500 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-green-800 font-semibold">
                <FormattedMessage
                  id="dashboard.kyc.verified"
                  defaultMessage="Account Verified!"
                />
              </p>
              <p className="text-green-700 text-sm">
                <FormattedMessage
                  id="dashboard.kyc.verified.description"
                  defaultMessage="You can now receive payments from clients."
                />
              </p>
            </div>
          </div>
        </div>
      )} */}

      {/* Show success banner if STRIPE KYC is verified and charges enabled */}
      {user &&
        (user.role === "lawyer" || user.role === "expat") &&
        (user?.paymentGateway === "stripe" || !user?.paymentGateway) &&
        user?.stripeOnboardingComplete &&
        user?.chargesEnabled && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
              <div className="flex items-center">
                <svg
                  className="h-6 w-6 text-green-500 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-green-800 font-semibold">
                    {intl.formatMessage({ id: 'kyc.verified.title' })}
                  </p>
                  <p className="text-green-700 text-sm">
                    {intl.formatMessage({ id: 'kyc.verified.description' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Show success banner if PAYPAL is connected and active */}
      {user &&
        (user.role === "lawyer" || user.role === "expat") &&
        user?.paymentGateway === "paypal" &&
        (user?.paypalAccountStatus === "active" || user?.paypalAccountStatus === "connected") &&
        user?.paypalOnboardingComplete && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
              <div className="flex items-center">
                <svg
                  className="h-6 w-6 text-green-500 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-green-800 font-semibold">
                    <FormattedMessage
                      id="dashboard.paypal.verified"
                      defaultMessage="PayPal Connected!"
                    />
                  </p>
                  <p className="text-green-700 text-sm">
                    <FormattedMessage
                      id="dashboard.paypal.verified.description"
                      defaultMessage="You can now receive payments via PayPal from clients worldwide."
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Show pending banner if KYC is under review */}
      {/* {user?.stripeOnboardingComplete && !user?.chargesEnabled && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <svg
              className="h-6 w-6 text-yellow-500 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-yellow-800 font-semibold">
                <FormattedMessage
                  id="dashboard.kyc.pending"
                  defaultMessage="Verification Under Review"
                />
              </p>
              <p className="text-yellow-700 text-sm">
                <FormattedMessage
                  id="dashboard.kyc.pending.description"
                  defaultMessage="Your verification is being reviewed by Stripe. You'll be notified once approved (usually 24-48 hours)."
                />
              </p>
            </div>
          </div>
        </div>
      )} */}

      {/* Show pending banner if STRIPE KYC is under review */}
      {user &&
        (user.role === "lawyer" || user.role === "expat") &&
        (user?.paymentGateway === "stripe" || !user?.paymentGateway) &&
        user?.stripeOnboardingComplete &&
        !user?.chargesEnabled && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 shadow-sm">
              <div className="flex items-center">
                <svg
                  className="h-6 w-6 text-yellow-500 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-yellow-800 font-semibold">
                    <FormattedMessage
                      id="dashboard.kyc.pending"
                      defaultMessage="Verification Under Review"
                    />
                  </p>
                  <p className="text-yellow-700 text-sm">
                    <FormattedMessage
                      id="dashboard.kyc.pending.description"
                      defaultMessage="Your verification is being reviewed by Stripe. You'll be notified once approved (usually 24-48 hours)."
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Show pending banner if PAYPAL is pending verification */}
      {user &&
        (user.role === "lawyer" || user.role === "expat") &&
        user?.paymentGateway === "paypal" &&
        user?.paypalAccountStatus === "pending" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 shadow-sm">
              <div className="flex items-center">
                <svg
                  className="h-6 w-6 text-yellow-500 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-yellow-800 font-semibold">
                    <FormattedMessage
                      id="dashboard.paypal.pending"
                      defaultMessage="PayPal Verification In Progress"
                    />
                  </p>
                  <p className="text-yellow-700 text-sm">
                    <FormattedMessage
                      id="dashboard.paypal.pending.description"
                      defaultMessage="PayPal is verifying your account. This usually takes a few minutes."
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ========================================== */}
      {/* END OF KYC STATUS SECTION */}
      {/* ========================================== */}
      </div>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-rose-50/40 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black">
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          userRole={user?.role}
          onMoreClick={() => setIsMobileDrawerOpen(true)}
        />

        {/* Mobile Side Drawer */}
        <MobileSideDrawer
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          aiQuota={{
            currentUsage: aiCurrentUsage,
            limit: aiLimit,
            remaining: aiRemaining,
            isInTrial: aiIsInTrial,
            trialDaysRemaining: aiTrialDaysRemaining,
            canMakeAiCall,
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* SIDEBAR GAUCHE - Hidden on mobile */}
            <div className="hidden lg:block lg:col-span-1">
              <div className={`${softCard} overflow-hidden`}>
                <div className={`p-6 ${headerGradient}`}>
                  <div className="flex items-center space-x-4">
                    {user.profilePhoto ? (
                      <img
                        src={`${user.profilePhoto}?v=${(user.updatedAt as Date | undefined)?.valueOf?.() || Date.now()}`}
                        alt={getUserFirstName()}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/80"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-extrabold leading-tight">
                        {getUserFullName()}
                      </h2>
                      <p
                        className="text-white/90 text-sm flex items-center gap-1"
                        title={user.email}
                      >
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2.5 py-1 ${UI.radiusFull} text-xs font-semibold bg-white/20`}
                      >
                        {user.role === "lawyer"
                          ? intl.formatMessage({ id: "dashboard.lawyer" })
                          : user.role === "expat"
                            ? intl.formatMessage({ id: "dashboard.expat" })
                            : user.role === "admin"
                              ? intl.formatMessage({ id: "dashboard.admin" })
                              : intl.formatMessage({ id: "dashboard.client" })}
                      </span>
                    </div>
                  </div>
                </div>

                <nav className="p-4">
                  <ul className="space-y-2">
                    {[
                      {
                        key: "profile",
                        icon: <User className="mr-3 h-5 w-5" />,
                        fr: "Mon profil",
                        en: "My profile",
                        es: "Mi perfil",
                        de: "Mein Profil",
                        ru: "Мой профиль",
                        hi: "मेरी प्रोफ़ाइल",
                        ch: "我的个人资料",
                        pt: "Meu perfil",
                        ar: "ملفي الشخصي",
                      },
                      {
                        key: "calls",
                        icon: <Phone className="mr-3 h-5 w-5" />,
                        fr: "Mes appels",
                        en: "My calls",
                        es: "Mis llamadas",
                        de: "Meine Anrufe",
                        ru: "Мои звонки",
                        hi: "मेरी कॉलें",
                        ch: "我的来电",
                        pt: "Minhas chamadas",
                        ar: "مكالماتي",
                      },
                      {
                        key: "invoices",
                        icon: <FileText className="mr-3 h-5 w-5" />,
                        fr: "Mes factures",
                        en: "My invoices",
                        es: "Mis facturas",
                        de: "Meine Rechnungen",
                        ru: "Мои счета",
                        hi: "मेरे बिल",
                        ch: "我的发票",
                        pt: "Minhas faturas",
                        ar: "فواتيري",
                      },
                      {
                        key: "reviews",
                        icon: <Star className="mr-3 h-5 w-5" />,
                        fr: "Mes avis",
                        en: "My reviews",
                        es: "Mis reseñas",
                        de: "Meine Bewertungen",
                        ru: "Мои отзывы",
                        hi: "मेरी समीक्षाएं",
                        ch: "我的评论",
                        pt: "Minhas avaliações",
                        ar: "تقييماتي",
                      },
                      {
                        key: "messages",
                        icon: <MessageSquare className="mr-3 h-5 w-5" />,
                        fr: "Mes messages",
                        en: "My messages",
                        es: "Mis mensajes",
                        de: "Meine Nachrichten",
                        ru: "Мои сообщения",
                        hi: "मेरे संदेश",
                        ch: "我的留言",
                        pt: "Minhas mensagens",
                        ar: "رسائلي",
                      },
                      {
                        key: "favorites",
                        icon: <Bookmark className="mr-3 h-5 w-5" />,
                        fr: "Mes favoris",
                        en: "My favorites",
                        es: "Mis favoritos",
                        de: "Meine Favoriten",
                        ru: "Мои избранные",
                        hi: "मेरे पसंदीदा",
                        ch: "我的最爱",
                        pt: "Meus favoritos",
                        ar: "المفضلة لدي",
                      },
                      {
                        key: "gdpr",
                        icon: <Shield className="mr-3 h-5 w-5" />,
                        fr: "Mes données (GDPR)",
                        en: "My Data (GDPR)",
                        es: "Mis datos (GDPR)",
                        de: "Meine Daten (DSGVO)",
                        ru: "Мои данные (GDPR)",
                        hi: "मेरा डेटा (GDPR)",
                        ch: "我的数据 (GDPR)",
                        pt: "Meus dados (GDPR)",
                        ar: "بياناتي (GDPR)",
                      },
                      // AI Subscription items - for lawyers, expats, and admins
                      // Note: authInitialized must be true to ensure role is loaded
                      // ✅ P0 FIX: Remove inline console.log that was causing spam on every render
                      ...(authInitialized && (user.role === "lawyer" || user.role === "expat" || user.role === "admin")
                        ? [
                            {
                              key: "ai-assistant",
                              icon: <Bot className="mr-3 h-5 w-5" />,
                              fr: "Assistant IA",
                              en: "AI Assistant",
                              es: "Asistente IA",
                              de: "KI-Assistent",
                              ru: "ИИ Ассистент",
                              hi: "एआई सहायक",
                              ch: "AI助手",
                              pt: "Assistente IA",
                              ar: "مساعد الذكاء الاصطناعي",
                              route: translatedRoutes.aiAssistant,
                              badge: "NEW",
                            },
                            {
                              key: "subscription",
                              icon: <CreditCard className="mr-3 h-5 w-5" />,
                              fr: "Mon Abonnement",
                              en: "My Subscription",
                              es: "Mi Suscripción",
                              de: "Mein Abo",
                              ru: "Моя подписка",
                              hi: "मेरी सदस्यता",
                              ch: "我的订阅",
                              pt: "Minha Assinatura",
                              ar: "اشتراكي",
                              route: translatedRoutes.subscription,
                            },
                          ]
                        : []),
                    ].map((item) => (
                      <li key={item.key}>
                        <button
                          onClick={() => {
                            dashboardLog.click(`Sidebar menu clicked: ${item.key}`, { item });

                            // If item has a route (external page), navigate to it
                            if ('route' in item && item.route) {
                              dashboardLog.nav(`Navigating to external route: ${item.route}`);
                              navigate(item.route);
                            } else {
                              // ✅ FIX: Use setSearchParams to update tab - more reliable than navigate
                              dashboardLog.tab(`Switching to tab: ${item.key}`, { from: activeTab, to: item.key });
                              if (item.key === 'profile') {
                                // For profile tab, remove the tab param entirely
                                setSearchParams({});
                              } else {
                                setSearchParams({ tab: item.key });
                              }
                              // Also update activeTab immediately for instant UI feedback
                              setActiveTab(item.key as TabType);
                            }
                          }}
                          className={`group relative w-full flex items-center px-4 py-2 text-sm font-medium ${UI.radiusSm} transition-all
                            ${activeTab === (item.key as TabType)
                              ? "bg-gradient-to-r from-red-50 to-orange-50 text-red-700 dark:from-white/5 dark:to-white/10 dark:text-white"
                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                            }
                          `}
                          title={(item as Record<string, unknown>)[language] as string || item.en}
                        >
                          {/* Barre active à gauche (UI only) */}
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${activeTab === item.key
                              ? "bg-gradient-to-b from-red-500 to-orange-500 dark:from-red-500 dark:to-orange-500"
                              : "bg-transparent"
                              } ${UI.radiusSm}`}
                          />
                          {item.icon}

                          {(item as Record<string, unknown>)[language] as string || item.en}

                          {/* NEW badge for AI items */}
                          {'badge' in item && item.badge && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold animate-pulse">
                              {item.badge}
                            </span>
                          )}
                          {/* Active indicator */}
                          {activeTab === (item.key as TabType) && !('badge' in item) && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-white/10 dark:text-white">
                              {intl.formatMessage({ id: "dashboard.active" })}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}

                    {user.role === "admin" && (
                      <li>
                        <button
                          onClick={() => {
                            dashboardLog.nav('Navigating to Admin Dashboard');
                            navigate("/admin/dashboard");
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <Shield className="mr-3 h-5 w-5" />

                          {intl.formatMessage({
                            id: "dashboard.administration",
                          })}
                        </button>
                      </li>
                    )}

                    <li>
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                          loggingOut
                            ? "text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        {loggingOut ? (
                          <>
                            <div className="mr-3 h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            {intl.formatMessage({ id: "dashboard.loggingOut", defaultMessage: "Déconnexion..." })}
                          </>
                        ) : (
                          <>
                            <LogOut className="mr-3 h-5 w-5" />
                            {intl.formatMessage({ id: "dashboard.logout" })}
                          </>
                        )}
                      </button>
                    </li>
                  </ul>
                </nav>

                {/* AI Quota Widget - Only for lawyers and expats */}
                {user && (user.role === "lawyer" || user.role === "expat") && (
                  <div className="p-4 border-t border-gray-200 dark:border-white/10">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {intl.formatMessage({ id: "dashboard.aiQuota" })}
                          </span>
                        </div>
                        {aiIsInTrial && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
                            {intl.formatMessage({ id: "subscription.plans.trial" })}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all duration-300 ${
                            aiLimit === -1
                              ? "bg-gradient-to-r from-green-500 to-emerald-500 w-1/4"
                              : aiRemaining === 0
                                ? "bg-gradient-to-r from-red-500 to-orange-500"
                                : aiRemaining <= (aiLimit * 0.2)
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                  : "bg-gradient-to-r from-indigo-500 to-purple-500"
                          }`}
                          style={{
                            width: aiLimit === -1 ? "100%" : `${Math.min(100, (aiCurrentUsage / aiLimit) * 100)}%`
                          }}
                        />
                      </div>

                      {/* Usage text */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">
                          {aiLimit === -1 ? (
                            <>{intl.formatMessage({ id: "subscription.quota.unlimited" })}</>
                          ) : (
                            <>
                              {aiCurrentUsage}/{aiLimit} {intl.formatMessage({ id: "dashboard.calls" })}
                            </>
                          )}
                        </span>
                        {aiIsInTrial && aiTrialDaysRemaining !== undefined && (
                          <span className={`font-medium ${aiTrialDaysRemaining <= 7 ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
                            {aiTrialDaysRemaining}j {intl.formatMessage({ id: "dashboard.daysLeft" })}
                          </span>
                        )}
                      </div>

                      {/* Upgrade button if needed */}
                      {!canMakeAiCall && (
                        <button
                          onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                          className="w-full mt-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                        >
                          {intl.formatMessage({ id: "dashboard.choosePlan" })}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {intl.formatMessage({ id: "dashboard.availabilityStatus" })}
                  </h3>
                  {user && (user.role === "lawyer" || user.role === "expat") ? (
                    <AvailabilityToggle className="justify-center" />
                  ) : (
                    <p className={`${UI.textMuted} text-center`}>
                      {intl.formatMessage({
                        id: "dashboard.statusOnlyProviders",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CONTENU PRINCIPAL - ID for auto-scroll */}
            <div id="dashboard-content" className="lg:col-span-3 space-y-6 lg:space-y-8 dashboard-content-wrapper">
              {/* AFFILIATE LINK - Always visible */}
              <DashboardAffiliateCard />

              {/* m5 FIX: Promo price banner for providers */}
              {activeTab === "profile" && (user.role === "lawyer" || user.role === "expat") && (
                <ActivePromoBanner providerRole={user.role as "lawyer" | "expat"} />
              )}

              {/* PROFIL — Vue et Édition unifiées */}
              {activeTab === "profile" && (
                <div className={`${softCard} overflow-hidden tab-content-animate`}>
                  <div
                    className={`px-6 py-4 ${headerGradient} flex justify-between items-center`}
                  >
                    <h2 className="text-xl font-semibold">
                      {intl.formatMessage({ id: "dashboard.myProfile" })}
                      {isEditMode && (
                        <span className="ml-2 text-sm font-normal opacity-80">
                          ({intl.formatMessage({ id: "dashboard.editMode" })})
                        </span>
                      )}
                    </h2>
                    {!isEditMode ? (
                      <Button
                        onClick={() => setIsEditMode(true)}
                        variant="outline"
                        size="small"
                        className="bg-white text-gray-800 hover:bg-gray-50"
                      >
                        <Edit size={16} className="mr-2" />
                        {intl.formatMessage({ id: "dashboard.edit" })}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setIsEditMode(false)}
                        variant="outline"
                        size="small"
                        className="bg-white/20 text-white hover:bg-white/30 border-white/30"
                      >
                        <Eye size={16} className="mr-2" />
                        {intl.formatMessage({ id: "dashboard.viewMode" })}
                      </Button>
                    )}
                  </div>

                  <div className="p-6">
                    {/* MODE VUE - Affichage en lecture seule */}
                    {!isEditMode ? (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className={`${UI.sectionTitle} mb-4`}>
                          {intl.formatMessage({ id: "dashboard.personalInfo" })}
                        </h3>
                        <div className="space-y-4">
                          <InfoRow
                            label={intl.formatMessage({
                              id: "dashboard.fullName",
                            })}
                            value={user.role !== "client" ? getUserFullName() : getUserFirstName()}
                          />
                          <InfoRow label="Email" value={user.email} />
                          {(user as { phone?: string }).phone && (
                            <InfoRow
                              label={intl.formatMessage({
                                id: "dashboard.phone",
                              })}
                              value={`${(user as { phone?: string }).phone}`}
                            />
                          )}
                          {user.role !== "client" && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {intl.formatMessage({ id: "dashboard.status" })}
                              </p>
                              <div className="mt-1 flex items-center">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatus
                                    ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
                                    }`}
                                >
                                  <span
                                    className={`w-2 h-2 mr-2 rounded-full ${currentStatus
                                      ? "bg-green-600"
                                      : "bg-red-600"
                                      }`}
                                  />

                                  {currentStatus
                                    ? intl.formatMessage({
                                      id: "dashboard.online",
                                    })
                                    : intl.formatMessage({
                                      id: "dashboard.offline",
                                    })}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className={`${UI.sectionTitle} mb-4`}>
                          {intl.formatMessage({ id: "dashboard.photoBio" })}
                        </h3>
                        <div className="flex items-start gap-6">
                          {user.profilePhoto ? (
                            <img
                              src={`${user.profilePhoto}?v=${(user.updatedAt as Date | undefined)?.valueOf?.() || Date.now()}`}
                              alt={getUserFirstName()}
                              className="w-32 h-32 rounded-full object-cover border border-white/30 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-32 h-32 bg-red-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                              <User className="h-16 w-16 text-red-600 dark:text-white/70" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className={`${UI.text} whitespace-pre-wrap`}>
                              {(user as { bio?: string }).bio ||
                                intl.formatMessage({
                                  id: "dashboard.noDescription",
                                })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {user.role !== "client" && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                        <h3 className={`${UI.sectionTitle} mb-4`}>
                          {intl.formatMessage({
                            id: "dashboard.professionalInfo",
                          })}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {user.role === "lawyer" && (
                            <>
                              <InfoRow
                                label={intl.formatMessage({
                                  id: "dashboard.yearsExperience",
                                })}
                                value={`${(user as { yearsOfExperience?: number }).yearsOfExperience ?? 0} ${intl.formatMessage(
                                  { id: "dashboard.years" }
                                )}`}
                              />
                              <PillsRow
                                label={intl.formatMessage({
                                  id: "dashboard.specialties",
                                })}
                                items={
                                  (user as { specialties?: string[] })
                                    .specialties || []
                                }
                                color="blue"
                                mapItem={(code) => getSpecialtyLabel(code, mapLanguageToLocale(language))}
                              />
                              <PillsRow
                                label={intl.formatMessage({
                                  id: "dashboard.countriesOfPractice",
                                })}
                                items={
                                  (user as { practiceCountries?: string[] })
                                    .practiceCountries || []
                                }
                                color="blue"
                              />
                              <InfoRow
                                label={intl.formatMessage({
                                  id: "dashboard.graduationYear",
                                })}
                                value={`${(user as { graduationYear?: number }).graduationYear || ""}`}
                              />
                            </>
                          )}
                          {user.role === "expat" && (
                            <>
                              <InfoRow
                                label={intl.formatMessage({
                                  id: "dashboard.countryOfResidence",
                                })}
                                value={
                                  (user as { residenceCountry?: string })
                                    .residenceCountry || ""
                                }
                              />
                              <InfoRow
                                label={intl.formatMessage({
                                  id: "dashboard.yearsAsExpat",
                                })}
                                value={`${(user as { yearsAsExpat?: number }).yearsAsExpat ?? 0} ${intl.formatMessage(
                                  { id: "dashboard.years" }
                                )}`}
                              />
                              <PillsRow
                                label={intl.formatMessage({
                                  id: "dashboard.helpTypes",
                                })}
                                items={
                                  (user as { helpTypes?: string[] })
                                    .helpTypes || []
                                }
                                color="green"
                                mapItem={(code) => getSpecialtyLabel(code, mapLanguageToLocale(language))}
                              />
                              <PillsRow
                                label={intl.formatMessage({
                                  id: "dashboard.countriesOfIntervention",
                                })}
                                items={
                                  (user as { interventionCountries?: string[] })
                                    .interventionCountries || []
                                }
                                color="green"
                              />
                            </>
                          )}
                          <PillsRow
                            label={
                              language === "fr"
                                ? "Langues parlées"
                                : "Languages spoken"
                            }
                            items={
                              (user as { languages?: string[] }).languages || []
                            }
                            color="red"
                          />
                        </div>
                      </div>
                    )}
                    </>
                    ) : (
                    /* MODE ÉDITION - Formulaire de modification */
                    <div className="space-y-6">
                    {successMessage && (
                      <Alert type="success" message={successMessage} />
                    )}
                    {errorMessage && (
                      <Alert type="error" message={errorMessage} />
                    )}

                    {/* Préférences de Notifications (pour lawyers/expats) */}
                    {(user?.role === "lawyer" || user?.role === "expat") && (
                      <section className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <h3 className={`${UI.sectionTitle} mb-4 flex items-center gap-2`}>
                          <Bell className="w-5 h-5 text-indigo-600" />
                          {intl.formatMessage({
                            id: "dashboard.notificationPreferences",
                          })}
                        </h3>
                        <NotificationSettings />
                      </section>
                    )}

                    {/* Photo de profil : mise à jour immédiate */}
                    <section>
                      <h3 className={`${UI.sectionTitle} mb-2`}>
                        {intl.formatMessage({ id: "dashboard.profilePhoto" })}
                      </h3>
                      <div className="flex items-center gap-6">
                        {profileData.profilePhoto ? (
                          <img
                            src={`${profileData.profilePhoto}?v=${photoVersion}`}
                            alt="preview"
                            className="w-24 h-24 rounded-full object-cover border border-white/30 dark:border-white/10"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-red-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                            <User className="h-10 w-10 text-red-600 dark:text-white/70" />
                          </div>
                        )}
                        <ImageUploader
                          currentImage={profileData.profilePhoto}
                          uploadPath={`profilePhotos/${user.id}`}
                          locale={language}
                          onImageUploaded={handleInstantPhotoPersist}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {intl.formatMessage({
                          id: "dashboard.photoUpdateNote",
                        })}
                      </p>
                    </section>

                    {/* Commun à tous les rôles */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field
                        label="Email"
                        value={profileData.email}
                        onChange={(v) =>
                          setProfileData((p) => ({ ...p, email: v }))
                        }
                        type="email"
                      />
                      <div>
                        <div className="flex gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {intl.formatMessage({ id: "dashboard.phone" })}
                            </label>
                            <Controller
                              control={phoneControl}
                              name="phone"
                              rules={{
                                validate: (v) => {
                                  if (!v) return true;
                                  try {
                                    const p = parsePhoneNumberFromString(v);
                                    return p && p.isValid()
                                      ? true
                                      : intl.formatMessage({ id: "dashboard.invalidPhone" });
                                  } catch {
                                    return intl.formatMessage({ id: "dashboard.invalidPhone" });
                                  }
                                },
                              }}
                              render={({ field, fieldState: { error } }) => (
                                <>
                                  <IntlPhoneInput
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    defaultCountry="fr"
                                    placeholder="+33 6 12 34 56 78"
                                    name="dashboardPhone"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition dark:bg-gray-900 dark:border-white"
                                  />
                                  {error && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error.message}</p>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <Field
                        label={intl.formatMessage({ id: "dashboard.countryOfResidence" })}
                        value={profileData.residenceCountry || profileData.currentCountry}
                        onChange={(v) =>
                          setProfileData((p) => ({
                            ...p,
                            residenceCountry: v,
                            currentCountry: p.currentCountry || v,
                          }))
                        }
                      />

                      <Field
                        label={intl.formatMessage({ id: "dashboard.currentPresenceCountry" })}
                        value={profileData.currentPresenceCountry || ""}
                        onChange={(v) =>
                          setProfileData((p) => ({ ...p, currentPresenceCountry: v }))
                        }
                      />

                      {/* WhatsApp */}
                      <div>
                        <div className="flex gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              WhatsApp
                            </label>
                            <Controller
                              control={phoneControl}
                              name="whatsappNumber"
                              rules={{
                                validate: (v) => {
                                  if (!v) return true;
                                  try {
                                    const p = parsePhoneNumberFromString(v);
                                    return p && p.isValid()
                                      ? true
                                      : intl.formatMessage({ id: "dashboard.invalidWhatsApp" });
                                  } catch {
                                    return intl.formatMessage({ id: "dashboard.invalidWhatsApp" });
                                  }
                                },
                              }}
                              render={({ field, fieldState: { error } }) => (
                                <>
                                  <IntlPhoneInput
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    defaultCountry="fr"
                                    placeholder="+33 6 12 34 56 78"
                                    name="dashboardWhatsapp"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition dark:bg-gray-900 dark:border-white"
                                  />
                                  {error && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error.message}</p>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Langues */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {intl.formatMessage({ id: "dashboard.languagesSpoken" })}
                        </label>
                        <MultiLanguageSelect
                          value={selectedLanguages}
                          onChange={(opts) => {
                            const normalized = (opts || []).map((o) => ({
                              value: o.value,
                              label: o.label,
                            }));
                            setSelectedLanguages(normalized);
                            setProfileData((p) => ({
                              ...p,
                              languages: normalized.map((o) => o.value),
                            }));
                          }}
                          providerLanguages={[]}
                          highlightShared
                          locale={language}
                          placeholder={intl.formatMessage({ id: "dashboard.searchLanguages" })}
                          className="w-full"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {intl.formatMessage({ id: "dashboard.descriptionBio" })}
                        </label>
                        <textarea
                          value={profileData.bio || ""}
                          onChange={(e) =>
                            setProfileData((p) => ({ ...p, bio: e.target.value }))
                          }
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder={intl.formatMessage({ id: "dashboard.bioPlaceholder" })}
                        />
                      </div>
                    </section>

                    {/* Rôle : Lawyer */}
                    {user.role === "lawyer" && (
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field
                          label={intl.formatMessage({ id: "dashboard.yearsExperience" })}
                          type="number"
                          value={String(profileData.yearsOfExperience ?? 0)}
                          onChange={(v) =>
                            setProfileData((p) => ({ ...p, yearsOfExperience: Number(v || 0) }))
                          }
                        />
                        <Field
                          label={intl.formatMessage({ id: "dashboard.graduationYear" })}
                          type="number"
                          value={String(profileData.graduationYear || new Date().getFullYear() - 5)}
                          onChange={(v) =>
                            setProfileData((p) => ({ ...p, graduationYear: Number(v || new Date().getFullYear() - 5) }))
                          }
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({ id: "dashboard.specialties" })}
                          </label>
                          <ChipInput
                            value={profileData.specialties || []}
                            onChange={(next) =>
                              setProfileData((p) => ({ ...p, specialties: next }))
                            }
                            placeholder={intl.formatMessage({ id: "dashboard.addSpecialty" })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({ id: "dashboard.countriesOfPractice" })}
                          </label>
                          <ChipInput
                            value={profileData.practiceCountries || []}
                            onChange={(next) =>
                              setProfileData((p) => ({ ...p, practiceCountries: next }))
                            }
                            placeholder={intl.formatMessage({ id: "dashboard.addCountry" })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({ id: "dashboard.educations" })}
                          </label>
                          <ChipInput
                            value={profileData.educations || []}
                            onChange={(next) =>
                              setProfileData((p) => ({ ...p, educations: next }))
                            }
                            placeholder={intl.formatMessage({ id: "dashboard.addEducation" })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                      </section>
                    )}

                    {/* Rôle : Expat */}
                    {user.role === "expat" && (
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field
                          label={intl.formatMessage({ id: "dashboard.yearsAsExpat" })}
                          type="number"
                          value={String(profileData.yearsAsExpat ?? 0)}
                          onChange={(v) =>
                            setProfileData((p) => ({ ...p, yearsAsExpat: Number(v || 0) }))
                          }
                        />
                        <div />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({ id: "dashboard.helpTypes" })}
                          </label>
                          <ChipInput
                            value={profileData.helpTypes || []}
                            onChange={(next) =>
                              setProfileData((p) => ({ ...p, helpTypes: next }))
                            }
                            placeholder={intl.formatMessage({ id: "dashboard.addHelpType" })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({ id: "dashboard.countriesOfIntervention" })}
                          </label>
                          <ChipInput
                            value={profileData.interventionCountries || []}
                            onChange={(next) =>
                              setProfileData((p) => ({ ...p, interventionCountries: next }))
                            }
                            placeholder={intl.formatMessage({ id: "dashboard.addCountry" })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                      </section>
                    )}

                    {/* Boutons Sauvegarder / Annuler */}
                    <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex gap-3">
                      <Button
                        onClick={saveSettings}
                        loading={isLoading}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        {intl.formatMessage({ id: "dashboard.saveSettings" })}
                      </Button>
                      <Button
                        onClick={() => setIsEditMode(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        {intl.formatMessage({ id: "common.cancel" })}
                      </Button>
                    </div>
                    </div>
                    )}
                  </div>
                </div>
              )}

              {/* PARAMÈTRES — (maintenant intégré dans profile, garder pour compatibilité) */}
              {activeTab === "settings" && (
                <div className={`${softCard} overflow-hidden tab-content-animate`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {intl.formatMessage({ id: "dashboard.settings" })}
                    </h2>
                  </div>

                  <div className="p-6 space-y-6">
                    {successMessage && (
                      <Alert type="success" message={successMessage} />
                    )}
                    {errorMessage && (
                      <Alert type="error" message={errorMessage} />
                    )}

                    {/* Photo de profil : mise à jour immédiate */}
                    <section>
                      <h3 className={`${UI.sectionTitle} mb-2`}>
                        {/* {language === "fr"
                          ? "Photo de profil"
                          : "Profile photo"} */}
                        {intl.formatMessage({ id: "dashboard.profilePhoto" })}
                      </h3>
                      <div className="flex items-center gap-6">
                        {profileData.profilePhoto ? (
                          <img
                            src={`${profileData.profilePhoto}?v=${photoVersion}`}
                            alt="preview"
                            className="w-24 h-24 rounded-full object-cover border border-white/30 dark:border-white/10"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-red-100 dark:bg-white/10 rounded-full flex items-center justify-center">
                            <User className="h-10 w-10 text-red-600 dark:text-white/70" />
                          </div>
                        )}
                        <ImageUploader
                          currentImage={profileData.profilePhoto}
                          uploadPath={`profilePhotos/${user.id}`}
                          locale={language}
                          onImageUploaded={handleInstantPhotoPersist}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {/* {language === "fr"
                          ? "La nouvelle photo remplace immédiatement l’ancienne dans tout le dashboard."
                          : "The new photo replaces the old one immediately across the dashboard."} */}
                        {intl.formatMessage({
                          id: "dashboard.photoUpdateNote",
                        })}
                      </p>
                    </section>

                    {/* Commun à tous les rôles */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field
                        label="Email"
                        value={profileData.email}
                        onChange={(v) =>
                          setProfileData((p) => ({ ...p, email: v }))
                        }
                        type="email"
                      />
                      <div>
                        {/* <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {intl.formatMessage({ id: "dashboard.phone" })}
                        </label> */}
                        <div className="flex gap-2">
                          {/* <select
                            value={profileData.phoneCountryCode}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                phoneCountryCode: e.target.value,
                              }))
                            }
                            className="w-28 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="+33">🇫🇷 +33</option>
                            <option value="+1">🇺🇸 +1</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+49">🇩🇪 +49</option>
                            <option value="+34">🇪🇸 +34</option>
                            <option value="+39">🇮🇹 +39</option>
                          </select> */}
                          {/* <input
                            value={profileData.phone}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                phone: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="612345678"
                          /> */}
                          {/* Phone Number with country selector */}
                          <div>
                            <label className="block text-sm font-medium text-white dark:text-gray-300 mb-1">
                              {intl.formatMessage({ id: "dashboard.phone" })}
                            </label>

                            <Controller
                              control={phoneControl}
                              name="phone"
                              rules={{
                                validate: (v) => {
                                  if (!v) return true; // Optional field
                                  try {
                                    const p = parsePhoneNumberFromString(v);
                                    return p && p.isValid()
                                      ? true
                                      : intl.formatMessage({
                                        id: "dashboard.invalidPhone",
                                      });
                                  } catch {
                                    return intl.formatMessage({
                                      id: "dashboard.invalidPhone",
                                    });
                                  }
                                },
                              }}
                              render={({ field, fieldState: { error } }) => (
                                <>
                                  <IntlPhoneInput
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    defaultCountry="fr"
                                    placeholder="+33 6 12 34 56 78"
                                    name="dashboardPhone"
                                    // className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition dark:bg-gray-900 dark:border-white dark:text-white"
                                  />

                                  {error && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                      {error.message}
                                    </p>
                                  )}

                                  {field.value && !error && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      {intl.formatMessage({
                                        id: "dashboard.phoneFormat",
                                      })}
                                      :{" "}
                                      <span className="font-mono">
                                        {field.value}
                                      </span>
                                    </p>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <Field
                        label={intl.formatMessage({
                          id: "dashboard.countryOfResidence",
                        })}
                        value={
                          profileData.residenceCountry ||
                          profileData.currentCountry
                        }
                        onChange={(v) =>
                          setProfileData((p) => ({
                            ...p,
                            residenceCountry: v,
                            currentCountry: p.currentCountry || v,
                          }))
                        }
                      />

                      <Field
                        label={intl.formatMessage({
                          id: "dashboard.currentPresenceCountry",
                        })}
                        value={profileData.currentPresenceCountry || ""}
                        onChange={(v) =>
                          setProfileData((p) => ({
                            ...p,
                            currentPresenceCountry: v,
                          }))
                        }
                      />

                      {/* WhatsApp */}
                      <div>
                        {/* <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          WhatsApp
                        </label> */}
                        <div className="flex gap-2">
                          {/* <select
                            value={profileData.whatsappCountryCode || "+33"}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                whatsappCountryCode: e.target.value,
                              }))
                            }
                            className="w-28 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="+33">🇫🇷 +33</option>
                            <option value="+1">🇺🇸 +1</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+49">🇩🇪 +49</option>
                            <option value="+34">🇪🇸 +34</option>
                            <option value="+39">🇮🇹 +39</option>
                          </select> */}
                          {/* <input
                            value={profileData.whatsappNumber || ""}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                whatsappNumber: e.target.value,
                              }))
                            }
                            className="flex-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="612345678"
                          /> */}

                          {/* WhatsApp Number with country selector */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              WhatsApp
                            </label>

                            <Controller
                              control={phoneControl}
                              name="whatsappNumber"
                              rules={{
                                validate: (v) => {
                                  if (!v) return true; // Optional field
                                  try {
                                    const p = parsePhoneNumberFromString(v);
                                    return p && p.isValid()
                                      ? true
                                      : intl.formatMessage({
                                        id: "dashboard.invalidWhatsApp",
                                      });
                                  } catch {
                                    return intl.formatMessage({
                                      id: "dashboard.invalidWhatsApp",
                                    });
                                  }
                                },
                              }}
                              render={({ field, fieldState: { error } }) => (
                                <>
                                  <IntlPhoneInput
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    defaultCountry="fr"
                                    placeholder="+33 6 12 34 56 78"
                                    name="dashboardWhatsapp"
                                    // className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition dark:bg-gray-900 dark:border-white dark:text-white"
                                  />

                                  {error && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                      {error.message}
                                    </p>
                                  )}

                                  {field.value && !error && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-white">
                                      WhatsApp:{" "}
                                      <span className="font-mono">
                                        {field.value}
                                      </span>
                                    </p>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Langues — même sélecteur que l’inscription */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {intl.formatMessage({
                            id: "dashboard.languagesSpoken",
                          })}
                        </label>
                        <MultiLanguageSelect
                          value={selectedLanguages}
                          onChange={(opts) => {
                            const normalized = (opts || []).map((o) => ({
                              value: o.value,
                              label: o.label,
                            }));
                            setSelectedLanguages(normalized);
                            setProfileData((p) => ({
                              ...p,
                              languages: normalized.map((o) => o.value),
                            }));
                          }}
                          providerLanguages={[]}
                          highlightShared
                          locale={language}
                          placeholder={intl.formatMessage({
                            id: "dashboard.searchLanguages",
                          })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition dark:bg-gray-900 dark:border-white dark:text-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {intl.formatMessage({
                            id: "dashboard.descriptionBio",
                          })}
                        </label>
                        <textarea
                          value={profileData.bio || ""}
                          onChange={(e) =>
                            setProfileData((p) => ({
                              ...p,
                              bio: e.target.value,
                            }))
                          }
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-black text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder={intl.formatMessage({
                            id: "dashboard.bioPlaceholder",
                          })}
                        />
                      </div>
                    </section>

                    {/* Rôle : Lawyer */}
                    {user.role === "lawyer" && (
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field
                          label={intl.formatMessage({
                            id: "dashboard.yearsExperience",
                          })}
                          type="number"
                          value={String(profileData.yearsOfExperience ?? 0)}
                          onChange={(v) =>
                            setProfileData((p) => ({
                              ...p,
                              yearsOfExperience: Number(v || 0),
                            }))
                          }
                        />
                        <Field
                          label={intl.formatMessage({
                            id: "dashboard.graduationYear",
                          })}
                          type="number"
                          value={String(
                            profileData.graduationYear ||
                            new Date().getFullYear() - 5
                          )}
                          onChange={(v) =>
                            setProfileData((p) => ({
                              ...p,
                              graduationYear: Number(
                                v || new Date().getFullYear() - 5
                              ),
                            }))
                          }
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {/* {language === "fr" ? "Spécialités" : "Specialties"} */}
                            {intl.formatMessage({
                              id: "dashboard.specialties",
                            })}
                          </label>
                          <ChipInput
                            value={profileData.specialties || []}
                            onChange={(next) =>
                              setProfileData((p) => ({
                                ...p,
                                specialties: next,
                              }))
                            }
                            placeholder={intl.formatMessage({
                              id: "dashboard.addSpecialty",
                            })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({
                              id: "dashboard.countriesOfPractice",
                            })}
                          </label>
                          <ChipInput
                            value={profileData.practiceCountries || []}
                            onChange={(next) =>
                              setProfileData((p) => ({
                                ...p,
                                practiceCountries: next,
                              }))
                            }
                            placeholder={intl.formatMessage({
                              id: "dashboard.addCountry",
                            })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                        <Field
                          label={intl.formatMessage({
                            id: "dashboard.barNumber",
                          })}
                          value={profileData.barNumber || ""}
                          onChange={(v) =>
                            setProfileData((p) => ({ ...p, barNumber: v }))
                          }
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({ id: "dashboard.educations" })}
                          </label>
                          <ChipInput
                            value={profileData.educations || []}
                            onChange={(next) =>
                              setProfileData((p) => ({
                                ...p,
                                educations: next,
                              }))
                            }
                            placeholder={intl.formatMessage({
                              id: "dashboard.addEducation",
                            })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                      </section>
                    )}

                    {/* Rôle : Expat */}
                    {user.role === "expat" && (
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field
                          label={intl.formatMessage({
                            id: "dashboard.yearsAsExpat",
                          })}
                          type="number"
                          value={String(profileData.yearsAsExpat ?? 0)}
                          onChange={(v) =>
                            setProfileData((p) => ({
                              ...p,
                              yearsAsExpat: Number(v || 0),
                            }))
                          }
                        />
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({ id: "dashboard.helpTypes" })}
                          </label>
                          <ChipInput
                            value={profileData.helpTypes || []}
                            onChange={(next) =>
                              setProfileData((p) => ({ ...p, helpTypes: next }))
                            }
                            placeholder={intl.formatMessage({
                              id: "dashboard.addType",
                            })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {intl.formatMessage({
                              id: "dashboard.countriesOfIntervention",
                            })}
                          </label>
                          <ChipInput
                            value={profileData.interventionCountries || []}
                            onChange={(next) =>
                              setProfileData((p) => ({
                                ...p,
                                interventionCountries: next,
                              }))
                            }
                            placeholder={intl.formatMessage({
                              id: "dashboard.addCountry",
                            })}
                            buttonLabel={intl.formatMessage({ id: "dashboard.add" }) || "Add"}
                          />
                        </div>
                      </section>
                    )}

                    {/* Sauvegarde */}
                    <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                      <Button
                        onClick={saveSettings}
                        loading={isLoading}
                        fullWidth
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {intl.formatMessage({ id: "dashboard.saveSettings" })}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* APPELS */}
              {activeTab === "calls" && (
                <div className={`${softCard} overflow-hidden tab-content-animate`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {/* {language === "fr" ? "Mes appels" : "My calls"} */}
                      {intl.formatMessage({ id: "dashboard.myCalls" })}
                    </h2>
                  </div>
                  <div className="p-6">
                    {calls.length > 0 ? (
                      <div className="space-y-4">
                        {calls.map((call) => (
                          <div
                            key={call.id}
                            className="border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:bg-gray-50/60 dark:hover:bg-white/[0.04] transition"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                  {call.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {call.description}
                                </p>
                                <div className="mt-2 flex items-center space-x-4 text-sm">
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 text-gray-400 mr-1" />
                                    <span className={UI.text}>
                                      {formatDuration(call.duration)}
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <CreditCard className="w-4 h-4 text-gray-400 mr-1" />
                                    <span className={UI.text}>
                                      {formatPrice(call.price)}
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                                    <span className={UI.text}>
                                      {formatDate(call.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <p className={`${UI.text} text-sm`}>
                                    {/* {user.role === "client"
                                      ? `${language === "fr" ? "Prestataire" : "Provider"}: ${call.providerName}`
                                      : `${language === "fr" ? "Client" : "Client"}: ${call.clientName}`} */}
                                    {user.role === "client"
                                      ? `${intl.formatMessage({ id: "dashboard.provider" })}: ${call.providerName}`
                                      : `${intl.formatMessage({ id: "dashboard.client" })}: ${call.clientName}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-2">
                                {getStatusBadge(call.status)}
                                {/* P0 FIX: Only show review button if call actually happened (duration >= 5 min) */}
                                {call.status === "completed" &&
                                  user.role === "client" &&
                                  !call.hasReview &&
                                  call.duration >= 300 && (
                                    <Button
                                      size="small"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedCallForReview(call);
                                        setShowReviewModal(true);
                                      }}
                                    >
                                      <Star className="w-4 h-4 mr-1" />
                                      {intl.formatMessage({
                                        id: "dashboard.leaveReview",
                                      })}
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`${UI.textMuted} text-center py-8`}>
                        {intl.formatMessage({ id: "dashboard.noCalls" })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* MESSAGES */}
              {activeTab === "messages" && (
                <div className={`${softCard} overflow-hidden tab-content-animate`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {intl.formatMessage({ id: "dashboard.myMessages" })}
                    </h2>
                  </div>
                  <div className="p-6">
                    <DashboardMessages />
                  </div>
                </div>
              )}

              {/* FACTURES */}
              {activeTab === "invoices" && <UserInvoices />}

              {/* AVIS */}
              {activeTab === "reviews" && (
                <div className={`${softCard} overflow-hidden tab-content-animate`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {intl.formatMessage({ id: "dashboard.myReviews" })}
                      </h2>
                  </div>
                    <div className="p-6">
                      {
                        reviews.length > 0 ? ( <div className="space-y-4">
                        {reviews.map((review) => (
                          <div
                            key={review.id}
                            className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                          >
                            <div className="p-4 md:p-5 flex flex-col gap-3">
                              {/* Header row: name + status + action */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white">
                                    <UserIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {review.clientName || "Anonymous user"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Review ID: {review.id}…
                                    </p>
                                  </div>
                                </div>
                  
                                <div className="flex items-center gap-2">
                                  {/* {getStatusBadge(review.status)} */}

                                        {review.status === "pending" && review.isPublic == false &&  (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 font-bold bg-green-500 px-2 py-1 rounded text-white hover:bg-green-600 transition-colors"
                                    onClick={() => handleShowReview(review.id)}
                                    aria-label="Show review on profile"
                                  >
                                    Show on profile
                                  </button>
                                )}


                                 {review.status === "published" && review.isPublic === true &&  (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 font-bold bg-red-500 px-2 py-1 rounded text-white hover:bg-red-600 transition-colors"
                                    onClick={() => handleHideReview(review.id)}
                                    aria-label="Hide review from profile"
                                  >
                                    Hide from profile
                                  </button>
                                )}
                                  {/* <button
                                    type="button"
                                    // onClick={() => onToggleVisibility(review)}
                                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors"
                                    title={
                                      review.status === "published"
                                        ? "Hide from profile"
                                        : "Show on profile"
                                    }
                                  >
                                    {review.status === "published" ? (
                                      <EyeOffIcon className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button> */}
                                </div>
                              </div>
                  
                              {/* Rating */}
                              <div>{renderStars(review.rating)}</div>
                  
                              {/* Comment */}
                              {review.comment && (
                                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
                                  {review.comment}
                                </p>
                              )}
                  
                              {/* Meta: dates */}
                              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                <div className="inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    Created: <span className="font-medium">{review.createdAt ? formatDate(review.createdAt) : '-'}</span>
                                  </span>
                                </div>
                               
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  : <p className={`${UI.textMuted} text-center py-8`}>
                          {intl.formatMessage({ id: "dashboard.noReviews" })}
                         
                        </p>
                      }
                    
                  </div>
                </div>
              )}

              {/* FAVORIS */}
              {activeTab === "favorites" && (
                <div className={`${softCard} overflow-hidden tab-content-animate`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {/* {language === "fr" ? "Mes favoris" : "My favorites"} */}
                      {intl.formatMessage({ id: "dashboard.myFavorites" })}
                    </h2>
                  </div>
                  <div className="p-6">
                    {favorites.length > 0 ? (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {favorites.map((f) => (
                          <li
                            key={f.id}
                            className="border border-gray-200 dark:border-white/10 rounded-lg p-4 flex items-center gap-3 hover:bg-gray-50/60 dark:hover:bg-white/[0.04] transition"
                          >
                            <img
                              src={
                                (f.photo || "/default-avatar.png") +
                                `?v=${Date.now()}`
                              }
                              alt={f.name}
                              className="w-12 h-12 rounded-full object-cover border border-white/30 dark:border-white/10"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {f.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {/* {f.type === "lawyer"
                                  ? language === "fr"
                                    ? "Avocat"
                                    : "Lawyer"
                                  : language === "fr"
                                    ? "Expatrié"
                                    : "Expat"} */}
                                {f.type === "lawyer"
                                  ? intl.formatMessage({
                                    id: "dashboard.lawyer",
                                  })
                                  : intl.formatMessage({
                                    id: "dashboard.expat",
                                  })}

                                {f.country ? ` • ${f.country}` : ""}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={`${UI.textMuted} text-center py-12`}>
                        {/* {language === "fr"
                          ? "Aucun favori pour le moment."
                          : "No favorites yet."} */}
                        {intl.formatMessage({ id: "dashboard.noFavorites" })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "translations" && (user.role === "lawyer" || user.role === "expat") && (
                <div className={`${softCard} overflow-hidden tab-content-animate`}>
                  <div className={`px-6 py-4 ${headerGradient}`}>
                    <h2 className="text-xl font-semibold">
                      {intl.formatMessage({ id: "dashboard.translations" }) || "Translations"}
                    </h2>
                  </div>
                  <div className="p-6 space-y-6">
                            {/* Language Dropdown */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {intl.formatMessage({ id: "dashboard.selectLanguage" }) || "Select Language"}
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={selectedTranslationLang || ""}
                                  onChange={(e) => handleLanguageChange(e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-red-500 transition"
                                >
                                  <option value="">{intl.formatMessage({ id: "dashboard.selectLanguage" }) || "Select a language"}</option>
                                  <option value="fr">Français</option>
                                  <option value="en">English</option>
                                  <option value="es">Español</option>
                                  <option value="pt">Português</option>
                                  <option value="de">Deutsch</option>
                                  <option value="ru">Русский</option>
                                  <option value="ch">中文</option>
                                  <option value="hi">हिन्दी</option>
                                  <option value="ar">العربية</option>
                                </select>
                                {selectedTranslationLang && (
                                  <Button
                                    type="button"
                                    onClick={handleFreezeUnfreeze}
                                    disabled={isFreezing}
                                    variant={isFrozen ? "outline" : "primary"}
                                    size="small"
                                    className="whitespace-nowrap"
                                  >
                                    {isFreezing ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                        {intl.formatMessage({ id: "dashboard.processing" }) || "Processing..."}
                                      </>
                                    ) : isFrozen ? (
                                      <>
                                        <Unlock className="h-4 w-4 mr-2" />
                                        {intl.formatMessage({ id: "dashboard.unfreeze" }) || "Unfreeze"}
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="h-4 w-4 mr-2" />
                                        {intl.formatMessage({ id: "dashboard.freeze" }) || "Freeze"}
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                              {isFrozen && selectedTranslationLang && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                  <Lock className="h-4 w-4" />
                                  <span>{intl.formatMessage({ id: "dashboard.translationFrozen" }) || "This translation is frozen and protected from automatic updates."}</span>
                                </div>
                              )}
                            </div>

                    {selectedTranslationLang && (
                      <>
                        {isLoadingTranslation ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading translation...</span>
                          </div>
                        ) : (
                          <>
                            {/* Description/Bio Field */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {intl.formatMessage({ id: "dashboard.description" }) || "Description / Bio"}
                              </label>
                              <textarea
                                value={translationDescription}
                                onChange={(e) => setTranslationDescription(e.target.value)}
                                placeholder={intl.formatMessage({ id: "dashboard.descriptionPlaceholder" }) || "Enter description or bio..."}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-red-500 transition resize-none"
                              />
                            </div>

                            {/* Specialties Field */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {intl.formatMessage({ id: "dashboard.specialties" }) || "Specialties"}
                              </label>
                              <ChipInput
                                value={translationSpecialties}
                                onChange={setTranslationSpecialties}
                                placeholder={intl.formatMessage({ id: "dashboard.specialtiesPlaceholder" }) || "Add specialty and press Enter"}
                                buttonLabel={intl.formatMessage({ id: "dashboard.addSpecialty" }) || "Add"}
                              />
                            </div>

                            {/* Motivation Field */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {intl.formatMessage({ id: "dashboard.motivation" }) || "Motivation"}
                              </label>
                              <textarea
                                value={translationMotivation}
                                onChange={(e) => setTranslationMotivation(e.target.value)}
                                placeholder={intl.formatMessage({ id: "dashboard.motivationPlaceholder" }) || "Enter your motivation..."}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-red-500 transition resize-none"
                              />
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end">
                              <Button
                                onClick={handleSaveTranslation}
                                disabled={isSavingTranslation}
                                className="min-w-[120px]"
                              >
                                {isSavingTranslation ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {intl.formatMessage({ id: "dashboard.saving" }) || "Saving..."}
                                  </>
                                ) : (
                                  intl.formatMessage({ id: "dashboard.save" }) || "Save"
                                )}
                              </Button>
                            </div>

                            {/* Success/Error Messages */}
                            {successMessage && (
                              <Alert type="success" message={successMessage} />
                            )}
                            {errorMessage && (
                              <Alert type="error" message={errorMessage} />
                            )}
                          </>
                        )}
                      </>
                    )}

                    {!selectedTranslationLang && (
                      <p className={`${UI.textMuted} text-center py-12`}>
                        {intl.formatMessage({ id: "dashboard.selectLanguageToEdit" }) || "Please select a language to edit translations"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* GDPR */}
              {activeTab === "gdpr" && (
                <DashboardGDPR />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Review Modal pour laisser un avis depuis l'onglet "calls" */}
      {selectedCallForReview && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedCallForReview(null);
          }}
          onSuccess={() => {
            // Mettre à jour hasReview pour cet appel après soumission réussie
            setCalls((prevCalls) =>
              prevCalls.map((c) =>
                c.id === selectedCallForReview.id ? { ...c, hasReview: true } : c
              )
            );
            setShowReviewModal(false);
            setSelectedCallForReview(null);
          }}
          providerId={selectedCallForReview.providerId}
          providerName={selectedCallForReview.providerName}
          callId={selectedCallForReview.id}
          serviceType={selectedCallForReview.serviceType === "lawyer_call" ? "lawyer_call" : "expat_call"}
        />
      )}
      {/* ✅ FIX: </ProviderOnlineManager> retiré */}
    </Layout>
  );
};

export default Dashboard;
