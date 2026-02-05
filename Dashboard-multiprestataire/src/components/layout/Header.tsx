/**
 * Header Component
 * Route-aware header with user info, language selector, and logout
 */
import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Globe } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { LANGUAGES } from '../../i18n/config';
import toast from 'react-hot-toast';

export default function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const PAGE_CONFIG: Record<string, { title: string; subtitle: string }> = {
    '/': { title: t('header.dashboard_title'), subtitle: t('header.dashboard_subtitle') },
    '/requests': { title: t('header.requests_title'), subtitle: t('header.requests_subtitle') },
    '/team': { title: t('header.team_title'), subtitle: t('header.team_subtitle') },
  };

  const config = PAGE_CONFIG[location.pathname] || { title: t('header.dashboard_title'), subtitle: '' };

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t('common.logout_success'));
    } catch {
      toast.error(t('common.logout_error'));
    }
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{config.title}</h1>
          {config.subtitle && <p className="text-sm text-gray-500 hidden sm:block">{config.subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language selector */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={currentLang.label}
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium uppercase">{currentLang.code}</span>
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-80 overflow-y-auto">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      i18n.language === lang.code ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User info */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.displayName || t('header.user_default')}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-primary-600" />
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('header.logout')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
