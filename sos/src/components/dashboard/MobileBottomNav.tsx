/**
 * MobileBottomNav - Navigation mobile moderne style 2026
 * Design fluide avec glassmorphism et animations modernes
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '../../multilingual-system';
import { useIntl } from 'react-intl';
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
  const intl = useIntl();

  // Determine active tab based on URL
  const getActiveTab = () => {
    const path = location.pathname;
    const search = location.search;

    if (path.includes('/ai-assistant')) return 'ai';
    if (path.includes('/subscription')) return 'subscription';
    if (search.includes('tab=calls')) return 'calls';
    if (path === '/dashboard' || path.endsWith('/dashboard') || path.includes('/tableau-de-bord')) return 'profile';
    return 'profile';
  };

  const activeTab = getActiveTab();

  // Navigation items - core items for bottom nav
  const navItems = [
    {
      key: 'profile',
      icon: User,
      route: '/dashboard',
      labelKey: 'dashboard.profile',
      defaultLabel: 'Profil',
    },
    {
      key: 'calls',
      icon: Phone,
      route: '/dashboard?tab=calls',
      labelKey: 'dashboard.calls',
      defaultLabel: 'Appels',
    },
    // AI Assistant only for providers and admin
    ...(userRole === 'lawyer' || userRole === 'expat' || userRole === 'admin' ? [{
      key: 'ai',
      icon: Bot,
      route: '/dashboard/ai-assistant',
      labelKey: 'dashboard.aiAssistant',
      defaultLabel: 'IA',
      badge: true,
    }] : []),
    // Subscription only for providers
    ...(userRole === 'lawyer' || userRole === 'expat' ? [{
      key: 'subscription',
      icon: CreditCard,
      route: '/dashboard/subscription',
      labelKey: 'dashboard.subscription',
      defaultLabel: 'Abo',
    }] : []),
    {
      key: 'more',
      icon: Menu,
      route: '',
      labelKey: 'common.more',
      defaultLabel: 'Plus',
      isMore: true,
    },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isMore) {
      onMoreClick();
      return;
    }

    navigate(item.route);

    // Auto-scroll to content after navigation
    setTimeout(() => {
      const contentEl = document.getElementById('dashboard-content');
      if (contentEl) {
        contentEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-gray-200/60 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]" />

      {/* Navigation content */}
      <div className="relative flex items-center justify-around h-[68px] px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          const label = intl.formatMessage({ id: item.labelKey, defaultMessage: item.defaultLabel });

          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item)}
              className={`
                relative flex flex-col items-center justify-center flex-1 h-full py-2 px-1
                transition-all duration-300 ease-out
                ${isActive
                  ? 'scale-100'
                  : 'scale-95 hover:scale-100 active:scale-90'
                }
              `}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon container with animated background */}
              <div className={`
                relative flex items-center justify-center w-12 h-9 rounded-2xl
                transition-all duration-300 ease-out
                ${isActive
                  ? 'bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/25'
                  : 'bg-transparent hover:bg-gray-100 dark:hover:bg-white/10'
                }
              `}>
                <Icon
                  className={`
                    w-[22px] h-[22px] transition-all duration-300
                    ${isActive
                      ? 'text-white'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* AI badge pulse */}
                {'badge' in item && item.badge && (
                  <span className={`
                    absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                    ${isActive
                      ? 'bg-white shadow-sm'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse'
                    }
                  `} />
                )}
              </div>

              {/* Label with smooth transition */}
              <span className={`
                text-[11px] font-semibold mt-1 transition-all duration-300
                ${isActive
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}>
                {label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Safe area padding for iOS */}
      <div
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl"
        style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
      />
    </nav>
  );
};

export default MobileBottomNav;
