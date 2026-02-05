/**
 * Protected Route Component
 * Redirects unauthenticated users to login
 * Supports both children and Outlet pattern
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui';
import BlockedScreen from './BlockedScreen';

interface ProtectedRouteProps {
  children?: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, error } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 safe-top">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-600">Chargement...</p>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    if (error) {
      return <BlockedScreen message={error} />;
    }
    const redirectPath = location.pathname + location.search;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirectPath)}`}
        replace
      />
    );
  }

  // Check role
  if (user.role !== 'agency_manager' && user.role !== 'admin') {
    return <BlockedScreen />;
  }

  return children ? <>{children}</> : <Outlet />;
}
