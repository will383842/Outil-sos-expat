// firebase/functions/src/adminApi.ts
import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'express';
import { stripeManager } from './StripeManager';
import * as admin from 'firebase-admin';
import { ALLOWED_ORIGINS } from './lib/functionConfigs';

const asDate = (d: Date | admin.firestore.Timestamp) =>
  (d && typeof (d as admin.firestore.Timestamp).toDate === 'function')
    ? (d as admin.firestore.Timestamp).toDate()
    : (d as Date);

// CRITICAL: Lazy initialization to avoid deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _db: admin.firestore.Firestore;
function getDb() {
  if (!_db && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) admin.initializeApp();
    _db = admin.firestore();
  }
  return _db;
}

// Proxy for backward compatibility
const db = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  }
});

/**
 * P0 SECURITY FIX: Verify admin authentication via Firebase ID token
 * Returns the decoded token if valid admin, null otherwise
 */
async function verifyAdminAuth(req: Request): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return null;
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Check if user has admin role in custom claims
    if (decodedToken.role !== 'admin' && decodedToken.admin !== true) {
      console.warn(`[AdminAPI] Non-admin user attempted access: ${decodedToken.uid}`);
      return null;
    }

    return decodedToken;
  } catch (error) {
    console.error('[AdminAPI] Token verification failed:', error);
    return null;
  }
}

function pctChange(curr: number, prev: number) {
  if (!prev) return 100;
  return ((curr - prev) / prev) * 100;
}

