import React, { useState } from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { FormattedMessage } from 'react-intl';
import { AnimatePresence, motion } from 'framer-motion';
import type { IntlShape } from 'react-intl';
import type { ThemeTokens } from './theme';

interface FAQSectionProps {
  theme: ThemeTokens;
  intl: IntlShape;
  faqCount?: number;
}

const FAQSection: React.FC<FAQSectionProps> = React.memo(({ theme, intl, faqCount = 8 }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const prefix = theme.i18nPrefix;

  const faqs = Array.from({ length: faqCount }, (_, i) => ({
    question: intl.formatMessage({ id: `${prefix}.faq.q${i + 1}` }),
    answer: intl.formatMessage({ id: `${prefix}.faq.a${i + 1}` }),
  }));

  return (
    <section
      className="relative z-[1] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg mt-8"
      aria-labelledby="faq-heading"
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${theme.iconBg}`}>
          <HelpCircle className={`w-5 h-5 ${theme.iconText}`} aria-hidden="true" />
        </div>
        <h2 id="faq-heading" className="text-xl font-black text-white">
          <FormattedMessage id={`${prefix}.faq.title`} />
        </h2>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="border border-white/10 rounded-xl overflow-hidden transition-colors hover:border-white/20"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors min-h-[48px]"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
              >
                <h3 className="text-sm font-bold text-gray-200 pr-4">{faq.question}</h3>
                <ArrowRight
                  className={`w-5 h-5 ${theme.iconText} flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-answer-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                    role="region"
                    aria-labelledby={`faq-q-${index}`}
                  >
                    <div className="px-4 pb-4 text-sm text-gray-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
});

FAQSection.displayName = 'FAQSection';
export default FAQSection;
