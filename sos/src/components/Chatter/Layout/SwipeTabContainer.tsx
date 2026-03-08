/**
 * SwipeTabContainer - Swipeable tab container for mobile navigation between sub-tabs
 * Pure CSS + JS touch events, no library dependency
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Tab {
  key: string;
  label: React.ReactNode;
  content: React.ReactNode;
}

interface SwipeTabContainerProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  className?: string;
}

const SWIPE_THRESHOLD = 50;

const SwipeTabContainer: React.FC<SwipeTabContainerProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  className = '',
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.key || '');
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const activeIndex = tabs.findIndex((t) => t.key === activeTab);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const setActiveTab = useCallback(
    (key: string) => {
      if (onTabChange) {
        onTabChange(key);
      } else {
        setInternalActiveTab(key);
      }
    },
    [onTabChange]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      // Only swipe if horizontal movement is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX < 0 && activeIndex < tabs.length - 1) {
          setActiveTab(tabs[activeIndex + 1].key);
        } else if (deltaX > 0 && activeIndex > 0) {
          setActiveTab(tabs[activeIndex - 1].key);
        }
      }
    },
    [activeIndex, tabs, setActiveTab]
  );

  // Scroll active tab into view
  useEffect(() => {
    if (tabsRef.current) {
      const activeButton = tabsRef.current.querySelector('[data-active="true"]');
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  if (tabs.length === 0) return null;

  return (
    <div className={className}>
      {/* Tab headers - horizontally scrollable on mobile */}
      <div
        ref={tabsRef}
        className="flex overflow-x-auto scrollbar-hide border-b border-slate-200 dark:border-white/10 -mx-4 px-4 sm:mx-0 sm:px-0"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              data-active={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap
                ${isActive
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }
              `}
            >
              {tab.label}
              {/* Active indicator */}
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-500 transition-transform duration-200 origin-center
                  ${isActive ? 'scale-x-100' : 'scale-x-0'}
                `}
              />
            </button>
          );
        })}
      </div>

      {/* Tab content - swipeable */}
      <div
        className="mt-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {tabs[activeIndex >= 0 ? activeIndex : 0]?.content}
      </div>
    </div>
  );
};

export default SwipeTabContainer;
