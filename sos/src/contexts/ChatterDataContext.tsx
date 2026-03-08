/**
 * ChatterDataContext - Calls useChatter() ONCE in the Layout, shares via Context to all pages
 * Eliminates redundant Firestore listeners when navigating between chatter pages.
 */

import React, { createContext, useContext } from 'react';
import { useChatter } from '@/hooks/useChatter';

type ChatterDataContextType = ReturnType<typeof useChatter>;

const ChatterDataContext = createContext<ChatterDataContextType | null>(null);

export function ChatterDataProvider({ children }: { children: React.ReactNode }) {
  const chatterData = useChatter();
  return (
    <ChatterDataContext.Provider value={chatterData}>
      {children}
    </ChatterDataContext.Provider>
  );
}

export function useChatterData(): ChatterDataContextType {
  const ctx = useContext(ChatterDataContext);
  if (!ctx) {
    throw new Error('useChatterData must be used within ChatterDataProvider');
  }
  return ctx;
}

export { ChatterDataContext };
export default ChatterDataProvider;
