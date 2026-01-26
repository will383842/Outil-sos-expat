/**
 * ============================================================================
 * LANDING PAGE CONVERSION - Template optimisé conversion
 * ============================================================================
 *
 * Design agressif orienté conversion maximale avec :
 * - Urgence (compteurs, places limitées)
 * - Social proof popup
 * - CTAs multiples et répétés
 * - Garantie mise en avant
 * - Barre de progression
 * - Sticky CTA permanent
 *
 * Idéal pour :
 * - Offres limitées dans le temps
 * - Promotions
 * - Services urgents (comme SOS Expat)
 */

import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, ArrowRight, Shield, Clock, Globe, Star, Check, AlertTriangle,
  Users, Zap, Gift, Timer, TrendingUp, Award, ChevronDown, X, Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { LandingProblem } from '../LandingProblem';
import { LandingSolution } from '../LandingSolution';
import { LandingProcess } from '../LandingProcess';
import { LandingTestimonials } from '../LandingTestimonials';
import { LandingFAQ } from '../LandingFAQ';
import { LandingSchema } from '../LandingSchema';
import { LandingMeta } from '../LandingMeta';
import { LandingBreadcrumbs } from '../LandingBreadcrumbs';
import { ReadingProgressBar } from '../ReadingProgressBar';
import { SocialProofPopup } from '../SocialProofPopup';
import { DynamicIcon, SectionHeader } from '../ui';
import { useReducedMotion, useIsMobile, useScrolledPast, useHapticFeedback } from '../../hooks';
import { staggerContainer, staggerItem, fadeInUp } from '../../lib/animations';
import { cn } from '@/lib/utils';
import type { LandingData } from '../../types';

import Layout from '@/components/layout/Layout';

export interface LandingPageConversionProps {
  data: LandingData;
}

/**
 * Template Conversion - Optimisé pour la conversion
 */
