/**
 * DashboardLayout - Layout wrapper avec sidebar pour les pages du dashboard
 * Utilisé par les pages séparées (AI Assistant, Subscription) pour maintenir
 * une expérience utilisateur cohérente avec le sidebar
 *
 * Mobile-first: Bottom nav + drawer pour mobile, sidebar pour desktop
 */

import React, { ReactNode, useState, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '../../multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '../../multilingual-system/core/routing/localeRoutes';
import {
  User,
  Phone,
  FileText,
  Shield,
  LogOut,
  CreditCard,
  Mail,
  MessageSquare,
  Star,
  Bookmark,
  Bot,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useAiQuota } from '../../hooks/useAiQuota';
import Layout from './Layout';
import AvailabilityToggle from '../dashboard/AvailabilityToggle';
import MobileBottomNav from '../dashboard/MobileBottomNav';
import MobileSideDrawer from '../dashboard/MobileSideDrawer';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  radiusSm: "rounded-lg",
  radiusFull: "rounded-full",
  textMuted: "text-gray-500 dark:text-gray-400",
} as const;

const ROLE = {
  admin: {
    header: "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white",
  },
  lawyer: {
    header: "bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white",
  },
  expat: {
    header: "bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white",
  },
  client: {
    header: "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white",
  },
  defaultHeader: "bg-gradient-to-r from-red-500 via-orange-500 to-purple-600 text-white",
} as const;

const getHeaderClassForRole = (role?: string): string => {
  if (role === "admin") return ROLE.admin.header;
  if (role === "lawyer") return ROLE.lawyer.header;
  if (role === "expat") return ROLE.expat.header;
  if (role === "client") return ROLE.client.header;
  return ROLE.defaultHeader;
};

