// src/services/helpArticles/helpArticlesAdminService.ts
// Service admin pour initialiser les articles du Help Center
// Version DIRECTE (sans Cloud Functions) - sauvegarde directement dans Firestore

import { HelpArticleData } from './helpArticlesClients';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

// Import de tous les articles
import { HELP_ARTICLES_CLIENTS } from './helpArticlesClients';
import { HELP_ARTICLES_LAWYERS } from './helpArticlesLawyers';
import { HELP_ARTICLES_HELPERS } from './helpArticlesHelpers';
import { HELP_ARTICLES_UNDERSTAND } from './helpArticlesUnderstand';
import { HELP_ARTICLES_SITUATIONS } from './helpArticlesSituations';

const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'pt', 'de', 'ru', 'ch', 'hi', 'ar'] as const;

// Mapping des sous-catégories vers les catégories parentes
const SUBCATEGORY_TO_CATEGORY: Record<string, string> = {
  // Clients
  'urgences-premiers-pas': 'clients-expatries',
  'paiements-frais': 'clients-expatries',
  'mon-compte-client': 'clients-expatries',
  'evaluations-qualite': 'clients-expatries',
  'securite-confidentialite': 'clients-expatries',
  // Avocats
  'rejoindre-sos-expat-avocat': 'prestataires-avocats',
  'gerer-missions-avocat': 'prestataires-avocats',
  'paiements-revenus-avocats': 'prestataires-avocats',
  'performance-visibilite-avocat': 'prestataires-avocats',
  'deontologie-conformite': 'prestataires-avocats',
  // Helpers
  'devenir-expat-aidant': 'prestataires-expat-aidant',
  'gerer-interventions': 'prestataires-expat-aidant',
  'paiements-revenus-aidants': 'prestataires-expat-aidant',
  'developper-activite': 'prestataires-expat-aidant',
  // Comprendre
  'presentation': 'comprendre-sos-expat',
  'faq-generale': 'comprendre-sos-expat',
  'nous-contacter': 'comprendre-sos-expat',
  'informations-legales': 'comprendre-sos-expat',
  // Guides
  'situations-urgence': 'guides-situations',
  'guides-pays': 'guides-situations',
};

/**
 * Tous les articles regroupés
 */
export const ALL_HELP_ARTICLES: HelpArticleData[] = [
  ...HELP_ARTICLES_CLIENTS,
  ...HELP_ARTICLES_LAWYERS,
  ...HELP_ARTICLES_HELPERS,
  ...HELP_ARTICLES_UNDERSTAND,
  ...HELP_ARTICLES_SITUATIONS,
];

/**
 * Articles par catégorie
 */
export const ARTICLES_BY_CATEGORY = {
  clients: HELP_ARTICLES_CLIENTS,
  lawyers: HELP_ARTICLES_LAWYERS,
  helpers: HELP_ARTICLES_HELPERS,
  understand: HELP_ARTICLES_UNDERSTAND,
  situations: HELP_ARTICLES_SITUATIONS,
};

interface BatchResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
  articleIds: string[];
}

interface CategoryCheckResult {
  exists: boolean;
  missing: string[];
  found: string[];
}

/**
 * Génère un slug à partir du titre
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

/**
 * Traduit un texte via API gratuite
 */
async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  if (!text || text.trim().length === 0 || fromLang === toLang) {
    return text;
  }

  const languageMap: Record<string, string> = {
    'fr': 'fr', 'en': 'en', 'es': 'es', 'pt': 'pt', 'de': 'de',
    'ru': 'ru', 'ch': 'zh', 'hi': 'hi', 'ar': 'ar',
  };

  const targetLang = languageMap[toLang] || toLang;
  const sourceLang = languageMap[fromLang] || fromLang;

  // Limiter la taille du texte
  const truncatedText = text.substring(0, 500);

  // Essai 1: MyMemory API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncatedText)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (e) {
    console.warn('[translateText] MyMemory failed:', e);
  }

  // Essai 2: Google Translate (unofficial)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(truncatedText)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data?.[0] && Array.isArray(data[0])) {
        return data[0].map((item: any[]) => item[0]).join('');
      }
    }
  } catch (e) {
    console.warn('[translateText] Google failed:', e);
  }

  // Fallback: retourner le texte original
  return text;
}

