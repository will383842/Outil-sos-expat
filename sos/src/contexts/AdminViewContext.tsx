import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface AdminViewContextType {
  /** The userId being viewed (from URL param), or null if not impersonating */
  viewAsUserId: string | null;
  /** True if admin is viewing another user's dashboard */
  isAdminView: boolean;
  /** The effective userId to use for data loading (viewAsUserId or current user's uid) */
  effectiveUserId: string | null;
}

const AdminViewContext = createContext<AdminViewContextType>({
  viewAsUserId: null,
  isAdminView: false,
  effectiveUserId: null,
});

export function AdminViewProvider({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const value = useMemo(() => {
    const adminViewId = searchParams.get('adminView');
    const isAdmin = user?.role === 'admin';
    const isAdminView = !!(isAdmin && adminViewId);

    return {
      viewAsUserId: isAdminView ? adminViewId : null,
      isAdminView,
      effectiveUserId: isAdminView ? adminViewId : (user?.uid ?? user?.id ?? null),
    };
  }, [searchParams, user]);

  return (
    <AdminViewContext.Provider value={value}>
      {children}
    </AdminViewContext.Provider>
  );
}

export function useAdminView(): AdminViewContextType {
  return useContext(AdminViewContext);
}
