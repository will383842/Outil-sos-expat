/**
 * Diagnostic: Check profile data
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const diagnoseProfiles = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    const db = admin.firestore();
    const searchName = req.query.name as string || 'julien';
    const searchShortId = req.query.shortId as string || '';

    try {
      const results: any[] = [];

      // Get all profiles
      const snapshot = await db.collection('sos_profiles')
        .where('isActive', '==', true)
        .limit(100)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const firstName = (data.firstName || data.fullName || '').toLowerCase();

        // Filter by name or shortId
        if (searchName && firstName.includes(searchName.toLowerCase())) {
          results.push({
            id: doc.id,
            firstName: data.firstName,
            fullName: data.fullName,
            shortId: data.shortId || 'MISSING',
            slug: data.slug || 'MISSING',
            slugs: data.slugs ? Object.keys(data.slugs) : 'MISSING',
            slugFr: data.slugs?.fr || 'MISSING',
            isActive: data.isActive,
            isVisible: data.isVisible,
            isApproved: data.isApproved,
          });
        }

        if (searchShortId && data.shortId === searchShortId) {
          results.push({
            id: doc.id,
            firstName: data.firstName,
            fullName: data.fullName,
            shortId: data.shortId,
            slug: data.slug,
            slugs: data.slugs ? Object.keys(data.slugs) : 'MISSING',
            slugFr: data.slugs?.fr || 'MISSING',
            isActive: data.isActive,
            isVisible: data.isVisible,
            isApproved: data.isApproved,
          });
        }
      }

      res.status(200).json({
        query: { name: searchName, shortId: searchShortId },
        count: results.length,
        profiles: results,
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);
