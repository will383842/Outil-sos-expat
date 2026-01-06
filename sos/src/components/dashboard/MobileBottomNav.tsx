/**
 * MobileBottomNav - Navigation mobile moderne style 2026
 * Bottom navigation avec icônes et animations fluides
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '../../multilingual-system';
import { useApp } from '../../contexts/AppContext';
import {
  User,
  Phone,
  Bot,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react';

interface MobileBottomNavProps {
  userRole?: string;
  onMoreClick: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ userRole, onMoreClick }) => {
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();

  // Determine active tab based on URL
  const getActiveTab = () => {
    const path = location.pathname;
    const search = location.search;

    if (path.includes('/ai-assistant')) return 'ai';
    if (path.includes('/subscription')) return 'subscription';
    if (search.includes('tab=calls')) return 'calls';
    if (path === '/dashboard' || path.endsWith('/dashboard')) return 'profile';
    return 'profile';
  };

  const activeTab = getActiveTab();

  // Navigation items - core items for bottom nav
  const navItems = [
    {
      key: 'profile',
      icon: User,
      route: '/dashboard',
      labels: { fr: 'Profil', en: 'Profile', es: 'Perfil', de: 'Profil' },
    },
    {
      key: 'calls',
      icon: Phone,
      route: '/dashboard?tab=calls',
      labels: { fr: 'Appels', en: 'Calls', es: 'Llamadas', de: 'Anrufe' },
    },
    // AI Assistant only for providers
    ...(userRole === 'lawyer' || userRole === 'expat' || userRole === 'admin' ? [{
      key: 'ai',
      icon: Bot,
      route: '/dashboard/ai-assistant',
      labels: { fr: 'IA', en: 'AI', es: 'IA', de: 'KI' },
      badge: true,
    }] : []),
    // Subscription only for providers
    ...(userRole === 'lawyer' || userRole === 'expat' ? [{
      key: 'subscription',
      icon: CreditCard,
      route: '/dashboard/subscription',
      labels: { fr: 'Abo', en: 'Plan', es: 'Plan', de: 'Abo' },
    }] : []),
    {
      key: 'more',
      icon: MoreHorizontal,
      route: '',
      labels: { fr: 'Plus', en: 'More', es: 'Más', de: 'Mehr' },
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          const label = item.labels[language as keyof typeof item.labels] || item.labels.en;

          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item)}
              className={`
                relative flex flex-col items-center justify-center flex-1 h-full py-1 px-1
                transition-all duration-200 ease-out
                ${isActive
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400 active:scale-95'
                }
              `}
              aria-label={label}
            >
              {/* Active indicator pill */}
              {isActive && (
                <span className="absolute top-1 w-8 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full" />
              )}

              {/* Icon container */}
              <span className={`
                relative flex items-center justify-center w-10 h-10 rounded-xl
                transition-all duration-200
                ${isActive
                  ? 'bg-red-50 dark:bg-red-500/10'
                  : 'hover:bg-gray-100 dark:hover:bg-white/5'
                }
              `}>
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* NEW badge for AI */}
                {'badge' in item && item.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" />
                )}
              </span>

              {/* Label */}
              <span className={`
                text-[10px] font-medium mt-0.5 transition-all duration-200
                ${isActive ? 'opacity-100' : 'opacity-70'}
              `}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe area spacer for iOS */}
      <div className="h-safe-area-inset-bottom bg-white/95 dark:bg-gray-900/95" />
    </nav>
  );
};

export default MobileBottomNav;
