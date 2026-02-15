// Input sanitization utilities for registration forms
import DOMPurify from 'dompurify';

// Sanitize string - preserves spaces during input (for names, simple text)
export const sanitizeString = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
};

// Final sanitization with trim - only at submission
export const sanitizeStringFinal = (str: string): string => {
  if (!str) return '';
  return sanitizeString(str).trim();
};

// Sanitize rich text (bio, descriptions) - uses DOMPurify for XSS protection
export const sanitizeRichText = (text: string): string => {
  if (!text) return '';
  try {
    // DOMPurify with strict config: only plain text, no HTML tags
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true // Keep text content even when stripping tags
    }).trim();
  } catch (error) {
    // Fallback to regex if DOMPurify fails
    console.warn('[sanitize] DOMPurify failed, using fallback:', error);
    return sanitizeStringFinal(text);
  }
};

// Email sanitization - for real-time input (no toLowerCase to preserve cursor)
export const sanitizeEmailInput = (email: string): string => {
  if (!email) return '';
  return email.replace(/\s/g, ''); // Remove spaces only
};

// Email sanitization - final version for onBlur/submit
export const sanitizeEmailFinal = (email: string): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

// Deprecated: use sanitizeEmailInput for onChange, sanitizeEmailFinal for onBlur/submit
export const sanitizeEmail = sanitizeEmailFinal;

// Name sanitization - preserves all Unicode characters (Cyrillic, Arabic, Chinese, etc.)
// ✅ FIX: Suppression du filtre restrictif - laisse NAME_REGEX valider Unicode
export const sanitizeName = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
  // Removed: .replace(/[^a-zA-Z\u00C0-\u017F '\-]/g, '') - trop restrictif
};
