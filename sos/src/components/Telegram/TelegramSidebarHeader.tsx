// =============================================================================
// TelegramSidebarHeader.tsx - Header de la Sidebar Telegram
// =============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { Send, ChevronLeft } from 'lucide-react';
import { useIntl } from 'react-intl';

// =============================================================================
// TYPES
// =============================================================================

interface TelegramSidebarHeaderProps {
  isSidebarOpen: boolean;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TelegramSidebarHeader: React.FC<TelegramSidebarHeaderProps> = ({ isSidebarOpen }) => {
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: key });

  return (
    <div className="flex flex-col border-b border-sky-800">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 bg-sky-800">
        <div className="flex items-center min-w-0">
          <Send className="h-8 w-8 text-sky-300 flex-shrink-0" />
          {isSidebarOpen && (
            <span className="ml-2 text-xl font-bold text-white truncate">
              {t('telegram.layout.telegramMarketing')}
            </span>
          )}
        </div>
      </div>

      {/* Back Button */}
      {isSidebarOpen && (
        <Link
          to="/admin/toolbox"
          className="flex items-center px-4 py-3 text-sm font-medium text-sky-200 hover:bg-sky-800 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">{t('telegram.layout.backToToolbox')}</span>
        </Link>
      )}
    </div>
  );
};

export default TelegramSidebarHeader;
