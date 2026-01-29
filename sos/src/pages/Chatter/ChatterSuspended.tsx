/**
 * ChatterSuspended - Page shown when chatter account is suspended
 * Displays suspension reason and contact information
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import { AlertTriangle, Mail, MessageCircle, ArrowLeft } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

interface ChatterSuspendedProps {
  reason?: string;
  suspendedAt?: string;
}

const ChatterSuspended: React.FC<ChatterSuspendedProps> = ({
  reason,
  suspendedAt,
}) => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const homeRoute = '/';
  const contactRoute = `/${getTranslatedRouteSlug('contact' as RouteKey, langCode)}`;

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-red-50/30 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black px-4 py-12">
        <div className="max-w-md w-full">
          <div className={`${UI.card} p-8 text-center`}>
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="chatter.suspended.title" defaultMessage="Compte suspendu" />
            </h1>

            {/* Subtitle */}
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              <FormattedMessage
                id="chatter.suspended.subtitle"
                defaultMessage="Votre compte Chatter a été temporairement suspendu."
              />
            </p>

            {/* Reason */}
            {reason && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-left">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                  <FormattedMessage id="chatter.suspended.reason" defaultMessage="Motif :" />
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {reason}
                </p>
              </div>
            )}

            {/* Suspended Date */}
            {suspendedAt && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                <FormattedMessage
                  id="chatter.suspended.date"
                  defaultMessage="Date de suspension : {date}"
                  values={{
                    date: new Date(suspendedAt).toLocaleDateString(intl.locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }),
                  }}
                />
              </p>
            )}

            {/* Contact Info */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                <FormattedMessage
                  id="chatter.suspended.contact"
                  defaultMessage="Si vous pensez qu'il s'agit d'une erreur, contactez-nous :"
                />
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:support@sosexpat.com"
                  className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  support@sosexpat.com
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate(contactRoute)}
                className={`${UI.button.secondary} w-full py-3 flex items-center justify-center gap-2`}
              >
                <MessageCircle className="w-5 h-5" />
                <FormattedMessage id="chatter.suspended.contactUs" defaultMessage="Nous contacter" />
              </button>

              <button
                onClick={() => navigate(homeRoute)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <FormattedMessage id="chatter.suspended.backHome" defaultMessage="Retour à l'accueil" />
              </button>
            </div>
          </div>

          {/* Info */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            <FormattedMessage
              id="chatter.suspended.info"
              defaultMessage="Les comptes peuvent être suspendus pour violation des conditions d'utilisation du programme Chatter."
            />
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default ChatterSuspended;
