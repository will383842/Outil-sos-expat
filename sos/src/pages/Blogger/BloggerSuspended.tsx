/**
 * BloggerSuspended - Page shown when blogger account is suspended or blocked
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useBlogger } from '@/hooks/useBlogger';
import Layout from '@/components/layout/Layout';
import { AlertTriangle, MessageCircle, ArrowLeft } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

const BloggerSuspended: React.FC = () => {
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const { blogger } = useBlogger();
  const contactRoute = `/${getTranslatedRouteSlug('contact' as RouteKey, langCode)}`;

  const isSuspended = blogger?.status === 'suspended';
  const isBanned = blogger?.status === 'banned';

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-black flex items-center justify-center p-4">
        <div className={`${UI.card} p-8 max-w-lg w-full text-center`}>
          <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isBanned ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
          }`}>
            <AlertTriangle className={`w-8 h-8 ${isBanned ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>

          <h1 className="text-2xl dark:text-white font-bold mb-4">
            {isBanned ? (
              <FormattedMessage id="blogger.suspended.blockedTitle" defaultMessage="Compte bloqué" />
            ) : (
              <FormattedMessage id="blogger.suspended.suspendedTitle" defaultMessage="Compte suspendu" />
            )}
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isBanned ? (
              <FormattedMessage
                id="blogger.suspended.blockedMessage"
                defaultMessage="Votre compte blogueur partenaire a été bloqué définitivement. Cette décision est généralement prise suite à des violations répétées de nos conditions d'utilisation."
              />
            ) : (
              <FormattedMessage
                id="blogger.suspended.suspendedMessage"
                defaultMessage="Votre compte blogueur partenaire a été temporairement suspendu. Cela peut être dû à une activité inhabituelle ou à une violation de nos conditions d'utilisation."
              />
            )}
          </p>

          {blogger?.suspensionReason && (
            <div className={`p-4 rounded-xl mb-6 text-left ${
              isBanned ? 'bg-red-50 dark:bg-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'
            }`}>
              <p className="text-sm dark:text-gray-300 font-medium mb-1">
                <FormattedMessage id="blogger.suspended.reason" defaultMessage="Raison :" />
              </p>
              <p className={`text-sm ${isBanned ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                {blogger.suspensionReason}
              </p>
            </div>
          )}

          {!isBanned && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border dark:border-blue-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm dark:text-blue-300">
                <FormattedMessage
                  id="blogger.suspended.howToResolve"
                  defaultMessage="Pour résoudre cette situation, veuillez contacter notre équipe support. Nous examinerons votre cas et vous informerons des étapes à suivre."
                />
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate(contactRoute)}
              className={`${UI.button.primary} px-6 py-3 w-full inline-flex items-center justify-center gap-2`}
            >
              <MessageCircle className="w-5 h-5" />
              <FormattedMessage id="blogger.suspended.contactSupport" defaultMessage="Nous contacter" />
            </button>

            <button
              onClick={() => navigate('/')}
              className={`${UI.button.secondary} px-6 py-3 w-full inline-flex items-center justify-center gap-2`}
            >
              <ArrowLeft className="w-5 h-5" />
              <FormattedMessage id="blogger.suspended.backHome" defaultMessage="Retour à l'accueil" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BloggerSuspended;
