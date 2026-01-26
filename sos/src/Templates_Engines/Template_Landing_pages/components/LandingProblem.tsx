/**
 * ============================================================================
 * LANDING PROBLEM - Section problèmes
 * ============================================================================
 *
 * Présente les problèmes/pain points que résout le service.
 * Design avec cards et icônes.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import { SectionHeader, DynamicIcon } from './ui';
import { useReducedMotion } from '../hooks';
import { staggerContainer, staggerItem, cardHover } from '../lib/animations';
import type { ProblemSection } from '../types';

export interface LandingProblemProps {
  problem: ProblemSection;
}

/**
 * Section présentant les problèmes résolus
 */
export const LandingProblem = memo<LandingProblemProps>(({ problem }) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion ? {} : staggerContainer;
  const itemVariants = prefersReducedMotion ? {} : staggerItem;

  return (
    <section
      className="py-16 sm:py-24 lg:py-32 bg-gray-50"
      aria-labelledby="problem-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <SectionHeader
          badge={{ icon: 'AlertTriangle', text: 'Le problème', color: 'accent' }}
          title={problem.title}
          subtitle={problem.intro}
          theme="light"
          align="center"
        />

        {/* Problem Cards */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {problem.items.map((item, index) => (
            <motion.article
              key={index}
              variants={itemVariants}
              whileHover={prefersReducedMotion ? {} : cardHover}
              className="group relative p-6 sm:p-8 rounded-3xl bg-white border border-gray-200 shadow-sm transition-shadow hover:shadow-xl"
            >
              {/* Background gradient on hover */}
              <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                aria-hidden="true"
              />

              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-5">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-red-100 to-orange-100 text-red-600">
                    <DynamicIcon name={item.icon} className="w-7 h-7" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
});

LandingProblem.displayName = 'LandingProblem';
