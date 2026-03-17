import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import { checkUserRole, isUserBanned } from '../../utils/auth';
import { devLog, devWarn, devError } from '../../utils/devLog';

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

type AuthState = 'loading' | 'checking' | 'authorized' | 'unauthorized' | 'wrong_role' | 'error' | 'banned';

/**
 * P1 FIX: Délai minimum avant de rediriger vers login
 * Réduit de 500ms à 150ms pour éviter les pages blanches prolongées
 * tout en prévenant les flash de 404/login quand l'auth est en cours
 */
const MIN_AUTH_WAIT_MS = 150;

/**
 * P0 FIX: Timeout de sécurité maximum pour éviter page blanche infinie
 * Si l'auth n'est toujours pas prête après ce délai, on redirige vers login
 */
const MAX_AUTH_WAIT_MS = 10000;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath,
  showError = false,
}) => {
  const intl = useIntl();
  const location = useLocation();
  // P0 FIX: Utiliser isFullyReady au lieu de authInitialized pour éviter les redirections prématurées
  const { user, isLoading, authInitialized, isFullyReady, error: authError, logout } = useAuth();

  // 🔍 [BOOKING_AUTH_DEBUG] Log initial state
  devLog('[BOOKING_AUTH_DEBUG] 🛡️ ProtectedRoute RENDER', {
    path: location.pathname,
    search: location.search,
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    isLoading,
    authInitialized,
    isFullyReady,
    authError: authError || null,
    selectedProviderInSession: sessionStorage.getItem('selectedProvider') ? 'EXISTS' : 'NULL',
    loginRedirectInSession: sessionStorage.getItem('loginRedirect') || 'NULL',
  });

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  // P0 FIX: Track time since component mounted to prevent premature redirects
  const mountTimeRef = useRef<number>(Date.now());
  const [hasWaitedMinTime, setHasWaitedMinTime] = useState(false);
  const [hasExceededMaxWait, setHasExceededMaxWait] = useState(false);

  // P0 FIX: Track if user was ever authorized to prevent unmounting during auth rechecks
  // Once authorized, keep children mounted even if auth briefly goes to loading state
  const wasAuthorizedRef = useRef(false);

  // P0 FIX: Wait minimum time before allowing redirects
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWaitedMinTime(true);
    }, MIN_AUTH_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // P0 FIX: Timeout de sécurité pour éviter page blanche infinie
  // Si l'auth n'est pas prête après MAX_AUTH_WAIT_MS, on force la redirection
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isFullyReady) {
        devWarn('🔐 [ProtectedRoute] ⚠️ Timeout sécurité atteint - forçage redirection login');
        setHasExceededMaxWait(true);
      }
    }, MAX_AUTH_WAIT_MS);
    return () => clearTimeout(timer);
  }, [isFullyReady]);

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
  // OU si on a dépassé le timeout de sécurité maximum (évite page blanche infinie)
  const shouldCheckAuth = useMemo(
    () => (isFullyReady && !authError && hasWaitedMinTime) || hasExceededMaxWait,
    [isFullyReady, authError, hasWaitedMinTime, hasExceededMaxWait]
  );

  const checkAuthorization = useCallback(async () => {
    if (!user) {
      // FIX: If we reached here via timeout (not normal auth flow),
      // show error instead of redirecting to prevent redirect loop
      if (hasExceededMaxWait && !isFullyReady) {
        devWarn('🔐 [ProtectedRoute] ⚠️ Timeout reached without user - showing error instead of redirect');
        setAuthState('error');
        setError('Délai de connexion dépassé. Veuillez rafraîchir la page.');
        return;
      }
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
        if (hasRole) {
          setAuthState('authorized');
        } else if (user.role === 'admin' && new URLSearchParams(location.search).has('adminView')) {
          // Admin impersonation: allow admin to view any role's dashboard
          devLog('[ProtectedRoute] Admin viewing user dashboard via adminView param');
          setAuthState('authorized');
        } else {
          // User is logged in but has wrong role — redirect to their own dashboard
          // instead of login page (which would cause infinite redirect loop)
          setAuthState('wrong_role');
        }
      } else {
        setAuthState('authorized');
      }
    } catch (err) {

      devError('Authorization check failed:', err);
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setAuthState('error');
    }
  }, [user, allowedRoles, location.pathname, hasExceededMaxWait, isFullyReady]);

  useEffect(() => {
    if (shouldCheckAuth) {
      checkAuthorization();
    } else if (authError && hasWaitedMinTime) {
      setAuthState('error');
      setError(intl.formatMessage({ id: 'auth.failed' }));
    } else {
      // P0 FIX: Don't unmount children by going back to 'loading' if user was already authorized
      // This prevents form data loss when auth briefly rechecks (token refresh, focus events)
      if (!wasAuthorizedRef.current) {
        setAuthState('loading');
      }
      // If wasAuthorizedRef.current is true, keep current authState ('authorized')
    }
  }, [shouldCheckAuth, checkAuthorization, authError, intl, hasWaitedMinTime]);

  // P0 FIX: Track when user becomes authorized
  useEffect(() => {
    if (authState === 'authorized') {
      wasAuthorizedRef.current = true;
    }
    // Reset if user explicitly logs out (unauthorized with no user)
    if (authState === 'unauthorized' && !user) {
      wasAuthorizedRef.current = false;
    }
  }, [authState, user]);

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
        // FIX: Always show retry UI when error came from timeout (prevents redirect loop)
        // Only redirect to login for non-timeout errors when showError is false
        if (showError || hasExceededMaxWait) {
          return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-2">{intl.formatMessage({ id: 'auth.accessError' })}</h2>
                <p className="text-gray-600 mb-4">{error || intl.formatMessage({ id: 'auth.unableVerify' })}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => checkAuthorization()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    {intl.formatMessage({ id: 'action.retry' })}
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    {intl.formatMessage({ id: 'action.refresh', defaultMessage: 'Rafraîchir' })}
                  </button>
                </div>
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

      case 'wrong_role': {
        // User is logged in but has the wrong role
        // Show a clear message instead of redirect loop
        const roleLabels: Record<string, string> = {
          client: 'Client', lawyer: 'Avocat', expat: 'Expert Expatriation',
          chatter: 'Chatter', influencer: 'Influenceur', blogger: 'Blogueur',
          groupAdmin: 'Admin Groupe', partner: 'Partenaire', admin: 'Admin',
        };
        const currentRoleLabel = roleLabels[user?.role || ''] || user?.role || '';
        const requiredRoleLabel = Array.isArray(allowedRoles)
          ? allowedRoles.map(r => roleLabels[r] || r).join(' / ')
          : roleLabels[allowedRoles || ''] || allowedRoles || '';

        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {intl.formatMessage({ id: 'auth.wrongRole.title', defaultMessage: 'Mauvais compte' })}
              </h2>
              <p className="text-gray-600 mb-2">
                {intl.formatMessage(
                  { id: 'auth.wrongRole.description', defaultMessage: 'Vous êtes connecté en tant que {currentRole} ({email}), mais cette page nécessite un compte {requiredRole}.' },
                  { currentRole: <strong>{currentRoleLabel}</strong>, email: <strong>{user?.email}</strong>, requiredRole: <strong>{requiredRoleLabel}</strong> }
                )}
              </p>
              <p className="text-gray-500 text-sm mb-6">
                {intl.formatMessage({ id: 'auth.wrongRole.hint', defaultMessage: 'Déconnectez-vous et reconnectez-vous avec le bon compte.' })}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={async () => {
                    sessionStorage.setItem('loginRedirect', location.pathname);
                    await logout();
                    window.location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`;
                  }}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  {intl.formatMessage({ id: 'auth.wrongRole.logout', defaultMessage: 'Se déconnecter et changer de compte' })}
                </button>
                <button
                  onClick={() => {
                    let roleDashboard = '/dashboard';
                    if (user?.role === 'chatter') roleDashboard = '/chatter/tableau-de-bord';
                    else if (user?.role === 'influencer') roleDashboard = '/influencer/tableau-de-bord';
                    else if (user?.role === 'blogger') roleDashboard = '/blogger/tableau-de-bord';
                    else if (user?.role === 'groupAdmin') roleDashboard = '/group-admin/tableau-de-bord';
                    else if (user?.role === 'partner') roleDashboard = '/partner/tableau-de-bord';
                    window.location.href = roleDashboard;
                  }}
                  className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  {intl.formatMessage({ id: 'auth.wrongRole.myDashboard', defaultMessage: 'Mon tableau de bord' })}
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'unauthorized':
        // 🔍 [BOOKING_AUTH_DEBUG] Log redirection vers login
        devLog('[BOOKING_AUTH_DEBUG] 🔀 ProtectedRoute → REDIRECT to login', {
          computedFallbackPath,
          safeRedirectParam,
          fullRedirectUrl: `${computedFallbackPath}?redirect=${encodeURIComponent(safeRedirectParam)}`,
          selectedProviderInSession: sessionStorage.getItem('selectedProvider') ? JSON.parse(sessionStorage.getItem('selectedProvider')!).id : 'NULL',
          loginRedirectInSession: sessionStorage.getItem('loginRedirect') || 'NULL',
        });
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
