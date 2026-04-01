// firebase/functions/src/services/helpArticles/helpArticlesInit.ts
// Script d'initialisation des articles du Help Center
// Traduit le contenu français vers les 8 autres langues et sauvegarde dans Firestore

import { db, FieldValue } from '../../utils/firebase';
import { SupportedLanguage } from '../providerTranslationService';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicApiKey } from '../../lib/secrets';

// Types
export interface HelpArticleData {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  faqSuggestions: { question: string; answer: string }[];
  seoKeywords: string[];
  subcategorySlug: string;
  order: number;
}

export interface TranslatedHelpArticle {
  // Identifiants
  id?: string;
  categoryId: string;
  subcategoryId: string;

  // Contenu multilingue (Record<lang, value>)
  title: Record<string, string>;
  slug: Record<string, string>;
  excerpt: Record<string, string>;
  content: Record<string, string>;
  tags: Record<string, string[]>;

  // FAQ multilingue
  faq: {
    questions: Record<string, string[]>;
    answers: Record<string, string[]>;
    jsonLd: Record<string, unknown>;
  };

  // SEO
  seoKeywords: Record<string, string[]>;

  // Métadonnées
  order: number;
  isPublished: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
  translationStatus: {
    sourceLanguage: 'fr';
    translatedLanguages: SupportedLanguage[];
    lastTranslationAt: FirebaseFirestore.FieldValue;
  };
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['fr', 'en', 'es', 'pt', 'de', 'ru', 'ch', 'hi', 'ar'];

// Mapping catégorie principale (slug.fr dans Firestore) -> subcategories (subcategorySlug dans articles)
// IMPORTANT: Les clés doivent correspondre aux slug.fr des MAIN_CATEGORIES dans helpCenterInit.ts
// IMPORTANT: Les valeurs doivent correspondre exactement aux subcategorySlug dans les fichiers d'articles
const CATEGORY_SUBCATEGORY_MAP: Record<string, string[]> = {
  'clients-expatries': [
    'urgences-premiers-pas',
    'paiements-frais',
    'mon-compte-client',
    'evaluations-qualite',
    'securite-confidentialite'
  ],
  'prestataires-avocats': [
    'rejoindre-sos-expat-avocat',
    'gerer-missions-avocat',
    'paiements-revenus-avocats',
    'performance-visibilite-avocat',
    'deontologie-conformite'
  ],
  'prestataires-expat-aidant': [
    'devenir-expat-aidant',
    'gerer-interventions',
    'paiements-revenus-aidants',
    'developper-activite'
  ],
  'comprendre-sos-expat': [
    'presentation',
    'faq-generale',
    'nous-contacter',
    'informations-legales'
  ],
  // Note: Dans helpCenterInit.ts le slug est 'guides-situations' pas 'guides-par-situation'
  'guides-situations': [
    'situations-urgence',
    'guides-pays'
  ]
};

/**
 * Génère un slug traduit à partir du titre
 */
function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .replace(/^-|-$/g, '') // Trim hyphens
    .substring(0, 80); // Max 80 chars
}

// Language name mapping for Claude prompts
const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'French', en: 'English', es: 'Spanish', pt: 'Portuguese',
  de: 'German', ru: 'Russian', ch: 'Simplified Chinese', hi: 'Hindi', ar: 'Arabic',
};

/**
 * Traduit un article complet (tous les champs courts) en une seule requête Claude Haiku.
 * Retourne JSON avec tous les champs traduits.
 */
async function translateArticleFieldsWithClaude(
  fields: { title: string; excerpt: string; tags: string[]; seoKeywords: string[]; faqQuestions: string[]; faqAnswers: string[] },
  targetLang: string
): Promise<typeof fields> {
  const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;
  const prompt = `Translate the following JSON from French to ${targetLangName}.
Return ONLY valid JSON with the same structure. Keep markdown formatting. For "ar" (Arabic) use right-to-left text naturally.

${JSON.stringify(fields)}`;

  try {
    const apiKey = getAnthropicApiKey();
    if (!apiKey) throw new Error('No Anthropic API key');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });
    const rawText = (response.content[0] as { type: string; text: string }).text?.trim() || '';
    // Extract JSON from response (may have markdown fences)
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText];
    const parsed = JSON.parse(jsonMatch[1] || rawText);
    return parsed as typeof fields;
  } catch (error) {
    console.warn(`[translateArticleFields] Claude error for ${targetLang}:`, error);
    return fields; // fallback: return source
  }
}

/**
 * Traduit le contenu markdown d'un article via Claude Haiku (full content, no char limit).
 */
