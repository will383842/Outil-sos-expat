/**
 * ============================================================================
 * LANDING CTA - Section CTA finale
 * ============================================================================
 *
 * Bandeau CTA final avec :
 * - Fond gradient rouge-orange
 * - Trust badges
 * - Double CTA (primary + secondary)
 * - Garantie
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Phone, Shield, Clock, Globe, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import { CTAButton, DynamicIcon } from './ui';
import { useReducedMotion } from '../hooks';
import { fadeInUp } from '../lib/animations';
import type { CTASection, CTAData, ConversionConfig } from '../types';

export interface LandingCTAProps {
  ctaSection: CTASection;
  globalCta: CTAData;
  guarantee?: ConversionConfig['guarantee'];
}

/**
 * Section CTA finale des landing pages
 * Design inspiré de la home page SOS Expat
 */
export const LandingCTA = memo<LandingCTAProps>(({
  ctaSection,
  globalCta,
  guarantee,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const variants = prefersReducedMotion ? {} : fadeInUp;

  // Use section CTA or fallback to global
  const primaryUrl = ctaSection.primaryCta?.url || globalCta.primary_url;
  const primaryText = ctaSection.primaryCta?.text || globalCta.primary_text;
  const secondaryUrl = ctaSection.secondaryCta?.url || globalCta.secondary_url;
  const secondaryText = ctaSection.secondaryCta?.text || globalCta.secondary_text;

  return (
    <section
      className="py-24 sm:py-32 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden"
      aria-labelledby="cta-heading"
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20 pointer-events-none"
        aria-hidden="true"
      />

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <motion.h2
          id="cta-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 sm:mb-8"
        >
          {ctaSection.title}
        </motion.h2>

        {/* Subtitle */}
        {ctaSection.subtitle && (
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={variants}
            className="text-xl sm:text-2xl text-white/90 mb-10 sm:mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            {ctaSection.subtitle}
          </motion.p>
        )}

        {/* Trust badges */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
          className="mb-10 flex flex-wrap items-center justify-center gap-3"
          role="list"
          aria-label="Garanties"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm text-white text-sm font-medium">
            <Shield className="w-4 h-4" />
            100% Sécurisé
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm text-white text-sm font-medium">
            <Clock className="w-4 h-4" />
            Réponse {'<'} 5 min
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm text-white text-sm font-medium">
            <Globe className="w-4 h-4" />
            197 pays
          </span>
        </motion.div>

        {/* CTA Buttons */}
        <motion.nav
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={variants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
          aria-label="Actions"
        >
          {/* Primary CTA */}
          <Link
            to={primaryUrl}
            className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-10 sm:px-12 py-5 sm:py-6 rounded-3xl font-black text-lg sm:text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl flex items-center gap-4 touch-manipulation"
          >
            <Phone className="w-6 h-6" />
            <span>{primaryText}</span>
            <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />
          </Link>

          {/* Secondary CTA */}
          {secondaryUrl && secondaryText && (
            <Link
              to={secondaryUrl}
              className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-10 sm:px-12 py-5 sm:py-6 rounded-3xl font-bold text-lg sm:text-xl transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-4 touch-manipulation"
            >
              <span>{secondaryText}</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </motion.nav>

        {/* Guarantee */}
        {guarantee && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={variants}
            className="mt-10 sm:mt-12"
          >
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
              <DynamicIcon
                name={guarantee.icon}
                className="w-8 h-8 text-green-400"
              />
              <div className="text-left">
                <div className="text-white font-bold">{guarantee.title}</div>
                <div className="text-white/80 text-sm">{guarantee.text}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Reassurance */}
        {ctaSection.reassurance && (
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={variants}
            className="mt-8 text-white/70 text-sm max-w-xl mx-auto"
          >
            {ctaSection.reassurance}
          </motion.p>
        )}
      </div>
    </section>
  );
});

LandingCTA.displayName = 'LandingCTA';
