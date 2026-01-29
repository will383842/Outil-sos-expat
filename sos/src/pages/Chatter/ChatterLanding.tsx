/**
 * ChatterLanding - Landing page for the Chatter program
 * Introduces the program and encourages sign-up
 *
 * SEO 2026 Optimized:
 * - FAQPageSchema for featured snippets (Position 0)
 * - HreflangLinks for 9 languages
 * - AI meta tags for LLM referencing
 * - Structured data enriched
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import FAQPageSchema from '@/components/seo/FAQPageSchema';
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
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

// Design tokens - Using SOS-Expat red brand colors
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl",
  },
} as const;

const ChatterLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const registerRoute = `/${getTranslatedRouteSlug('chatter-register' as RouteKey, langCode)}`;

  // SEO 2026 - Meta tags optimized for AI/LLM and featured snippets
  const seoTitle = intl.formatMessage({
    id: 'chatter.landing.seo.title',
    defaultMessage: 'Devenir Chatter SOS-Expat | Gagnez des commissions en recommandant'
  });
  const seoDescription = intl.formatMessage({
    id: 'chatter.landing.seo.description',
    defaultMessage: 'Rejoignez le programme Chatter SOS-Expat et gagnez 1000 FCFA par client parrainé. Commission recrutement, bonus Top 3, 5 niveaux. Inscription gratuite, retrait via Wise ou Mobile Money.'
  });
  const seoKeywords = intl.formatMessage({
    id: 'chatter.landing.seo.keywords',
    defaultMessage: 'chatter, ambassadeur, affiliation, commission, parrainage, SOS-Expat, gagner argent, mobile money, wise'
  });
  const aiSummary = intl.formatMessage({
    id: 'chatter.landing.seo.aiSummary',
    defaultMessage: 'Programme ambassadeur SOS-Expat permettant de gagner des commissions (1000 FCFA/client, 500 FCFA/recrutement) en recommandant la plateforme. Système gamifié avec 5 niveaux et bonus Top 3 mensuel.'
  });

  // FAQ for Position 0 featured snippets
  const faqs = [
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q1', defaultMessage: "Qu'est-ce qu'un Chatter SOS-Expat ?" }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a1', defaultMessage: "Un Chatter est un ambassadeur SOS-Expat qui recommande la plateforme et gagne des commissions sur chaque client parrainé ou prestataire recruté." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q2', defaultMessage: 'Combien puis-je gagner comme Chatter ?' }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a2', defaultMessage: "Vous gagnez 1 000 FCFA par appel payé d'un client parrainé et 500 FCFA par appel reçu par un prestataire recruté (pendant 6 mois). Des bonus jusqu'à +100% sont possibles pour le Top 3 mensuel." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q3', defaultMessage: "L'inscription est-elle gratuite ?" }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a3', defaultMessage: "Oui, l'inscription au programme Chatter est 100% gratuite. Vous devez simplement passer un quiz de qualification (85% de réussite requis)." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q4', defaultMessage: 'Comment retirer mes gains ?' }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a4', defaultMessage: "Vous pouvez retirer vos gains via Wise, Mobile Money (Orange Money, Wave, MTN) ou virement bancaire dès que vous atteignez le seuil minimum de 2 500 FCFA." }),
    },
    {
      question: intl.formatMessage({ id: 'chatter.landing.faq.q5', defaultMessage: 'Comment fonctionnent les niveaux Chatter ?' }),
      answer: intl.formatMessage({ id: 'chatter.landing.faq.a5', defaultMessage: "Il y a 5 niveaux (Bronze, Silver, Gold, Platinum, Diamond) avec des bonus croissants de +5% à +20% sur vos commissions. Vous montez de niveau en atteignant des objectifs de conversions." }),
    },
  ];

  const benefits = [
    {
      icon: <Wallet className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'chatter.landing.benefit1.title', defaultMessage: 'Gagnez facilement' }),
      desc: intl.formatMessage({ id: 'chatter.landing.benefit1.desc', defaultMessage: '1 000 FCFA par client qui passe un appel' }),
      color: 'from-red-500 to-orange-500',
      bg: 'bg-red-100 dark:bg-red-900/30',
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
      color: 'from-yellow-400 to-orange-500',
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
      {/* SEO 2026 - Complete meta tags for AI/LLM and search engines */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        ogImage="/og-chatter.jpg"
        ogType="website"
        aiSummary={aiSummary}
        expertise="affiliate-marketing"
        trustworthiness="high"
        contentQuality="high"
        contentType="LandingPage"
        lastReviewed="2026-01-29"
      />
      <HreflangLinks pathname={location.pathname} />
      <FAQPageSchema faqs={faqs} pageTitle={seoTitle} />

      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-red-500 via-orange-500 to-red-600 text-white py-20 px-4">
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
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white text-xl font-bold">
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
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.landing.commissions.client.title" defaultMessage="Commission Client" />
                  </h3>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
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

        {/* FAQ Section - SEO Position 0 */}
        <section className="py-16 px-4 bg-white dark:bg-gray-900" itemScope itemType="https://schema.org/FAQPage">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <HelpCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.landing.faq.title" defaultMessage="Questions fréquentes" />
              </h2>
            </div>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              <FormattedMessage id="chatter.landing.faq.subtitle" defaultMessage="Tout ce que vous devez savoir sur le programme Chatter" />
            </p>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className={`${UI.card} group`}
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                >
                  <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                    <h3 className="font-semibold text-gray-900 dark:text-white pr-4" itemProp="name">
                      {faq.question}
                    </h3>
                    <ChevronDown className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180 flex-shrink-0" aria-hidden="true" />
                  </summary>
                  <div
                    className="px-5 pb-5 text-gray-600 dark:text-gray-300"
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                  >
                    <p itemProp="text">{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <FormattedMessage id="chatter.landing.cta.title" defaultMessage="Prêt à commencer ?" />
            </h2>
            <p className="text-xl text-white/90 mb-8">
              <FormattedMessage id="chatter.landing.cta.subtitle" defaultMessage="Rejoignez des centaines de Chatters qui gagnent déjà" />
            </p>
            <button
              onClick={() => navigate(registerRoute)}
              className="bg-white text-red-600 font-bold px-8 py-4 rounded-xl text-lg inline-flex items-center gap-3 hover:bg-gray-50 transition-colors"
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
