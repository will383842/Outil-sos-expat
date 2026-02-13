// =============================================================================
// TelegramSidebar.tsx - Sidebar Navigation pour Telegram Marketing
// =============================================================================

import React from 'react';
import { telegramMenuTree } from '../../config/telegramMenu';
import SidebarItem from '../admin/sidebar/SidebarItem';
import TelegramSidebarHeader from './TelegramSidebarHeader';
import TelegramSidebarFooter from './TelegramSidebarFooter';

// =============================================================================
// TYPES
// =============================================================================

interface TelegramSidebarProps {
  isMobile: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TelegramSidebar: React.FC<TelegramSidebarProps> = ({
  isMobile,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <div className="flex flex-col h-full bg-sky-900">
      {/* Header */}
      <TelegramSidebarHeader isSidebarOpen={isSidebarOpen} />

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 py-4 space-y-1">
          {telegramMenuTree.map((node) => (
            <SidebarItem
              key={node.id}
              node={node}
              isSidebarCollapsed={!isSidebarOpen}
            />
          ))}
        </nav>
      </div>

      {/* Footer (Collapse Toggle) */}
      {!isMobile && (
        <TelegramSidebarFooter
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={onToggleSidebar}
        />
      )}
    </div>
  );
};

export default TelegramSidebar;
