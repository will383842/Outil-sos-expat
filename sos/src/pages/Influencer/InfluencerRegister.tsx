/**
 * InfluencerRegister - Registration page for influencers
 * No quiz required - direct activation after registration
 * Supports auto referral code from URL params
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import InfluencerRegisterForm from '@/components/Influencer/Forms/InfluencerRegisterForm';
import { CheckCircle, Gift, Users, Image } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const InfluencerRegister: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get referral code from URL params (supports: ref, referralCode, code, sponsor)
  const referralCodeFromUrl = useMemo(() => {
    return searchParams.get('ref')
      || searchParams.get('referralCode')
      || searchParams.get('code')
      || searchParams.get('sponsor')
      || '';
  }, [searchParams]);

  const seoTitle = intl.formatMessage({
    id: 'influencer.register.seo.title',
    defaultMessage: 'Inscription Influenceur SOS-Expat'
  });
  const seoDescription = intl.formatMessage({
    id: 'influencer.register.seo.description',
    defaultMessage: 'Inscrivez-vous au programme Influenceur SOS-Expat. Activation immédiate, commissions fixes $10/client, outils promo inclus.'
  });

  const benefits = [
    {
      icon: <Gift className="w-5 h-5 text-red-500" />,
      text: intl.formatMessage({ id: 'influencer.register.benefit1', defaultMessage: '$10 par client référé' }),
    },
    {
      icon: <Users className="w-5 h-5 text-purple-500" />,
      text: intl.formatMessage({ id: 'influencer.register.benefit2.v3', defaultMessage: '$5/appel avocat ou expatrié aidant recruté' }),
    },
    {
      icon: <Image className="w-5 h-5 text-blue-500" />,
      text: intl.formatMessage({ id: 'influencer.register.benefit3', defaultMessage: 'Bannières, widgets, QR codes inclus' }),
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      text: intl.formatMessage({ id: 'influencer.register.benefit4', defaultMessage: 'Activation immédiate (pas de quiz)' }),
    },
  ];

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        ogImage="/og-influencer-register.jpg"
        ogType="website"
      />
      <HreflangLinks pathname={location.pathname} />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="influencer.register.title" defaultMessage="Devenir Influenceur SOS-Expat" />
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              <FormattedMessage id="influencer.register.subtitle" defaultMessage="Créez votre compte et commencez à gagner immédiatement" />
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Benefits Sidebar */}
            <div className="lg:col-span-1">
              <div className={`${UI.card} p-6 sticky top-24`}>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                  <FormattedMessage id="influencer.register.benefits.title" defaultMessage="Ce que vous obtenez" />
                </h2>
                <div className="space-y-4">
                  {benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {benefit.icon}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {benefit.text}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="influencer.register.info"
                      defaultMessage="L'inscription est gratuite. Votre compte sera activé immédiatement après validation."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <div className="lg:col-span-2">
              <div className={`${UI.card} p-6`}>
                {/* Referral code banner if present */}
                {referralCodeFromUrl && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                        <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-300">
                          <FormattedMessage id="influencer.register.referralDetected" defaultMessage="You've been referred!" />
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          <FormattedMessage
                            id="influencer.register.referralCode.applied"
                            defaultMessage="Referral code {code} will be applied automatically"
                            values={{ code: <strong>{referralCodeFromUrl}</strong> }}
                          />
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <InfluencerRegisterForm referralCode={referralCodeFromUrl} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InfluencerRegister;
