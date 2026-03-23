/**
 * SEO AI Generation — Main Service
 *
 * Generates personalized SEO content for provider profiles using Claude Haiku.
 * Stores results in seo_optimized/{providerId} collection.
 *
 * Cloud Functions:
 * - generateProviderSEOCallable: Admin callable for single profile
 * - batchGenerateSEO: Admin callable for all profiles (via Cloud Tasks)
 * - processSEOTask: HTTP endpoint called by Cloud Tasks
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicApiKey, ANTHROPIC_SECRETS, TASKS_AUTH_SECRET } from '../lib/secrets';
import { seoGenerationConfig, ALLOWED_ORIGINS } from '../lib/functionConfigs';
import { getCountryName } from '../utils/countryUtils';
import { submitToIndexNow } from './indexNowService';
import {
  SITE_LOCALES,
  SiteLocale,
  SEOGenerationInput,
  SEOOptimizedDoc,
  SEOLocaleData,
  SEOOriginalDescription,
} from './seoTypes';
import { SEO_SYSTEM_PROMPT, buildUserPrompt, buildAnalysisPrompt } from './seoPrompts';
import {
  validateLocaleData,
  validateAnalysis,
  computeInputHash,
  parseClaudeJSON,
} from './seoValidator';

// ============================================================================
// CONSTANTS
// ============================================================================

const MODEL = 'claude-haiku-4-5-20251001';
const TEMPERATURE = 0.4;
const MAX_TOKENS = 1500;
const DAILY_LIMIT = 100;
const COLLECTION = 'seo_optimized';
const AI_LOGS_COLLECTION = 'ai_call_logs';
const SITE_URL = 'https://sos-expat.com';

// ============================================================================
// HELPERS
// ============================================================================

function db() {
  return admin.firestore();
}

/** Get a localized specialty label — simple fallback since backend doesn't have the full i18n system */
function formatSpecialties(specialties: string[] | undefined, _type: string): string[] {
  if (!specialties || specialties.length === 0) return [];
  // Convert SCREAMING_SNAKE_CASE to readable labels
  return specialties.map(s =>
    s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  );
}

/** Check daily generation count (tolerant to missing index) */
async function getDailyCount(): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snap = await db().collection(AI_LOGS_COLLECTION)
      .where('callType', '==', 'seo_generation')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
      .count()
      .get();

    return snap.data().count;
  } catch (err) {
    // Index may not exist yet — allow generation to proceed
    console.warn('[SEO] Daily count check failed (index may be missing):', err);
    return 0;
  }
}

/** Verify admin access */
async function verifyAdmin(uid: string): Promise<boolean> {
  const userDoc = await db().collection('users').doc(uid).get();
  const data = userDoc.data();
  return data?.role === 'admin' || data?.role === 'super_admin';
}

/** Build profile URLs for IndexNow submission */
function buildProfileUrls(profileData: any): string[] {
  const slugs = profileData.slugs as Record<string, string> | undefined;
  if (!slugs) return [];
  return Object.values(slugs)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
    .map(s => `${SITE_URL}/${s}`);
}

// ============================================================================
// CORE: Call Claude API
// ============================================================================

