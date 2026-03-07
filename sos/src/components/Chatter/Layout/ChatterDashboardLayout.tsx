/**
 * ChatterDashboardLayout - Layout wrapper for Chatter dashboard pages
 * Provides sidebar navigation, user info, and chatter-specific features
 * Mobile-first: Bottom nav (5 items) + drawer for more, sidebar for desktop
 */

import React, { ReactNode, useState, useCallback, useMemo, useEffect } from 'react';
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
  LogOut,
  Share2,
  X,
  BookOpen,
  DollarSign,
  Crown,
  TrendingUp,
  Lightbulb,
  FolderOpen,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { UI, CHATTER_THEME } from '@/components/Chatter/designTokens';

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
  const [isCaptain, setIsCaptain] = useState(false);

  // Check if chatter is a captain (load once)
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "chatters", user.uid)).then((snap) => {
      if (snap.exists() && snap.data()?.role === 'captainChatter') {
        setIsCaptain(true);
      }
    }).catch((e) => console.warn("[ChatterDashboardLayout] Failed to check captain role:", e));
  }, [user?.uid]);

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

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMobileMenuOpen]);

  // Translated routes for chatter
  const translatedRoutes = useMemo(() => {
    const dashboardSlug = getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode);
    const leaderboardSlug = getTranslatedRouteSlug('chatter-leaderboard' as RouteKey, langCode);
    const paymentsSlug = getTranslatedRouteSlug('chatter-payments' as RouteKey, langCode);
    const zoomSlug = getTranslatedRouteSlug('chatter-zoom' as RouteKey, langCode);
    const trainingSlug = getTranslatedRouteSlug('chatter-training' as RouteKey, langCode);
    const referralsSlug = getTranslatedRouteSlug('chatter-referrals' as RouteKey, langCode);
    const referralEarningsSlug = getTranslatedRouteSlug('chatter-referral-earnings' as RouteKey, langCode);
    const referSlug = getTranslatedRouteSlug('chatter-refer' as RouteKey, langCode);
    const progressionSlug = getTranslatedRouteSlug('chatter-progression' as RouteKey, langCode);
    const howToEarnSlug = getTranslatedRouteSlug('chatter-how-to-earn' as RouteKey, langCode);
    const resourcesSlug = getTranslatedRouteSlug('chatter-resources' as RouteKey, langCode);
    const captainTeamSlug = getTranslatedRouteSlug('chatter-captain-team' as RouteKey, langCode);
    const profileSlug = getTranslatedRouteSlug('chatter-profile' as RouteKey, langCode);

    return {
      dashboard: `/${dashboardSlug}`,
      leaderboard: `/${leaderboardSlug}`,
      progression: `/${progressionSlug}`,
      howToEarn: `/${howToEarnSlug}`,
      payments: `/${paymentsSlug}`,
      zoom: `/${zoomSlug}`,
      training: `/${trainingSlug}`,
      referrals: `/${referralsSlug}`,
      referralEarnings: `/${referralEarningsSlug}`,
      refer: `/${referSlug}`,
      resources: `/${resourcesSlug}`,
      captainTeam: `/${captainTeamSlug}`,
      profile: `/${profileSlug}`,
    };
  }, [langCode]);

  // Loading state
  if (!user || !authInitialized) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 via-red-50/20 dark:via-gray-950 to-white dark:to-black flex items-center justify-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
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
    if (path.includes('/progression') || path.includes('/progresion') || path.includes('/fortschritt') || path.includes('/progressao') || path.includes('/jindu') || path.includes('/pragati') || path.includes('/التقدم') || path.includes('/progress')) return 'progression';
    if (path.includes('/comment-gagner') || path.includes('/how-to-earn') || path.includes('/como-ganar') || path.includes('/wie-verdienen') || path.includes('/kak-zarabotat') || path.includes('/como-ganhar') || path.includes('/ruhe-zhuanqian') || path.includes('/kaise-kamaye') || path.includes('/كيف-تكسب')) return 'how-to-earn';
    if (path.includes('/payments') || path.includes('/paiements') || path.includes('/pagos') || path.includes('/zahlungen') || path.includes('/platezhi') || path.includes('/pagamentos') || path.includes('/fukuan') || path.includes('/bhugtaan')) return 'payments';
    if (path.includes('/zoom')) return 'zoom';
    if (path.includes('/training') || path.includes('/formation') || path.includes('/formacion') || path.includes('/schulung') || path.includes('/obuchenie') || path.includes('/formacao') || path.includes('/peixun') || path.includes('/prashikshan')) return 'training';
    if (path.includes('/referral-earnings') || path.includes('/gains-parrainage')) return 'referral-earnings';
    if (path.includes('/referrals') || path.includes('/filleuls')) return 'referrals';
    if (path.includes('/refer') || path.includes('/parrainer')) return 'refer';
    if (path.includes('/ressources') || path.includes('/resources') || path.includes('/recursos') || path.includes('/ressourcen') || path.includes('/resursy') || path.includes('/ziyuan') || path.includes('/sansaadhan') || path.includes('/موارد')) return 'resources';
    if (path.includes('/mon-equipe') || path.includes('/my-team')) return 'captain-team';
    if (path.includes('/profil') || path.includes('/profile')) return 'profile';
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
      key: "progression",
      icon: <TrendingUp className="mr-3 h-5 w-5" />,
      route: translatedRoutes.progression,
      labels: { fr: "Progression", en: "Progression", es: "Progresión", de: "Fortschritt", ru: "Прогресс", pt: "Progressão", ch: "进度", hi: "प्रगति", ar: "التقدم" },
    },
    {
      key: "how-to-earn",
      icon: <Lightbulb className="mr-3 h-5 w-5" />,
      route: translatedRoutes.howToEarn,
      labels: { fr: "Comment gagner", en: "How to earn", es: "Cómo ganar", de: "Wie verdienen", ru: "Как заработать", pt: "Como ganhar", ch: "如何赚钱", hi: "कैसे कमाएं", ar: "كيف تكسب" },
    },
    {
      key: "payments",
      icon: <Wallet className="mr-3 h-5 w-5" />,
      route: translatedRoutes.payments,
      labels: { fr: "Mes paiements", en: "My payments", es: "Mis pagos", de: "Meine Zahlungen", ru: "Мои платежи", pt: "Meus pagamentos", ch: "我的付款", hi: "मेरे भुगतान", ar: "مدفوعاتي" },
    },
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
    {
      key: "resources",
      icon: <FolderOpen className="mr-3 h-5 w-5" />,
      route: translatedRoutes.resources,
      labels: { fr: "Ressources", en: "Resources", es: "Recursos", de: "Ressourcen", ru: "Ресурсы", pt: "Recursos", ch: "资源", hi: "संसाधन", ar: "الموارد" },
    },
    ...(isCaptain ? [{
      key: "captain-team",
      icon: <Crown className="mr-3 h-5 w-5" />,
      route: translatedRoutes.captainTeam,
      labels: { fr: "Mon équipe", en: "My Team", es: "Mi Equipo", de: "Mein Team", ru: "Моя команда", pt: "Minha Equipe", ch: "我的团队", hi: "मेरी टीम", ar: "فريقي" },
    }] : []),
    {
      key: "profile",
      icon: <User className="mr-3 h-5 w-5" />,
      route: translatedRoutes.profile,
      labels: { fr: "Mon profil", en: "My Profile", es: "Mi Perfil", de: "Mein Profil", ru: "Мой профиль", pt: "Meu Perfil", ch: "我的个人资料", hi: "मेरी प्रोफ़ाइल", ar: "ملفي الشخصي" },
    },
  ];

  // ============================================================================
  // BOTTOM NAV — 5 primary items for mobile (iPhone SE 375px first)
  // ============================================================================
  const bottomNavItems = [
    {
      key: "dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      route: translatedRoutes.dashboard,
      label: { fr: "Accueil", en: "Home", es: "Inicio", de: "Start", ru: "Главная", pt: "Início", ch: "首页", hi: "होम", ar: "الرئيسية" },
    },
    {
      key: "payments",
      icon: <Wallet className="w-5 h-5" />,
      route: translatedRoutes.payments,
      label: { fr: "Paiements", en: "Payments", es: "Pagos", de: "Zahlungen", ru: "Платежи", pt: "Pagamentos", ch: "付款", hi: "भुगतान", ar: "مدفوعات" },
    },
    {
      key: "refer",
      icon: <Share2 className="w-5 h-5" />,
      route: translatedRoutes.refer,
      label: { fr: "Parrainer", en: "Refer", es: "Referir", de: "Empfehlen", ru: "Пригласить", pt: "Indicar", ch: "推荐", hi: "रेफर", ar: "إحالة" },
    },
    {
      key: "leaderboard",
      icon: <Trophy className="w-5 h-5" />,
      route: translatedRoutes.leaderboard,
      label: { fr: "Classement", en: "Ranking", es: "Ranking", de: "Rangliste", ru: "Рейтинг", pt: "Ranking", ch: "排名", hi: "रैंकिंग", ar: "الترتيب" },
    },
    {
      key: "_more",
      icon: <MoreHorizontal className="w-5 h-5" />,
      route: "",
      label: { fr: "Plus", en: "More", es: "Más", de: "Mehr", ru: "Ещё", pt: "Mais", ch: "更多", hi: "अधिक", ar: "المزيد" },
    },
  ];

  // Check if current page matches a bottom nav item (for highlighting)
  const isBottomNavActive = (key: string) => {
    if (key === "_more") {
      // "More" is active if current page is NOT one of the 4 primary bottom nav keys
      const primaryKeys = ["dashboard", "payments", "refer", "leaderboard"];
      return !primaryKeys.includes(currentKey);
    }
    return currentKey === key;
  };

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 via-red-50/20 dark:via-gray-950 to-white dark:to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">

            {/* MOBILE DRAWER — "More" menu slides in from left */}
            {isMobileMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="lg:hidden fixed inset-0 bg-black/40 z-40 animate-fade-in"
                  onClick={() => setIsMobileMenuOpen(false)}
                  role="presentation"
                  aria-hidden="true"
                />
                {/* Drawer */}
                <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto animate-slide-in-left">
                  {/* Drawer header */}
                  <div className={`p-3 sm:p-5 ${CHATTER_THEME.header}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-1 ${UI.radiusFull} text-xs font-semibold bg-white/20`}>
                        Chatter
                      </span>
                      <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/20" aria-label={intl.formatMessage({ id: 'common.closeMenu', defaultMessage: 'Close menu' })}>
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const photo = [user.profilePhoto, user.photoURL, user.avatar].find(
                          (u) => u && u.startsWith('http')
                        );
                        return photo ? (
                          <img src={photo} alt={getUserFirstName()} className="w-12 h-12 rounded-full object-cover ring-2" loading="eager" />
                        ) : (
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                        );
                      })()}
                      <h2 className="text-base font-extrabold leading-tight truncate">{getUserFullName()}</h2>
                    </div>
                  </div>

                  {/* Drawer nav */}
                  <nav className="p-3">
                    <ul className="space-y-1">
                      {menuItems.map((item) => (
                        <li key={item.key}>
                          <button
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              if (currentKey !== item.key) navigate(item.route);
                            }}
                            className={`w-full flex items-center px-3 py-2.5 text-sm font-medium ${UI.radiusSm} transition-all
                              ${currentKey === item.key
                                ? "bg-gradient-to-r from-red-50 to-orange-50 text-red-700 dark:from-white/5 dark:to-white/10 dark:text-red-400"
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                              }
                            `}
                          >
                            {item.icon}
                            {item.labels[language] ?? item.labels.en}
                          </button>
                        </li>
                      ))}
                      <li className="pt-3 border-t dark:border-white/10">
                        <button
                          onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                          disabled={loggingOut}
                          className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <LogOut className="mr-3 h-5 w-5" />
                          {intl.formatMessage({ id: "dashboard.logout", defaultMessage: "Déconnexion" })}
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </>
            )}

            {/* SIDEBAR - Desktop only */}
            <div className="hidden lg:block lg:col-span-1">
              <div className={`${UI.card} overflow-hidden sticky top-8`}>
                {/* Header with user info */}
                <div className={`p-6 ${CHATTER_THEME.header}`}>
                  <div className="flex items-center space-x-4">
                    {(() => {
                      const photo = [user.profilePhoto, user.photoURL, user.avatar].find(
                        (u) => u && u.startsWith('http')
                      );
                      return photo ? (
                        <img
                          src={photo}
                          alt={getUserFirstName()}
                          className="w-16 h-16 rounded-full object-cover ring-2"
                          loading="eager"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="h-8 w-8 text-white" />
                        </div>
                      );
                    })()}
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
            <div id="chatter-dashboard-content" className="lg:col-span-3 pb-20 lg:pb-0">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BOTTOM NAV — Mobile only, fixed at bottom, 5 items           */}
        {/* iOS safe-area-inset-bottom handled via pb-safe               */}
        {/* ============================================================ */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
            {bottomNavItems.map((item) => {
              const active = isBottomNavActive(item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    if (item.key === "_more") {
                      setIsMobileMenuOpen(true);
                    } else if (currentKey !== item.key) {
                      navigate(item.route);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] transition-colors touch-manipulation ${
                    active
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <div className={`p-2 rounded-lg transition-colors ${active ? "bg-red-100 dark:bg-red-900/30" : ""}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[10px] font-medium leading-tight ${active ? "font-semibold" : ""}`}>
                    {item.label[language as keyof typeof item.label] ?? item.label.en}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </Layout>
  );
};

export default ChatterDashboardLayout;
