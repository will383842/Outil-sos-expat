/**
 * PartnerSuspended - Page shown when partner account is suspended or blocked
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { usePartner } from '@/hooks/usePartner';
import Layout from '@/components/layout/Layout';
import { ShieldAlert, AlertTriangle, MessageCircle, ArrowLeft } from 'lucide-react';

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all active:scale-[0.98]',
    secondary: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all active:scale-[0.98]',
  },
} as const;

const PartnerSuspended: React.FC = () => {
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const { partner } = usePartner();
  const contactRoute = `/${getTranslatedRouteSlug('contact' as RouteKey, langCode)}`;

  const isSuspended = partner?.status === 'suspended';
  const isBanned = partner?.status === 'banned';

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-black flex items-center justify-center p-4">
        <div className={`${UI.card} p-8 max-w-lg w-full text-center`}>
          <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isBanned ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
          }`}>
            <ShieldAlert className={`w-8 h-8 ${isBanned ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>

          <h1 className="text-2xl dark:text-white font-bold mb-4">
            {isBanned ? (
              <FormattedMessage id="partner.suspended.blockedTitle" defaultMessage="Compte bloqu\u00e9" />
            ) : (
              <FormattedMessage id="partner.suspended.suspendedTitle" defaultMessage="Compte suspendu" />
            )}
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isBanned ? (
              <FormattedMessage
                id="partner.suspended.blockedMessage"
                defaultMessage="Votre compte partenaire a \u00e9t\u00e9 bloqu\u00e9 d\u00e9finitivement. Cette d\u00e9cision est g\u00e9n\u00e9ralement prise suite \u00e0 des violations r\u00e9p\u00e9t\u00e9es de nos conditions d'utilisation."
              />
            ) : (
              <FormattedMessage
                id="partner.suspended.suspendedMessage"
                defaultMessage="Votre compte partenaire a \u00e9t\u00e9 temporairement suspendu. Cela peut \u00eatre d\u00fb \u00e0 une activit\u00e9 inhabituelle ou \u00e0 une violation de nos conditions d'utilisation."
              />
            )}
          </p>

          {partner?.suspensionReason && (
            <div className={`p-4 rounded-xl mb-6 text-left ${
              isBanned ? 'bg-red-50 dark:bg-red-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'
            }`}>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
                <FormattedMessage id="partner.suspended.reason" defaultMessage="Raison :" />
              </p>
              <p className={`text-sm ${isBanned ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                {partner.suspensionReason}
              </p>
            </div>
          )}

          {!isBanned && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border dark:border-blue-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <FormattedMessage
                  id="partner.suspended.howToResolve"
                  defaultMessage="Pour r\u00e9soudre cette situation, veuillez contacter notre \u00e9quipe support. Nous examinerons votre cas et vous informerons des \u00e9tapes \u00e0 suivre."
                />
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate(contactRoute)}
              className={`${UI.button.primary} px-6 py-3 min-h-[48px] w-full inline-flex items-center justify-center gap-2`}
            >
              <MessageCircle className="w-5 h-5" />
              <FormattedMessage id="partner.suspended.contactSupport" defaultMessage="Nous contacter" />
            </button>

            <button
              onClick={() => navigate('/')}
              className={`${UI.button.secondary} px-6 py-3 min-h-[48px] w-full inline-flex items-center justify-center gap-2`}
            >
              <ArrowLeft className="w-5 h-5" />
              <FormattedMessage id="partner.suspended.backHome" defaultMessage="Retour \u00e0 l'accueil" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PartnerSuspended;
