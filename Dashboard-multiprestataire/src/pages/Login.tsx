/**
 * Login Page
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/auth/LoginForm';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, isLoading, isAuthenticated, error } = useAuth();
  const { t } = useTranslation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/';
      // Validate redirect is a local path
      const safePath = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
      navigate(safePath, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleSubmit = async (email: string, password: string) => {
    await signIn(email, password);
    // Navigate directly after successful signIn (which now resolves auth state fully)
    // This is more reliable on mobile than relying solely on useEffect
    const redirect = searchParams.get('redirect') || '/';
    const safePath = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/';
    navigate(safePath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col items-center justify-center p-4 safe-top safe-bottom">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('login.title')}</h1>
          <p className="text-gray-600 mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('login.heading')}</h2>
          <LoginForm
            onSubmit={handleSubmit}
            error={error}
            isLoading={isLoading}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {t('login.footer')}
        </p>
      </div>
    </div>
  );
}
