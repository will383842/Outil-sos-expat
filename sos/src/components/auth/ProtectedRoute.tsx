import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import { checkUserRole, isUserBanned } from '../../utils/auth';

/**
 * Validates that a redirect URL is safe (local path only)
 * Prevents open redirect vulnerabilities
 */
const isValidLocalRedirect = (url: string): boolean => {
  // Must start with / and not have protocol or double slashes
  if (!url || typeof url !== 'string') return false;

  // Reject URLs with protocols (http:, https:, javascript:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return false;

  // Reject protocol-relative URLs (//example.com)
  if (url.startsWith('//')) return false;

  // Reject URLs with @ (user@host format)
  if (url.includes('@')) return false;

  // Must be a relative path starting with /
  if (!url.startsWith('/')) return false;

  // Reject URLs with backslashes (path traversal)
  if (url.includes('\\')) return false;

  return true;
};

/**
 * Sanitizes a redirect URL, returning a safe default if invalid
 */
const sanitizeRedirectUrl = (url: string, defaultPath: string = '/'): string => {
  return isValidLocalRedirect(url) ? url : defaultPath;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string | string[];
  fallbackPath?: string; // Peut être surchargé par l'appelant
  showError?: boolean;
}

type AuthState = 'loading' | 'checking' | 'authorized' | 'unauthorized' | 'error' | 'banned';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath,
  showError = false,
}) => {
  const intl = useIntl();
  const location = useLocation();
  const { user, isLoading, authInitialized, error: authError } = useAuth();

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  // ⚠️ Fallback robuste : admin → /admin/login, sinon → /login
  const computedFallbackPath = useMemo(() => {
    if (fallbackPath) return fallbackPath;

    const isAdminRoute =
      (Array.isArray(allowedRoles) ? allowedRoles.includes('admin') : allowedRoles === 'admin') ||
      location.pathname.startsWith('/admin');

    return isAdminRoute ? '/admin/login' : '/login';
  }, [fallbackPath, allowedRoles, location.pathname]);

  const shouldCheckAuth = useMemo(
    () => authInitialized && !isLoading && !authError,
    [authInitialized, isLoading, authError]
  );

  const checkAuthorization = useCallback(async () => {
    if (!user) {
      setAuthState('unauthorized');
      return;
    }

    setAuthState('checking');
    setError(null);

    try {
      // Timeout anti-latence sur le check de ban (15s pour réseaux lents)
      const banned = await Promise.race([
        isUserBanned(user.id),
        new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000)),
      ]);

      if (banned) {
        setAuthState('banned');
        return;
      }

      if (allowedRoles) {
        const hasRole = checkUserRole(user, allowedRoles);
        setAuthState(hasRole ? 'authorized' : 'unauthorized');
      } else {
        setAuthState('authorized');
      }
    } catch (err) {
       
      console.error('Authorization check failed:', err);
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setAuthState('error');
    }
  }, [user, allowedRoles]);

  useEffect(() => {
    if (shouldCheckAuth) {
      checkAuthorization();
    } else if (authError) {
      setAuthState('error');
      setError(intl.formatMessage({ id: 'auth.failed' }));
    } else {
      setAuthState('loading');
    }
  }, [shouldCheckAuth, checkAuthorization, authError, intl]);

  const fullPath = useMemo(
    () => location.pathname + location.search + location.hash,
    [location]
  );

  // Sanitize the redirect URL to prevent open redirect attacks
  const safeRedirectParam = useMemo(
    () => sanitizeRedirectUrl(fullPath, computedFallbackPath),
    [fullPath, computedFallbackPath]
  );

  const renderContent = () => {
    switch (authState) {
      case 'loading':
      case 'checking':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <LoadingSpinner size="large" color="red" />
            <p className="mt-4 text-sm text-gray-600 text-center">
              {authState === 'loading' ? intl.formatMessage({ id: 'auth.initializing' }) : intl.formatMessage({ id: 'auth.verifyingAccess' })}
            </p>
          </div>
        );

      case 'error':
        if (showError) {
          return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-2">{intl.formatMessage({ id: 'auth.accessError' })}</h2>
                <p className="text-gray-600 mb-4">{error || intl.formatMessage({ id: 'auth.unableVerify' })}</p>
                <button
                  onClick={() => checkAuthorization()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {intl.formatMessage({ id: 'action.retry' })}
                </button>
              </div>
            </div>
          );
        }
        return (
          <Navigate
            to={`${computedFallbackPath}?redirect=${encodeURIComponent(safeRedirectParam)}&error=auth_error`}
            replace
          />
        );

      case 'banned':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">{intl.formatMessage({ id: 'auth.accountSuspended' })}</h2>
              <p className="text-gray-600">{intl.formatMessage({ id: 'auth.contactSupport' })}</p>
            </div>
          </div>
        );

      case 'unauthorized':
        return (
          <Navigate
            to={`${computedFallbackPath}?redirect=${encodeURIComponent(safeRedirectParam)}`}
            replace
          />
        );

      case 'authorized':
        return <>{children}</>;

      default:
        return (
          <Navigate
            to={`${computedFallbackPath}?redirect=${encodeURIComponent(safeRedirectParam)}&error=unknown`}
            replace
          />
        );
    }
  };

  return <ErrorBoundary>{renderContent()}</ErrorBoundary>;
};

export default ProtectedRoute;
