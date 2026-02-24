/**
 * Sitemap Functions
 * HTTP endpoints and Firestore triggers for sitemap generation
 * Optimized for performance and cost efficiency
 */

import * as admin from 'firebase-admin';
import { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { generateAllSitemaps } from './generator';

// Lazy initialization to avoid issues during deployment analysis
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// Debounce mechanism to prevent excessive regenerations
let lastRegenerationTime = 0;
const REGENERATION_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes - don't regenerate more than once per 5 minutes

/**
 * Check if regeneration should be skipped (debouncing)
 **/

async function shouldSkipRegeneration(): Promise<boolean> {
  const now = Date.now();
  const timeSinceLastRegeneration = now - lastRegenerationTime;
  
  if (timeSinceLastRegeneration < REGENERATION_DEBOUNCE_MS) {
    const remainingSeconds = Math.ceil((REGENERATION_DEBOUNCE_MS - timeSinceLastRegeneration) / 1000);
    console.log(`⏸️ Skipping regeneration (debounced). Next regeneration allowed in ${remainingSeconds}s`);
    return true;
  }
  
  lastRegenerationTime = now;
  return false;
}

/**
 * HTTP endpoint to manually trigger sitemap generation
 * Optimized configuration for heavy processing
 */
export const generateSitemaps = onRequest(
  {
    region: 'europe-west3',
    timeoutSeconds: 540, // 9 minutes (max for v2)
    memory: '1GiB', // More memory for large operations
    cpu: 0.083,
    maxInstances: 1, // Only one at a time to avoid conflicts
    minInstances: 0,
    concurrency: 1,
    // Use Firebase Admin service account for Firestore access
    serviceAccount: 'firebase-adminsdk-fbsvc@sos-urgently-ac307.iam.gserviceaccount.com',
  },
  async (_req: Request, res: Response) => {
    ensureInitialized();
    try {
      console.log('🚀 Manual sitemap generation triggered');
      const result = await generateAllSitemaps();
      res.status(200).json({ 
        success: true, 
        message: 'Sitemaps generated successfully',
        timestamp: new Date().toISOString(),
        sitemaps: result,
      });
    } catch (error) {
      console.error('❌ Error generating sitemaps:', error);
      res.status(500).json({ 
        success: false, 
        error: String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Firestore trigger: Regenerate sitemaps when a provider is created/updated
 * OPTIMIZED: Uses debouncing to prevent excessive regenerations
 * 
 * ⚠️ Note: This trigger can be expensive if you have many provider updates.
 * Consider disabling it and relying only on scheduled generation if cost is a concern.
 */
export const onProviderChange = onDocumentWritten(
  {
    region: 'europe-west3',
    timeoutSeconds: 540,
    memory: '1GiB',
    cpu: 0.083,
    maxInstances: 1,
    minInstances: 0,
    concurrency: 1,
    document: 'sos_profiles/{providerId}',
  },
  async (event) => {
    ensureInitialized();
    const data = event.data?.after.data();
    const providerId = event.params.providerId;
    
    // Only regenerate if provider is public
    if (data && data.isVisible && data.isApproved && !data.isBanned && !data.isAdmin) {
      // Check debouncing
      if (await shouldSkipRegeneration()) {
        return;
      }
      
      console.log(`🔄 Provider ${providerId} changed, regenerating sitemaps...`);
      try {
        const result = await generateAllSitemaps();
        console.log('✅ Sitemaps regenerated after provider change');
        console.log(`📊 Generated ${result.summary.totalFiles} files`);
        // Note: Sitemaps are returned but not saved to disk here
        // They need to be downloaded via HTTP endpoint and saved locally
      } catch (error) {
        console.error('❌ Error regenerating sitemaps:', error);
        // Don't throw - we don't want to fail the provider update
      }
    }
  }
);  

/**
 * Scheduled function: Regenerate sitemaps daily
 * Optimized for background processing
 * This is the primary method for sitemap generation.
 * Runs once per day at a time when traffic is low.
 */

export const scheduledSitemapGeneration = onSchedule(
  {
    region: 'europe-west3',
    timeoutSeconds: 540,
    memory: '1GiB',
    cpu: 0.083,
    maxInstances: 1,
    minInstances: 0,
    schedule: 'every 24 hours',
    timeZone: 'UTC',
  },
  async () => {
    ensureInitialized();
    console.log('⏰ Running scheduled sitemap generation...');
    try {
      const result = await generateAllSitemaps();
      console.log('✅ Scheduled sitemap generation completed');
      console.log(`📊 Generated ${result.summary.totalFiles} files`);
      // Note: Sitemaps are returned but not saved to disk here
      // They need to be downloaded via HTTP endpoint and saved locally
    } catch (error) {
      console.error('❌ Error in scheduled sitemap generation:', error);
      // Log to Firestore for monitoring
      try {
        const db = admin.firestore();
        await db.collection('sitemap_errors').add({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: 'scheduled_generation',
          error: String(error),
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }
  }
);
