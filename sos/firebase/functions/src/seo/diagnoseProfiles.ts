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
    // Vérifier l'authentification admin
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized - Bearer token required' });
      return;
    }
    try {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (decodedToken.role !== 'admin') {
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
          res.status(403).json({ error: 'Forbidden - Admin access required' });
          return;
        }
      }
    } catch (authError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

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
