/**
 * ChatterCountrySelection - Page for selecting intervention countries
 * Displayed after quiz success, before accessing the dashboard
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ChatterCountrySelector from '@/components/Chatter/Forms/ChatterCountrySelector';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Globe, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

const ChatterCountrySelection: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const { user, isLoading: authLoading } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dashboardRoute = `/${getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(loginRoute);
    }
  }, [authLoading, user, navigate, loginRoute]);

  // Handle country selection submission
  const handleSubmit = async (countryCodes: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(undefined, 'europe-west1');
      const assignCountriesToCurrentChatter = httpsCallable(
        functions,
        'assignCountriesToCurrentChatter'
      );

      const result = await assignCountriesToCurrentChatter({ countryCodes });
      const data = result.data as {
        success: boolean;
        assignedCountries: string[];
        unavailableCountries: string[];
        cycleAdvanced: boolean;
        message?: string;
      };

      if (data.success) {
        setSuccess(true);
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate(dashboardRoute);
        }, 2000);
      } else {
        setError(intl.formatMessage({
          id: 'chatter.countries.assignError',
          defaultMessage: 'Impossible d\'assigner les pays sélectionnés'
        }));
      }
    } catch (err: unknown) {
      console.error('Error assigning countries:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('unavailable') || errorMessage.includes('already assigned')) {
        setError(intl.formatMessage({
          id: 'chatter.countries.unavailableError',
          defaultMessage: 'Certains pays ne sont plus disponibles. Veuillez rafraîchir et réessayer.'
        }));
      } else {
        setError(intl.formatMessage({
          id: 'chatter.countries.genericError',
          defaultMessage: 'Une erreur est survenue. Veuillez réessayer.'
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto text-red-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="common.loading" defaultMessage="Chargement..." />
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Success state
  if (success) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black px-4">
          <div className={`${UI.card} p-8 max-w-md w-full text-center`}>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="chatter.countries.success.title" defaultMessage="Pays assignés !" />
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              <FormattedMessage
                id="chatter.countries.success.message"
                defaultMessage="Vos pays d'intervention ont été enregistrés. Vous allez être redirigé vers votre tableau de bord."
              />
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <FormattedMessage id="chatter.countries.success.redirecting" defaultMessage="Redirection en cours..." />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage
                id="chatter.countries.title"
                defaultMessage="Choisissez vos pays d'intervention"
              />
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              <FormattedMessage
                id="chatter.countries.subtitle"
                defaultMessage="Sélectionnez les pays où vous souhaitez interagir avec les clients SOS-Expat. Vous pouvez choisir jusqu'à 5 pays."
              />
            </p>
          </div>

          {/* Country Selector */}
          <div className={`${UI.card} p-6`}>
            <ChatterCountrySelector
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              maxSelection={5}
              minSelection={1}
            />
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              <FormattedMessage
                id="chatter.countries.helpText"
                defaultMessage="Vous pourrez modifier vos pays d'intervention ultérieurement depuis les paramètres."
              />
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatterCountrySelection;
