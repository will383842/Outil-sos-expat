/**
 * InfluencerSuspended - Page shown when account is suspended
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useInfluencer } from '@/hooks/useInfluencer';
import Layout from '@/components/layout/Layout';
import { AlertTriangle, MessageCircle, ArrowLeft } from 'lucide-react';

const InfluencerSuspended: React.FC = () => {
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const { dashboardData: dashboard } = useInfluencer();

  const contactRoute = `/${getTranslatedRouteSlug('contact' as RouteKey, langCode)}`;

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 dark:from-gray-950 to-white dark:to-black px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="text-2xl dark:text-white font-bold mb-4">
            <FormattedMessage id="influencer.suspended.title" defaultMessage="Compte suspendu" />
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            <FormattedMessage
              id="influencer.suspended.message"
              defaultMessage="Votre compte influenceur a été suspendu. Si vous pensez qu'il s'agit d'une erreur, veuillez nous contacter via le formulaire de contact."
            />
          </p>

          {dashboard?.influencer?.suspensionReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-800 rounded-xl p-4 mb-6">
              <p className="text-sm dark:text-red-400">
                <strong>
                  <FormattedMessage id="influencer.suspended.reason" defaultMessage="Motif :" />
                </strong>{' '}
                {dashboard.influencer.suspensionReason}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(contactRoute)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <FormattedMessage id="influencer.suspended.contact" defaultMessage="Nous contacter" />
            </button>

            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <FormattedMessage id="influencer.suspended.backHome" defaultMessage="Retour à l'accueil" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InfluencerSuspended;
