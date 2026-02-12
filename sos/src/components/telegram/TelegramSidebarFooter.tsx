// =============================================================================
// TelegramSidebarFooter.tsx - Footer de la Sidebar Telegram (Collapse Toggle)
// =============================================================================

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useIntl } from 'react-intl';

// =============================================================================
// TYPES
// =============================================================================

interface TelegramSidebarFooterProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TelegramSidebarFooter: React.FC<TelegramSidebarFooterProps> = ({
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: key });

  return (
    <div className="p-4 border-t border-sky-800">
      <button
        onClick={onToggleSidebar}
        className={`flex items-center w-full px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-800 hover:text-white rounded-md transition-all ${
          !isSidebarOpen ? 'justify-center' : ''
        }`}
        aria-label={isSidebarOpen ? t('telegram.layout.collapse') : t('telegram.layout.expand')}
      >
        {isSidebarOpen ? (
          <>
            <ChevronLeft className="h-5 w-5 flex-shrink-0" />
            <span className="ml-3">{t('telegram.layout.collapse')}</span>
          </>
        ) : (
          <ChevronRight className="h-5 w-5 flex-shrink-0" />
        )}
      </button>
    </div>
  );
};

export default TelegramSidebarFooter;
