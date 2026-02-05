/**
 * Blocked Screen Component
 * Shown when user account is blocked or doesn't have access
 */
import { useTranslation } from 'react-i18next';
import { ShieldX, Mail } from 'lucide-react';

interface BlockedScreenProps {
  title?: string;
  message?: string;
  email?: string;
}

export default function BlockedScreen({
  title,
  message,
  email,
}: BlockedScreenProps) {
  const { t } = useTranslation();
  const displayTitle = title ?? t('blocked.title');
  const displayMessage = message ?? t('blocked.default_message');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 safe-top">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{displayTitle}</h1>
        <p className="text-gray-600 mb-6">{displayMessage}</p>

        {email && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">{t('blocked.connected_account')}</p>
            <p className="font-medium text-gray-900">{email}</p>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="mailto:support@sos-expat.com"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Mail className="w-5 h-5" />
            {t('blocked.contact_support')}
          </a>

          <button
            onClick={() => window.location.href = '/login'}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('blocked.change_account')}
          </button>
        </div>
      </div>
    </div>
  );
}
