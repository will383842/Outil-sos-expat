/**
 * MobileSideDrawer - Drawer latéral pour le menu mobile
 * S'ouvre depuis la droite avec animation fluide
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocaleNavigate } from '../../multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '../../multilingual-system/core/routing/localeRoutes';
import { useIntl } from 'react-intl';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  User,
  Phone,
  FileText,
  Star,
  MessageSquare,
  Bookmark,
  Shield,
  LogOut,
  Bot,
  CreditCard,
  Mail,
  Sparkles,
} from 'lucide-react';

interface MobileSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  aiQuota?: {
    currentUsage: number;
    limit: number;
    remaining: number;
    isInTrial: boolean;
    trialDaysRemaining?: number;
    canMakeAiCall: boolean;
  };
}

const MobileSideDrawer: React.FC<MobileSideDrawerProps> = ({
  isOpen,
  onClose,
  aiQuota,
}) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { language } = useApp();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Close on outside click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Get active key from URL
  const getActiveKey = () => {
    const path = location.pathname;
    const search = location.search;
    if (path.includes('/ai-assistant')) return 'ai-assistant';
    if (path.includes('/subscription')) return 'subscription';
    if (search.includes('tab=calls')) return 'calls';
    if (search.includes('tab=invoices')) return 'invoices';
    if (search.includes('tab=reviews')) return 'reviews';
    if (search.includes('tab=messages')) return 'messages';
    if (search.includes('tab=favorites')) return 'favorites';
    return 'profile';
  };

  const activeKey = getActiveKey();

  // P0 FIX: Get translated dashboard slug based on current language
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  // Get translated routes for current language
  const translatedRoutes = useMemo(() => {
    const dashboardSlug = getTranslatedRouteSlug('dashboard' as RouteKey, langCode);
    const aiAssistantSlug = getTranslatedRouteSlug('dashboard-ai-assistant' as RouteKey, langCode);
    const subscriptionSlug = getTranslatedRouteSlug('dashboard-subscription' as RouteKey, langCode);
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
      login: `/${loginSlug}`,
    };
  }, [langCode]);

  // All menu items (all 9 supported languages)
  // ✅ FIX: Mark items as internal tabs (use setSearchParams) vs external routes (use navigate)
  const menuItems = [
    {
      key: 'profile',
      icon: User,
      isInternalTab: true, // Uses setSearchParams
      tabKey: null, // profile = no tab param
      labels: { fr: 'Mon profil', en: 'My profile', es: 'Mi perfil', de: 'Mein Profil', ru: 'Мой профиль', pt: 'Meu perfil', ch: '我的资料', hi: 'मेरी प्रोफ़ाइल', ar: 'ملفي' },
    },
    {
      key: 'calls',
      icon: Phone,
      isInternalTab: true,
      tabKey: 'calls',
      labels: { fr: 'Mes appels', en: 'My calls', es: 'Mis llamadas', de: 'Meine Anrufe', ru: 'Мои звонки', pt: 'Minhas chamadas', ch: '我的通话', hi: 'मेरी कॉल', ar: 'مكالماتي' },
    },
    {
      key: 'invoices',
      icon: FileText,
      isInternalTab: true,
      tabKey: 'invoices',
      labels: { fr: 'Mes factures', en: 'My invoices', es: 'Mis facturas', de: 'Meine Rechnungen', ru: 'Мои счета', pt: 'Minhas faturas', ch: '我的发票', hi: 'मेरे इनवॉयस', ar: 'فواتيري' },
    },
    {
      key: 'reviews',
      icon: Star,
      isInternalTab: true,
      tabKey: 'reviews',
      labels: { fr: 'Mes avis', en: 'My reviews', es: 'Mis reseñas', de: 'Meine Bewertungen', ru: 'Мои отзывы', pt: 'Minhas avaliações', ch: '我的评价', hi: 'मेरी समीक्षाएं', ar: 'تقييماتي' },
    },
    {
      key: 'messages',
      icon: MessageSquare,
      isInternalTab: true,
      tabKey: 'messages',
      labels: { fr: 'Mes messages', en: 'My messages', es: 'Mis mensajes', de: 'Meine Nachrichten', ru: 'Мои сообщения', pt: 'Minhas mensagens', ch: '我的消息', hi: 'मेरे संदेश', ar: 'رسائلي' },
    },
    {
      key: 'favorites',
      icon: Bookmark,
      isInternalTab: true,
      tabKey: 'favorites',
      labels: { fr: 'Mes favoris', en: 'My favorites', es: 'Mis favoritos', de: 'Meine Favoriten', ru: 'Мое избранное', pt: 'Meus favoritos', ch: '我的收藏', hi: 'मेरे पसंदीदा', ar: 'مفضلاتي' },
    },
  ];

  // AI items for providers (all 9 supported languages)
  // These are external routes (separate pages), not internal tabs
  const aiItems = (user?.role === 'lawyer' || user?.role === 'expat' || user?.role === 'admin') ? [
    {
      key: 'ai-assistant',
      icon: Bot,
      isInternalTab: false,
      route: translatedRoutes.aiAssistant,
      labels: { fr: 'Assistant IA', en: 'AI Assistant', es: 'Asistente IA', de: 'KI-Assistent', ru: 'ИИ Ассистент', pt: 'Assistente IA', ch: 'AI助手', hi: 'एआई सहायक', ar: 'مساعد الذكاء' },
      badge: 'NEW',
    },
    {
      key: 'subscription',
      icon: CreditCard,
      isInternalTab: false,
      route: translatedRoutes.subscription,
      labels: { fr: 'Mon Abonnement', en: 'My Subscription', es: 'Mi Suscripción', de: 'Mein Abo', ru: 'Моя подписка', pt: 'Minha Assinatura', ch: '我的订阅', hi: 'मेरी सदस्यता', ar: 'اشتراكي' },
    },
  ] : [];

  // ✅ FIX: Handle both internal tabs (setSearchParams) and external routes (navigate)
  const handleNavClick = (item: { isInternalTab?: boolean; tabKey?: string | null; route?: string }) => {
    if (item.isInternalTab) {
      // Internal tab - use setSearchParams to change tab
      if (item.tabKey === null) {
        // Profile tab - remove tab param
        setSearchParams({});
      } else if (item.tabKey) {
        setSearchParams({ tab: item.tabKey });
      }
    } else if (item.route) {
      // External route - use navigate
      navigate(item.route);
    }

    onClose();

    // Auto-scroll to content
    setTimeout(() => {
      const contentEl = document.getElementById('dashboard-content');
      if (contentEl) {
        contentEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate(translatedRoutes.login);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] lg:hidden"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0'}
        `}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`
          absolute top-0 right-0 h-full w-[85%] max-w-sm
          bg-white dark:bg-gray-900 shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt=""
                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-white/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {user?.firstName || user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* Main navigation */}
          <div className="px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeKey === item.key;
              const label = item.labels[language as keyof typeof item.labels] || item.labels.en;

              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1
                    transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 dark:from-red-500/10 dark:to-orange-500/10 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98]'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-red-600 dark:text-red-400' : ''}`} />
                  <span className="font-medium text-sm">{label}</span>
                  {isActive && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                      {intl.formatMessage({ id: 'dashboard.active' })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* AI Section */}
          {aiItems.length > 0 && (
            <>
              <div className="h-px bg-gray-200 dark:bg-white/10 my-3 mx-4" />
              <div className="px-2">
                <p className="px-4 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {intl.formatMessage({ id: 'dashboard.aiTools', defaultMessage: 'AI Tools' })}
                </p>
                {aiItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeKey === item.key;
                  const label = item.labels[language as keyof typeof item.labels] || item.labels.en;

                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavClick(item)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1
                        transition-all duration-200
                        ${isActive
                          ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 dark:from-purple-500/10 dark:to-pink-500/10 dark:text-purple-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98]'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-purple-600 dark:text-purple-400' : ''}`} />
                      <span className="font-medium text-sm">{label}</span>
                      {'badge' in item && item.badge && (
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Admin link */}
          {user?.role === 'admin' && (
            <>
              <div className="h-px bg-gray-200 dark:bg-white/10 my-3 mx-4" />
              <div className="px-2">
                <button
                  onClick={() => handleNavClick({ isInternalTab: false, route: '/admin/dashboard' })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium text-sm">
                    {intl.formatMessage({ id: 'dashboard.administration' })}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* AI Quota Widget (for providers) */}
        {aiQuota && (user?.role === 'lawyer' || user?.role === 'expat') && (
          <div className="p-4 border-t border-gray-200 dark:border-white/10">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {intl.formatMessage({ id: 'dashboard.aiQuota' })}
                  </span>
                </div>
                {aiQuota.isInTrial && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
                    {intl.formatMessage({ id: 'subscription.plans.trial' })}
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    aiQuota.limit === -1
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : aiQuota.remaining === 0
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  }`}
                  style={{
                    width: aiQuota.limit === -1 ? '100%' : `${Math.min(100, (aiQuota.currentUsage / aiQuota.limit) * 100)}%`
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-600 dark:text-gray-400">
                {aiQuota.limit === -1
                  ? intl.formatMessage({ id: 'subscription.quota.unlimited' })
                  : `${aiQuota.currentUsage}/${aiQuota.limit} ${intl.formatMessage({ id: 'dashboard.calls' })}`
                }
              </p>
            </div>
          </div>
        )}

        {/* Logout button */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium text-sm"
          >
            <LogOut className="w-5 h-5" />
            {intl.formatMessage({ id: 'dashboard.logout' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileSideDrawer;
