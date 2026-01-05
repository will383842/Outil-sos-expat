import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface WizardContextType {
  /** Whether a wizard (like GuidedFilterWizard) is currently open */
  isWizardOpen: boolean;
  /** Set the wizard open state */
  setWizardOpen: (open: boolean) => void;
}

const WizardContext = createContext<WizardContextType>({
  isWizardOpen: false,
  setWizardOpen: () => {},
});

interface WizardProviderProps {
  children: ReactNode;
}

/**
 * Provider for sharing wizard state globally.
 * Used to hide popups (cookie banner, PWA install) during wizard steps.
 */
export const WizardProvider: React.FC<WizardProviderProps> = ({ children }) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const setWizardOpen = useCallback((open: boolean) => {
    setIsWizardOpen(open);
  }, []);

  return (
    <WizardContext.Provider value={{ isWizardOpen, setWizardOpen }}>
      {children}
    </WizardContext.Provider>
  );
};

/**
 * Hook to access wizard state from any component.
 * Used in Layout to hide popups when wizard is open.
 */
export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};

export default WizardContext;
