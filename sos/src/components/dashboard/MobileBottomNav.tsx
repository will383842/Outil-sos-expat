/**
 * MobileBottomNav - Navigation mobile moderne style 2026
 * Design fluide avec glassmorphism et animations modernes
 *
 * P0 FIX: Navigation via URL query params + indicateur actif clair
 */

import React, { useMemo, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocaleNavigate } from '../../multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '../../multilingual-system/core/routing/localeRoutes';
import { useApp } from '../../contexts/AppContext';
import {
  User,
  Phone,
  Bot,
  CreditCard,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  userRole?: string;
  onMoreClick: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ userRole, onMoreClick }) => {
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useApp();

  // P0 FIX: Get translated routes based on current language
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const translatedRoutes = useMemo(() => {
    const dashboardSlug = getTranslatedRouteSlug('dashboard' as RouteKey, langCode);
    const aiAssistantSlug = getTranslatedRouteSlug('dashboard-ai-assistant' as RouteKey, langCode);
    const subscriptionSlug = getTranslatedRouteSlug('dashboard-subscription' as RouteKey, langCode);

    return {
      dashboard: `/${dashboardSlug}`,
      dashboardCalls: `/${dashboardSlug}?tab=calls`,
      aiAssistant: `/${aiAssistantSlug}`,
      subscription: `/${subscriptionSlug}`,
    };
  }, [langCode]);

  // P0 FIX: Determine active tab based on URL + query params
  const getActiveTab = (): string => {
    const path = location.pathname;
    const tabParam = searchParams.get('tab');

    // Check query param first (most specific)
    if (tabParam === 'calls') return 'calls';

    // Check path for sub-routes (match both translated and English paths)
    if (path.includes('/ai-assistant') || path.includes('/assistant-ia')) return 'ai';
    if (path.includes('/subscription') || path.includes('/abonnement')) return 'subscription';

    // Default to profile for dashboard root
    if (path.includes('/dashboard') || path.includes('/tableau-de-bord') || path.includes('/panel')) {
      return tabParam || 'profile';
    }

    return 'profile';
  };

  const activeTab = getActiveTab();

  // Navigation items with SHORT labels (max 5 chars) - using translated routes
  // ✅ FIX: Mark items as internal tabs (use setSearchParams) vs external routes (use navigate)
  const navItems = [
    {
      key: 'profile',
      icon: User,
      isInternalTab: true,
      tabKey: null, // profile = no tab param
      label: 'Profil',
    },
    {
      key: 'calls',
      icon: Phone,
      isInternalTab: true,
      tabKey: 'calls',
      label: 'Appels',
    },
    // AI Assistant only for providers and admin
    ...(userRole === 'lawyer' || userRole === 'expat' || userRole === 'admin' ? [{
      key: 'ai',
      icon: Bot,
      isInternalTab: false,
      route: translatedRoutes.aiAssistant,
      label: 'IA',
      badge: true,
    }] : []),
    // Subscription only for providers
    ...(userRole === 'lawyer' || userRole === 'expat' ? [{
      key: 'subscription',
      icon: CreditCard,
      isInternalTab: false,
      route: translatedRoutes.subscription,
      label: 'Abo',
    }] : []),
    {
      key: 'more',
      icon: Menu,
      isMore: true,
      label: 'Menu',
    },
  ];

  // ✅ FIX: Handle both internal tabs (setSearchParams) and external routes (navigate)
  const handleNavClick = useCallback((item: typeof navItems[0]) => {
    if (item.isMore) {
      onMoreClick();
      return;
    }

    if (item.isInternalTab) {
      // Internal tab - use setSearchParams to change tab
      if ('tabKey' in item && item.tabKey === null) {
        // Profile tab - remove tab param
        setSearchParams({});
      } else if ('tabKey' in item && item.tabKey) {
        setSearchParams({ tab: item.tabKey });
      }
    } else if ('route' in item && item.route) {
      // External route - use navigate
      navigate(item.route);
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate, onMoreClick, setSearchParams]);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700" />

      {/* Navigation content */}
      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item)}
              className={`
                relative flex flex-col items-center justify-center min-w-[56px] h-full py-1
                transition-all duration-200
                ${isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'}
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active pill background - VERY VISIBLE */}
              {isActive && (
                <div className="absolute inset-x-1 top-1 bottom-1 bg-red-500/10 dark:bg-red-500/20 rounded-xl" />
              )}

              {/* Icon container */}
              <div className={`
                relative flex items-center justify-center w-10 h-8 rounded-xl
                transition-all duration-200
                ${isActive
                  ? 'bg-red-500 shadow-lg shadow-red-500/30'
                  : 'bg-gray-100 dark:bg-gray-800'
                }
              `}>
                <Icon
                  className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* AI badge */}
                {'badge' in item && item.badge && (
                  <span className={`
                    absolute -top-1 -right-1 w-2 h-2 rounded-full
                    ${isActive ? 'bg-white' : 'bg-purple-500 animate-pulse'}
                  `} />
                )}
              </div>

              {/* Label - SHORT and BOLD when active */}
              <span className={`
                text-[10px] mt-0.5 truncate max-w-[50px]
                ${isActive
                  ? 'font-bold text-red-600 dark:text-red-400'
                  : 'font-medium text-gray-500 dark:text-gray-400'
                }
              `}>
                {item.label}
              </span>

              {/* Active dot indicator at bottom */}
              {isActive && (
                <span className="absolute bottom-0.5 w-4 h-1 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Safe area padding for iOS */}
      <div
        className="bg-white/95 dark:bg-gray-900/95"
        style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
      />
    </nav>
  );
};

export default MobileBottomNav;
