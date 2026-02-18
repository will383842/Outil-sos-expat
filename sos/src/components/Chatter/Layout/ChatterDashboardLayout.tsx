/**
 * ChatterDashboardLayout - Layout wrapper for Chatter dashboard pages
 * Provides sidebar navigation, user info, and chatter-specific features
 * Mobile-first: Bottom nav + drawer for mobile, sidebar for desktop
 */

import React, { ReactNode, useState, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import {
  User,
  LayoutDashboard,
  Wallet,
  Users,
  Trophy,
  FileText,
  LogOut,
  Copy,
  CheckCircle,
  Share2,
  Flame,
  Star,
  Menu,
  X,
  Video,
  BookOpen,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  radiusSm: "rounded-lg",
  radiusFull: "rounded-full",
  textMuted: "text-gray-500 dark:text-gray-400",
} as const;

// Chatter-specific gradient theme
const CHATTER_THEME = {
  header: "bg-gradient-to-r from-red-500 via-orange-500 to-red-500 text-white",
  accent: "from-red-500 to-orange-500",
  accentBg: "bg-gradient-to-r from-red-500 to-orange-500",
} as const;

interface ChatterDashboardLayoutProps {
  children: ReactNode;
  activeKey?: string;
}

const ChatterDashboardLayout: React.FC<ChatterDashboardLayoutProps> = ({ children, activeKey }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { user, logout, authInitialized } = useAuth();
  const { language } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  // Get login route for logout redirect
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

  // Translated routes for chatter
  const translatedRoutes = useMemo(() => {
    const dashboardSlug = getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode);
    const leaderboardSlug = getTranslatedRouteSlug('chatter-leaderboard' as RouteKey, langCode);
    const paymentsSlug = getTranslatedRouteSlug('chatter-payments' as RouteKey, langCode);
    const postsSlug = getTranslatedRouteSlug('chatter-posts' as RouteKey, langCode);
    const zoomSlug = getTranslatedRouteSlug('chatter-zoom' as RouteKey, langCode);
    const trainingSlug = getTranslatedRouteSlug('chatter-training' as RouteKey, langCode);
    const referralsSlug = getTranslatedRouteSlug('chatter-referrals' as RouteKey, langCode);
    const referralEarningsSlug = getTranslatedRouteSlug('chatter-referral-earnings' as RouteKey, langCode);
    const referSlug = getTranslatedRouteSlug('chatter-refer' as RouteKey, langCode);

    return {
      dashboard: `/${dashboardSlug}`,
      leaderboard: `/${leaderboardSlug}`,
      payments: `/${paymentsSlug}`,
      posts: `/${postsSlug}`,
      zoom: `/${zoomSlug}`,
      training: `/${trainingSlug}`,
      referrals: `/${referralsSlug}`,
      referralEarnings: `/${referralEarningsSlug}`,
      refer: `/${referSlug}`,
    };
  }, [langCode]);

  // Loading state
  if (!user || !authInitialized) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 via-red-50/20 dark:via-gray-950 to-white dark:to-black flex items-center justify-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" />
            <p className="text-sm dark:text-gray-600">
              {intl.formatMessage({ id: 'common.loading', defaultMessage: 'Chargement...' })}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Get user info
  const getUserFullName = () => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email || 'Chatter';
  };

  const getUserFirstName = () => {
    if (user.firstName) return user.firstName;
    return user.email?.split('@')[0] || 'Chatter';
  };

  // Determine active key from URL
  const getCurrentActiveKey = () => {
    if (activeKey) return activeKey;
    const path = location.pathname;
    if (path.includes('/leaderboard') || path.includes('/classement') || path.includes('/clasificacion') || path.includes('/rangliste') || path.includes('/reiting') || path.includes('/classificacao') || path.includes('/paihangbang')) return 'leaderboard';
    if (path.includes('/payments') || path.includes('/paiements') || path.includes('/pagos') || path.includes('/zahlungen') || path.includes('/platezhi') || path.includes('/pagamentos') || path.includes('/fukuan') || path.includes('/bhugtaan')) return 'payments';
    if (path.includes('/posts') || path.includes('/publicaciones') || path.includes('/beitraege') || path.includes('/posty') || path.includes('/publicacoes') || path.includes('/tiezi')) return 'posts';
    if (path.includes('/zoom')) return 'zoom';
    if (path.includes('/training') || path.includes('/formation') || path.includes('/formacion') || path.includes('/schulung') || path.includes('/obuchenie') || path.includes('/formacao') || path.includes('/peixun') || path.includes('/prashikshan')) return 'training';
    // Referral routes
    if (path.includes('/referral-earnings') || path.includes('/gains-parrainage')) return 'referral-earnings';
    if (path.includes('/referrals') || path.includes('/filleuls')) return 'referrals';
    if (path.includes('/refer') || path.includes('/parrainer')) return 'refer';
    return 'dashboard';
  };

  const currentKey = getCurrentActiveKey();

  // Menu items
  type MenuItem = {
    key: string;
    icon: React.ReactNode;
    route: string;
    labels: Record<string, string>;
  };

  const menuItems: MenuItem[] = [
    {
      key: "dashboard",
      icon: <LayoutDashboard className="mr-3 h-5 w-5" />,
      route: translatedRoutes.dashboard,
      labels: { fr: "Tableau de bord", en: "Dashboard", es: "Panel", de: "Dashboard", ru: "Панель", pt: "Painel", ch: "控制面板", hi: "डैशबोर्ड", ar: "لوحة التحكم" },
    },
    {
      key: "leaderboard",
      icon: <Trophy className="mr-3 h-5 w-5" />,
      route: translatedRoutes.leaderboard,
      labels: { fr: "Classement", en: "Leaderboard", es: "Clasificación", de: "Rangliste", ru: "Рейтинг", pt: "Classificação", ch: "排行榜", hi: "रैंकिंग", ar: "الترتيب" },
    },
    {
      key: "payments",
      icon: <Wallet className="mr-3 h-5 w-5" />,
      route: translatedRoutes.payments,
      labels: { fr: "Mes paiements", en: "My payments", es: "Mis pagos", de: "Meine Zahlungen", ru: "Мои платежи", pt: "Meus pagamentos", ch: "我的付款", hi: "मेरे भुगतान", ar: "مدفوعاتي" },
    },
    {
      key: "posts",
      icon: <FileText className="mr-3 h-5 w-5" />,
      route: translatedRoutes.posts,
      labels: { fr: "Mes posts", en: "My posts", es: "Mis posts", de: "Meine Beiträge", ru: "Мои посты", pt: "Meus posts", ch: "我的帖子", hi: "मेरे पोस्ट", ar: "منشوراتي" },
    },
    // DISABLED: Zoom bonus feature removed - not implemented
    // {
    //   key: "zoom",
    //   icon: <Video className="mr-3 h-5 w-5" />,
    //   route: translatedRoutes.zoom,
    //   labels: { fr: "Réunions Zoom", en: "Zoom meetings", es: "Reuniones Zoom", de: "Zoom-Meetings", ru: "Zoom-встречи", pt: "Reuniões Zoom", ch: "Zoom会议", hi: "ज़ूम मीटिंग", ar: "اجتماعات زووم" },
    // },
    {
      key: "training",
      icon: <BookOpen className="mr-3 h-5 w-5" />,
      route: translatedRoutes.training,
      labels: { fr: "Formation", en: "Training", es: "Formación", de: "Schulung", ru: "Обучение", pt: "Formação", ch: "培训", hi: "प्रशिक्षण", ar: "التدريب" },
    },
    {
      key: "referrals",
      icon: <Users className="mr-3 h-5 w-5" />,
      route: translatedRoutes.referrals,
      labels: { fr: "Mes Filleuls", en: "My Referrals", es: "Mis Referidos", de: "Meine Empfehlungen", ru: "Мои рефералы", pt: "Meus Indicados", ch: "我的推荐", hi: "मेरे रेफरल", ar: "إحالاتي" },
    },
    {
      key: "referral-earnings",
      icon: <DollarSign className="mr-3 h-5 w-5" />,
      route: translatedRoutes.referralEarnings,
      labels: { fr: "Gains Parrainage", en: "Referral Earnings", es: "Ganancias de Referidos", de: "Empfehlungs-Einnahmen", ru: "Доходы от рефералов", pt: "Ganhos de Indicação", ch: "推荐收益", hi: "रेफरल आय", ar: "أرباح الإحالات" },
    },
    {
      key: "refer",
      icon: <Share2 className="mr-3 h-5 w-5" />,
      route: translatedRoutes.refer,
      labels: { fr: "Parrainer", en: "Refer", es: "Referir", de: "Empfehlen", ru: "Пригласить", pt: "Indicar", ch: "推荐", hi: "रेफर करें", ar: "إحالة" },
    },
  ];

  // Copy affiliate link
  const copyAffiliateLink = async (code: string) => {
    const link = `${window.location.origin}?ref=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 via-red-50/20 dark:via-gray-950 to-white dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
            {/* SIDEBAR - Hidden on mobile */}
            <div className="hidden lg:block lg:col-span-1">
              <div className={`${UI.card} overflow-hidden sticky top-8`}>
                {/* Header with user info */}
                <div className={`p-6 ${CHATTER_THEME.header}`}>
                  <div className="flex items-center space-x-4">
                    {user.profilePhoto ? (
                      <img
                        src={`${user.profilePhoto}?v=${Date.now()}`}
                        alt={getUserFirstName()}
                        className="w-16 h-16 rounded-full object-cover ring-2"
                        loading="eager"
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
                      <span className={`inline-block mt-2 px-2.5 py-1 ${UI.radiusFull} text-xs font-semibold bg-white/20`}>
                        Chatter
                      </span>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="p-4">
                  <ul className="space-y-2">
                    {menuItems.map((item) => (
                      <li key={item.key}>
                        <button
                          onClick={() => {
                            if (currentKey === item.key) return;
                            navigate(item.route);
                          }}
                          className={`group relative w-full flex items-center px-4 py-2 text-sm font-medium ${UI.radiusSm} transition-all
                            ${currentKey === item.key
                              ? "bg-gradient-to-r from-red-50 to-orange-50 text-red-700 dark:from-white/5 dark:to-white/10 dark:text-red-400"
                              : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                            }
                          `}
                        >
                          {/* Active indicator */}
                          <span
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${
                              currentKey === item.key
                                ? "bg-gradient-to-b from-red-500 to-orange-500"
                                : "bg-transparent"
                            } ${UI.radiusSm}`}
                          />
                          {item.icon}
                          {item.labels[language] ?? item.labels.en}
                          {currentKey === item.key && (
                            <span className="ml-auto text-[10px] dark:text-red-400 px-1.5 py-0.5 rounded bg-red-100 dark:bg-white/10">
                              {intl.formatMessage({ id: "dashboard.active", defaultMessage: "Actif" })}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}

                    {/* Logout */}
                    <li className="pt-4 border-t dark:border-white/10">
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
                            <div className="mr-3 h-5 w-5 border-2 rounded-full animate-spin" />
                            {intl.formatMessage({ id: "dashboard.loggingOut", defaultMessage: "Déconnexion..." })}
                          </>
                        ) : (
                          <>
                            <LogOut className="mr-3 h-5 w-5" />
                            {intl.formatMessage({ id: "dashboard.logout", defaultMessage: "Déconnexion" })}
                          </>
                        )}
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div id="chatter-dashboard-content" className="lg:col-span-3">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatterDashboardLayout;
