import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

/**
 * P0 FIX: Délai minimum avant de rediriger vers login
 * Cela évite les flash de 404/login quand l'auth est en cours de chargement
 */
const MIN_AUTH_WAIT_MS = 500;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath,
  showError = false,
}) => {
  const intl = useIntl();
  const location = useLocation();
  // P0 FIX: Utiliser isFullyReady au lieu de authInitialized pour éviter les redirections prématurées
  const { user, isLoading, authInitialized, isFullyReady, error: authError } = useAuth();

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  // P0 FIX: Track time since component mounted to prevent premature redirects
  const mountTimeRef = useRef<number>(Date.now());
  const [hasWaitedMinTime, setHasWaitedMinTime] = useState(false);

  // P0 FIX: Wait minimum time before allowing redirects
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaitedMinTime(true);
    }, MIN_AUTH_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // ⚠️ Fallback robuste : admin → /admin/login, sinon → /login
  // FIX: Only check pathname, not allowedRoles - prevents redirect to /admin/login
  // when route has 'admin' in allowedRoles but is not an admin route
  const computedFallbackPath = useMemo(() => {
    if (fallbackPath) return fallbackPath;

    // Only redirect to /admin/login if the path actually starts with /admin
    const isAdminRoute = location.pathname.startsWith('/admin');

    return isAdminRoute ? '/admin/login' : '/login';
  }, [fallbackPath, location.pathname]);

  // P0 FIX: Ne check l'auth que si isFullyReady ET on a attendu le temps minimum
  // Cela évite les redirections prématurées vers login
  const shouldCheckAuth = useMemo(
    () => isFullyReady && !authError && hasWaitedMinTime,
    [isFullyReady, authError, hasWaitedMinTime]
  );

  const checkAuthorization = useCallback(async () => {
    // 🔍 DEBUG: Afficher l'utilisateur et son rôle
    console.log("🛡️ [ProtectedRoute] checkAuthorization:", {
      hasUser: !!user,
      userRole: user?.role,
      allowedRoles,
      path: location.pathname,
      timeSinceMount: Date.now() - mountTimeRef.current,
    });

    if (!user) {
      setAuthState('unauthorized');
      return;
    }

    setAuthState('checking');
    setError(null);

    try {
      // Timeout anti-latence sur le check de ban (8s - réduit pour éviter pages blanches prolongées)
      const banned = await Promise.race([
        isUserBanned(user.id),
        new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Authorization timeout')), 8000)),
      ]);

      if (banned) {
        setAuthState('banned');
        return;
      }

      if (allowedRoles) {
        const hasRole = checkUserRole(user, allowedRoles);
        // 🔍 DEBUG: Résultat du check de rôle
        console.log("🛡️ [ProtectedRoute] checkUserRole result:", {
          userRole: user.role,
          allowedRoles,
          hasRole,
        });
        setAuthState(hasRole ? 'authorized' : 'unauthorized');
      } else {
        setAuthState('authorized');
      }
    } catch (err) {

      console.error('Authorization check failed:', err);
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setAuthState('error');
    }
  }, [user, allowedRoles, location.pathname]);

  useEffect(() => {
    if (shouldCheckAuth) {
      checkAuthorization();
    } else if (authError && hasWaitedMinTime) {
      setAuthState('error');
      setError(intl.formatMessage({ id: 'auth.failed' }));
    } else {
      setAuthState('loading');
    }
  }, [shouldCheckAuth, checkAuthorization, authError, intl, hasWaitedMinTime]);

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
