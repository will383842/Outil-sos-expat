/**
 * ============================================================================
 * LANDING SOLUTION - Section solution
 * ============================================================================
 *
 * Présente la solution et ses fonctionnalités principales.
 * Design avec cards vertes pour contraster avec les problèmes rouges.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

import { SectionHeader, DynamicIcon } from './ui';
import { useReducedMotion } from '../hooks';
import { staggerContainer, staggerItem, cardHover } from '../lib/animations';
import type { SolutionSection } from '../types';

export interface LandingSolutionProps {
  solution: SolutionSection;
}

/**
 * Section présentant la solution
 */
export const LandingSolution = memo<LandingSolutionProps>(({ solution }) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion ? {} : staggerContainer;
  const itemVariants = prefersReducedMotion ? {} : staggerItem;

  return (
    <section
      className="py-16 sm:py-24 lg:py-32 bg-white"
      aria-labelledby="solution-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <SectionHeader
          badge={{ icon: 'Sparkles', text: 'La solution', color: 'success' }}
          title={solution.title}
          subtitle={solution.intro}
          theme="light"
          align="center"
        />

        {/* Solution Features */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {solution.features.map((feature, index) => (
            <motion.article
              key={index}
              variants={itemVariants}
              whileHover={prefersReducedMotion ? {} : cardHover}
              className="group relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 shadow-sm transition-shadow hover:shadow-xl"
            >
              {/* Background gradient on hover */}
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                aria-hidden="true"
              />

              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-5">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30">
                    <DynamicIcon name={feature.icon} className="w-7 h-7" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  {feature.title}
                  <Check className="w-5 h-5 text-green-500" />
                </h3>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
});

LandingSolution.displayName = 'LandingSolution';
