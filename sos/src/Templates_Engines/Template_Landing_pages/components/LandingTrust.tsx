/**
 * ============================================================================
 * LANDING TRUST - Section confiance et E-E-A-T
 * ============================================================================
 *
 * Affiche les badges de confiance, stats et signaux E-E-A-T.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Globe, Clock, Star, Award, Check } from 'lucide-react';

import { DynamicIcon } from './ui';
import { useReducedMotion } from '../hooks';
import { staggerContainer, staggerItem } from '../lib/animations';
import type { TrustBadge, SocialProofData, EEATSignals } from '../types';

export interface LandingTrustProps {
  badges: TrustBadge[];
  socialProof?: SocialProofData;
  eeat?: EEATSignals;
}

/**
 * Section Trust avec badges et statistiques
 */
export const LandingTrust = memo<LandingTrustProps>(({
  badges,
  socialProof,
  eeat,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion ? {} : staggerContainer;
  const itemVariants = prefersReducedMotion ? {} : staggerItem;

  // Stats from E-E-A-T or social proof
  const stats = [
    {
      icon: Users,
      value: eeat?.experience?.clientsHelped || socialProof?.stats?.[0]?.value || '10 000+',
      label: 'Clients accompagnés',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Globe,
      value: eeat?.experience?.countriesCovered?.toString() || '197',
      label: 'Pays couverts',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Clock,
      value: '24/7',
      label: 'Disponibilité',
      color: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          {/* Trust Badges */}
          {badges.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-10"
            >
              {badges.map((badge) => (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-700"
                >
                  <DynamicIcon
                    name={badge.icon}
                    className={`w-4 h-4 ${
                      badge.color === 'success' ? 'text-green-500' :
                      badge.color === 'accent' ? 'text-orange-500' :
                      'text-red-500'
                    }`}
                  />
                  {badge.text}
                </span>
              ))}
            </motion.div>
          )}

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} mb-3`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* E-E-A-T Signals */}
          {eeat && (
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500"
            >
              {eeat.trust?.ratings?.google && (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {eeat.trust.ratings.google.score}/5 Google ({eeat.trust.ratings.google.count} avis)
                </span>
              )}
              {eeat.authority?.certifications?.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-500" />
                  {eeat.authority.certifications[0]}
                </span>
              )}
              {eeat.experience?.successRate && (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-green-500" />
                  {eeat.experience.successRate} de satisfaction
                </span>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
});

LandingTrust.displayName = 'LandingTrust';
