/**
 * BloggerLanding - Public landing page for blogger partner program
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import Layout from '@/components/layout/Layout';
import {
  DollarSign,
  Users,
  Gift,
  Shield,
  ArrowRight,
  CheckCircle,
  Globe,
  Zap,
  BookOpen,
  FolderOpen,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
  },
} as const;

const BloggerLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();

  const benefits = [
    {
      icon: <DollarSign className="w-8 h-8 text-green-500" />,
      title: intl.formatMessage({ id: 'blogger.landing.benefit1.title', defaultMessage: '10$ par client référé' }),
      description: intl.formatMessage({ id: 'blogger.landing.benefit1.desc', defaultMessage: 'Gagnez 10$ pour chaque nouveau client qui fait un appel payant via votre lien' }),
    },
    {
      icon: <Users className="w-8 h-8 text-blue-500" />,
      title: intl.formatMessage({ id: 'blogger.landing.benefit2.title', defaultMessage: '5$ par recrutement' }),
      description: intl.formatMessage({ id: 'blogger.landing.benefit2.desc', defaultMessage: 'Recrutez des prestataires et gagnez 5$ sur chaque appel qu\'ils reçoivent pendant 6 mois' }),
    },
    {
      icon: <FolderOpen className="w-8 h-8 text-purple-500" />,
      title: intl.formatMessage({ id: 'blogger.landing.benefit3.title', defaultMessage: 'Ressources exclusives' }),
      description: intl.formatMessage({ id: 'blogger.landing.benefit3.desc', defaultMessage: 'Accédez à des logos, images et textes prêts à l\'emploi pour votre blog' }),
    },
    {
      icon: <BookOpen className="w-8 h-8 text-orange-500" />,
      title: intl.formatMessage({ id: 'blogger.landing.benefit4.title', defaultMessage: 'Guide d\'intégration' }),
      description: intl.formatMessage({ id: 'blogger.landing.benefit4.desc', defaultMessage: 'Templates d\'articles et textes à copier-coller pour votre contenu' }),
    },
  ];

  const steps = [
    {
      step: '1',
      title: intl.formatMessage({ id: 'blogger.landing.step1.title', defaultMessage: 'Inscrivez-vous' }),
      description: intl.formatMessage({ id: 'blogger.landing.step1.desc', defaultMessage: 'Créez votre compte blogueur en quelques minutes' }),
    },
    {
      step: '2',
      title: intl.formatMessage({ id: 'blogger.landing.step2.title', defaultMessage: 'Partagez vos liens' }),
      description: intl.formatMessage({ id: 'blogger.landing.step2.desc', defaultMessage: 'Intégrez vos liens d\'affiliation dans vos articles' }),
    },
    {
      step: '3',
      title: intl.formatMessage({ id: 'blogger.landing.step3.title', defaultMessage: 'Gagnez de l\'argent' }),
      description: intl.formatMessage({ id: 'blogger.landing.step3.desc', defaultMessage: 'Recevez vos commissions via PayPal, Wise ou Mobile Money' }),
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-950 dark:to-black">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <span className="inline-block px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium mb-6">
              <FormattedMessage id="blogger.landing.badge" defaultMessage="Programme Partenaire Blogueurs" />
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              <FormattedMessage
                id="blogger.landing.title"
                defaultMessage="Monétisez votre blog avec SOS-Expat"
              />
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              <FormattedMessage
                id="blogger.landing.subtitle"
                defaultMessage="Rejoignez notre programme partenaire et gagnez des commissions fixes en recommandant nos services d'experts à votre audience."
              />
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/blogger/inscription')}
                className={`${UI.button.primary} px-8 py-4 text-lg flex items-center justify-center gap-2`}
              >
                <FormattedMessage id="blogger.landing.cta" defaultMessage="Devenir Blogueur Partenaire" />
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Commission Highlight */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`${UI.card} p-8 text-center`}>
                <DollarSign className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">$10</p>
                <p className="text-gray-600 dark:text-gray-300">
                  <FormattedMessage id="blogger.landing.commission.client" defaultMessage="par client référé" />
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  <FormattedMessage id="blogger.landing.commission.clientDesc" defaultMessage="Commission fixe sur chaque appel payant" />
                </p>
              </div>
              <div className={`${UI.card} p-8 text-center`}>
                <Users className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <p className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">$5</p>
                <p className="text-gray-600 dark:text-gray-300">
                  <FormattedMessage id="blogger.landing.commission.recruit" defaultMessage="par recrutement" />
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  <FormattedMessage id="blogger.landing.commission.recruitDesc" defaultMessage="Sur chaque appel reçu pendant 6 mois" />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <FormattedMessage id="blogger.landing.benefits.title" defaultMessage="Pourquoi rejoindre le programme ?" />
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className={`${UI.card} p-6 flex gap-4`}>
                  <div className="flex-shrink-0">{benefit.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Exclusive Features */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="blogger.landing.exclusive.title" defaultMessage="Avantages exclusifs aux blogueurs" />
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
              <FormattedMessage
                id="blogger.landing.exclusive.subtitle"
                defaultMessage="Des outils uniques pour vous aider à promouvoir SOS-Expat sur votre blog"
              />
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className={`${UI.card} p-6 text-center`}>
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.landing.exclusive.resources" defaultMessage="Ressources" />
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  <FormattedMessage
                    id="blogger.landing.exclusive.resourcesDesc"
                    defaultMessage="Logos HD, bannières, images optimisées et textes promotionnels"
                  />
                </p>
              </div>
              <div className={`${UI.card} p-6 text-center`}>
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.landing.exclusive.guide" defaultMessage="Guide d'intégration" />
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  <FormattedMessage
                    id="blogger.landing.exclusive.guideDesc"
                    defaultMessage="Templates d'articles, textes prêts à copier et bonnes pratiques SEO"
                  />
                </p>
              </div>
              <div className={`${UI.card} p-6 text-center`}>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  <FormattedMessage id="blogger.landing.exclusive.tools" defaultMessage="Outils promo" />
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  <FormattedMessage
                    id="blogger.landing.exclusive.toolsDesc"
                    defaultMessage="Générateur de liens, widgets intégrables et codes QR personnalisés"
                  />
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              <FormattedMessage id="blogger.landing.howItWorks.title" defaultMessage="Comment ça marche ?" />
            </h2>
            <div className="flex flex-col md:flex-row gap-8">
              {steps.map((step, index) => (
                <div key={index} className="flex-1 text-center">
                  <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
              <FormattedMessage id="blogger.landing.requirements.title" defaultMessage="Critères d'éligibilité" />
            </h2>
            <div className={`${UI.card} p-8`}>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <FormattedMessage id="blogger.landing.req1" defaultMessage="Posséder un blog actif avec du contenu régulier" />
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <FormattedMessage id="blogger.landing.req2" defaultMessage="Audience intéressée par l'expatriation, l'immigration ou les services juridiques" />
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <FormattedMessage id="blogger.landing.req3" defaultMessage="Contenu de qualité et conforme à nos valeurs" />
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    <FormattedMessage id="blogger.landing.notice.title" defaultMessage="Information importante" />
                  </h3>
                  <p className="text-amber-700 dark:text-amber-300">
                    <FormattedMessage
                      id="blogger.landing.notice.text"
                      defaultMessage="Le statut de Blogueur Partenaire est définitif. Une fois inscrit, vous ne pourrez pas devenir Chatter ou Influenceur. Cette distinction permet de maintenir l'intégrité de chaque programme."
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              <FormattedMessage id="blogger.landing.cta.title" defaultMessage="Prêt à monétiser votre blog ?" />
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              <FormattedMessage
                id="blogger.landing.cta.subtitle"
                defaultMessage="Rejoignez des centaines de blogueurs qui gagnent de l'argent avec SOS-Expat"
              />
            </p>
            <button
              onClick={() => navigate('/blogger/inscription')}
              className={`${UI.button.primary} px-10 py-4 text-lg flex items-center justify-center gap-2 mx-auto`}
            >
              <FormattedMessage id="blogger.landing.cta.button" defaultMessage="S'inscrire maintenant" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default BloggerLanding;
