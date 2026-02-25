// firebase/functions/src/helpCenter/initHelpArticles.ts
// Cloud Function pour initialiser les articles du Help Center

import { onRequest } from 'firebase-functions/v2/https';
import {
  initializeHelpArticle,
  initializeArticlesBatch,
  checkCategoriesExist,
  clearAllHelpArticles,
  HelpArticleData
} from '../services/helpArticles/helpArticlesInit';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';

/**
 * Cloud Function: Initialise un seul article
 * POST /initSingleHelpArticle
 * Body: { article: HelpArticleData, dryRun?: boolean }
 */
export const initSingleHelpArticle = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 300,
    cors: ALLOWED_ORIGINS,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { article, dryRun = false } = req.body as {
        article: HelpArticleData;
        dryRun?: boolean;
      };

      if (!article) {
        res.status(400).json({ error: 'Missing article data' });
        return;
      }

      console.log(`[initSingleHelpArticle] Processing: ${article.title}`);
      const result = await initializeHelpArticle(article, dryRun);

      res.status(200).json(result);
    } catch (error) {
      console.error('[initSingleHelpArticle] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * Cloud Function: Initialise un lot d'articles
 * POST /initHelpArticlesBatch
 * Body: { articles: HelpArticleData[], batchSize?: number, dryRun?: boolean }
 */
export const initHelpArticlesBatch = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 540,
    cors: ALLOWED_ORIGINS,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { articles, batchSize = 3, dryRun = false } = req.body as {
        articles: HelpArticleData[];
        batchSize?: number;
        dryRun?: boolean;
      };

      if (!articles || !Array.isArray(articles)) {
        res.status(400).json({ error: 'Missing or invalid articles array' });
        return;
      }

      console.log(`[initHelpArticlesBatch] Processing ${articles.length} articles...`);
      const result = await initializeArticlesBatch(articles, batchSize, dryRun);

      res.status(200).json(result);
    } catch (error) {
      console.error('[initHelpArticlesBatch] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * Cloud Function: Vérifie que les catégories existent
 * GET /checkHelpCategories
 */
export const checkHelpCategories = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (_req, res) => {
    try {
      const result = await checkCategoriesExist();
      res.status(200).json(result);
    } catch (error) {
      console.error('[checkHelpCategories] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * Cloud Function: Supprime tous les articles (DANGER - pour réinitialisation)
 * POST /clearHelpArticles
 * Body: { confirmDelete: "DELETE_ALL_ARTICLES" }
 */
export const clearHelpArticles = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 120,
    cors: ALLOWED_ORIGINS,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { confirmDelete } = req.body as { confirmDelete?: string };

      if (confirmDelete !== 'DELETE_ALL_ARTICLES') {
        res.status(400).json({
          error: 'Safety check failed',
          message: 'You must send confirmDelete: "DELETE_ALL_ARTICLES" to proceed'
        });
        return;
      }

      const deletedCount = await clearAllHelpArticles();
      res.status(200).json({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} articles`
      });
    } catch (error) {
      console.error('[clearHelpArticles] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);
