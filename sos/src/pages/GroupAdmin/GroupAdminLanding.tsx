/**
 * GroupAdminLanding - Landing Page for Facebook Group Administrators
 *
 * Designed to convert Facebook group admins into SOS-Expat partners.
 * Highlights: $15 per client, ready-to-use tools, 9 languages support.
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import {
  Users,
  CheckCircle,
  ArrowRight,
  DollarSign,
  Globe,
  ChevronDown,
  Smartphone,
  Zap,
  Gift,
  Image,
  Copy,
  Target,
  TrendingUp,
  Award,
  ShieldCheck,
  Facebook,
  UserPlus,
  FileText,
} from 'lucide-react';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const GroupAdminLanding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleRegisterClick = () => {
    navigate('/group-admin/inscription');
  };

  return (
    <Layout>
      <SEOHead
        title={intl.formatMessage({ id: 'groupAdmin.landing.seo.title', defaultMessage: 'Become a Group Admin Partner - Earn $15 per Client | SOS-Expat' })}
        description={intl.formatMessage({ id: 'groupAdmin.landing.seo.description', defaultMessage: 'Monetize your Facebook group. Earn $15 for each client referred, plus $5 for each admin recruited. Ready-to-use tools in 9 languages.' })}
      />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Facebook Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Facebook className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">
                <FormattedMessage id="groupAdmin.landing.badge" defaultMessage="For Facebook Group Admins" />
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              <FormattedMessage
                id="groupAdmin.landing.hero.title"
                defaultMessage="Earn Money with Your Facebook Group"
              />
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto">
              <FormattedMessage
                id="groupAdmin.landing.hero.subtitle"
                defaultMessage="Help your expat members with legal assistance and earn $15 per client. Plus $5 for each admin you recruit."
              />
            </p>

            {/* Key Numbers */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-10">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6">
                <div className="text-3xl md:text-4xl font-bold text-green-400">$15</div>
                <div className="text-sm text-blue-200">
                  <FormattedMessage id="groupAdmin.landing.hero.perClient" defaultMessage="per client" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6">
                <div className="text-3xl md:text-4xl font-bold text-yellow-400">$5</div>
                <div className="text-sm text-blue-200">
                  <FormattedMessage id="groupAdmin.landing.hero.perRecruit" defaultMessage="per recruit" />
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6">
                <div className="text-3xl md:text-4xl font-bold text-purple-400">9</div>
                <div className="text-sm text-blue-200">
                  <FormattedMessage id="groupAdmin.landing.hero.languages" defaultMessage="languages" />
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleRegisterClick}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <FormattedMessage id="groupAdmin.landing.hero.cta" defaultMessage="Become a Partner" />
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-sm text-blue-200 mt-4">
              <FormattedMessage id="groupAdmin.landing.hero.free" defaultMessage="100% free - No commitment" />
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <FormattedMessage id="groupAdmin.landing.howItWorks.title" defaultMessage="How It Works" />
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            <FormattedMessage id="groupAdmin.landing.howItWorks.subtitle" defaultMessage="Three simple steps to start earning" />
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-sm font-bold text-blue-600 mb-2">
                <FormattedMessage id="groupAdmin.landing.step1.label" defaultMessage="STEP 1" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                <FormattedMessage id="groupAdmin.landing.step1.title" defaultMessage="Register for Free" />
              </h3>
              <p className="text-gray-600">
                <FormattedMessage id="groupAdmin.landing.step1.description" defaultMessage="Sign up and add your Facebook group. Get your unique affiliate links instantly." />
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Copy className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-sm font-bold text-green-600 mb-2">
                <FormattedMessage id="groupAdmin.landing.step2.label" defaultMessage="STEP 2" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                <FormattedMessage id="groupAdmin.landing.step2.title" defaultMessage="Share Ready-Made Posts" />
              </h3>
              <p className="text-gray-600">
                <FormattedMessage id="groupAdmin.landing.step2.description" defaultMessage="Use our copy-paste posts, banners, and images. Available in 9 languages!" />
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-sm font-bold text-yellow-600 mb-2">
                <FormattedMessage id="groupAdmin.landing.step3.label" defaultMessage="STEP 3" />
              </div>
              <h3 className="text-xl font-bold mb-3">
                <FormattedMessage id="groupAdmin.landing.step3.title" defaultMessage="Earn Commissions" />
              </h3>
              <p className="text-gray-600">
                <FormattedMessage id="groupAdmin.landing.step3.description" defaultMessage="Earn $15 for each client and $5 for each admin you recruit. Withdraw anytime." />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <FormattedMessage id="groupAdmin.landing.benefits.title" defaultMessage="Why Join?" />
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Benefit 1 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <DollarSign className="w-10 h-10 text-green-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">
                <FormattedMessage id="groupAdmin.landing.benefit1.title" defaultMessage="$15 Per Client" />
              </h3>
              <p className="text-gray-600 text-sm">
                <FormattedMessage id="groupAdmin.landing.benefit1.description" defaultMessage="Earn commission for every member who books a consultation through your link." />
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <Image className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">
                <FormattedMessage id="groupAdmin.landing.benefit2.title" defaultMessage="Ready-Made Tools" />
              </h3>
              <p className="text-gray-600 text-sm">
                <FormattedMessage id="groupAdmin.landing.benefit2.description" defaultMessage="Posts, banners, images - all ready to use. Just copy-paste!" />
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
              <Globe className="w-10 h-10 text-purple-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">
                <FormattedMessage id="groupAdmin.landing.benefit3.title" defaultMessage="9 Languages" />
              </h3>
              <p className="text-gray-600 text-sm">
                <FormattedMessage id="groupAdmin.landing.benefit3.description" defaultMessage="All resources available in FR, EN, ES, PT, AR, DE, IT, NL, ZH." />
              </p>
            </div>

            {/* Benefit 4 */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
              <Gift className="w-10 h-10 text-yellow-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">
                <FormattedMessage id="groupAdmin.landing.benefit4.title" defaultMessage="$5 Discount for Members" />
              </h3>
              <p className="text-gray-600 text-sm">
                <FormattedMessage id="groupAdmin.landing.benefit4.description" defaultMessage="Your members get an exclusive $5 discount on their first consultation." />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Groups Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <FormattedMessage id="groupAdmin.landing.targetGroups.title" defaultMessage="Perfect For Your Group" />
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            <FormattedMessage id="groupAdmin.landing.targetGroups.subtitle" defaultMessage="Whether you manage a travel, expat, or immigration group - we have the right tools for you." />
          </p>

          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {[
              { id: 'travel', icon: '✈️', label: 'Travel Groups' },
              { id: 'expat', icon: '🌍', label: 'Expat Communities' },
              { id: 'nomad', icon: '💻', label: 'Digital Nomads' },
              { id: 'immigration', icon: '🛂', label: 'Immigration' },
              { id: 'relocation', icon: '📦', label: 'Relocation' },
              { id: 'student', icon: '🎓', label: 'Students Abroad' },
              { id: 'family', icon: '👨‍👩‍👧‍👦', label: 'Expat Families' },
              { id: 'retirement', icon: '🌴', label: 'Retirement Abroad' },
            ].map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-full px-5 py-3 shadow-sm hover:shadow-md transition-shadow flex items-center gap-2"
              >
                <span className="text-xl">{group.icon}</span>
                <span className="font-medium text-gray-700">
                  <FormattedMessage id={`groupAdmin.landing.groupType.${group.id}`} defaultMessage={group.label} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            <FormattedMessage id="groupAdmin.landing.faq.title" defaultMessage="Frequently Asked Questions" />
          </h2>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q1', defaultMessage: 'Is it really free to join?' }),
                a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a1', defaultMessage: 'Yes! Registration is 100% free. There are no fees, no commitments, and no minimum requirements.' }),
              },
              {
                q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q2', defaultMessage: 'When do I get paid?' }),
                a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a2', defaultMessage: 'Commissions become available 7 days after the client\'s consultation. You can withdraw anytime once you have at least $25.' }),
              },
              {
                q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q3', defaultMessage: 'What payment methods are available?' }),
                a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a3', defaultMessage: 'We support PayPal, Wise, Mobile Money, and bank transfers to over 100 countries.' }),
              },
              {
                q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q4', defaultMessage: 'How does the recruitment bonus work?' }),
                a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a4', defaultMessage: 'When you recruit another group admin using your recruitment link, you earn $5 when they sign up. The bonus window is 6 months.' }),
              },
              {
                q: intl.formatMessage({ id: 'groupAdmin.landing.faq.q5', defaultMessage: 'What kind of groups are eligible?' }),
                a: intl.formatMessage({ id: 'groupAdmin.landing.faq.a5', defaultMessage: 'Any Facebook group related to travel, expatriation, immigration, international relocation, or living abroad is eligible.' }),
              },
            ].map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="p-5 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-600">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-indigo-900 to-purple-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            <FormattedMessage id="groupAdmin.landing.finalCta.title" defaultMessage="Ready to Start Earning?" />
          </h2>
          <p className="text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
            <FormattedMessage id="groupAdmin.landing.finalCta.subtitle" defaultMessage="Join hundreds of group admins already earning with SOS-Expat." />
          </p>
          <button
            onClick={handleRegisterClick}
            className="inline-flex items-center gap-3 bg-white text-indigo-900 font-bold text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <FormattedMessage id="groupAdmin.landing.finalCta.cta" defaultMessage="Register Now - It's Free" />
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </Layout>
  );
};

export default GroupAdminLanding;
