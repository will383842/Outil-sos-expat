/**
 * SEO AI Generation — Validator
 * Validates and sanitizes Claude output, computes input hash for change detection
 */

import * as crypto from 'crypto';
import {
  SEOLocaleData,
  SEOOriginalDescription,
  ClaudeLocaleResponse,
  ClaudeAnalysisResponse,
  SEOGenerationInput,
} from './seoTypes';

// ============================================================================
// TRUNCATION HELPERS
// ============================================================================

/** Truncate to max chars at last word boundary */
function truncate(text: string | undefined, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  const truncated = text.substring(0, max);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > max * 0.7 ? truncated.substring(0, lastSpace) : truncated;
}

/** Ensure array has between min and max items */
function clampArray<T>(arr: T[] | undefined, min: number, max: number): T[] {
  if (!arr || !Array.isArray(arr)) return [];
  const filtered = arr.filter(Boolean);
  if (filtered.length < min) return filtered;
  return filtered.slice(0, max);
}

// ============================================================================
// SCREAMING_SNAKE_CASE DETECTOR
// ============================================================================

const SCREAMING_SNAKE_RE = /\b[A-Z]{2,}(?:_[A-Z0-9]+){1,}\b/;

function containsRawCodes(text: string): boolean {
  return SCREAMING_SNAKE_RE.test(text);
}

// ============================================================================
// LOCALE DATA VALIDATOR
// ============================================================================

/**
 * Validate and sanitize Claude's locale response.
 * Returns null only if the response is completely unusable.
 */
export function validateLocaleData(raw: unknown): SEOLocaleData | null {
  if (!raw || typeof raw !== 'object') return null;

  const r = raw as ClaudeLocaleResponse;

  // metaTitle and metaDescription are required
  if (!r.metaTitle || !r.metaDescription) return null;

  // Check for raw codes in critical fields
  const criticalTexts = [r.metaTitle, r.metaDescription, r.profileDescription, r.ogTitle];
  for (const text of criticalTexts) {
    if (text && containsRawCodes(text)) {
      console.warn('[SEO Validator] Raw code detected in output, skipping');
      return null;
    }
  }

  // Validate FAQs
  const faqs = (r.faqs || [])
    .filter(f => f && typeof f === 'object' && f.question && f.answer)
    .map(f => ({
      question: truncate(f.question, 200),
      answer: truncate(f.answer, 500),
    }));

  return {
    metaTitle: truncate(r.metaTitle, 60),
    metaDescription: truncate(r.metaDescription, 155),
    faqs: clampArray(faqs, 0, 6),
    ogTitle: truncate(r.ogTitle || r.metaTitle, 70),
    ogDescription: truncate(r.ogDescription || r.metaDescription, 200),
    aiSummary: truncate(r.aiSummary || r.metaDescription, 250),
    aiKeyFacts: clampArray(r.aiKeyFacts, 0, 7),
    profileDescription: truncate(r.profileDescription, 400),
    breadcrumbLabel: truncate(r.breadcrumbLabel, 30),
    structuredData: {
      knowsAbout: clampArray(r.structuredData?.knowsAbout, 0, 8),
      serviceDescription: truncate(r.structuredData?.serviceDescription, 200),
    },
  };
}

// ============================================================================
// ANALYSIS VALIDATOR
// ============================================================================

/**
 * Validate Claude's analysis response (description correction).
 */
export function validateAnalysis(raw: unknown): SEOOriginalDescription {
  const defaults: SEOOriginalDescription = {
    corrected: null,
    detectedLanguage: 'unknown',
    qualityScore: 0,
    correctionsMade: [],
  };

  if (!raw || typeof raw !== 'object') return defaults;

  const r = raw as ClaudeAnalysisResponse;

  return {
    corrected: typeof r.corrected === 'string' ? r.corrected : null,
    detectedLanguage: typeof r.detectedLanguage === 'string' ? r.detectedLanguage : 'unknown',
    qualityScore: typeof r.qualityScore === 'number'
      ? Math.max(0, Math.min(100, Math.round(r.qualityScore)))
      : 0,
    correctionsMade: Array.isArray(r.correctionsMade)
      ? r.correctionsMade.filter(s => typeof s === 'string')
      : [],
  };
}

// ============================================================================
// INPUT HASH
// ============================================================================

/**
 * Compute a SHA256 hash of the key profile fields.
 * Used to detect meaningful changes and skip unnecessary regeneration.
 */
export function computeInputHash(input: SEOGenerationInput): string {
  const data = [
    input.firstName,
    input.lastName,
    input.type,
    input.country,
    input.city || '',
    input.languages.sort().join(','),
    input.specialtiesLabels.sort().join(','),
    String(input.yearsOfExperience || ''),
    String(input.rating || ''),
    String(input.reviewCount || ''),
    input.description || '',
  ].join('|');

  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// ============================================================================
// JSON PARSER (resilient)
// ============================================================================

/**
 * Parse Claude's response text as JSON, handling markdown code blocks.
 */
export function parseClaudeJSON(text: string): unknown {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON object from text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