async function translateContentWithClaude(content: string, targetLang: string): Promise<string> {
  if (!content || content.trim().length === 0) return content;
  const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;
  const prompt = `Translate the following help center article from French to ${targetLangName}.
Keep all markdown formatting (##, ###, **, -, numbered lists, etc.) exactly as-is.
Return ONLY the translated markdown, no explanations.

${content}`;

  try {
    const apiKey = getAnthropicApiKey();
    if (!apiKey) throw new Error('No Anthropic API key');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    return (response.content[0] as { type: string; text: string }).text?.trim() || content;
  } catch (error) {
    console.warn(`[translateContent] Claude error for ${targetLang}:`, error);
    return content; // fallback: return source
  }
}

/**
 * Traduit un article complet vers une langue cible via Claude Haiku.
 * - Champs courts (title, excerpt, tags, FAQ, keywords) : 1 seul appel API
 * - Contenu markdown (content) : appel séparé pour gérer les textes longs
 */
async function translateArticleToLanguage(
  article: HelpArticleData,
  targetLang: SupportedLanguage
): Promise<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  faqQuestions: string[];
  faqAnswers: string[];
  seoKeywords: string[];
}> {
  // Si c'est français, pas besoin de traduire
  if (targetLang === 'fr') {
    return {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      tags: article.tags,
      faqQuestions: article.faqSuggestions.map(f => f.question),
      faqAnswers: article.faqSuggestions.map(f => f.answer),
      seoKeywords: article.seoKeywords,
    };
  }

  // Traduire les champs courts et le contenu en parallèle (2 appels Claude)
  const [translatedFields, translatedContent] = await Promise.all([
    translateArticleFieldsWithClaude({
      title: article.title,
      excerpt: article.excerpt,
      tags: article.tags,
      seoKeywords: article.seoKeywords,
      faqQuestions: article.faqSuggestions.map(f => f.question),
      faqAnswers: article.faqSuggestions.map(f => f.answer),
    }, targetLang),
    translateContentWithClaude(article.content, targetLang),
  ]);

  const title = translatedFields.title || article.title;
  const slug = generateSlugFromTitle(title);

  return {
    title,
    slug,
    excerpt: translatedFields.excerpt || article.excerpt,
    content: translatedContent || article.content,
    tags: translatedFields.tags || article.tags,
    faqQuestions: translatedFields.faqQuestions || article.faqSuggestions.map(f => f.question),
    faqAnswers: translatedFields.faqAnswers || article.faqSuggestions.map(f => f.answer),
    seoKeywords: translatedFields.seoKeywords || article.seoKeywords,
  };
}

/**
 * Génère le JSON-LD pour les FAQ
 */
function generateFAQJsonLd(questions: string[], answers: string[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q, i) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answers[i] || '',
      },
    })),
  };
}

/**
 * Récupère l'ID de la catégorie parente à partir du slug de sous-catégorie
 */
async function getCategoryIdFromSubcategorySlug(subcategorySlug: string): Promise<{ categoryId: string; subcategoryId: string } | null> {
  // Trouver dans quelle catégorie principale est cette sous-catégorie
  let parentCategorySlug: string | null = null;

  for (const [catSlug, subcats] of Object.entries(CATEGORY_SUBCATEGORY_MAP)) {
    if (subcats.includes(subcategorySlug)) {
      parentCategorySlug = catSlug;
      break;
    }
  }

  if (!parentCategorySlug) {
    console.error(`[getCategoryId] Subcategory not found in mapping: ${subcategorySlug}`);
    return null;
  }

  // Chercher la catégorie dans Firestore par son slug français
  const categoriesRef = db.collection('help_categories');
  const categorySnapshot = await categoriesRef.where(`slug.fr`, '==', parentCategorySlug).get();

  if (categorySnapshot.empty) {
    console.error(`[getCategoryId] Category not found in Firestore: ${parentCategorySlug}`);
    return null;
  }

  const categoryDoc = categorySnapshot.docs[0];
  const categoryData = categoryDoc.data();

  // Trouver la sous-catégorie dans la catégorie
  const subcategories = categoryData.subcategories || [];
  const subcategory = subcategories.find((s: any) => s.slug?.fr === subcategorySlug);

  if (!subcategory) {
    console.error(`[getCategoryId] Subcategory not found in category: ${subcategorySlug}`);
    return null;
  }

  return {
    categoryId: categoryDoc.id,
    subcategoryId: subcategory.id,
  };
}

/**
 * Initialise un seul article (traduit vers toutes les langues et sauvegarde)
 */
