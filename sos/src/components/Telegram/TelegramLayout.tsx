// =============================================================================
// TelegramLayout.tsx - Layout dédié pour l'outil Telegram Marketing
// =============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useOutlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

import TelegramSidebar from './TelegramSidebar';
import TelegramHeader from './TelegramHeader';
import ErrorBoundary from '../common/ErrorBoundary';

// =============================================================================
// TYPES
// =============================================================================

interface TelegramLayoutProps {
  children?: ReactNode;
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const TelegramLayout: React.FC<TelegramLayoutProps> = ({ children }) => {
  // =========================================================================
  // HOOKS
  // =========================================================================
  const outlet = useOutlet();
  const location = useLocation();

  // =========================================================================
  // LOCAL STATE
  // =========================================================================
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // =========================================================================
  // EFFECTS
  // =========================================================================

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Sidebar preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('telegram-sidebar-open');
      if (saved !== null) {
        setIsSidebarOpen(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse telegram-sidebar-open from localStorage:', e);
    }
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // =========================================================================
  // CALLBACKS
  // =========================================================================

  const toggleSidebar = useCallback(() => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('telegram-sidebar-open', JSON.stringify(newState));
  }, [isSidebarOpen]);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((s) => !s);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  // =========================================================================
  // RENDER PRINCIPAL
  // =========================================================================

  return (
    <ErrorBoundary>
      <div className="h-screen flex overflow-hidden bg-gray-50">

        {/* MOBILE SIDEBAR OVERLAY */}
        {isMobile && isMobileSidebarOpen && (
          <div className="fixed inset-0 flex z-40">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-sky-900">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  onClick={closeMobileSidebar}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-label="Fermer le menu"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>
              <TelegramSidebar
                isMobile={true}
                isSidebarOpen={true}
                onToggleSidebar={toggleSidebar}
              />
            </div>
          </div>
        )}

        {/* DESKTOP SIDEBAR */}
        {!isMobile && (
          <div className={`flex flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
            <TelegramSidebar
              isMobile={false}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={toggleSidebar}
            />
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          <TelegramHeader
            isMobile={isMobile}
            onToggleMobileSidebar={toggleMobileSidebar}
          />

          <main className="flex-1 relative overflow-y-auto focus:outline-none bg-white" role="main">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {outlet ?? children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default TelegramLayout;
