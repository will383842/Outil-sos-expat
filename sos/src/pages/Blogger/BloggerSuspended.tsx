/**
 * BloggerSuspended - Page shown when blogger account is suspended or blocked
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { useBlogger } from '@/hooks/useBlogger';
import Layout from '@/components/layout/Layout';
import { AlertTriangle, Mail, ArrowLeft } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

const BloggerSuspended: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { blogger } = useBlogger();

  const isSuspended = blogger?.status === 'suspended';
  const isBlocked = blogger?.status === 'blocked';

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black flex items-center justify-center p-4">
        <div className={`${UI.card} p-8 max-w-lg w-full text-center`}>
          <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isBlocked ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
          }`}>
            <AlertTriangle className={`w-8 h-8 ${isBlocked ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isBlocked ? (
              <FormattedMessage id="blogger.suspended.blockedTitle" defaultMessage="Compte bloqué" />
            ) : (
              <FormattedMessage id="blogger.suspended.suspendedTitle" defaultMessage="Compte suspendu" />
            )}
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isBlocked ? (
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
              isBlocked ? 'bg-red-50 dark:bg-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'
            }`}>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FormattedMessage id="blogger.suspended.reason" defaultMessage="Raison :" />
              </p>
              <p className={`text-sm ${isBlocked ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                {blogger.suspensionReason}
              </p>
            </div>
          )}

          {!isBlocked && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <FormattedMessage
                  id="blogger.suspended.howToResolve"
                  defaultMessage="Pour résoudre cette situation, veuillez contacter notre équipe support. Nous examinerons votre cas et vous informerons des étapes à suivre."
                />
              </p>
            </div>
          )}

          <div className="space-y-3">
            <a
              href="mailto:support@sos-expat.com?subject=Compte%20blogueur%20suspendu"
              className={`${UI.button.primary} px-6 py-3 w-full inline-flex items-center justify-center gap-2`}
            >
              <Mail className="w-5 h-5" />
              <FormattedMessage id="blogger.suspended.contactSupport" defaultMessage="Contacter le support" />
            </a>

            <button
              onClick={() => navigate('/blogger/tableau-de-bord')}
              className={`${UI.button.secondary} px-6 py-3 w-full inline-flex items-center justify-center gap-2`}
            >
              <ArrowLeft className="w-5 h-5" />
              <FormattedMessage id="blogger.suspended.backToDashboard" defaultMessage="Retour au tableau de bord" />
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            <FormattedMessage
              id="blogger.suspended.supportEmail"
              defaultMessage="Email: support@sos-expat.com"
            />
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default BloggerSuspended;
