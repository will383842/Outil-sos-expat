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
// MANUAL FIELD EXTRACTION (fallback when JSON is malformed)
// ============================================================================

/** Extract a string field value from broken JSON using regex */
function extractString(text: string, key: string): string | undefined {
  // Match "key": "value" or "key":"value" — handles multiline values
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
  const m = text.match(re);
  return m?.[1]?.replace(/\\n/g, ' ').replace(/\\"/g, '"');
}

/** Extract an array of strings from broken JSON */
function extractStringArray(text: string, key: string): string[] {
  const re = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*?)\\]`, 's');
  const m = text.match(re);
  if (!m) return [];
  const items = m[1].match(/"((?:[^"\\\\]|\\\\.)*)"/g);
  return (items || []).map(s => s.slice(1, -1).replace(/\\"/g, '"'));
}

/** Extract FAQ array from broken JSON */
function extractFaqs(text: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  const faqRe = /\{\s*"question"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"answer"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/gs;
  let match;
  while ((match = faqRe.exec(text)) !== null) {
    faqs.push({
      question: match[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
      answer: match[2].replace(/\\"/g, '"').replace(/\\n/g, ' '),
    });
  }
  return faqs;
}

/** Last resort: extract individual fields with regex from malformed JSON */
function extractFieldsManually(text: string): Record<string, unknown> | null {
  const metaTitle = extractString(text, 'metaTitle');
  const metaDescription = extractString(text, 'metaDescription');

  // Must have at least title and description
  if (!metaTitle || !metaDescription) return null;

  return {
    metaTitle,
    metaDescription,
    faqs: extractFaqs(text),
    ogTitle: extractString(text, 'ogTitle'),
    ogDescription: extractString(text, 'ogDescription'),
    aiSummary: extractString(text, 'aiSummary'),
    aiKeyFacts: extractStringArray(text, 'aiKeyFacts'),
    profileDescription: extractString(text, 'profileDescription'),
    breadcrumbLabel: extractString(text, 'breadcrumbLabel'),
    structuredData: {
      knowsAbout: extractStringArray(text, 'knowsAbout'),
      serviceDescription: extractString(text, 'serviceDescription'),
    },
  };
}

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
  if (!raw || typeof raw !== 'object') {
    console.warn('[SEO Validator] Response is not an object:', typeof raw);
    return null;
  }

  const r = raw as ClaudeLocaleResponse;

  // metaTitle and metaDescription are required
  if (!r.metaTitle || !r.metaDescription) {
    console.warn('[SEO Validator] Missing metaTitle or metaDescription. Keys found:', Object.keys(r as any).slice(0, 10));
    return null;
  }

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
 * Parse Claude's response text as JSON, handling markdown code blocks,
 * JSON comments, and other common Claude output quirks.
 */
export function parseClaudeJSON(text: string): unknown {
  // Strip markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  // Remove JSON comment keys that Claude sometimes copies from the prompt template
  // e.g., "// ===== SEO CLASSIQUE =====": "",
  cleaned = cleaned.replace(/^\s*"\/\/[^"]*"\s*:\s*"[^"]*"\s*,?\s*$/gm, '');

  // Remove trailing commas before closing braces/brackets (common Claude mistake)
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  // Attempt parsing with progressive cleanup strategies
  const attempts = [
    cleaned,
    // Strategy 1: extract outermost JSON object
    (cleaned.match(/\{[\s\S]*\}/) || [''])[0],
  ];

  for (let attempt of attempts) {
    if (!attempt) continue;

    // Clean comment keys
    attempt = attempt.replace(/^\s*"\/\/[^"]*"\s*:\s*"[^"]*"\s*,?\s*$/gm, '');
    // Remove trailing commas
    attempt = attempt.replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(attempt);
    } catch {
      // Strategy 2: fix unescaped newlines inside JSON strings
      // Replace actual newlines inside quoted strings with \\n
      const fixed = attempt.replace(/"([^"]*?)"/gs, (_match, content) => {
        const escaped = content
          .replace(/\\/g, '\\\\')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        return `"${escaped}"`;
      });
      try {
        return JSON.parse(fixed);
      } catch (e2) {
        // Strategy 3: use a more aggressive approach — extract key fields manually
        try {
          return extractFieldsManually(attempt);
        } catch (e3) {
          console.warn('[SEO Validator] JSON parse failed after cleanup:', (e2 as Error).message);
          console.warn('[SEO Validator] First 300 chars:', attempt.substring(0, 300));
        }
      }
    }
  }
  return null;
}