export const LandingPageConversion = memo<LandingPageConversionProps>(({ data }) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const showStickyCta = useScrolledPast(400);
  const { onTap } = useHapticFeedback();

  const { sections, cta, targeting, breadcrumbs, conversion, socialProof, eeat } = data;

  const containerVariants = prefersReducedMotion ? {} : staggerContainer;
  const itemVariants = prefersReducedMotion ? {} : staggerItem;

  // Countdown state (for urgency)
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 33 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Layout>
      <LandingMeta data={data} />
      <LandingSchema data={data} />

      {/* Reading Progress Bar - Toujours actif */}
      <ReadingProgressBar />

      {/* Social Proof Popup */}
      {socialProof && (
        <SocialProofPopup
          socialProof={socialProof}
          interval={25000}
          displayDuration={6000}
          maxShows={8}
        />
      )}

      <div className="min-h-screen">
        {/* ================================================================
            URGENCY BAR - Barre d'urgence en haut
            ================================================================ */}
        <div className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 animate-pulse" />
              <span>Offre spéciale expire dans :</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-lg">
              <span className="bg-white/20 px-2 py-1 rounded">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span>:</span>
              <span className="bg-white/20 px-2 py-1 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span>:</span>
              <span className="bg-white/20 px-2 py-1 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Plus que <strong>3 places</strong> disponibles</span>
            </div>
          </div>
        </div>

        {/* ================================================================
            HERO CONVERSION - Maximum d'impact
            ================================================================ */}
        <header className="relative pt-12 pb-20 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.2),transparent_50%)]" />

          {/* Animated elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-orange-500/20 rounded-full blur-[100px] animate-pulse delay-500" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Content */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
              >
                {/* Badges urgence */}
                <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-6">
                  <span className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-4 py-2 text-red-400 text-sm font-medium animate-pulse">
                    <Zap className="w-4 h-4" />
                    Réponse immédiate
                  </span>
                  <span className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2 text-green-400 text-sm font-medium">
                    <Check className="w-4 h-4" />
                    Satisfaction garantie
                  </span>
                </motion.div>

                {/* Country */}
                {targeting?.country && (
                  <motion.div variants={itemVariants} className="mb-4">
                    <span className="inline-flex items-center gap-2 text-white/80">
                      <span className="text-2xl">{targeting.country.flag}</span>
                      <span className="font-medium">{targeting.country.nameFr}</span>
                    </span>
                  </motion.div>
                )}

                {/* Title */}
                <motion.h1
                  variants={itemVariants}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
                >
                  {sections.hero.title}
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  variants={itemVariants}
                  className="text-xl text-gray-300 mb-8"
                >
                  {sections.hero.subtitle}
                </motion.p>

                {/* Benefits list */}
                <motion.ul variants={itemVariants} className="space-y-3 mb-8">
                  {['Experts disponibles 24/7', 'Réponse en moins de 5 minutes', 'Satisfaction garantie ou remboursé'].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/90">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </span>
                      {benefit}
                    </li>
                  ))}
                </motion.ul>

                {/* CTA Buttons */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to={cta.primary_url}
                    onClick={() => onTap()}
                    className="group flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white px-8 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(239,68,68,0.4)] animate-pulse"
                  >
                    <Phone className="w-6 h-6" />
                    <span>{cta.primary_text}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  {cta.secondary_url && (
                    <Link
                      to={cta.secondary_url}
                      className="flex items-center justify-center gap-3 bg-white/10 border border-white/20 text-white px-8 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-white/20"
                    >
                      {cta.secondary_text}
                    </Link>
                  )}
                </motion.div>

                {/* Micro-commitment */}
                <motion.p variants={itemVariants} className="mt-4 text-sm text-gray-400">
                  ✓ Sans engagement · ✓ Annulation gratuite · ✓ Paiement sécurisé
                </motion.p>
              </motion.div>

              {/* Right: Social Proof Card */}
              <motion.div
                className="hidden lg:block"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                  {/* Live activity */}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="text-green-400 font-medium">12 personnes consultent cette page</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="text-center p-4 bg-white/5 rounded-2xl">
                      <div className="text-3xl font-black text-white mb-1">4.9/5</div>
                      <div className="flex justify-center gap-0.5 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <div className="text-xs text-gray-400">2,847 avis</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-2xl">
                      <div className="text-3xl font-black text-white mb-1">98%</div>
                      <div className="text-sm text-gray-300">Satisfaction</div>
                      <div className="text-xs text-gray-400">clients satisfaits</div>
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400 font-medium">Activité récente :</p>
                    {[
                      { name: 'Marie', city: 'Paris', time: 'il y a 2 min' },
                      { name: 'Thomas', city: 'Berlin', time: 'il y a 5 min' },
                      { name: 'Sophie', city: 'Madrid', time: 'il y a 8 min' },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                          {activity.name[0]}
                        </div>
                        <div className="flex-1">
                          <span className="text-white font-medium">{activity.name}</span>
                          <span className="text-gray-400"> de {activity.city} a réservé</span>
                        </div>
                        <span className="text-gray-500 text-xs">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </header>

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <LandingBreadcrumbs items={breadcrumbs} />
        )}

        {/* ================================================================
            TRUST BAR - Logos et certifications
            ================================================================ */}
        <section className="py-8 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-8">
              <p className="text-sm text-gray-500">Ils nous font confiance :</p>
              {['Google', 'Trustpilot', 'Forbes', 'Le Monde'].map((logo, i) => (
                <span key={i} className="text-gray-400 font-bold text-lg">{logo}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            MID-PAGE CTA - Rappel après Problem/Solution
            ================================================================ */}
        {sections.problem && <LandingProblem problem={sections.problem} />}
        {sections.solution && <LandingSolution solution={sections.solution} />}

        {/* Mid-page CTA */}
        <section className="py-12 bg-gradient-to-r from-red-600 to-orange-500">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-white/90 text-lg mb-4">
              Ne perdez plus de temps avec vos problèmes d'expatriation
            </p>
            <Link
              to={cta.primary_url}
              className="inline-flex items-center gap-3 bg-white text-red-600 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <Phone className="w-5 h-5" />
              {cta.primary_text}
            </Link>
          </div>
        </section>

        {/* Process */}
        {sections.howItWorks && <LandingProcess process={sections.howItWorks} />}

        {/* ================================================================
            GUARANTEE SECTION - Mise en avant garantie
            ================================================================ */}
        {conversion?.guarantee && (
          <section className="py-16 bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-green-200 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 mb-6">
                  <DynamicIcon name={conversion.guarantee.icon} className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-4">
                  {conversion.guarantee.title}
                </h3>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  {conversion.guarantee.text}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Testimonials */}
        {sections.testimonials && (
          <LandingTestimonials
            testimonials={sections.testimonials}
            socialProof={socialProof}
          />
        )}

        {/* FAQ */}
        {sections.faq && <LandingFAQ faq={sections.faq} />}

        {/* ================================================================
            FINAL CTA - Maximum urgence
            ================================================================ */}
        <section className="relative py-24 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.3),transparent_70%)]" />

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Urgency reminder */}
            <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-6 py-3 text-red-400 mb-8 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Plus que 3 places disponibles aujourd'hui</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6">
              {sections.cta.title}
            </h2>

            {sections.cta.subtitle && (
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                {sections.cta.subtitle}
              </p>
            )}

            {/* Final CTA */}
            <Link
              to={cta.primary_url}
              onClick={() => onTap()}
              className="group inline-flex items-center gap-4 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white px-12 py-6 rounded-full font-black text-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(239,68,68,0.5)] animate-pulse"
            >
              <Phone className="w-7 h-7" />
              <span>{cta.primary_text}</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Link>

            {/* Trust elements */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-gray-400">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Paiement sécurisé
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Réponse immédiate
              </span>
              <span className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                Satisfaction garantie
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ================================================================
          STICKY CTA - Toujours visible après scroll
          ================================================================ */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="hidden sm:block">
                <p className="font-bold text-gray-900">Besoin d'aide urgente ?</p>
                <p className="text-sm text-gray-500">Nos experts sont disponibles 24/7</p>
              </div>
              <Link
                to={cta.primary_url}
                onClick={() => onTap()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105"
              >
                <Phone className="w-5 h-5" />
                <span>{cta.primary_text}</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
});

LandingPageConversion.displayName = 'LandingPageConversion';