// Non-Latin languages that need English slug fallback
const NON_LATIN_LANGUAGES = ['hi', 'ru', 'ar', 'ch'] as const;

/**
 * Traduit un article vers toutes les langues
 */
async function translateArticle(article: HelpArticleData): Promise<{
  title: Record<string, string>;
  slug: Record<string, string>;
  excerpt: Record<string, string>;
  content: Record<string, string>;
  tags: Record<string, string[]>;
  faqQuestions: Record<string, string[]>;
  faqAnswers: Record<string, string[]>;
}> {
  const result: any = {
    title: { fr: article.title },
    slug: { fr: article.slug },
    excerpt: { fr: article.excerpt },
    content: { fr: article.content },
    tags: { fr: article.tags },
    faqQuestions: { fr: article.faqSuggestions.map(f => f.question) },
    faqAnswers: { fr: article.faqSuggestions.map(f => f.answer) },
  };

  // Get English translation first (for non-Latin slug fallback)
  const englishTitle = await translateText(article.title, 'fr', 'en');
  result.title['en'] = englishTitle;
  result.slug['en'] = generateSlug(englishTitle);

  // Traduire vers les autres langues
  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang === 'fr' || lang === 'en') continue;

    // Petite pause pour éviter le rate limiting
    await new Promise(r => setTimeout(r, 200));

    const [translatedTitle, translatedExcerpt] = await Promise.all([
      translateText(article.title, 'fr', lang),
      translateText(article.excerpt, 'fr', lang),
    ]);

    result.title[lang] = translatedTitle;

    // For non-Latin scripts, use English slug with language prefix
    // e.g., "ar-how-to-create-account" instead of broken transliteration
    if (NON_LATIN_LANGUAGES.includes(lang as any)) {
      result.slug[lang] = `${lang}-${generateSlug(englishTitle)}`;
    } else {
      result.slug[lang] = generateSlug(translatedTitle);
    }
    result.excerpt[lang] = translatedExcerpt;

    // Pour le contenu, on garde le français (trop long à traduire)
    result.content[lang] = article.content;

    // Traduire les tags
    const translatedTags = await Promise.all(
      article.tags.slice(0, 3).map(tag => translateText(tag, 'fr', lang))
    );
    result.tags[lang] = translatedTags;

    // Traduire les FAQ (questions seulement pour gagner du temps)
    const translatedQuestions = await Promise.all(
      article.faqSuggestions.slice(0, 3).map(f => translateText(f.question, 'fr', lang))
    );
    result.faqQuestions[lang] = translatedQuestions;
    result.faqAnswers[lang] = article.faqSuggestions.slice(0, 3).map(f => f.answer);
  }

  return result;
}

/**
 * Trouve l'ID de la catégorie dans Firestore
 * Les sous-catégories sont stockées comme des documents séparés dans help_categories
 */
async function findCategoryIds(subcategorySlug: string): Promise<{ categoryId: string; subcategoryId: string } | null> {
  const categoriesRef = collection(db, 'help_categories');

  // Chercher directement la sous-catégorie par son slug
  const q = query(categoriesRef, where('slug.fr', '==', subcategorySlug));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Trouvé la sous-catégorie directement
    const categoryDoc = snapshot.docs[0];
    return {
      categoryId: categoryDoc.id,
      subcategoryId: categoryDoc.id,
    };
  }

  // Si pas trouvé, chercher la catégorie parente
  const parentCategorySlug = SUBCATEGORY_TO_CATEGORY[subcategorySlug];
  if (parentCategorySlug) {
    const parentQuery = query(categoriesRef, where('slug.fr', '==', parentCategorySlug));
    const parentSnapshot = await getDocs(parentQuery);

    if (!parentSnapshot.empty) {
      const parentDoc = parentSnapshot.docs[0];
      return {
        categoryId: parentDoc.id,
        subcategoryId: parentDoc.id,
      };
    }
  }

  console.error(`[findCategoryIds] Category not found for: ${subcategorySlug}`);
  return null;
}

/**
 * Initialise un seul article (traduit et sauvegarde dans Firestore)
 */
