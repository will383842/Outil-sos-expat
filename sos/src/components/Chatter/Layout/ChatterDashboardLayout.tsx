/**
 * ChatterDashboardLayout - Redesigned layout with:
 * - ChatterDataProvider (single useChatter() for all pages)
 * - StickyAffiliateBar (persistent affiliate links)
 * - 6-tab navigation (simplified from 12+)
 * - Mobile bottom nav with FAB share button
 * - Desktop sidebar (collapsible)
 * - No more getDoc() for captain check (uses Context data)
 */

import React, { ReactNode, useState, useCallback, useMemo, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import {
  Home,
  DollarSign,
  Users,
  Trophy,
  Briefcase,
  User,
  LogOut,
  X,
  Share2,
  Crown,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ChatterDataProvider, useChatterData } from '@/contexts/ChatterDataContext';
import { CelebrationProvider } from '@/components/Chatter/Activation/CelebrationSystem';
import StickyAffiliateBar from './StickyAffiliateBar';
import { UI, CHATTER_THEME } from '@/components/Chatter/designTokens';
import toast from 'react-hot-toast';

interface ChatterDashboardLayoutProps {
  children: ReactNode;
  activeKey?: string;
}

const ChatterDashboardLayout: React.FC<ChatterDashboardLayoutProps> = ({ children, activeKey }) => {
  return (
    <ChatterDataProvider>
      <LayoutInner activeKey={activeKey}>{children}</LayoutInner>
    </ChatterDataProvider>
  );
};

/**
 * Inner layout component that has access to ChatterDataContext
 */
const LayoutInner: React.FC<ChatterDashboardLayoutProps> = ({ children, activeKey }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { user, logout, authInitialized } = useAuth();
  const { language } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Captain status from Context (no more getDoc!)
  const { dashboardData, clientShareUrl } = useChatterData();
  const isCaptain = dashboardData?.chatter?.role === 'captainChatter';

  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const loginRoute = useMemo(() => {
    const loginSlug = getTranslatedRouteSlug('login' as RouteKey, langCode);
    return `/${loginSlug}`;
  }, [langCode]);

  const handleLogout = useCallback(async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate(loginRoute);
    } catch {
      navigate(loginRoute);
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate, loggingOut, loginRoute]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isDrawerOpen]);

  // Translated routes (6 main + captain + extras)
  const routes = useMemo(() => ({
    dashboard: `/${getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode)}`,
    payments: `/${getTranslatedRouteSlug('chatter-payments' as RouteKey, langCode)}`,
    referrals: `/${getTranslatedRouteSlug('chatter-referrals' as RouteKey, langCode)}`,
    leaderboard: `/${getTranslatedRouteSlug('chatter-leaderboard' as RouteKey, langCode)}`,
    training: `/${getTranslatedRouteSlug('chatter-training' as RouteKey, langCode)}`,
    profile: `/${getTranslatedRouteSlug('chatter-profile' as RouteKey, langCode)}`,
    captainTeam: `/${getTranslatedRouteSlug('chatter-captain-team' as RouteKey, langCode)}`,
    refer: `/${getTranslatedRouteSlug('chatter-refer' as RouteKey, langCode)}`,
    progression: `/${getTranslatedRouteSlug('chatter-progression' as RouteKey, langCode)}`,
    howToEarn: `/${getTranslatedRouteSlug('chatter-how-to-earn' as RouteKey, langCode)}`,
    resources: `/${getTranslatedRouteSlug('chatter-resources' as RouteKey, langCode)}`,
    referralEarnings: `/${getTranslatedRouteSlug('chatter-referral-earnings' as RouteKey, langCode)}`,
  }), [langCode]);

  // Loading state
  if (!user || !authInitialized) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {intl.formatMessage({ id: 'common.loading', defaultMessage: 'Chargement...' })}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // User info helpers
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Chatter';
  const firstName = user.firstName || user.email?.split('@')[0] || 'Chatter';
  const photo = [user.profilePhoto, user.photoURL, user.avatar].find((u) => u && u.startsWith('http'));

  // Current active key from URL
  const currentKey = (() => {
    if (activeKey) return activeKey;
    const path = location.pathname;
    if (path.includes('/paiements') || path.includes('/payments') || path.includes('/pagos') || path.includes('/zahlungen') || path.includes('/platezhi') || path.includes('/pagamentos') || path.includes('/fukuan') || path.includes('/bhugtaan')) return 'payments';
    if (path.includes('/filleuls') || path.includes('/referrals') || path.includes('/referral') || path.includes('/parrainer') || path.includes('/refer') || path.includes('/gains-parrainage')) return 'team';
    if (path.includes('/classement') || path.includes('/leaderboard') || path.includes('/progression') || path.includes('/progress')) return 'ranking';
    if (path.includes('/formation') || path.includes('/training') || path.includes('/ressources') || path.includes('/resources') || path.includes('/comment-gagner') || path.includes('/how-to-earn')) return 'tools';
    if (path.includes('/profil') || path.includes('/profile')) return 'profile';
    if (path.includes('/mon-equipe') || path.includes('/my-team')) return 'captain';
    return 'home';
  })();

  // 6 main nav items
  type NavItem = { key: string; icon: React.ReactNode; route: string; labels: Record<string, string> };

  const mainNavItems: NavItem[] = [
    { key: 'home', icon: <Home className="w-5 h-5" />, route: routes.dashboard, labels: { fr: 'Accueil', en: 'Home', es: 'Inicio', de: 'Start', ru: 'Главная', pt: 'Início', ch: '首页', hi: 'होम', ar: 'الرئيسية' } },
    { key: 'payments', icon: <DollarSign className="w-5 h-5" />, route: routes.payments, labels: { fr: 'Gains', en: 'Earnings', es: 'Ganancias', de: 'Einnahmen', ru: 'Доходы', pt: 'Ganhos', ch: '收益', hi: 'कमाई', ar: 'الأرباح' } },
    { key: 'team', icon: <Users className="w-5 h-5" />, route: routes.referrals, labels: { fr: 'Equipe', en: 'Team', es: 'Equipo', de: 'Team', ru: 'Команда', pt: 'Equipe', ch: '团队', hi: 'टीम', ar: 'الفريق' } },
    { key: 'ranking', icon: <Trophy className="w-5 h-5" />, route: routes.leaderboard, labels: { fr: 'Classement', en: 'Ranking', es: 'Ranking', de: 'Rangliste', ru: 'Рейтинг', pt: 'Ranking', ch: '排名', hi: 'रैंकिंग', ar: 'الترتيب' } },
    { key: 'tools', icon: <Briefcase className="w-5 h-5" />, route: routes.training, labels: { fr: 'Outils', en: 'Tools', es: 'Herramientas', de: 'Werkzeuge', ru: 'Инструменты', pt: 'Ferramentas', ch: '工具', hi: 'उपकरण', ar: 'أدوات' } },
    { key: 'profile', icon: <User className="w-5 h-5" />, route: routes.profile, labels: { fr: 'Profil', en: 'Profile', es: 'Perfil', de: 'Profil', ru: 'Профиль', pt: 'Perfil', ch: '个人资料', hi: 'प्रोफ़ाइल', ar: 'الملف الشخصي' } },
  ];

  // Drawer items (includes sub-pages and captain)
  const drawerItems: NavItem[] = [
    ...mainNavItems,
    ...(isCaptain ? [{
      key: 'captain', icon: <Crown className="w-5 h-5" />, route: routes.captainTeam,
      labels: { fr: 'Mon equipe Captain', en: 'Captain Team', es: 'Equipo Captain', de: 'Captain Team', ru: 'Команда Капитана', pt: 'Equipe Captain', ch: '队长团队', hi: 'कैप्टन टीम', ar: 'فريق الكابتن' },
    }] : []),
  ];

  // FAB share action
  const handleFabShare = useCallback(async () => {
    if (!clientShareUrl) return;
    localStorage.setItem('chatter_link_shared', Date.now().toString());
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SOS Expat', url: clientShareUrl });
        toast.success('Lien partage !');
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(clientShareUrl).then(() => {
        toast.success('Lien copie !');
      });
    }
  }, [clientShareUrl]);

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Sticky Affiliate Bar */}
        <StickyAffiliateBar />

        <div className="max-w-7xl mx-auto lg:px-6 lg:py-6">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-6">

            {/* MOBILE DRAWER */}
            {isDrawerOpen && (
              <>
                <div
                  className="lg:hidden fixed inset-0 bg-black/40 z-40"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-hidden="true"
                />
                <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto">
                  {/* Drawer header */}
                  <div className={`p-4 ${CHATTER_THEME.header}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20">Chatter</span>
                      <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-white/20"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      {photo ? (
                        <img src={photo} alt={firstName} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30" />
                      ) : (
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <h2 className="text-base font-bold text-white truncate">{fullName}</h2>
                    </div>
                  </div>

                  {/* Drawer nav */}
                  <nav className="p-3">
                    <ul className="space-y-1">
                      {drawerItems.map((item) => (
                        <li key={item.key}>
                          <button
                            onClick={() => { setIsDrawerOpen(false); if (currentKey !== item.key) navigate(item.route); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all min-h-[44px]
                              ${currentKey === item.key
                                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                              }`}
                          >
                            {item.icon}
                            {item.labels[language] ?? item.labels.en}
                          </button>
                        </li>
                      ))}
                      <li className="pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                          onClick={() => { setIsDrawerOpen(false); handleLogout(); }}
                          disabled={loggingOut}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 min-h-[44px]"
                        >
                          <LogOut className="w-5 h-5" />
                          {intl.formatMessage({ id: 'dashboard.logout', defaultMessage: 'Deconnexion' })}
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </>
            )}

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden lg:block">
              <div className={`${UI.card} overflow-hidden sticky top-4`}>
                {/* Header */}
                <div className={`p-5 ${CHATTER_THEME.header}`}>
                  <div className="flex items-center gap-3">
                    {photo ? (
                      <img src={photo} alt={firstName} className="w-14 h-14 rounded-full object-cover ring-2 ring-white/30" />
                    ) : (
                      <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="h-7 w-7 text-white" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-white truncate">{fullName}</h2>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
                        Chatter
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nav */}
                <nav className="p-3">
                  <ul className="space-y-1">
                    {drawerItems.map((item) => (
                      <li key={item.key}>
                        <button
                          onClick={() => { if (currentKey !== item.key) navigate(item.route); }}
                          className={`group relative w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all
                            ${currentKey === item.key
                              ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                          {currentKey === item.key && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-red-500 to-orange-500 rounded-r" />
                          )}
                          {item.icon}
                          {item.labels[language] ?? item.labels.en}
                        </button>
                      </li>
                    ))}
                    <li className="pt-3 border-t border-slate-200 dark:border-white/10">
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                      >
                        <LogOut className="w-5 h-5" />
                        {loggingOut
                          ? intl.formatMessage({ id: 'dashboard.loggingOut', defaultMessage: 'Deconnexion...' })
                          : intl.formatMessage({ id: 'dashboard.logout', defaultMessage: 'Deconnexion' })
                        }
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="min-w-0 pb-24 lg:pb-0">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </div>

        {/* MOBILE BOTTOM NAV - 5 items with FAB */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-white/10"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
            {/* Home */}
            <BottomNavItem
              icon={<Home className="w-5 h-5" />}
              label={mainNavItems[0].labels[language] ?? 'Home'}
              active={currentKey === 'home'}
              onClick={() => currentKey !== 'home' && navigate(routes.dashboard)}
            />
            {/* Gains */}
            <BottomNavItem
              icon={<DollarSign className="w-5 h-5" />}
              label={mainNavItems[1].labels[language] ?? 'Earnings'}
              active={currentKey === 'payments'}
              onClick={() => currentKey !== 'payments' && navigate(routes.payments)}
            />

            {/* FAB - Central Share button */}
            <div className="relative -mt-6">
              <button
                onClick={handleFabShare}
                className="w-14 h-14 bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-lg shadow-red-500/25 flex items-center justify-center text-white active:scale-95 transition-transform"
                aria-label={intl.formatMessage({ id: 'chatter.share', defaultMessage: 'Partager' })}
              >
                <Share2 className="w-6 h-6" />
              </button>
            </div>

            {/* Classement */}
            <BottomNavItem
              icon={<Trophy className="w-5 h-5" />}
              label={mainNavItems[3].labels[language] ?? 'Ranking'}
              active={currentKey === 'ranking'}
              onClick={() => currentKey !== 'ranking' && navigate(routes.leaderboard)}
            />
            {/* Menu */}
            <BottomNavItem
              icon={<Menu className="w-5 h-5" />}
              label={intl.formatMessage({ id: 'common.menu', defaultMessage: 'Menu' })}
              active={false}
              onClick={() => setIsDrawerOpen(true)}
            />
          </div>
        </nav>
      </div>
    </Layout>
  );
};

/**
 * Bottom nav item component
 */
const BottomNavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] transition-colors touch-manipulation ${
      active ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-red-50 dark:bg-red-500/10' : ''}`}>
      {icon}
    </div>
    <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
      {label}
    </span>
  </button>
);

export default ChatterDashboardLayout;
