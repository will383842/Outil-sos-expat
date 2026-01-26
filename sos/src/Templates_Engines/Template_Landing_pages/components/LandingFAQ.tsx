/**
 * ============================================================================
 * LANDING FAQ - Section FAQ optimisée Position 0
 * ============================================================================
 *
 * FAQ accordéon avec :
 * - Réponses courtes pour Position 0
 * - Animation smooth
 * - Accessibilité WCAG
 * - Schema.org FAQ intégré
 */

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

import { SectionHeader } from './ui';
import { useReducedMotion } from '../hooks';
import { cn } from '@/lib/utils';
import type { FAQSection, FAQItem } from '../types';

export interface LandingFAQProps {
  faq: FAQSection;
}

interface FAQItemProps {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Item FAQ avec accordéon animé
 */
const FAQItemComponent = memo<FAQItemProps>(({
  item,
  index,
  isOpen,
  onToggle,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="border-b border-gray-200 last:border-0">
      {/* Question Button */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-start justify-between gap-4 py-5 sm:py-6 text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
          'transition-colors hover:text-red-600'
        )}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
        id={`faq-question-${index}`}
      >
        <span className="text-lg sm:text-xl font-semibold text-gray-900 pr-2">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </motion.span>
      </button>

      {/* Answer */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-answer-${index}`}
            role="region"
            aria-labelledby={`faq-question-${index}`}
            initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? {} : { height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-gray-600 leading-relaxed">
              {/* Short answer for featured snippet */}
              <p className="text-base sm:text-lg mb-3">
                {item.answerShort}
              </p>

              {/* Full answer (if different) */}
              {item.answer !== item.answerShort && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

FAQItemComponent.displayName = 'FAQItemComponent';

/**
 * Section FAQ complète
 */
export const LandingFAQ = memo<LandingFAQProps>(({ faq }) => {
  // Track which items are open (allow multiple)
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0])); // First item open by default

  const toggleItem = useCallback((index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <section
      className="py-16 sm:py-24 lg:py-32 bg-white"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <SectionHeader
          badge={{ icon: 'HelpCircle', text: 'FAQ', color: 'blue' }}
          title={faq.title}
          subtitle={`${faq.totalQuestions} questions fréquentes`}
          theme="light"
          align="center"
        />

        {/* FAQ List */}
        <div
          className="mt-8 sm:mt-12 bg-gray-50 rounded-3xl p-6 sm:p-8"
          role="list"
        >
          {faq.items.map((item, index) => (
            <FAQItemComponent
              key={index}
              item={item}
              index={index}
              isOpen={openItems.has(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>

        {/* CTA after FAQ */}
        <div className="mt-10 sm:mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Vous avez d'autres questions ?
          </p>
          <a
            href="/sos-appel"
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            Parlez à un expert maintenant
          </a>
        </div>
      </div>
    </section>
  );
});

LandingFAQ.displayName = 'LandingFAQ';