async function initializeSingleArticle(article: HelpArticleData): Promise<{ success: boolean; articleId?: string; error?: string }> {
  try {
    console.log(`[initArticle] Processing: ${article.title}`);

    // Trouver les IDs de catégorie
    const categoryIds = await findCategoryIds(article.subcategorySlug);
    if (!categoryIds) {
      return { success: false, error: `Category not found for: ${article.subcategorySlug}` };
    }

    // Traduire l'article
    const translations = await translateArticle(article);

    // Construire le document
    const articleDoc = {
      categoryId: categoryIds.categoryId,
      subcategoryId: categoryIds.subcategoryId,
      title: translations.title,
      slug: translations.slug,
      excerpt: translations.excerpt,
      content: translations.content,
      tags: translations.tags,
      faqs: article.faqSuggestions.map((f, i) => ({
        question: Object.fromEntries(
          SUPPORTED_LANGUAGES.map(lang => [lang, translations.faqQuestions[lang]?.[i] || f.question])
        ),
        answer: Object.fromEntries(
          SUPPORTED_LANGUAGES.map(lang => [lang, translations.faqAnswers[lang]?.[i] || f.answer])
        ),
      })),
      seoKeywords: { fr: article.seoKeywords },
      order: article.order,
      readTime: Math.ceil(article.content.length / 1000),
      isPublished: true,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      locale: 'fr',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Sauvegarder dans Firestore
    const docRef = await addDoc(collection(db, 'help_articles'), articleDoc);
    console.log(`[initArticle] ✓ Saved: ${docRef.id}`);

    return { success: true, articleId: docRef.id };
  } catch (error) {
    console.error(`[initArticle] Error:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Initialise tous les articles (119 articles)
 */
export async function initializeAllArticles(
  _dryRun: boolean = false,
  onProgress?: (completed: number, total: number, currentArticle: string) => void
): Promise<BatchResult> {
  const results: BatchResult = {
    total: ALL_HELP_ARTICLES.length,
    success: 0,
    failed: 0,
    errors: [],
    articleIds: [],
  };

  for (let i = 0; i < ALL_HELP_ARTICLES.length; i++) {
    const article = ALL_HELP_ARTICLES[i];

    if (onProgress) {
      onProgress(i, ALL_HELP_ARTICLES.length, article.title);
    }

    const result = await initializeSingleArticle(article);

    if (result.success) {
      results.success++;
      if (result.articleId) {
        results.articleIds.push(result.articleId);
      }
    } else {
      results.failed++;
      results.errors.push(`${article.title}: ${result.error}`);
    }

    // Petite pause entre les articles
    await new Promise(r => setTimeout(r, 500));
  }

  if (onProgress) {
    onProgress(ALL_HELP_ARTICLES.length, ALL_HELP_ARTICLES.length, 'Terminé!');
  }

  return results;
}

/**
 * Vérifie que les catégories ET sous-catégories existent dans Firestore
 */
export async function checkCategoriesExist(): Promise<CategoryCheckResult> {
  // Toutes les sous-catégories nécessaires (20 sous-catégories)
  const requiredSubcategories = Object.keys(SUBCATEGORY_TO_CATEGORY);

  const found: string[] = [];
  const missing: string[] = [];

  for (const subCatSlug of requiredSubcategories) {
    const q = query(collection(db, 'help_categories'), where('slug.fr', '==', subCatSlug));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      missing.push(subCatSlug);
    } else {
      found.push(subCatSlug);
    }
  }

  return {
    exists: missing.length === 0,
    missing,
    found,
  };
}

/**
 * Statistiques sur les articles
 */
export function getArticlesStats() {
  return {
    total: ALL_HELP_ARTICLES.length,
    byCategory: {
      clients: HELP_ARTICLES_CLIENTS.length,
      lawyers: HELP_ARTICLES_LAWYERS.length,
      helpers: HELP_ARTICLES_HELPERS.length,
      understand: HELP_ARTICLES_UNDERSTAND.length,
      situations: HELP_ARTICLES_SITUATIONS.length,
    },
    languages: SUPPORTED_LANGUAGES,
    totalTranslations: ALL_HELP_ARTICLES.length * 9,
  };
}
