/**
 * ============================================================================
 * LANDING PAGE COMPLETE - Template complet avec toutes les sections
 * ============================================================================
 *
 * Design professionnel avec toutes les sections disponibles.
 * Sections : Hero + Trust + Problem + Solution + Process + Benefits +
 *            Testimonials + FAQ + CTA
 *
 * Idéal pour :
 * - Services complexes nécessitant des explications
 * - Nouvelles audiences à éduquer
 * - SEO (plus de contenu = meilleur référencement)
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';

import { LandingHero } from '../LandingHero';
import { LandingProblem } from '../LandingProblem';
import { LandingSolution } from '../LandingSolution';
import { LandingProcess } from '../LandingProcess';
import { LandingBenefits } from '../LandingBenefits';
import { LandingTestimonials } from '../LandingTestimonials';
import { LandingFAQ } from '../LandingFAQ';
import { LandingCTA } from '../LandingCTA';
import { LandingTrust } from '../LandingTrust';
import { LandingSchema } from '../LandingSchema';
import { LandingMeta } from '../LandingMeta';
import { LandingBreadcrumbs } from '../LandingBreadcrumbs';
import { ReadingProgressBar } from '../ReadingProgressBar';
import { StickyCTAMobile } from '../StickyCTAMobile';
import { useReducedMotion, useIsMobile } from '../../hooks';
import type { LandingData } from '../../types';

import Layout from '@/components/layout/Layout';

export interface LandingPageCompleteProps {
  data: LandingData;
}

/**
 * Template Complete - Toutes les sections
 */
export const LandingPageComplete = memo<LandingPageCompleteProps>(({ data }) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const { sections, cta, breadcrumbs, conversion, targeting } = data;

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.4 },
      };

  return (
    <Layout>
      {/* SEO Meta Tags */}
      <LandingMeta data={data} />

      {/* Schema.org JSON-LD */}
      <LandingSchema data={data} />

      {/* Reading Progress Bar */}
      {conversion?.progressBar?.enabled && <ReadingProgressBar />}

      {/* Main Content */}
      <motion.div className="min-h-screen overflow-x-hidden" {...animationProps}>
        {/* Hero Section */}
        <LandingHero hero={sections.hero} cta={cta} targeting={targeting} />

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <LandingBreadcrumbs items={breadcrumbs} />
        )}

        {/* Trust Section */}
        {data.trustBadges && data.trustBadges.length > 0 && (
          <LandingTrust
            badges={data.trustBadges}
            socialProof={data.socialProof}
            eeat={data.eeat}
          />
        )}

        {/* Problem Section */}
        {sections.problem && <LandingProblem problem={sections.problem} />}

        {/* Solution Section */}
        {sections.solution && <LandingSolution solution={sections.solution} />}

        {/* How It Works Section */}
        {sections.howItWorks && <LandingProcess process={sections.howItWorks} />}

        {/* Benefits Section */}
        {sections.advantages && <LandingBenefits benefits={sections.advantages} />}

        {/* Testimonials Section */}
        {sections.testimonials && (
          <LandingTestimonials
            testimonials={sections.testimonials}
            socialProof={data.socialProof}
          />
        )}

        {/* FAQ Section */}
        {sections.faq && <LandingFAQ faq={sections.faq} />}

        {/* Final CTA Section */}
        <LandingCTA
          ctaSection={sections.cta}
          globalCta={cta}
          guarantee={conversion?.guarantee}
        />
      </motion.div>

      {/* Sticky CTA Mobile */}
      {isMobile && conversion?.stickyCta?.enabled && (
        <StickyCTAMobile
          cta={cta}
          showAfterScroll={conversion.stickyCta.showAfterScroll}
        />
      )}
    </Layout>
  );
});

LandingPageComplete.displayName = 'LandingPageComplete';
