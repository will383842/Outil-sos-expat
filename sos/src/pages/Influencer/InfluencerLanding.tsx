/**
 * InfluencerLanding - Landing page for the Influencer program
 * Introduces the program and encourages sign-up
 *
 * KEY DIFFERENCES FROM CHATTERS:
 * - No quiz required (direct activation)
 * - Fixed commissions ($10 client, $5 recruitment)
 * - No levels/badges
 * - 5% client discount via referral link
 * - Promotional tools (banners, widgets, QR codes)
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
  Percent,
  Image,
  CheckCircle,
  ArrowRight,
  Gift,
  Globe,
  HelpCircle,
  ChevronDown,
  Video,
  QrCode,
  Share2,
} from 'lucide-react';

// Design tokens - Using SOS-Expat red brand colors
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl",
  },
} as const;

const InfluencerLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const registerRoute = `/${getTranslatedRouteSlug('influencer-register' as RouteKey, langCode)}`;

  // SEO Meta tags
  const seoTitle = intl.formatMessage({
    id: 'influencer.landing.seo.title',
    defaultMessage: 'Devenir Influenceur SOS-Expat | Gagnez $10 par client référé'
  });
  const seoDescription = intl.formatMessage({
    id: 'influencer.landing.seo.description',
    defaultMessage: 'Rejoignez le programme Influenceur SOS-Expat et gagnez $10 par client parrainé + $5 par appel de prestataire recruté. Bannières, widgets, QR codes inclus. Retrait dès $50.'
  });
  const seoKeywords = intl.formatMessage({
    id: 'influencer.landing.seo.keywords',
    defaultMessage: 'influenceur, affiliation, commission, parrainage, SOS-Expat, gagner argent, créateur contenu, youtube, instagram'
  });
  const aiSummary = intl.formatMessage({
    id: 'influencer.landing.seo.aiSummary',
    defaultMessage: 'Programme influenceur SOS-Expat pour créateurs de contenu. Commission fixe $10/client, $5/appel recruté pendant 6 mois. Outils promo inclus: bannières, widgets, QR codes.'
  });

  // FAQ for Position 0 featured snippets
  const faqs = [
    {
      question: intl.formatMessage({ id: 'influencer.landing.faq.q1', defaultMessage: "Qu'est-ce qu'un Influenceur SOS-Expat ?" }),
      answer: intl.formatMessage({ id: 'influencer.landing.faq.a1', defaultMessage: "Un Influenceur SOS-Expat est un créateur de contenu ou une personne avec une audience qui recommande la plateforme et gagne des commissions sur chaque client parrainé ou prestataire recruté." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.landing.faq.q2', defaultMessage: 'Combien puis-je gagner comme Influenceur ?' }),
      answer: intl.formatMessage({ id: 'influencer.landing.faq.a2', defaultMessage: "Vous gagnez $10 par appel payé d'un client parrainé et $5 par appel reçu par un prestataire recruté (pendant 6 mois). Les commissions sont fixes, sans limite de gains." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.landing.faq.q3', defaultMessage: "Quels outils sont fournis ?" }),
      answer: intl.formatMessage({ id: 'influencer.landing.faq.a3', defaultMessage: "Vous recevez des bannières prêtes à l'emploi, des widgets interactifs pour votre site, un générateur de QR codes personnalisé et des textes promotionnels en 9 langues." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.landing.faq.q4', defaultMessage: 'Comment retirer mes gains ?' }),
      answer: intl.formatMessage({ id: 'influencer.landing.faq.a4', defaultMessage: "Vous pouvez retirer vos gains via Wise, PayPal ou virement bancaire dès que vous atteignez le seuil minimum de $50. Les commissions sont disponibles 7 jours après validation." }),
    },
    {
      question: intl.formatMessage({ id: 'influencer.landing.faq.q5', defaultMessage: 'Quel avantage pour mes followers ?' }),
      answer: intl.formatMessage({ id: 'influencer.landing.faq.a5', defaultMessage: "Vos followers bénéficient automatiquement d'une remise de 5% sur leur premier appel grâce à votre lien de parrainage. C'est un avantage exclusif pour votre communauté." }),
    },
  ];

  const benefits = [
    {
      icon: <Wallet className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'influencer.landing.benefit1.title', defaultMessage: 'Commission fixe $10' }),
      desc: intl.formatMessage({ id: 'influencer.landing.benefit1.desc', defaultMessage: 'Par client qui passe un appel via votre lien' }),
      color: 'from-red-500 to-red-600',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'influencer.landing.benefit2.title', defaultMessage: 'Recrutez et gagnez' }),
      desc: intl.formatMessage({ id: 'influencer.landing.benefit2.desc', defaultMessage: '$5 par appel de vos recrutés pendant 6 mois' }),
      color: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      icon: <Percent className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'influencer.landing.benefit3.title', defaultMessage: '5% pour vos followers' }),
      desc: intl.formatMessage({ id: 'influencer.landing.benefit3.desc', defaultMessage: 'Remise automatique sur leur premier appel' }),
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: <Image className="w-6 h-6" />,
      title: intl.formatMessage({ id: 'influencer.landing.benefit4.title', defaultMessage: 'Outils promo inclus' }),
      desc: intl.formatMessage({ id: 'influencer.landing.benefit4.desc', defaultMessage: 'Bannières, widgets, QR codes, textes prêts' }),
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  const tools = [
    {
      icon: <Image className="w-8 h-8 text-red-500" />,
      title: intl.formatMessage({ id: 'influencer.landing.tool1.title', defaultMessage: 'Bannières' }),
      desc: intl.formatMessage({ id: 'influencer.landing.tool1.desc', defaultMessage: 'Pour vos sites, blogs et signatures email' }),
    },
    {
      icon: <Video className="w-8 h-8 text-red-500" />,
      title: intl.formatMessage({ id: 'influencer.landing.tool2.title', defaultMessage: 'Widgets interactifs' }),
      desc: intl.formatMessage({ id: 'influencer.landing.tool2.desc', defaultMessage: 'Recherche intégrée pour votre site web' }),
    },
    {
      icon: <QrCode className="w-8 h-8 text-red-500" />,
      title: intl.formatMessage({ id: 'influencer.landing.tool3.title', defaultMessage: 'QR Codes' }),
      desc: intl.formatMessage({ id: 'influencer.landing.tool3.desc', defaultMessage: 'Personnalisés avec votre code unique' }),
    },
    {
      icon: <Share2 className="w-8 h-8 text-red-500" />,
      title: intl.formatMessage({ id: 'influencer.landing.tool4.title', defaultMessage: 'Textes promo' }),
      desc: intl.formatMessage({ id: 'influencer.landing.tool4.desc', defaultMessage: 'Posts prêts en 9 langues' }),
    },
  ];

  const steps = [
    {
      num: 1,
      title: intl.formatMessage({ id: 'influencer.landing.step1.title', defaultMessage: 'Inscrivez-vous' }),
      desc: intl.formatMessage({ id: 'influencer.landing.step1.desc', defaultMessage: 'Créez votre compte en 2 minutes' }),
    },
    {
      num: 2,
      title: intl.formatMessage({ id: 'influencer.landing.step2.title', defaultMessage: 'Accédez aux outils' }),
      desc: intl.formatMessage({ id: 'influencer.landing.step2.desc', defaultMessage: 'Bannières, widgets et liens personnalisés' }),
    },
    {
      num: 3,
      title: intl.formatMessage({ id: 'influencer.landing.step3.title', defaultMessage: 'Partagez' }),
      desc: intl.formatMessage({ id: 'influencer.landing.step3.desc', defaultMessage: 'Sur vos réseaux, chaîne, blog...' }),
    },
    {
      num: 4,
      title: intl.formatMessage({ id: 'influencer.landing.step4.title', defaultMessage: 'Gagnez' }),
      desc: intl.formatMessage({ id: 'influencer.landing.step4.desc', defaultMessage: 'Retirez dès $50 via Wise ou PayPal' }),
    },
  ];

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        ogImage="/og-influencer.jpg"
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
        <section className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-red-700 text-white py-20 px-4">
          <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
          <div className="max-w-5xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-6">
                <Star className="w-5 h-5" />
                <span className="font-medium">
                  <FormattedMessage id="influencer.landing.badge" defaultMessage="Programme Influenceur" />
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                <FormattedMessage id="influencer.landing.hero.title" defaultMessage="Devenez Influenceur SOS-Expat" />
              </h1>

              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-8">
                <FormattedMessage id="influencer.landing.hero.subtitle" defaultMessage="Gagnez $10 par client référé + outils promo exclusifs" />
              </p>

              <button
                onClick={() => navigate(registerRoute)}
                className={`${UI.button.primary} px-8 py-4 text-lg inline-flex items-center gap-3`}
              >
                <FormattedMessage id="influencer.landing.hero.cta" defaultMessage="Devenir Influenceur" />
                <ArrowRight className="w-5 h-5" />
              </button>

              <p className="mt-4 text-white/70 text-sm">
                <FormattedMessage id="influencer.landing.hero.free" defaultMessage="Inscription gratuite • Activation immédiate" />
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="influencer.landing.benefits.title" defaultMessage="Pourquoi devenir Influenceur ?" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              <FormattedMessage id="influencer.landing.benefits.subtitle" defaultMessage="Des commissions fixes et des outils professionnels" />
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

        {/* Promo Tools Section */}
        <section className="py-16 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="influencer.landing.tools.title" defaultMessage="Outils promotionnels inclus" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              <FormattedMessage id="influencer.landing.tools.subtitle" defaultMessage="Tout ce dont vous avez besoin pour promouvoir SOS-Expat" />
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {tools.map((tool, idx) => (
                <div key={idx} className={`${UI.card} p-6 text-center`}>
                  <div className="flex justify-center mb-4">
                    {tool.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tool.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="influencer.landing.howItWorks.title" defaultMessage="Comment ça marche ?" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              <FormattedMessage id="influencer.landing.howItWorks.subtitle" defaultMessage="4 étapes simples pour commencer" />
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {steps.map((step, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white text-xl font-bold">
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
        <section className="py-16 px-4 bg-white dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <FormattedMessage id="influencer.landing.commissions.title" defaultMessage="Vos commissions" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Commission */}
              <div className={`${UI.card} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <FormattedMessage id="influencer.landing.commissions.client.title" defaultMessage="Commission Client" />
                  </h3>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent mb-2">
                  $10
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="influencer.landing.commissions.client.desc" defaultMessage="Par appel payé d'un client référé" />
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Percent className="w-4 h-4" />
                    <FormattedMessage id="influencer.landing.commissions.client.bonus" defaultMessage="+ 5% de remise automatique pour votre follower" />
                  </div>
                </div>
              </div>

              {/* Recruitment Commission */}
              <div className={`${UI.card} p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <FormattedMessage id="influencer.landing.commissions.recruitment.title" defaultMessage="Commission Recrutement" />
                  </h3>
                </div>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent mb-2">
                  $5
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="influencer.landing.commissions.recruitment.desc" defaultMessage="Par appel reçu par un prestataire recruté" />
                </p>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                    <CheckCircle className="w-4 h-4" />
                    <FormattedMessage id="influencer.landing.commissions.recruitment.bonus" defaultMessage="Pendant 6 mois après inscription" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black" itemScope itemType="https://schema.org/FAQPage">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <HelpCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.landing.faq.title" defaultMessage="Questions fréquentes" />
              </h2>
            </div>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              <FormattedMessage id="influencer.landing.faq.subtitle" defaultMessage="Tout ce que vous devez savoir sur le programme" />
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
        <section className="py-20 px-4 bg-gradient-to-r from-red-600 via-red-500 to-red-700 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <FormattedMessage id="influencer.landing.cta.title" defaultMessage="Prêt à devenir Influenceur ?" />
            </h2>
            <p className="text-xl text-white/90 mb-8">
              <FormattedMessage id="influencer.landing.cta.subtitle" defaultMessage="Inscription gratuite, activation immédiate" />
            </p>
            <button
              onClick={() => navigate(registerRoute)}
              className="bg-white text-red-600 font-bold px-8 py-4 rounded-xl text-lg inline-flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <FormattedMessage id="influencer.landing.cta.button" defaultMessage="S'inscrire maintenant" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default InfluencerLanding;
