/**
 * ============================================================================
 * LANDING TESTIMONIALS - Section témoignages
 * ============================================================================
 *
 * Carrousel de témoignages avec notes et avatars.
 * Design inspiré de la home page SOS Expat.
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote, MapPin, Award } from 'lucide-react';

import { SectionHeader } from './ui';
import { useReducedMotion, useIsMobile } from '../hooks';
import { cn } from '@/lib/utils';
import type { TestimonialsSection, SocialProofData, Testimonial } from '../types';

export interface LandingTestimonialsProps {
  testimonials: TestimonialsSection;
  socialProof?: SocialProofData;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
  isActive: boolean;
}

/**
 * Carte témoignage individuelle
 */
const TestimonialCard = memo<TestimonialCardProps>(({
  testimonial,
  isActive,
}) => {
  return (
    <div className="w-full flex-shrink-0 px-2 sm:px-4">
      <div className={cn(
        'rounded-3xl border bg-white p-6 sm:p-8 md:p-10 transition-all duration-300',
        isActive ? 'border-gray-200 shadow-xl' : 'border-gray-100 shadow-sm'
      )}>
        {/* Quote icon */}
        <div className="mb-6">
          <Quote className="w-10 h-10 text-red-500/20" />
        </div>

        {/* Quote text */}
        <blockquote className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-6">
          "{testimonial.quote}"
        </blockquote>

        {/* Author info */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {testimonial.avatar && (
            <div className="relative">
              <img
                src={testimonial.avatar}
                alt={testimonial.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                loading="lazy"
              />
              {testimonial.verified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Name & Location */}
          <div className="flex-1">
            <div className="font-bold text-gray-900">{testimonial.name}</div>
            {testimonial.location && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-3.5 h-3.5" />
                {testimonial.location}
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-5 h-5',
                  i < testimonial.rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-200'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

TestimonialCard.displayName = 'TestimonialCard';

/**
 * Section témoignages avec carrousel
 */
export const LandingTestimonials = memo<LandingTestimonialsProps>(({
  testimonials,
  socialProof,
}) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);

  const items = testimonials.items;
  const total = items.length;

  // Auto-advance
  useEffect(() => {
    if (paused || prefersReducedMotion || total <= 1) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, 5000);

    return () => clearInterval(interval);
  }, [paused, total, prefersReducedMotion]);

  // Navigation
  const goTo = (index: number) => setCurrent((index + total) % total);
  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? prev() : next();
    }
    touchStartX.current = null;
  };

  return (
    <section
      className="py-16 sm:py-24 lg:py-32 bg-gradient-to-b from-gray-50 to-white overflow-hidden"
      aria-labelledby="testimonials-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <SectionHeader
          badge={{ icon: 'Star', text: `${testimonials.aggregateRating.ratingValue}/5`, color: 'accent' }}
          title="Ce que disent"
          titleHighlight="nos clients"
          subtitle={`Plus de ${testimonials.aggregateRating.ratingCount} avis vérifiés`}
          theme="light"
          align="center"
        />

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="overflow-hidden rounded-3xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {items.map((item, index) => (
                <TestimonialCard
                  key={index}
                  testimonial={item}
                  isActive={index === current}
                />
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          {total > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-white hover:bg-gray-50 rounded-full border border-gray-200 shadow-lg transition-all duration-300 flex items-center justify-center text-gray-700 active:scale-95"
                aria-label="Témoignage précédent"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                onClick={next}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-white hover:bg-gray-50 rounded-full border border-gray-200 shadow-lg transition-all duration-300 flex items-center justify-center text-gray-700 active:scale-95"
                aria-label="Témoignage suivant"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          {/* Dots */}
          {total > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    current === i
                      ? 'w-8 bg-gradient-to-r from-red-500 to-orange-500'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  )}
                  aria-label={`Aller au témoignage ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Aggregate rating */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full px-6 py-3">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 text-yellow-400 fill-yellow-400"
                />
              ))}
            </div>
            <span className="text-gray-700 font-medium">
              {testimonials.aggregateRating.ratingValue.toFixed(1)}/5 basé sur {testimonials.aggregateRating.ratingCount} avis
            </span>
          </div>
        </div>
      </div>
    </section>
  );
});

LandingTestimonials.displayName = 'LandingTestimonials';
