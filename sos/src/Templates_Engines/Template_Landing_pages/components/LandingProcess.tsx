/**
 * ============================================================================
 * LANDING PROCESS - Section "Comment ça marche"
 * ============================================================================
 *
 * Présente les étapes du processus avec timeline visuelle.
 * Optimisé pour Schema.org HowTo.
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';

import { SectionHeader, DynamicIcon } from './ui';
import { useReducedMotion, useIsMobile } from '../hooks';
import { staggerContainer, staggerItem } from '../lib/animations';
import type { HowItWorksSection } from '../types';

export interface LandingProcessProps {
  process: HowItWorksSection;
}

/**
 * Section "Comment ça marche" avec timeline
 */
export const LandingProcess = memo<LandingProcessProps>(({ process }) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const containerVariants = prefersReducedMotion ? {} : staggerContainer;
  const itemVariants = prefersReducedMotion ? {} : staggerItem;

  return (
    <section
      className="py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-gray-900 to-gray-950"
      aria-labelledby="process-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <SectionHeader
          badge={{ icon: 'Zap', text: 'Simple & Rapide', color: 'accent' }}
          title={process.title}
          subtitle={process.intro}
          theme="dark"
          align="center"
        >
          {/* Total time badge */}
          <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <Clock className="w-4 h-4 text-green-400" />
            <span className="text-white text-sm font-medium">
              Temps total : {process.totalTime}
            </span>
          </div>
        </SectionHeader>

        {/* Steps Timeline */}
        <motion.div
          className="relative"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {/* Timeline line (desktop only) */}
          {!isMobile && (
            <div
              className="absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"
              aria-hidden="true"
            />
          )}

          {/* Steps Grid */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {process.steps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="relative"
              >
                {/* Step Card */}
                <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-white/20 transition-colors">
                  {/* Step Number */}
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-red-500/30">
                      {step.number}
                    </div>
                  </div>

                  <div className="pt-6 text-center">
                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 text-white mb-4">
                      <DynamicIcon name={step.icon} className="w-8 h-8" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-400 leading-relaxed mb-4">
                      {step.description}
                    </p>

                    {/* Estimated time */}
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {step.estimatedTime}
                    </span>
                  </div>
                </div>

                {/* Arrow to next step (not on last item, desktop only) */}
                {!isMobile && index < process.steps.length - 1 && (
                  <div
                    className="absolute top-24 -right-6 lg:-right-8 w-12 h-12 flex items-center justify-center z-10"
                    aria-hidden="true"
                  >
                    <ArrowRight className="w-6 h-6 text-orange-500" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
});

LandingProcess.displayName = 'LandingProcess';
