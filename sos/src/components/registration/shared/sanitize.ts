// Input sanitization utilities for registration forms

// Sanitize string - preserves spaces during input
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

// Email sanitization
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

// Name sanitization - preserves accents, hyphens, apostrophes, spaces
export const sanitizeName = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/[^a-zA-Z\u00C0-\u017F '\-]/g, '');
};
