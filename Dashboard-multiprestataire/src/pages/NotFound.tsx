/**
 * 404 Not Found Page
 */
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 safe-top">
      <div className="w-full max-w-md text-center">
        <p className="text-7xl font-bold text-primary-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('notfound.title')}
        </h1>
        <p className="text-gray-600 mb-8">
          {t('notfound.message')}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('notfound.back')}
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            {t('notfound.home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
