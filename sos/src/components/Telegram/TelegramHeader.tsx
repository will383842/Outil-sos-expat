// =============================================================================
// TelegramHeader.tsx - Top Header pour Telegram Marketing
// =============================================================================

import React from 'react';
import { Menu } from 'lucide-react';
import { useIntl } from 'react-intl';
import TelegramBreadcrumb from './TelegramBreadcrumb';

// =============================================================================
// TYPES
// =============================================================================

interface TelegramHeaderProps {
  isMobile: boolean;
  onToggleMobileSidebar: () => void;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  isMobile,
  onToggleMobileSidebar,
}) => {
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: key });

  return (
    <header className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={onToggleMobileSidebar}
          className="px-4 text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500"
          aria-label={t('telegram.layout.openMenu') || 'Ouvrir le menu'}
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      {/* Breadcrumb & Actions */}
      <div className="flex-1 px-4 flex items-center justify-between">
        <TelegramBreadcrumb />

        {/* Actions (Placeholder pour futures actions) */}
        <div className="flex items-center space-x-4">
          {/* Ex: Notifications, Quick Actions, etc. */}
        </div>
      </div>
    </header>
  );
};

export default TelegramHeader;
