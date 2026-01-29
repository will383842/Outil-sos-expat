/**
 * ChatterLanding - Landing page for the Chatter program
 * Introduces the program and encourages sign-up
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import {
  Star,
  Wallet,
  Users,
  Trophy,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Gift,
  TrendingUp,
  Globe,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl",
  },
} as const;

const ChatterLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;

  const benefits = [
    {
      icon: <Wallet className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.benefit1.title', defaultMessage: 'Gagnez facilement' }),
      desc: intl.formatMessage({ id: 'chatter.landing.benefit1.desc', defaultMessage: '1 000 FCFA par client qui passe un appel' }),
      color: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.benefit2.title', defaultMessage: 'Recrutez et gagnez plus' }),
      desc: intl.formatMessage({ id: 'chatter.landing.benefit2.desc', defaultMessage: '500 FCFA par appel de vos recrutés pendant 6 mois' }),
      color: 'from-purple-500 to-pink-500',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.benefit3.title', defaultMessage: 'Bonus Top 3 mensuel' }),
      desc: intl.formatMessage({ id: 'chatter.landing.benefit3.desc', defaultMessage: 'Jusqu\'à +100% de bonus pour les meilleurs' }),
      color: 'from-yellow-400 to-amber-500',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.benefit4.title', defaultMessage: 'Montez en niveau' }),
      desc: intl.formatMessage({ id: 'chatter.landing.benefit4.desc', defaultMessage: '5 niveaux avec bonus croissants jusqu\'à +20%' }),
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
  ];

  const steps = [
    {
      num: 1,
      title: intl.formatMessage({ id: 'chatter.landing.step1.title', defaultMessage: 'Inscrivez-vous' }),
      desc: intl.formatMessage({ id: 'chatter.landing.step1.desc', defaultMessage: 'Créez votre compte Chatter en 2 minutes' }),
    },
    {
      num: 2,
      title: intl.formatMessage({ id: 'chatter.landing.step2.title', defaultMessage: 'Passez le quiz' }),
      desc: intl.formatMessage({ id: 'chatter.landing.step2.desc', defaultMessage: 'Validez vos connaissances sur SOS-Expat' }),
    },
    {
      num: 3,
      title: intl.formatMessage({ id: 'chatter.landing.step3.title', defaultMessage: 'Partagez vos liens' }),
      desc: intl.formatMessage({ id: 'chatter.landing.step3.desc', defaultMessage: 'Sur les réseaux, groupes WhatsApp, etc.' }),
    },
    {
      num: 4,
      title: intl.formatMessage({ id: 'chatter.landing.step4.title', defaultMessage: 'Gagnez de l\'argent' }),
      desc: intl.formatMessage({ id: 'chatter.landing.step4.desc', defaultMessage: 'Retirez via Wise, Mobile Money ou virement' }),
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white py-20 px-4">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
          <div className="max-w-5xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-6">
                <Star className="w-5 h-5" />
                <span className="font-medium">
                  <FormattedMessage id="chatter.landing.badge" defaultMessage="Programme Ambassadeur" />
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                <FormattedMessage id="chatter.landing.hero.title" defaultMessage="Devenez Chatter SOS-Expat" />
              </h1>

              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-8">
                <FormattedMessage id="chatter.landing.hero.subtitle" defaultMessage="Gagnez de l'argent en recommandant SOS-Expat autour de vous" />
              </p>

              <button
                onClick={() => navigate(registerRoute)}
                className={`${UI.button.primary} px-8 py-4 text-lg inline-flex items-center gap-3`}
              >
                <FormattedMessage id="chatter.landing.hero.cta" defaultMessage="Devenir Chatter" />
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="mt-4 text-white/70 text-sm">
                <FormattedMessage id="chatter.landing.hero.free" defaultMessage="Inscription 100% gratuite" />
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="chatter.landing.benefits.title" defaultMessage="Pourquoi devenir Chatter ?" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              <FormattedMessage id="chatter.landing.benefits.subtitle" defaultMessage="Un programme conçu pour vous récompenser" />
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit, idx) => (
                <div key={idx} className={`${UI.card} p-6 flex items-start gap-4`}>
                  <div className={`w-12 h-12 rounded-xl ${benefit.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`bg-gradient-to-r ${benefit.color} bg-clip-text text-transparent`}>
                      {benefit.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-16 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="chatter.landing.howItWorks.title" defaultMessage="Comment ça marche ?" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              <FormattedMessage id="chatter.landing.howItWorks.subtitle" defaultMessage="4 étapes simples pour commencer à gagner" />
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {steps.map((step, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl font-bold">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Commission Details */}
        <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <FormattedMessage id="chatter.landing.commissions.title" defaultMessage="Vos commissions" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Commission */}
              <div className={`${UI.card} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.landing.commissions.client.title" defaultMessage="Commission Client" />
                  </h3>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-2">
                  1 000 FCFA
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.landing.commissions.client.desc" defaultMessage="Par appel payé d'un client parrainé" />
                </p>
              </div>

              {/* Recruitment Commission */}
              <div className={`${UI.card} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.landing.commissions.recruitment.title" defaultMessage="Commission Recrutement" />
                  </h3>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
                  500 FCFA
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.landing.commissions.recruitment.desc" defaultMessage="Par appel reçu par un prestataire recruté (6 mois)" />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <FormattedMessage id="chatter.landing.cta.title" defaultMessage="Prêt à commencer ?" />
            </h2>
            <p className="text-xl text-white/90 mb-8">
              <FormattedMessage id="chatter.landing.cta.subtitle" defaultMessage="Rejoignez des centaines de Chatters qui gagnent déjà" />
            </p>
            <button
              onClick={() => navigate(registerRoute)}
              className="bg-white text-amber-600 font-bold px-8 py-4 rounded-xl text-lg inline-flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <FormattedMessage id="chatter.landing.cta.button" defaultMessage="S'inscrire maintenant" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default ChatterLanding;
