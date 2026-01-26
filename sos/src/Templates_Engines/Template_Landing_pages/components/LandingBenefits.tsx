/**
 * ============================================================================
 * LANDING BENEFITS - Section avantages
 * ============================================================================
 *
 * Présente les avantages clés du service.
 * Design avec cards premium et animations.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

import { SectionHeader, DynamicIcon } from './ui';
import { useReducedMotion } from '../hooks';
import { staggerContainer, staggerItem, cardHover } from '../lib/animations';
import type { AdvantagesSection } from '../types';

export interface LandingBenefitsProps {
  benefits: AdvantagesSection;
}

// Gradients for variety
const gradients = [
  'from-red-500 to-orange-500',
  'from-blue-500 to-purple-500',
  'from-green-500 to-emerald-500',
  'from-yellow-500 to-red-500',
  'from-purple-500 to-pink-500',
  'from-cyan-500 to-blue-500',
];

/**
 * Section présentant les avantages
 */
export const LandingBenefits = memo<LandingBenefitsProps>(({ benefits }) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion ? {} : staggerContainer;
  const itemVariants = prefersReducedMotion ? {} : staggerItem;

  return (
    <section
      className="py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50"
      aria-labelledby="benefits-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <SectionHeader
          badge={{ icon: 'Award', text: 'Avantages', color: 'primary' }}
          title={benefits.title || 'Pourquoi nous'}
          titleHighlight="choisir"
          titleSuffix="?"
          theme="light"
          align="center"
        />

        {/* Benefits Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {benefits.items.map((item, index) => {
            const gradient = gradients[index % gradients.length];

            return (
              <motion.article
                key={index}
                variants={itemVariants}
                whileHover={prefersReducedMotion ? {} : cardHover}
                className="group relative p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-sm transition-shadow hover:shadow-2xl text-center"
              >
                {/* Background gradient on hover */}
                <div
                  className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`}
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-6">
                    <div
                      className={`mx-auto inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r ${gradient} text-white shadow-md`}
                    >
                      <DynamicIcon name={item.icon} className="w-7 h-7" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Check badge */}
                  <div className="mt-6 flex items-center justify-center">
                    <span className={`inline-flex rounded-full p-[1px] bg-gradient-to-r ${gradient}`}>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-gray-600">
                        <Check className={`w-4 h-4`} />
                        Inclus
                      </span>
                    </span>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
});

LandingBenefits.displayName = 'LandingBenefits';