async function callClaude(
  client: Anthropic,
  userPrompt: string,
  uid: string,
  callType: string,
): Promise<{ parsed: unknown; inputTokens: number; outputTokens: number }> {
  const startMs = Date.now();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: SEO_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  const inputTokens = response.usage?.input_tokens || 0;
  const outputTokens = response.usage?.output_tokens || 0;
  const durationMs = Date.now() - startMs;

  // Log to ai_call_logs for cost tracking
  await db().collection(AI_LOGS_COLLECTION).add({
    providerId: uid,
    callType,
    provider: 'claude',
    model: MODEL,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    success: true,
    errorMessage: null,
    durationMs,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { parsed: parseClaudeJSON(text), inputTokens, outputTokens };
}

// ============================================================================
// CORE: Generate SEO for a single provider
// ============================================================================

export async function generateSEOForProvider(uid: string): Promise<{
  success: boolean;
  localesGenerated: number;
  error?: string;
}> {
  // 1. Read profile
  const profileDoc = await db().collection('sos_profiles').doc(uid).get();
  if (!profileDoc.exists) {
    return { success: false, localesGenerated: 0, error: 'Profile not found' };
  }

  const profile = profileDoc.data()!;

  // Skip non-visible or AAA test profiles
  if (!profile.isVisible || profile.isAAA || uid.startsWith('aaa_')) {
    return { success: false, localesGenerated: 0, error: 'Profile not eligible (AAA or not visible)' };
  }

  // 2. Build input and check hash
  const input: SEOGenerationInput = {
    uid,
    type: profile.type || 'lawyer',
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    country: profile.country || '',
    countryName: getCountryName(profile.country, 'en'),
    city: profile.city,
    languages: profile.languages || [],
    specialtiesLabels: formatSpecialties(
      profile.type === 'expat' ? profile.helpTypes : profile.specialties,
      profile.type
    ),
    yearsOfExperience: profile.yearsOfExperience,
    yearsAsExpat: profile.yearsAsExpat,
    rating: profile.rating,
    reviewCount: profile.reviewCount,
    totalCalls: profile.totalCalls,
    description: typeof profile.description === 'string'
      ? profile.description
      : typeof profile.description === 'object' && profile.description
        ? (profile.description as Record<string, string>).fr
          || (profile.description as Record<string, string>).en
          || Object.values(profile.description as Record<string, string>).find(v => v)
          || ''
        : '',
    price: profile.type === 'lawyer' ? '49€/20min' : '19€/30min',
    profileUrl: profile.slugs?.fr
      ? `${SITE_URL}/${profile.slugs.fr}`
      : `${SITE_URL}/provider/${uid}`,
  };

  const newHash = computeInputHash(input);

  // Check existing SEO document
  const existingDoc = await db().collection(COLLECTION).doc(uid).get();
  if (existingDoc.exists) {
    const existing = existingDoc.data() as SEOOptimizedDoc;
    if (existing.metadata?.inputHash === newHash) {
      console.log(`[SEO] Skipping ${uid} — inputHash unchanged`);
      return { success: true, localesGenerated: 0, error: 'No changes detected' };
    }
  }

  // 3. Check daily limit
  const dailyCount = await getDailyCount();
  if (dailyCount >= DAILY_LIMIT) {
    return { success: false, localesGenerated: 0, error: `Daily limit reached (${DAILY_LIMIT})` };
  }

  // 4. Initialize Claude client
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return { success: false, localesGenerated: 0, error: 'ANTHROPIC_API_KEY not configured' };
  }
  const client = new Anthropic({ apiKey });

  // 5. Analysis call: detect language + correct description
  let originalDescription: SEOOriginalDescription = {
    corrected: null,
    detectedLanguage: 'unknown',
    qualityScore: 0,
    correctionsMade: [],
  };

  const analysisPrompt = buildAnalysisPrompt(input);
  if (analysisPrompt) {
    try {
      const { parsed } = await callClaude(client, analysisPrompt, uid, 'seo_analysis');
      originalDescription = validateAnalysis(parsed);
    } catch (err) {
      console.warn(`[SEO] Analysis call failed for ${uid}:`, err);
    }
  }

  // 6. Generate for each locale (sequential to respect rate limits)
  const locales: Partial<Record<SiteLocale, SEOLocaleData>> = {};
  let localesGenerated = 0;

  for (const locale of SITE_LOCALES) {
    try {
      // Update country name in the target locale
      const localizedInput = {
        ...input,
        countryName: getCountryName(input.country, locale === 'zh' ? 'zh' : locale as any),
      };
      const userPrompt = buildUserPrompt(localizedInput, locale);
      const { parsed } = await callClaude(client, userPrompt, uid, 'seo_generation');
      const validated = validateLocaleData(parsed);

      if (validated) {
        locales[locale] = validated;
        localesGenerated++;
      } else {
        console.warn(`[SEO] Invalid response for ${uid}/${locale}, skipping`);
      }
    } catch (err) {
      console.error(`[SEO] Failed generating ${locale} for ${uid}:`, err);
      // Continue with other locales
    }
  }

  if (localesGenerated === 0) {
    return { success: false, localesGenerated: 0, error: 'All locale generations failed' };
  }

  // 7. Write to Firestore
  const seoDoc: SEOOptimizedDoc = {
    locales,
    originalDescription,
    metadata: {
      generatedAt: admin.firestore.Timestamp.now(),
      modelUsed: MODEL,
      inputHash: newHash,
      version: 1,
    },
  };

  await db().collection(COLLECTION).doc(uid).set(seoDoc);
  console.log(`[SEO] Generated ${localesGenerated}/${SITE_LOCALES.length} locales for ${uid}`);

  // 8. Submit to IndexNow (non-blocking)
  try {
    const urls = buildProfileUrls(profile);
    if (urls.length > 0) {
      await submitToIndexNow(urls);
    }
  } catch (err) {
    console.warn(`[SEO] IndexNow submission failed for ${uid}:`, err);
  }

  return { success: true, localesGenerated };
}

// ============================================================================
// CLOUD FUNCTION: Admin callable — single profile
// ============================================================================

export const generateProviderSEOCallable = onCall(
  {
    ...seoGenerationConfig,
    secrets: [...ANTHROPIC_SECRETS],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    if (!(await verifyAdmin(request.auth.uid))) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { uid } = request.data as { uid: string };
    if (!uid) {
      throw new HttpsError('invalid-argument', 'uid is required');
    }

    console.log(`[SEO] Admin ${request.auth.uid} triggered generation for ${uid}`);
    const result = await generateSEOForProvider(uid);
    return result;
  }
);

// ============================================================================
// CLOUD FUNCTION: Admin callable — batch all profiles
// ============================================================================

export const batchGenerateSEO = onCall(
  {
    ...seoGenerationConfig,
    secrets: [...ANTHROPIC_SECRETS],
    timeoutSeconds: 540,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    if (!(await verifyAdmin(request.auth.uid))) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    // Get all visible, non-AAA profiles
    const snap = await db().collection('sos_profiles')
      .where('isVisible', '==', true)
      .get();

    const eligibleProfiles = snap.docs.filter(d => {
      const data = d.data();
      return !data.isAAA && !d.id.startsWith('aaa_');
    });

    console.log(`[SEO Batch] Found ${eligibleProfiles.length} eligible profiles`);

    // Process sequentially with delays to respect rate limits
    let processed = 0;
    let succeeded = 0;
    const errors: string[] = [];

    for (const doc of eligibleProfiles) {
      try {
        const result = await generateSEOForProvider(doc.id);
        processed++;
        if (result.success && result.localesGenerated > 0) {
          succeeded++;
        }
        if (result.error) {
          errors.push(`${doc.id}: ${result.error}`);
        }

        // Small delay between profiles
        if (processed < eligibleProfiles.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        processed++;
        errors.push(`${doc.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`[SEO Batch] Done: ${succeeded}/${processed} profiles generated`);

    return {
      total: eligibleProfiles.length,
      processed,
      succeeded,
      errors: errors.slice(0, 20), // Limit error list
    };
  }
);

// ============================================================================
// CLOUD FUNCTION: HTTP endpoint for Cloud Tasks
// ============================================================================

export const processSEOTask = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    cpu: 0.5,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
    timeoutSeconds: 300,
    cors: ALLOWED_ORIGINS,
    secrets: [...ANTHROPIC_SECRETS, TASKS_AUTH_SECRET],
  },
  async (req, res) => {
    // Verify request method
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    // Verify auth (Cloud Tasks sends auth header)
    const authHeader = req.headers['x-task-auth'] as string | undefined;
    const expectedSecret = TASKS_AUTH_SECRET.value();
    if (!authHeader || !expectedSecret || authHeader !== expectedSecret) {
      console.warn('[SEO Task] Unauthorized request');
      res.status(401).send('Unauthorized');
      return;
    }

    const { uid } = req.body as { uid: string };
    if (!uid) {
      res.status(400).send('uid is required');
      return;
    }

    try {
      const result = await generateSEOForProvider(uid);
      console.log(`[SEO Task] Result for ${uid}:`, result);
      res.status(200).json(result);
    } catch (err) {
      console.error(`[SEO Task] Error for ${uid}:`, err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
);
