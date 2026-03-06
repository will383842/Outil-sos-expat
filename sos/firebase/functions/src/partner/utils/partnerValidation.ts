/**
 * Partner Validation Utilities
 */

import { getFirestore } from "firebase-admin/firestore";
import { PARTNER_CONSTANTS, type SupportedPartnerLanguage, type PartnerCategory, type PartnerTrafficTier } from "../types";

const VALID_LANGUAGES: SupportedPartnerLanguage[] = ["fr", "en", "es", "de", "pt", "ar", "ch", "ru", "hi"];

const VALID_CATEGORIES: PartnerCategory[] = [
  "expatriation", "travel", "legal", "finance", "insurance",
  "relocation", "education", "media", "association", "corporate", "other",
];

const VALID_TRAFFIC_TIERS: PartnerTrafficTier[] = [
  "lt10k", "10k-50k", "50k-100k", "100k-500k", "500k-1m", "gt1m",
];

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateWebsiteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateAffiliateCode(code: string): boolean {
  return PARTNER_CONSTANTS.AFFILIATE_CODE_REGEX.test(code);
}

export function validateLanguage(lang: string): lang is SupportedPartnerLanguage {
  return VALID_LANGUAGES.includes(lang as SupportedPartnerLanguage);
}

export function validateCategory(cat: string): cat is PartnerCategory {
  return VALID_CATEGORIES.includes(cat as PartnerCategory);
}

export function validateTrafficTier(tier: string): tier is PartnerTrafficTier {
  return VALID_TRAFFIC_TIERS.includes(tier as PartnerTrafficTier);
}

/**
 * Sanitize text input — strip HTML tags to prevent XSS
 */
export function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

/**
 * Check if an email is already used across all collections
 */
export async function isEmailTaken(email: string): Promise<boolean> {
  const db = getFirestore();
  const normalizedEmail = email.toLowerCase().trim();

  const collections = ["users", "chatters", "bloggers", "influencers", "group_admins", "partners"];

  for (const col of collections) {
    const snap = await db.collection(col).where("email", "==", normalizedEmail).limit(1).get();
    if (!snap.empty) return true;
  }

  return false;
}

/**
 * Check if an affiliate code is already used across all collections
 */
export async function isAffiliateCodeTaken(code: string): Promise<boolean> {
  const db = getFirestore();
  const normalized = code.toUpperCase().trim();

  // Check users collection (affiliateCode, affiliateCodeClient, affiliateCodeRecruitment)
  const fields = ["affiliateCode", "affiliateCodeClient", "affiliateCodeRecruitment"];
  for (const field of fields) {
    const snap = await db.collection("users").where(field, "==", normalized).limit(1).get();
    if (!snap.empty) return true;
  }

  // Check affiliate_codes collection
  const reservedDoc = await db.collection("affiliate_codes").doc(normalized).get();
  if (reservedDoc.exists) return true;

  // Check partners collection
  const partnerSnap = await db.collection("partners").where("affiliateCode", "==", normalized).limit(1).get();
  if (!partnerSnap.empty) return true;

  return false;
}

/**
 * Check if a website URL is already used by another partner
 */
export async function isWebsiteUrlTaken(url: string, excludePartnerId?: string): Promise<boolean> {
  const db = getFirestore();
  const normalizedUrl = url.toLowerCase().trim().replace(/\/+$/, "");

  const snap = await db.collection("partners")
    .where("websiteUrl", "==", normalizedUrl)
    .limit(2)
    .get();

  if (snap.empty) return false;

  if (excludePartnerId) {
    return snap.docs.some(doc => doc.id !== excludePartnerId);
  }

  return true;
}
