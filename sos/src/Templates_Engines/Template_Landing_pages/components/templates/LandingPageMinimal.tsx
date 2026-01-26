/**
 * ============================================================================
 * LANDING PAGE MINIMAL - Template premium épuré
 * ============================================================================
 *
 * Design haut de gamme avec moins de sections pour un impact maximum.
 * Sections : Hero Premium + Trust Compact + FAQ Élégant + CTA Puissant
 *
 * Idéal pour :
 * - Services premium / haut de gamme
 * - Audiences pressées
 * - Messages clairs et directs
 */

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Phone, ArrowRight, Shield, Clock, Globe, Star, Check, ChevronDown, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';

import { LandingSchema } from '../LandingSchema';
import { LandingMeta } from '../LandingMeta';
import { LandingBreadcrumbs } from '../LandingBreadcrumbs';
import { DynamicIcon, CTAButton } from '../ui';
import { useReducedMotion, useIsMobile } from '../../hooks';
import { staggerContainer, staggerItem, fadeInUp } from '../../lib/animations';
import { cn } from '@/lib/utils';
import type { LandingData } from '../../types';

import Layout from '@/components/layout/Layout';

export interface LandingPageMinimalProps {
  data: LandingData;
}

/**
 * Template Minimal - Design premium épuré
 */
export const LandingPageMinimal = memo<LandingPageMinimalProps>(({ data }) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const { sections, cta, targeting, breadcrumbs, conversion } = data;

  const containerVariants = prefersReducedMotion ? {} : staggerContainer;
  const itemVariants = prefersReducedMotion ? {} : staggerItem;

  // Testimonial highlight (si disponible)
  const highlightTestimonial = sections.testimonials?.items?.[0];

  return (
    <Layout>
      <LandingMeta data={data} />
      <LandingSchema data={data} />

      <div className="min-h-screen">
        {/* ================================================================
            HERO PREMIUM - Full viewport avec glassmorphism
            ================================================================ */}
        <header className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1),transparent_50%)]" />

          {/* Animated gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-blue-500/15 to-purple-500/15 rounded-full blur-[80px] animate-pulse delay-1000" />

          {/* Content */}
          <motion.div
            className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Country badge */}
            {targeting?.country && (
              <motion.div variants={itemVariants} className="mb-8">
                <span className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3">
                  <span className="text-2xl">{targeting.country.flag}</span>
                  <span className="text-white/90 font-medium">{targeting.country.nameFr}</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </span>
              </motion.div>
            )}

            {/* Title */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] mb-8"
            >
              <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                {sections.hero.title}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed"
            >
              {sections.hero.subtitle}
            </motion.p>

            {/* CTA - Single powerful button */}
            <motion.div variants={itemVariants} className="mb-16">
              <Link
                to={cta.primary_url}
                className="group relative inline-flex items-center gap-4 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white px-12 py-6 rounded-full font-black text-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(239,68,68,0.4)]"
              >
                <Phone className="w-6 h-6 animate-pulse" />
                <span>{cta.primary_text}</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
            </motion.div>

            {/* Trust indicators - Elegant row */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center gap-8 text-white/70"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span>100% Sécurisé</span>
              </div>
              <div className="w-px h-5 bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span>Réponse {'<'} 5 min</span>
              </div>
              <div className="w-px h-5 bg-white/20 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-400" />
                <span>197 pays</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <ChevronDown className="w-8 h-8 text-white/30 animate-bounce" />
          </motion.div>
        </header>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <LandingBreadcrumbs items={breadcrumbs} />
        )}

        {/* ================================================================
            TRUST SECTION - Compact et élégant
            ================================================================ */}
        <section className="py-16 bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              {[
                { icon: 'Users', value: '10 000+', label: 'Clients satisfaits', color: 'from-red-500 to-orange-500' },
                { icon: 'Globe', value: '197', label: 'Pays couverts', color: 'from-blue-500 to-cyan-500' },
                { icon: 'Clock', value: '24/7', label: 'Disponibilité', color: 'from-green-500 to-emerald-500' },
                { icon: 'Star', value: '4.9/5', label: 'Note moyenne', color: 'from-yellow-500 to-orange-500' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="text-center"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r ${stat.color} mb-4`}>
                    <DynamicIcon name={stat.icon} className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ================================================================
            TESTIMONIAL HIGHLIGHT - Citation premium
            ================================================================ */}
        {highlightTestimonial && (
          <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                className="relative bg-white rounded-[2rem] p-10 sm:p-14 shadow-xl border border-gray-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                {/* Quote mark */}
                <Quote className="absolute top-8 left-8 w-12 h-12 text-red-500/10" />

                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-6 h-6',
                        i < highlightTestimonial.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-200'
                      )}
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-2xl sm:text-3xl text-gray-800 font-medium leading-relaxed mb-8">
                  "{highlightTestimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  {highlightTestimonial.avatar && (
                    <img
                      src={highlightTestimonial.avatar}
                      alt={highlightTestimonial.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                    />
                  )}
                  <div>
                    <div className="font-bold text-gray-900">{highlightTestimonial.name}</div>
                    {highlightTestimonial.location && (
                      <div className="text-gray-500">{highlightTestimonial.location}</div>
                    )}
                  </div>
                  {highlightTestimonial.verified && (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      <Check className="w-4 h-4" />
                      Vérifié
                    </span>
                  )}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* ================================================================
            FAQ ÉLÉGANT - Design épuré
            ================================================================ */}
        {sections.faq && (
          <section className="py-20 bg-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <motion.div
                className="text-center mb-14"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">
                  Questions fréquentes
                </h2>
                <p className="text-lg text-gray-500">
                  Tout ce que vous devez savoir
                </p>
              </motion.div>

              {/* FAQ Items - Elegant accordion */}
              <motion.div
                className="space-y-4"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={containerVariants}
              >
                {sections.faq.items.slice(0, 5).map((item, index) => (
                  <FAQItemMinimal key={index} item={item} index={index} />
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* ================================================================
            CTA FINAL - Puissant et élégant
            ================================================================ */}
        <section className="relative py-24 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.2),transparent_70%)]" />

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6">
                {sections.cta.title}
              </h2>

              {sections.cta.subtitle && (
                <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                  {sections.cta.subtitle}
                </p>
              )}

              {/* CTA Button */}
              <Link
                to={cta.primary_url}
                className="group inline-flex items-center gap-4 bg-white text-gray-900 px-12 py-6 rounded-full font-black text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <Phone className="w-6 h-6 text-red-500" />
                <span>{cta.primary_text}</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>

              {/* Reassurance */}
              <p className="mt-8 text-gray-400">
                {sections.cta.reassurance}
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </Layout>
  );
});

LandingPageMinimal.displayName = 'LandingPageMinimal';

/**
 * FAQ Item pour template Minimal
 */
const FAQItemMinimal = memo<{ item: any; index: number }>(({ item, index }) => {
  const [isOpen, setIsOpen] = React.useState(index === 0);
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={staggerItem}
      className="bg-gray-50 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-semibold text-gray-900">{item.question}</span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <motion.div
          initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
          animate={prefersReducedMotion ? {} : { height: 'auto', opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-6 pb-6"
        >
          <p className="text-gray-600 leading-relaxed">{item.answerShort}</p>
        </motion.div>
      )}
    </motion.div>
  );
});

FAQItemMinimal.displayName = 'FAQItemMinimal';
