/**
 * ============================================================================
 * LANDING HERO - Section hero des landing pages
 * ============================================================================
 *
 * Design premium inspiré de la home page SOS Expat avec :
 * - Fond gradient sombre avec effets blur
 * - Titre avec gradient de texte
 * - Badges de confiance
 * - CTA principal animé
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Phone, Shield, Globe, Clock, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import { CTAButton, TrustBadge } from './ui';
import { useReducedMotion } from '../hooks';
import { fadeInUp, staggerContainer, staggerItem } from '../lib/animations';
import type { HeroSection, CTAData, LandingTargeting } from '../types';

export interface LandingHeroProps {
  hero: HeroSection;
  cta: CTAData;
  targeting?: LandingTargeting;
}

/**
 * Section Hero des landing pages
 * Design aligné sur la home page SOS Expat
 */
export const LandingHero = memo<LandingHeroProps>(({
  hero,
  cta,
  targeting,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion ? {} : staggerContainer;
  const itemVariants = prefersReducedMotion ? {} : staggerItem;

  // Flag du pays si disponible
  const countryFlag = targeting?.country?.flag;
  const countryName = targeting?.country?.nameFr || targeting?.country?.nameLocal;

  return (
    <header
      className="relative pt-20 pb-24 sm:pb-32 overflow-hidden"
      role="banner"
      aria-labelledby="hero-title"
    >
      {/* Background Layers */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Animated blur circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="text-center">
          {/* Country Badge */}
          {countryFlag && countryName && (
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-sm font-medium">
                <span className="text-xl">{countryFlag}</span>
                <span>{countryName}</span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </span>
            </motion.div>
          )}

          {/* Badges */}
          {hero.badges && hero.badges.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap justify-center gap-3 mb-6"
            >
              {hero.badges.map((badge, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-sm font-medium"
                >
                  <Check className="w-4 h-4 text-green-400" />
                  {badge}
                </span>
              ))}
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            id="hero-title"
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 sm:mb-8 leading-tight"
          >
            <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
              {hero.title}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-10 sm:mb-12 leading-relaxed"
          >
            {hero.subtitle}
          </motion.p>

          {/* CTA Buttons */}
          <motion.nav
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
            aria-label="Actions principales"
          >
            {/* Primary CTA */}
            <CTAButton
              href={cta.primary_url}
              variant="primary"
              size="xl"
              icon="phone"
              iconPosition="left"
              className="w-full sm:w-auto"
              trackingEvent="landing_hero_cta_click"
            >
              {cta.primary_text}
            </CTAButton>

            {/* Secondary CTA (if exists) */}
            {cta.secondary_url && cta.secondary_text && (
              <CTAButton
                href={cta.secondary_url}
                variant="outline"
                size="xl"
                icon="arrow"
                className="w-full sm:w-auto hidden sm:flex"
              >
                {cta.secondary_text}
              </CTAButton>
            )}
          </motion.nav>

          {/* Trust indicators */}
          <motion.div
            variants={itemVariants}
            className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          >
            <div className="flex items-center gap-2 text-green-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">100% Sécurisé</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-white/20" />
            <div className="flex items-center gap-2 text-blue-400">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium">197 Pays</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-white/20" />
            <div className="flex items-center gap-2 text-purple-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Réponse {'<'} 5 min</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </header>
  );
});

LandingHero.displayName = 'LandingHero';