export const api = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    concurrency: 1,
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 3,
    cors: ALLOWED_ORIGINS,
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const path = req.path.replace(/\/+$/, ''); // trim trailing /

      console.log('🔍 API Request:', {
        method: req.method,
        path,
        originalUrl: req.originalUrl});

      // =============================
      // 📊 /admin/financial-stats
      // =============================
      if (path === '/admin/financial-stats') {
        console.log('📊 Route financial-stats appelée');

        // P0 SECURITY FIX: Require admin authentication
        const adminUser = await verifyAdminAuth(req);
        if (!adminUser) {
          res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
          return;
        }
        console.log(`📊 Admin authenticated: ${adminUser.uid}`);

        try {
          const now = Date.now();
          const d30 = admin.firestore.Timestamp.fromDate(
            new Date(now - 30 * 864e5)
          );
          const prevStart = admin.firestore.Timestamp.fromDate(
            new Date(now - 60 * 864e5)
          );
          const prevEnd = admin.firestore.Timestamp.fromDate(
            new Date(now - 30 * 864e5)
          );

          // Stats 30 derniers jours
          const curr = await stripeManager.getPaymentStatistics({
            startDate: asDate(d30)});
          console.log('✅ Stats courantes récupérées:', curr);

          // Période précédente
          const prev = await stripeManager.getPaymentStatistics({
            startDate: asDate(prevStart),
            endDate: asDate(prevEnd)});
          console.log('✅ Stats précédentes récupérées:', prev);

          // "Transactions actives"
          const pendingSnap = await db
            .collection('payments')
            .where('createdAt', '>=', d30)
            .where('status', 'in', [
              'pending',
              'authorized',
              'requires_capture',
              'processing',
            ])
            .get();

          const monthlyRevenue = curr.totalAmount || 0;

          const totalCommissions = curr.totalCommission || 0;
          const activeTransactions = pendingSnap.size;
          const conversionRate = curr.count
            ? ((curr.count - (curr.byStatus?.failed || 0)) / curr.count) * 100
            : 0;

          const response = {
            monthlyRevenue,
            totalCommissions,
            activeTransactions,
            conversionRate,
            changes: {
              revenue: pctChange(monthlyRevenue, prev.totalAmount || 0),
              commissions: pctChange(
                totalCommissions,
                prev.totalCommission || 0
              ),
              transactions: pctChange(activeTransactions, 0),
              conversion: pctChange(conversionRate, 0)},
            debug: {
              currentStats: curr,
              previousStats: prev,
              pendingCount: pendingSnap.size}};

          console.log('📊 Réponse financial-stats:', response);
          res.json(response);
          return;
        } catch (statsError) {
          console.error('❌ Erreur stats:', statsError);
          res.status(500).json({
            error: 'Erreur récupération statistiques',
            details:
              statsError instanceof Error
                ? statsError.message
                : String(statsError)});
          return;
        }
      }

      // =============================
      // 🕐 /admin/last-modifications
      // =============================
      if (path === '/admin/last-modifications') {
        console.log('🕐 Route last-modifications appelée');

        // P0 SECURITY FIX: Require admin authentication
        const adminUser = await verifyAdminAuth(req);
        if (!adminUser) {
          res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
          return;
        }
        console.log(`🕐 Admin authenticated: ${adminUser.uid}`);

        try {
          const pricingDoc = await db
            .doc('admin_config/pricing')
            .get()
            .catch(() => null);

          const lastPayment = await db
            .collection('payments')
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get()
            .catch(() => null);

          const lastAnalytics = await db
            .collection('call_sessions')
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get()
            .catch(() => null);

          const fmt = (ts?: admin.firestore.Timestamp | null) =>
            ts ? ts.toDate().toISOString() : 'N/A';

          const response = {
            pricing: fmt(
              (pricingDoc?.updateTime as admin.firestore.Timestamp) ??
                pricingDoc?.get('updatedAt')
            ),
            commissions: fmt(
              lastPayment?.docs[0]?.get('updatedAt') ||
                lastPayment?.docs[0]?.get('createdAt')
            ),
            analytics: fmt(
              lastAnalytics?.docs[0]?.get('updatedAt') ||
                lastAnalytics?.docs[0]?.get('createdAt')
            )};

          console.log('🕐 Réponse last-modifications:', response);
          res.json(response);
          return;
        } catch (modifError) {
          console.error('❌ Erreur modifications:', modifError);
          res.status(500).json({
            error: 'Erreur récupération modifications',
            details:
              modifError instanceof Error
                ? modifError.message
                : String(modifError)});
          return;
        }
      }

      // =============================
      // ⚙️ /admin/system-status
      // =============================
      if (path === '/admin/system-status') {
        console.log('⚙️ Route system-status appelée');

        // P0 SECURITY FIX: Require admin authentication
        const adminUser = await verifyAdminAuth(req);
        if (!adminUser) {
          res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
          return;
        }
        console.log(`⚙️ Admin authenticated: ${adminUser.uid}`);

        try {
          const t0 = Date.now();
          await db.collection('users').limit(1).get();
          const latency = Date.now() - t0;

          const response = {
            api: 'online',
            database:
              latency < 250 ? 'optimal' : latency < 1000 ? 'slow' : 'error',
            cache: 'inactive',
            lastCheck: new Date().toISOString(),
            latency: `${latency}ms`};

          console.log('⚙️ Réponse system-status:', response);
          res.json(response);
          return;
        } catch (statusError) {
          console.error('❌ Erreur status:', statusError);
          res.status(500).json({
            error: 'Erreur vérification status',
            details:
              statusError instanceof Error
                ? statusError.message
                : String(statusError)});
          return;
        }
      }

      // =============================
      // 🏠 / (racine)
      // =============================
      if (path === '' || path === '/') {
        console.log('🏠 Route racine appelée');
        res.json({
          message: 'API SOS Expat fonctionnelle',
          status: 'online',
          timestamp: new Date().toISOString(),
          availableRoutes: [
            '/admin/financial-stats',
            '/admin/last-modifications',
            '/admin/system-status',
          ]});
        return;
      }

      // =============================
      // ❌ Route non trouvée
      // =============================
      console.log('❌ Route non trouvée:', path);
      res.status(404).json({
        error: 'Route non trouvée',
        path,
        availableRoutes: [
          '/admin/financial-stats',
          '/admin/last-modifications',
          '/admin/system-status',
        ]});
      return;
    } catch (e: unknown) {
      console.error('💥 Erreur globale API:', e);
      res.status(500).json({
        error: e instanceof Error ? e.message : 'Internal error',
        timestamp: new Date().toISOString()});
      return;
    }
  }
);