interface DashboardLayoutProps {
  children: ReactNode;
  activeKey?: string; // Clé active dans le sidebar (ex: "ai-assistant", "subscription")
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeKey }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { user, logout, authInitialized } = useAuth();
  const { language } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // AI Quota for sidebar display
  const {
    currentUsage: aiCurrentUsage,
    limit: aiLimit,
    remaining: aiRemaining,
    isInTrial: aiIsInTrial,
    trialDaysRemaining: aiTrialDaysRemaining,
    canMakeAiCall
  } = useAiQuota();

  // P0 FIX: Get translated routes based on current language (defined early for use in handleLogout)
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  // P0 FIX: Get login route early for handleLogout (needs to be outside the callback due to hook rules)
  const loginRoute = useMemo(() => {
    const loginSlug = getTranslatedRouteSlug('login' as RouteKey, langCode);
    return `/${loginSlug}`;
  }, [langCode]);

  const handleLogout = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logout();
      navigate(loginRoute);
    } catch (error) {
      console.error("Logout error:", error);
      navigate(loginRoute);
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate, loggingOut, loginRoute]);

  // Get translated routes using langCode defined above
  const translatedRoutes = useMemo(() => {
    const dashboardSlug = getTranslatedRouteSlug('dashboard' as RouteKey, langCode);
    const aiAssistantSlug = getTranslatedRouteSlug('dashboard-ai-assistant' as RouteKey, langCode);
    const subscriptionSlug = getTranslatedRouteSlug('dashboard-subscription' as RouteKey, langCode);
    const subscriptionPlansSlug = getTranslatedRouteSlug('dashboard-subscription-plans' as RouteKey, langCode);
    const loginSlug = getTranslatedRouteSlug('login' as RouteKey, langCode);

    return {
      dashboard: `/${dashboardSlug}`,
      dashboardCalls: `/${dashboardSlug}?tab=calls`,
      dashboardInvoices: `/${dashboardSlug}?tab=invoices`,
      dashboardReviews: `/${dashboardSlug}?tab=reviews`,
      dashboardMessages: `/${dashboardSlug}?tab=messages`,
      dashboardFavorites: `/${dashboardSlug}?tab=favorites`,
      aiAssistant: `/${aiAssistantSlug}`,
      subscription: `/${subscriptionSlug}`,
      subscriptionPlans: `/${subscriptionPlansSlug}`,
      login: `/${loginSlug}`,
    };
  }, [langCode]);

  // Early return after all hooks
  if (!user) {
    return null;
  }

  const headerGradient = getHeaderClassForRole(user.role);
  const softCard = UI.card;

  // Helper to get user's full name
  const getUserFullName = () => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    if ((user as any).fullName) return (user as any).fullName;
    if ((user as any).displayName) return (user as any).displayName;
    return user.email || 'User';
  };

  const getUserFirstName = () => {
    if (user.firstName) return user.firstName;
    const fullName = (user as any).fullName || (user as any).displayName || '';
    if (fullName) return fullName.split(' ')[0];
    return user.email?.split('@')[0] || 'User';
  };

  // Déterminer la clé active basée sur l'URL si non fournie
  const getCurrentActiveKey = () => {
    if (activeKey) return activeKey;
    const path = location.pathname;
    if (path.includes('/ai-assistant')) return 'ai-assistant';
    if (path.includes('/subscription')) return 'subscription';
    if (path.includes('/dashboard')) return 'profile';
    return '';
  };

  const currentKey = getCurrentActiveKey();

  // Menu items
  type MenuItem = {
    key: string;
    icon: React.ReactNode;
    route: string;
    labels: Record<string, string>;
    badge?: string;
  };

  const menuItems: MenuItem[] = [
    {
      key: "profile",
      icon: <User className="mr-3 h-5 w-5" />,
      route: translatedRoutes.dashboard,
      labels: { fr: "Mon profil", en: "My profile", es: "Mi perfil", de: "Mein Profil", ru: "Мой профиль", hi: "मेरी प्रोफ़ाइल", ch: "我的个人资料", pt: "Meu perfil", ar: "ملفي الشخصي" },
    },
    {
      key: "calls",
      icon: <Phone className="mr-3 h-5 w-5" />,
      route: translatedRoutes.dashboardCalls,
      labels: { fr: "Mes appels", en: "My calls", es: "Mis llamadas", de: "Meine Anrufe", ru: "Мои звонки", hi: "मेरी कॉलें", ch: "我的来电", pt: "Minhas chamadas", ar: "مكالماتي" },
    },
    {
      key: "invoices",
      icon: <FileText className="mr-3 h-5 w-5" />,
      route: translatedRoutes.dashboardInvoices,
      labels: { fr: "Mes factures", en: "My invoices", es: "Mis facturas", de: "Meine Rechnungen", ru: "Мои счета", hi: "मेरे बिल", ch: "我的发票", pt: "Minhas faturas", ar: "فواتيري" },
    },
    {
      key: "reviews",
      icon: <Star className="mr-3 h-5 w-5" />,
      route: translatedRoutes.dashboardReviews,
      labels: { fr: "Mes avis", en: "My reviews", es: "Mis reseñas", de: "Meine Bewertungen", ru: "Мои отзывы", hi: "मेरी समीक्षाएं", ch: "我的评论", pt: "Minhas avaliações", ar: "تقييماتي" },
    },
    {
      key: "messages",
      icon: <MessageSquare className="mr-3 h-5 w-5" />,
      route: translatedRoutes.dashboardMessages,
      labels: { fr: "Mes messages", en: "My messages", es: "Mis mensajes", de: "Meine Nachrichten", ru: "Мои сообщения", hi: "मेरे संदेश", ch: "我的留言", pt: "Minhas mensagens", ar: "رسائلي" },
    },
    {
      key: "favorites",
      icon: <Bookmark className="mr-3 h-5 w-5" />,
      route: translatedRoutes.dashboardFavorites,
      labels: { fr: "Mes favoris", en: "My favorites", es: "Mis favoritos", de: "Meine Favoriten", ru: "Мои избранные", hi: "मेरे पसंदीदा", ch: "我的最爱", pt: "Meus favoritos", ar: "المفضلة لدي" },
    },
  ];

  // AI items for lawyers, expats, and admins
  const aiMenuItems: MenuItem[] = authInitialized && (user.role === "lawyer" || user.role === "expat" || user.role === "admin")
    ? [
        {
          key: "ai-assistant",
          icon: <Bot className="mr-3 h-5 w-5" />,
          route: translatedRoutes.aiAssistant,
          labels: { fr: "Assistant IA", en: "AI Assistant", es: "Asistente IA", de: "KI-Assistent", ru: "ИИ Ассистент", hi: "एआई सहायक", ch: "AI助手", pt: "Assistente IA", ar: "مساعد الذكاء الاصطناعي" },
          badge: "NEW",
        },
        {
          key: "subscription",
          icon: <CreditCard className="mr-3 h-5 w-5" />,
          route: translatedRoutes.subscription,
          labels: { fr: "Mon Abonnement", en: "My Subscription", es: "Mi Suscripción", de: "Mein Abo", ru: "Моя подписка", hi: "मेरी सदस्यता", ch: "我的订阅", pt: "Minha Assinatura", ar: "اشتراكي" },
        },
      ]
    : [];

  const allMenuItems: MenuItem[] = [...menuItems, ...aiMenuItems];

  // AI Quota object for mobile drawer
  const aiQuotaData = {
    currentUsage: aiCurrentUsage,
    limit: aiLimit,
    remaining: aiRemaining,
    isInTrial: aiIsInTrial,
    trialDaysRemaining: aiTrialDaysRemaining,
    canMakeAiCall,
  };

  return (
    <Layout showFooter={false}>
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
          aiQuota={aiQuotaData}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* SIDEBAR GAUCHE - Hidden on mobile, visible on desktop */}
            <div className="hidden lg:block lg:col-span-1">
              <div className={`${softCard} overflow-hidden sticky top-8`}>
                {/* Header avec photo et infos utilisateur */}
                <div className={`p-6 ${headerGradient}`}>
                  <div className="flex items-center space-x-4">
                    {user.profilePhoto ? (
                      <img
                        src={`${user.profilePhoto}?v=${(user.updatedAt as Date | undefined)?.valueOf?.() || Date.now()}`}
                        alt={getUserFirstName()}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/80"
                        loading="eager"
                        decoding="async"
                        width={64}
                        height={64}
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
                      <p className="text-white/90 text-sm flex items-center gap-1" title={user.email}>
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </p>
                      <span className={`inline-block mt-2 px-2.5 py-1 ${UI.radiusFull} text-xs font-semibold bg-white/20`}>
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

                {/* Navigation */}
                <nav className="p-4">
                  <ul className="space-y-2">
                    {allMenuItems.map((item) => (
                      <li key={item.key}>
                        <button
                          onClick={() => navigate(item.route)}
                          className={`group relative w-full flex items-center px-4 py-2 text-sm font-medium ${UI.radiusSm} transition-all
                            ${currentKey === item.key
                              ? "bg-gradient-to-r from-red-50 to-orange-50 text-red-700 dark:from-white/5 dark:to-white/10 dark:text-white"
                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                            }
                          `}
                          title={item.labels[language] ?? item.labels.en}
                        >
                          {/* Barre active à gauche */}
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${
                              currentKey === item.key
                                ? "bg-gradient-to-b from-red-500 to-orange-500"
                                : "bg-transparent"
                            } ${UI.radiusSm}`}
                          />
                          {item.icon}
                          {item.labels[language] ?? item.labels.en}

                          {/* Badge NEW */}
                          {'badge' in item && item.badge && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold animate-pulse">
                              {String(item.badge)}
                            </span>
                          )}
                          {/* Active indicator */}
                          {currentKey === item.key && !('badge' in item) && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-white/10 dark:text-white">
                              {intl.formatMessage({ id: "dashboard.active" })}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}

                    {/* Admin link */}
                    {user.role === "admin" && (
                      <li>
                        <button
                          onClick={() => navigate("/admin/dashboard")}
                          className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <Shield className="mr-3 h-5 w-5" />
                          {intl.formatMessage({ id: "dashboard.administration" })}
                        </button>
                      </li>
                    )}

                    {/* Logout */}
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

                {/* Availability Toggle */}
                <div className="p-6 border-t border-gray-200 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {intl.formatMessage({ id: "dashboard.availabilityStatus" })}
                  </h3>
                  {user && (user.role === "lawyer" || user.role === "expat") ? (
                    <AvailabilityToggle className="justify-center" />
                  ) : (
                    <p className={`${UI.textMuted} text-center`}>
                      {intl.formatMessage({ id: "dashboard.statusOnlyProviders" })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CONTENU PRINCIPAL */}
            <div id="dashboard-content" className="lg:col-span-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardLayout;