export async function initializeHelpArticle(
  article: HelpArticleData,
  dryRun: boolean = false
): Promise<{ success: boolean; articleId?: string; error?: string }> {
  try {
    console.log(`[initializeHelpArticle] Processing: ${article.title}`);

    // Récupérer les IDs de catégorie/sous-catégorie
    const categoryIds = await getCategoryIdFromSubcategorySlug(article.subcategorySlug);
    if (!categoryIds) {
      return {
        success: false,
        error: `Category/subcategory not found for: ${article.subcategorySlug}`
      };
    }

    // Traduire vers toutes les langues
    const translations: Record<SupportedLanguage, Awaited<ReturnType<typeof translateArticleToLanguage>>> = {} as any;

    for (const lang of SUPPORTED_LANGUAGES) {
      console.log(`[initializeHelpArticle] Translating to ${lang}...`);
      translations[lang] = await translateArticleToLanguage(article, lang);

      // Pause pour éviter le rate limiting des APIs
      if (lang !== 'fr') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Construire le document Firestore
    const articleDoc: TranslatedHelpArticle = {
      categoryId: categoryIds.categoryId,
      subcategoryId: categoryIds.subcategoryId,

      // Contenus multilingues
      title: Object.fromEntries(
        SUPPORTED_LANGUAGES.map(lang => [lang, translations[lang].title])
      ),
      slug: Object.fromEntries(
        SUPPORTED_LANGUAGES.map(lang => [lang, translations[lang].slug])
      ),
      excerpt: Object.fromEntries(
        SUPPORTED_LANGUAGES.map(lang => [lang, translations[lang].excerpt])
      ),
      content: Object.fromEntries(
        SUPPORTED_LANGUAGES.map(lang => [lang, translations[lang].content])
      ),
      tags: Object.fromEntries(
        SUPPORTED_LANGUAGES.map(lang => [lang, translations[lang].tags])
      ),

      // FAQ multilingue
      faq: {
        questions: Object.fromEntries(
          SUPPORTED_LANGUAGES.map(lang => [lang, translations[lang].faqQuestions])
        ),
        answers: Object.fromEntries(
          SUPPORTED_LANGUAGES.map(lang => [lang, translations[lang].faqAnswers])
        ),
        jsonLd: generateFAQJsonLd(
          translations['fr'].faqQuestions,
          translations['fr'].faqAnswers
        ),
      },

      // SEO
      seoKeywords: Object.fromEntries(
        SUPPORTED_LANGUAGES.map(lang => [lang, translations[lang].seoKeywords])
      ),

      // Métadonnées
      order: article.order,
      isPublished: true,
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      translationStatus: {
        sourceLanguage: 'fr',
        translatedLanguages: SUPPORTED_LANGUAGES,
        lastTranslationAt: FieldValue.serverTimestamp(),
      },
    };

    if (dryRun) {
      console.log(`[initializeHelpArticle] DRY RUN - Would save:`, {
        title: articleDoc.title,
        categoryId: articleDoc.categoryId,
        subcategoryId: articleDoc.subcategoryId,
      });
      return { success: true, articleId: 'dry-run' };
    }

    // Sauvegarder dans Firestore
    const docRef = await db.collection('help_articles').add(articleDoc);
    console.log(`[initializeHelpArticle] ✓ Saved article: ${docRef.id}`);

    return { success: true, articleId: docRef.id };
  } catch (error) {
    console.error(`[initializeHelpArticle] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Initialise tous les articles d'une catégorie
 */
export async function initializeArticlesBatch(
  articles: HelpArticleData[],
  batchSize: number = 5,
  dryRun: boolean = false
): Promise<{
  total: number;
  success: number;
  failed: number;
  errors: string[];
  articleIds: string[];
}> {
  const results = {
    total: articles.length,
    success: 0,
    failed: 0,
    errors: [] as string[],
    articleIds: [] as string[],
  };

  console.log(`[initializeArticlesBatch] Starting batch of ${articles.length} articles...`);

  // Traiter par lots pour éviter le rate limiting
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    console.log(`[initializeArticlesBatch] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)}`);

    for (const article of batch) {
      const result = await initializeHelpArticle(article, dryRun);

      if (result.success) {
        results.success++;
        if (result.articleId) {
          results.articleIds.push(result.articleId);
        }
      } else {
        results.failed++;
        results.errors.push(`${article.title}: ${result.error}`);
      }
    }

    // Pause entre les lots
    if (i + batchSize < articles.length) {
      console.log(`[initializeArticlesBatch] Pausing 5s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log(`[initializeArticlesBatch] ✓ Complete: ${results.success}/${results.total} succeeded`);
  return results;
}

/**
 * Vérifie si les catégories existent dans Firestore
 */
export async function checkCategoriesExist(): Promise<{
  exists: boolean;
  missing: string[];
  found: string[];
}> {
  const missing: string[] = [];
  const found: string[] = [];

  for (const categorySlug of Object.keys(CATEGORY_SUBCATEGORY_MAP)) {
    const snapshot = await db.collection('help_categories')
      .where('slug.fr', '==', categorySlug)
      .get();

    if (snapshot.empty) {
      missing.push(categorySlug);
    } else {
      found.push(categorySlug);
    }
  }

  return {
    exists: missing.length === 0,
    missing,
    found,
  };
}

/**
 * Supprime tous les articles existants (pour réinitialisation)
 */
export async function clearAllHelpArticles(): Promise<number> {
  const snapshot = await db.collection('help_articles').get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`[clearAllHelpArticles] Deleted ${snapshot.size} articles`);

  return snapshot.size;
}
