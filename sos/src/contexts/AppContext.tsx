import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { collection, getDocs, query, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { Service, AppSettings, Notification, EnhancedSettings } from "./types";
import { ensureCollectionsExist } from "../utils/firestore";
import { detectUserLanguage, saveLanguagePreference, hasLocalePrefix, parseLocaleFromPath } from "../multilingual-system";

// Updated Language type: fr, en, es, de, ru, pt, ch, hi, ar (9 languages)
type Language = "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

interface AppContextType {
  services: Service[];
  settings: AppSettings;
  enhancedSettings: EnhancedSettings;
  notifications: Notification[];
  language: Language;
  setLanguage: (lang: Language) => void;
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt">
  ) => void;
  markNotificationAsRead: (id: string) => void;
  getUnreadNotificationsCount: () => number;
  updateEnhancedSettings: (settings: Partial<EnhancedSettings>) => void;
  isCountryEnabled: (countryCode: string) => boolean;
  countriesLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [language, setLanguage] = useState<Language>("fr");
  const [supportedCountries, setSupportedCountries] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  // Load enabled countries from Firestore on app startup
  useEffect(() => {
    const loadEnabledCountries = async () => {
      try {
        setCountriesLoading(true);
        const countrySettingsQuery = query(collection(db, "country_settings"));
        const snapshot = await getDocs(countrySettingsQuery);

        // Si collection vide, initialiser avec les pays par defaut
        if (snapshot.empty) {
          console.log("[AppContext] Initializing default countries...");
          const defaultCountries = ["FR", "GB", "DE", "ES", "IT", "BE", "CH", "PT", "NL", "PL"];

          for (const code of defaultCountries) {
            await setDoc(doc(db, "country_settings", code.toLowerCase()), {
              code: code.toUpperCase(),
              isActive: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }

          setSupportedCountries(defaultCountries);
          console.log(`[AppContext] Initialized ${defaultCountries.length} default countries`);
        } else {
          const enabledCountries: string[] = [];
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.isActive === true) {
              // Use the code from the document (uppercase)
              enabledCountries.push(data.code?.toUpperCase() || docSnap.id.toUpperCase());
            }
          });

          setSupportedCountries(enabledCountries);
          console.log(`[AppContext] Loaded ${enabledCountries.length} enabled countries from Firestore`);
        }
      } catch (error) {
        console.error("[AppContext] Error loading country settings:", error);
        // Fallback to default countries if Firestore fails
        const fallbackCountries = ["FR", "GB", "DE", "ES", "IT", "PT", "NL", "PL"];
        setSupportedCountries(fallbackCountries);
        console.log("[AppContext] Using fallback countries due to error");
      } finally {
        setCountriesLoading(false);
      }
    };

    loadEnabledCountries();
  }, []);

  // Settings now uses dynamic supportedCountries from Firestore
  const settings: AppSettings = {
    servicesEnabled: {
      lawyerCalls: true,
      expatCalls: true,
    },
    pricing: {
      lawyerCall: 49,
      expatCall: 19,
    },
    platformCommission: 0.15,
    maxCallDuration: 30,
    callTimeout: 30,
    supportedCountries: supportedCountries,
    // Updated: 9 languages matching the new configuration
    supportedLanguages: ["fr", "en", "es", "de", "ru", "pt", "ch", "hi", "ar"],
  };

  // Helper function to check if a country is enabled
  const isCountryEnabled = (countryCode: string): boolean => {
    if (!countryCode) return false;
    return supportedCountries.includes(countryCode.toUpperCase());
  };

  const [enhancedSettings, setEnhancedSettings] = useState<EnhancedSettings>({
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    privacy: {
      profileVisibility: "public",
      allowContact: true,
      showOnMap: true,
    },
    language: {
      primary: "fr",
      secondary: "en",
      preferredCommunication: "fr",
    },
    rateLimit: {
      apiCallsPerMinute: 60,
      lastApiCall: new Date(),
      callCount: 0,
    },
    audit: {
      lastLogin: new Date(),
      lastProfileUpdate: new Date(),
      loginHistory: [],
    },
  });

  useEffect(() => {
    const defaultServices: Service[] = [
      {
        id: "lawyer_call",
        type: "lawyer_call",
        name: "Appel Avocat",
        price: 49,
        duration: 20,
        description:
          "Consultation juridique urgente par telephone avec avocat certifie",
        isActive: true,
      },
      {
        id: "expat_call",
        type: "expat_call",
        name: "Appel Expatrie",
        price: 19,
        duration: 30,
        description:
          "Conseil pratique d'un expatrie francophone qui connait le pays",
        isActive: true,
      },
    ];

    setServices(defaultServices);

    // Detect language with priority: URL locale > saved preference > location > browser > default
    // CRITICAL FIX: Check URL first to prevent race condition with LocaleRouter
    const initializeLanguage = async () => {
      // Check if URL already has a locale prefix - if so, let LocaleRouter handle it
      const pathname = window.location.pathname;
      if (hasLocalePrefix(pathname)) {
        const { lang } = parseLocaleFromPath(pathname);
        if (lang) {
          // Use URL language directly, don't override with saved preference
          setLanguage(lang);
          return;
        }
      }

      // No locale in URL, use detection system
      const detectedLang = await detectUserLanguage('fr');
      setLanguage(detectedLang);
    };

    initializeLanguage();
  }, []);

  // Save user's manual language choice
  // CRITICAL: Memoize to prevent useEffect re-runs in LocaleRouter
  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    saveLanguagePreference(lang); // Save user preference (takes priority over location)
  }, []);

  const addNotification = (
    notification: Omit<Notification, "id" | "createdAt">
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      isRead: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const getUnreadNotificationsCount = () => {
    return notifications.filter((n) => !n.isRead).length;
  };

  const updateEnhancedSettings = (partial: Partial<EnhancedSettings>) => {
    setEnhancedSettings((prev) => ({
      ...prev,
      ...partial,
      notifications: partial.notifications
        ? { ...prev.notifications, ...partial.notifications }
        : prev.notifications,
      privacy: partial.privacy
        ? { ...prev.privacy, ...partial.privacy }
        : prev.privacy,
      language: partial.language
        ? { ...prev.language, ...partial.language }
        : prev.language,
      rateLimit: partial.rateLimit
        ? { ...prev.rateLimit, ...partial.rateLimit }
        : prev.rateLimit,
      audit: partial.audit ? { ...prev.audit, ...partial.audit } : prev.audit,
    }));

    console.log("Settings updated:", {
      action: "settings_updated",
      timestamp: new Date(),
      details: { settings: JSON.stringify(partial) },
    });
  };

  return (
    <AppContext.Provider
      value={{
        services,
        settings,
        enhancedSettings,
        notifications,
        language,
        setLanguage: handleSetLanguage,
        addNotification,
        markNotificationAsRead,
        getUnreadNotificationsCount,
        updateEnhancedSettings,
        isCountryEnabled,
        countriesLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
