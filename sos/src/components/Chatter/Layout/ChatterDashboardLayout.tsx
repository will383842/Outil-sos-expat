/**
 * ChatterDashboardLayout - Rich sidebar with:
 * - Profile + Level badge with glow
 * - Available Balance widget (orange/green/blue states)
 * - Piggy Bank mini progress
 * - 2 Affiliate links (client + recruitment)
 * - 7-tab navigation (+ captain conditional)
 * - Level progression bar
 * - Logout
 * - Mobile drawer (same content) + bottom nav with indigo FAB
 */

import React, { ReactNode, useState, useCallback, useMemo, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import {
  Home,
  Lightbulb,
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
  Copy,
  PiggyBank,
  TrendingUp,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ChatterDataProvider, useChatterData } from '@/contexts/ChatterDataContext';
import { CelebrationProvider } from '@/components/Chatter/Activation/CelebrationSystem';
import StickyAffiliateBar from './StickyAffiliateBar';
import WithdrawalBottomSheet from '@/components/Chatter/WithdrawalBottomSheet';
import { UI, CHATTER_THEME, LEVEL_COLORS } from '@/components/Chatter/designTokens';
import toast from 'react-hot-toast';
import { copyToClipboard } from '@/utils/clipboard';

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

// ============================================================================
// HELPER: Format cents to dollars
// ============================================================================
const formatAmount = (cents: number): string => (cents / 100).toFixed(2);

// ============================================================================
// SIDEBAR CONTENT (shared between desktop sidebar and mobile drawer)
// ============================================================================
interface SidebarContentProps {
  photo: string | undefined;
  fullName: string;
  firstName: string;
  level: number;
  levelProgress: number;
  availableBalance: number;
  canWithdraw: boolean;
  minimumWithdrawal: number;
  pendingWithdrawalId: string | null;
  piggyBank: { totalPending: number; unlockThreshold: number; progressPercent: number } | null;
  clientCode: string;
  recruitmentCode: string;
  clientShareUrl: string;
  recruitmentShareUrl: string;
  commissionClientCall: number;
  commissionN1Call: number;
  drawerItems: NavItem[];
  currentKey: string;
  language: string;
  loggingOut: boolean;
  onNavigate: (key: string, route: string) => void;
  onLogout: () => void;
  onWithdraw?: () => void;
  intl: ReturnType<typeof useIntl>;
}

type NavItem = { key: string; icon: React.ReactNode; route: string; labels: Record<string, string> };

const SidebarContent: React.FC<SidebarContentProps> = ({
  photo, fullName, firstName, level, levelProgress,
  availableBalance, canWithdraw, minimumWithdrawal, pendingWithdrawalId,
  piggyBank, clientCode, recruitmentCode, clientShareUrl, recruitmentShareUrl,
  commissionClientCall, commissionN1Call,
  drawerItems, currentKey, language, loggingOut,
  onNavigate, onLogout, onWithdraw, intl,
}) => {
  const levelConfig = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || LEVEL_COLORS[1];
  const balanceInDollars = formatAmount(availableBalance);
  const minimumInDollars = formatAmount(minimumWithdrawal);
  const remaining = minimumWithdrawal - availableBalance;
  const withdrawProgress = Math.min((availableBalance / minimumWithdrawal) * 100, 100);

  // Determine balance state
  const hasPendingWithdrawal = !!pendingWithdrawalId;
  const belowThreshold = !canWithdraw && !hasPendingWithdrawal;

  const handleCopy = useCallback(async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${label} copie !`);
  }, []);

  const handleShare = useCallback(async (url: string) => {
    if (navigator.share) {
      try { await navigator.share({ title: 'SOS Expat', url }); } catch { /* cancelled */ }
    } else {
      const ok = await copyToClipboard(url);
      if (ok) toast.success('Lien copie !');
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* ── 1. Profile ── */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          {photo ? (
            <img src={photo} alt={firstName} className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/20" />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <User className="h-7 w-7 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white truncate">{fullName}</h2>
            <span
              className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${levelConfig.bg} ${levelConfig.text}`}
              style={{ boxShadow: `0 0 12px ${level >= 4 ? 'rgba(251,191,36,0.3)' : level >= 3 ? 'rgba(139,92,246,0.3)' : 'transparent'}` }}
            >
              <FormattedMessage id="chatter.sidebar.level" defaultMessage="Niveau {level}" values={{ level }} />
              {' '}&middot;{' '}{levelConfig.name}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Available Balance ── */}
      <div className="px-4 pb-3">
        <div className={`rounded-xl p-3.5 border ${
          hasPendingWithdrawal
            ? 'bg-blue-500/10 border-blue-500/20'
            : canWithdraw
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">
            <FormattedMessage id="chatter.sidebar.available" defaultMessage="Disponible" />
          </p>
          <p className={`text-2xl font-extrabold tracking-tight ${
            hasPendingWithdrawal
              ? 'text-blue-400'
              : canWithdraw
                ? 'text-emerald-400'
                : 'text-amber-400'
          }`}>
            ${balanceInDollars}
          </p>

          {/* State: Pending withdrawal */}
          {hasPendingWithdrawal && (
            <div className="flex items-center gap-2 mt-2.5 text-blue-400">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-xs font-medium">
                <FormattedMessage id="chatter.sidebar.withdrawPending" defaultMessage="Retrait en cours" />
              </span>
            </div>
          )}

          {/* State: Can withdraw */}
          {canWithdraw && !hasPendingWithdrawal && (
            <button
              onClick={onWithdraw}
              className="mt-2.5 w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-all animate-pulse hover:animate-none shadow-lg shadow-emerald-500/25"
            >
              <FormattedMessage id="chatter.sidebar.withdraw" defaultMessage="Retirer" /> ${balanceInDollars}
            </button>
          )}

          {/* State: Below threshold */}
          {belowThreshold && (
            <div className="mt-2.5">
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
                  style={{ width: `${withdrawProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-amber-400/80 mt-1.5">
                <FormattedMessage
                  id="chatter.sidebar.moreToWithdraw"
                  defaultMessage="Encore {amount} pour retirer"
                  values={{ amount: `$${formatAmount(Math.max(remaining, 0))}` }}
                />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Piggy Bank Mini ── */}
      {piggyBank && (
        <div className="px-4 pb-3">
          <div className="rounded-xl p-3 bg-pink-500/10 border border-pink-500/15">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-semibold text-pink-300">
                  <FormattedMessage id="chatter.sidebar.piggyBank" defaultMessage="Tirelire" />
                </span>
              </div>
              <span className="text-xs font-bold text-pink-400">
                ${formatAmount(piggyBank.totalPending)} / ${formatAmount(piggyBank.unlockThreshold)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all duration-700"
                style={{ width: `${Math.min(piggyBank.progressPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Affiliate Links ── */}
      <div className="px-4 pb-3 space-y-2">
        {/* Client link */}
        <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/15">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              <FormattedMessage id="chatter.sidebar.clientLink" defaultMessage="Lien client" />
            </span>
            {commissionClientCall > 0 && (
              <span className="text-[10px] font-medium text-emerald-500/70">
                <FormattedMessage
                  id="chatter.sidebar.perCall"
                  defaultMessage="{amount}/appel"
                  values={{ amount: `$${formatAmount(commissionClientCall)}` }}
                />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 text-xs font-mono text-emerald-300 truncate bg-white/5 px-2 py-1.5 rounded-lg">
              {clientCode || '---'}
            </code>
            <button
              onClick={() => handleCopy(clientCode, 'Code')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-400 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Copy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleShare(clientShareUrl)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-400 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Share"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recruitment link */}
        <div className="rounded-xl p-3 bg-violet-500/10 border border-violet-500/15">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">
              <FormattedMessage id="chatter.sidebar.recruitLink" defaultMessage="Lien recrutement" />
            </span>
            {commissionN1Call > 0 && (
              <span className="text-[10px] font-medium text-violet-500/70">
                <FormattedMessage
                  id="chatter.sidebar.perCall"
                  defaultMessage="{amount}/appel"
                  values={{ amount: `$${formatAmount(commissionN1Call)}` }}
                />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 text-xs font-mono text-violet-300 truncate bg-white/5 px-2 py-1.5 rounded-lg">
              {recruitmentCode || '---'}
            </code>
            <button
              onClick={() => handleCopy(recruitmentCode, 'Code')}
              className="p-1.5 rounded-lg hover:bg-white/10 text-violet-400 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Copy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleShare(recruitmentShareUrl)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-violet-400 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Share"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Navigation ── */}
      <nav className="px-3 flex-1">
        <ul className="space-y-0.5">
          {drawerItems.map((item) => (
            <li key={item.key}>
              <button
                onClick={() => onNavigate(item.key, item.route)}
                className={`group relative w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all min-h-[40px]
                  ${currentKey === item.key
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
              >
                {currentKey === item.key && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r" />
                )}
                {item.icon}
                {item.labels[language] ?? item.labels.en}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── 6. Level Progression ── */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium text-slate-400">
              <FormattedMessage id="chatter.sidebar.progression" defaultMessage="Progression" />
            </span>
          </div>
          <span className="text-[11px] font-bold text-indigo-400">{Math.round(levelProgress)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
            style={{ width: `${Math.min(levelProgress, 100)}%` }}
          />
        </div>
        {level < 5 && (
          <p className="text-[10px] text-slate-500 mt-1">
            <FormattedMessage id="chatter.sidebar.level" defaultMessage="Niveau {level}" values={{ level: level + 1 }} />
          </p>
        )}
      </div>

      {/* ── 7. Logout ── */}
      <div className="px-3 pb-4 pt-1">
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all min-h-[40px]"
        >
          <LogOut className="w-5 h-5" />
          {loggingOut
            ? intl.formatMessage({ id: 'dashboard.loggingOut', defaultMessage: 'Deconnexion...' })
            : intl.formatMessage({ id: 'dashboard.logout', defaultMessage: 'Deconnexion' })
          }
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// INNER LAYOUT
// ============================================================================
const LayoutInner: React.FC<ChatterDashboardLayoutProps> = ({ children, activeKey }) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { user, logout, authInitialized } = useAuth();
  const { language } = useApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showWithdrawalSheet, setShowWithdrawalSheet] = useState(false);

  // Captain status from Context (no more getDoc!)
  const { dashboardData, clientShareUrl, recruitmentShareUrl, canWithdraw, minimumWithdrawal, refreshDashboard } = useChatterData();
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
    document.body.style.overflow = isDrawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
    if (path.includes('/comment-gagner') || path.includes('/how-to-earn')) return 'howToEarn';
    if (path.includes('/formation') || path.includes('/training') || path.includes('/ressources') || path.includes('/resources')) return 'tools';
    if (path.includes('/profil') || path.includes('/profile')) return 'profile';
    if (path.includes('/mon-equipe') || path.includes('/my-team')) return 'captain';
    return 'home';
  })();

  // 7 main nav items
  const mainNavItems: NavItem[] = [
    { key: 'home', icon: <Home className="w-5 h-5" />, route: routes.dashboard, labels: { fr: 'Accueil', en: 'Home', es: 'Inicio', de: 'Start', ru: 'Главная', pt: 'Inicio', ch: '首页', hi: 'होम', ar: 'الرئيسية' } },
    { key: 'howToEarn', icon: <Lightbulb className="w-5 h-5" />, route: routes.howToEarn, labels: { fr: 'Gagner', en: 'Earn', es: 'Ganar', de: 'Verdienen', ru: 'Заработок', pt: 'Ganhar', ch: '赚钱', hi: 'कमाएँ', ar: 'اكسب' } },
    { key: 'payments', icon: <DollarSign className="w-5 h-5" />, route: routes.payments, labels: { fr: 'Gains', en: 'Earnings', es: 'Ganancias', de: 'Einnahmen', ru: 'Доходы', pt: 'Ganhos', ch: '收益', hi: 'कमाई', ar: 'الأرباح' } },
    { key: 'team', icon: <Users className="w-5 h-5" />, route: routes.referrals, labels: { fr: 'Equipe', en: 'Team', es: 'Equipo', de: 'Team', ru: 'Команда', pt: 'Equipe', ch: '团队', hi: 'टीम', ar: 'الفريق' } },
    { key: 'ranking', icon: <Trophy className="w-5 h-5" />, route: routes.leaderboard, labels: { fr: 'Classement', en: 'Ranking', es: 'Ranking', de: 'Rangliste', ru: 'Рейтинг', pt: 'Ranking', ch: '排名', hi: 'रैंकिंग', ar: 'الترتيب' } },
    { key: 'tools', icon: <Briefcase className="w-5 h-5" />, route: routes.training, labels: { fr: 'Formation', en: 'Training', es: 'Formacion', de: 'Schulung', ru: 'Обучение', pt: 'Formacao', ch: '培训', hi: 'प्रशिक्षण', ar: 'التدريب' } },
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
  const handleFabShare = async () => {
    if (!clientShareUrl) return;
    localStorage.setItem('chatter_link_shared', Date.now().toString());
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SOS Expat', url: clientShareUrl });
        toast.success('Lien partage !');
      } catch { /* cancelled */ }
    } else {
      copyToClipboard(clientShareUrl).then((success) => {
        if (success) toast.success('Lien copie !');
      });
    }
  };

  // Shared sidebar props
  const chatter = dashboardData?.chatter;
  const sidebarProps: SidebarContentProps = {
    photo,
    fullName,
    firstName,
    level: chatter?.level || 1,
    levelProgress: chatter?.levelProgress || 0,
    availableBalance: chatter?.availableBalance || 0,
    canWithdraw,
    minimumWithdrawal,
    pendingWithdrawalId: chatter?.pendingWithdrawalId || null,
    piggyBank: dashboardData?.piggyBank || null,
    clientCode: chatter?.affiliateCodeClient || '',
    recruitmentCode: chatter?.affiliateCodeRecruitment || '',
    clientShareUrl,
    recruitmentShareUrl,
    commissionClientCall: dashboardData?.config?.commissionClientCallAmount || 0,
    commissionN1Call: dashboardData?.config?.commissionN1CallAmount || 0,
    drawerItems,
    currentKey,
    language: language || 'en',
    loggingOut,
    onNavigate: (key, route) => {
      if (currentKey !== key) navigate(route);
    },
    onLogout: () => handleLogout(),
    onWithdraw: () => setShowWithdrawalSheet(true),
    intl,
  };

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Sticky Affiliate Bar */}
        <StickyAffiliateBar />

        <div className="max-w-7xl mx-auto lg:px-6 lg:py-6">
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">

            {/* MOBILE DRAWER */}
            {isDrawerOpen && (
              <>
                <div
                  className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-hidden="true"
                />
                <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border-r border-white/[0.06] shadow-2xl shadow-black/50 overflow-y-auto">
                  {/* Drawer close button */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>

                  <SidebarContent
                    {...sidebarProps}
                    onNavigate={(key, route) => {
                      setIsDrawerOpen(false);
                      if (currentKey !== key) navigate(route);
                    }}
                    onLogout={() => { setIsDrawerOpen(false); handleLogout(); }}
                  />
                </div>
              </>
            )}

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden lg:block">
              <div className="sticky top-4 bg-slate-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
                <SidebarContent {...sidebarProps} />
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
              label={mainNavItems[0].labels[language || 'en'] ?? 'Home'}
              active={currentKey === 'home'}
              onClick={() => currentKey !== 'home' && navigate(routes.dashboard)}
            />
            {/* Gagner */}
            <BottomNavItem
              icon={<Lightbulb className="w-5 h-5" />}
              label={mainNavItems[1].labels[language || 'en'] ?? 'Earn'}
              active={currentKey === 'howToEarn'}
              onClick={() => currentKey !== 'howToEarn' && navigate(routes.howToEarn)}
            />

            {/* FAB - Central Share button */}
            <div className="relative -mt-6">
              <button
                onClick={handleFabShare}
                className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white active:scale-95 transition-transform animate-[fabBounce_0.6s_ease-out]"
                aria-label={intl.formatMessage({ id: 'chatter.share', defaultMessage: 'Partager' })}
              >
                <Share2 className="w-6 h-6" />
              </button>
            </div>

            {/* Gains */}
            <BottomNavItem
              icon={<DollarSign className="w-5 h-5" />}
              label={mainNavItems[2].labels[language || 'en'] ?? 'Earnings'}
              active={currentKey === 'payments'}
              onClick={() => currentKey !== 'payments' && navigate(routes.payments)}
              badge={canWithdraw}
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

      {/* FAB bounce keyframe */}
      <style>{`@keyframes fabBounce { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); } 70% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }`}</style>

      {/* Withdrawal Bottom Sheet */}
      <WithdrawalBottomSheet
        isOpen={showWithdrawalSheet}
        onClose={() => setShowWithdrawalSheet(false)}
        onSuccess={() => refreshDashboard()}
      />
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
  badge?: boolean;
}> = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] transition-colors touch-manipulation ${
      active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    <div className={`relative p-1.5 rounded-lg transition-colors ${active ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}>
      {icon}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
      )}
    </div>
    <span className={`text-[10px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>
      {label}
    </span>
  </button>
);

export default ChatterDashboardLayout;
