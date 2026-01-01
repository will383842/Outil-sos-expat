import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, LogIn, Shield } from 'lucide-react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useIntl } from 'react-intl';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, authInitialized } = useAuth();
  const intl = useIntl();

  // P0 SECURITY FIX: Removed hardcoded credentials and admin whitelist - 2025-12-29
  // Admin verification now relies ONLY on Firestore role and Firebase custom claims
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState(false);

  // Ref pour éviter navigation multiple
  const hasNavigatedRef = useRef(false);

  // Surveiller AuthContext pour naviguer quand user.role === 'admin'
  useEffect(() => {
    if (pendingNavigation && authInitialized && authUser?.role === 'admin' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      setPendingNavigation(false);
      navigate('/admin/dashboard');
    }
  }, [pendingNavigation, authInitialized, authUser?.role, navigate]);

  // Check if user is already logged in and is admin (via AuthContext)
  useEffect(() => {
    if (authInitialized && authUser?.role === 'admin' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigate('/admin/dashboard');
    }
  }, [authInitialized, authUser?.role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Activer la persistance pour la session
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // P0 SECURITY FIX: Check admin status from Firestore ONLY (no frontend whitelist)
      // Admin role must be set by backend (Cloud Functions) or existing admins
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      // Verify user exists and has admin role in Firestore
      if (!userDoc.exists()) {
        // User doesn't exist in Firestore - cannot be admin
        setError(intl.formatMessage({ id: 'admin.login.error.unauthorized' }));
        setIsLoading(false);
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
        return;
      }

      const userData = userDoc.data();
      const isAdmin = userData?.role === 'admin';

      if (!isAdmin) {
        // User exists but is not admin - deny access
        setError(intl.formatMessage({ id: 'admin.login.error.unauthorized' }));
        setIsLoading(false);
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
        return;
      }

      // User is verified admin - set custom claims via Cloud Function
      // This is CRITICAL for Firestore security rules to work
      try {
        const setAdminClaimsFn = httpsCallable(functions, 'setAdminClaims');
        await setAdminClaimsFn();
        console.log('[AdminLogin] Custom claims set successfully');

        // Force token refresh to get new claims
        await user.getIdToken(true);
        console.log('[AdminLogin] Token refreshed with new claims');
      } catch (claimsError) {
        console.warn('[AdminLogin] Could not set custom claims:', claimsError);
        // Continue anyway - claims might already be set
      }

      // Update last login timestamp
      await setDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Activer la navigation en attente - le useEffect surveillera AuthContext
      setPendingNavigation(true);

      // Timeout de sécurité: si AuthContext ne synchronise pas après 5s, naviguer quand même
      setTimeout(() => {
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigate('/admin/dashboard');
        }
      }, 5000);

    } catch (error: any) {
      console.error('Login error:', error);
      setError(getErrorMessage(error.code));
      setIsLoading(false);
    }
    // Note: isLoading reste true pendant pendingNavigation pour montrer le spinner
  };

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/invalid-email':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return intl.formatMessage({ id: 'admin.login.error.invalidCredentials' });
      case 'auth/too-many-requests':
        return intl.formatMessage({ id: 'admin.login.error.tooManyAttempts' });
      case 'auth/network-request-failed':
        return intl.formatMessage({ id: 'admin.login.error.network' });
      default:
        return intl.formatMessage({ id: 'admin.login.error.generic' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-red-600 p-3 rounded-full">
            <Shield className="h-12 w-12 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-white">
          {intl.formatMessage({ id: 'admin.login.title' })}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          {intl.formatMessage({ id: 'admin.login.subtitle' })}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-300">
                      {intl.formatMessage({ id: 'admin.login.error.title' })}
                    </h3>
                    <div className="mt-2 text-sm text-red-300">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                {intl.formatMessage({ id: 'admin.login.email' })}
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                {intl.formatMessage({ id: 'admin.login.password' })}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 bg-gray-700 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span>{intl.formatMessage({ id: 'admin.login.button.loading' })}</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LogIn size={20} className="mr-2" />
                    <span>{intl.formatMessage({ id: 'admin.login.button.submit' })}</span>
                  </div>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-gray-400 hover:text-gray-300">
              {intl.formatMessage({ id: 'admin.login.backToHome' })}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;

