/**
 * Bottom Navigation Component (Mobile only)
 * Fixed bottom bar with main navigation items
 */
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Inbox, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBookingRequests } from '../../hooks';

export default function BottomNav() {
  const { pendingCount } = useBookingRequests();
  const { t } = useTranslation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.home') },
    { to: '/requests', icon: Inbox, label: t('nav.requests'), hasBadge: true },
    { to: '/team', icon: Users, label: t('nav.team') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden safe-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-colors ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-400'
              }`
            }
          >
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {item.hasBadge && pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center min-w-[18px] h-5 px-1 text-[11px] font-bold bg-red-500 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
