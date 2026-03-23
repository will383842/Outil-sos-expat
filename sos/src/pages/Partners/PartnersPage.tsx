/**
 * PartnersPage - "Nos Partenaires de Confiance" public page
 *
 * Displays visible partner websites in a grid.
 * Conditionally rendered based on partner_config/current.isPartnerListingPageVisible.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import {
  Globe,
  ExternalLink,
  Loader2,
  ArrowRight,
  Users,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
interface PartnerDisplay {
  id: string;
  websiteName: string;
  websiteUrl: string;
  websiteDescription?: string;
  websiteCategory: string;
  websiteLogo?: string;
}

// ============================================================================
// CATEGORY BADGE
// ============================================================================
const CATEGORY_COLORS: Record<string, string> = {
  expatriation: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  travel: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  legal: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  finance: 'bg-green-500/10 text-green-400 border-green-500/20',
  insurance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  relocation: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  education: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  media: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  association: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  corporate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  other: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const PartnersPage: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<PartnerDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [configChecked, setConfigChecked] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if page is visible
        const configSnap = await getDoc(doc(db, 'partner_config', 'current'));
        if (!configSnap.exists() || !configSnap.data()?.isPartnerListingPageVisible) {
          navigate('/', { replace: true });
          return;
        }
        setConfigChecked(true);

        // Fetch visible partners
        const q = query(
          collection(db, 'partners'),
          where('isVisible', '==', true),
          where('status', '==', 'active')
        );
        const snapshot = await getDocs(q);
        const data: PartnerDisplay[] = snapshot.docs.map(d => ({
          id: d.id,
          websiteName: d.data().websiteName || '',
          websiteUrl: d.data().websiteUrl || '',
          websiteDescription: d.data().websiteDescription,
          websiteCategory: d.data().websiteCategory || 'other',
          websiteLogo: d.data().websiteLogo,
        }));
        setPartners(data);
      } catch (err) {
        console.error('Error loading partners page:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  if (loading || !configChecked) {
    return (
      <Layout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title={intl.formatMessage({ id: 'partner.page.seo.title', defaultMessage: 'Our Trusted Partners - SOS-Expat' })}
        description={intl.formatMessage({ id: 'partner.page.seo.description', defaultMessage: 'Discover our trusted partner websites for expatriates.' })}
      />
      <BreadcrumbSchema items={[
        { name: intl.formatMessage({ id: 'breadcrumb.home', defaultMessage: 'Home' }), url: '/' },
        { name: 'Partners' }
      ]} />

      <div className="bg-black text-white min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20" />
          <div className="relative px-4 py-20 md:py-28">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
                <FormattedMessage id="partner.page.hero.title" defaultMessage="Our Trusted Partners" />
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                <FormattedMessage id="partner.page.hero.subtitle" defaultMessage="Discover the websites and organizations that work with SOS-Expat to serve expatriates worldwide." />
              </p>
            </div>
          </div>
        </section>

        {/* Partner Grid */}
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-6xl mx-auto">
            {partners.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  <FormattedMessage id="partner.page.empty" defaultMessage="No partners to display yet." />
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map((partner) => (
                  <a
                    key={partner.id}
                    href={partner.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      {partner.websiteLogo ? (
                        <img
                          src={partner.websiteLogo}
                          alt={partner.websiteName}
                          className="w-12 h-12 rounded-xl object-contain bg-white/10 p-1"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-6 h-6 text-cyan-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
                          {partner.websiteName}
                        </h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full border ${CATEGORY_COLORS[partner.websiteCategory] || CATEGORY_COLORS.other}`}>
                          {intl.formatMessage({ id: `partner.landing.category.${partner.websiteCategory}`, defaultMessage: partner.websiteCategory })}
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-1" />
                    </div>

                    {partner.websiteDescription && (
                      <p className="text-gray-400 text-sm line-clamp-3">
                        {partner.websiteDescription}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <FormattedMessage id="partner.page.cta.title" defaultMessage="Want to become a partner?" />
            </h2>
            <p className="text-gray-400 mb-8">
              <FormattedMessage id="partner.page.cta.subtitle" defaultMessage="Join our network and monetize your expat audience." />
            </p>
            <button
              onClick={() => navigate('/devenir-partenaire')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold text-lg rounded-xl transition-all min-h-[44px]"
            >
              <FormattedMessage id="partner.page.cta.button" defaultMessage="Become a partner" />
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default PartnersPage;
