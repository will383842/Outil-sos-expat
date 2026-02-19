/**
 * GroupAdminSuspended - Page shown when account is suspended
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import { AlertTriangle, MessageCircle, ArrowLeft } from 'lucide-react';

const GroupAdminSuspended: React.FC = () => {
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const contactRoute = `/${getTranslatedRouteSlug('contact' as RouteKey, langCode)}`;

  return (
    <GroupAdminDashboardLayout>
      <div className="flex items-center justify-center p-4 py-20">
        <div className="bg-white dark:bg-white/5 rounded-2xl shadow-xl dark:shadow-none p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="text-2xl dark:text-white font-bold mb-4">
            <FormattedMessage id="groupadmin.suspended.title" defaultMessage="Compte suspendu" />
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            <FormattedMessage
              id="groupadmin.suspended.message"
              defaultMessage="Votre compte Admin de Groupe a été temporairement suspendu. Si vous pensez qu'il s'agit d'une erreur, veuillez nous contacter via le formulaire de contact."
            />
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(contactRoute)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <FormattedMessage id="groupadmin.suspended.contactUs" defaultMessage="Nous contacter" />
            </button>

            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <FormattedMessage id="groupadmin.suspended.backHome" defaultMessage="Retour à l'accueil" />
            </button>
          </div>
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminSuspended;
