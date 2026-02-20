// src/pages/admin/AdminHelpCenter.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useIntl } from "react-intl";
import {
  Plus,
  Edit,
  Trash,
  BookOpen,
  CheckCircle2,
  Loader2,
  Tag,
  Globe,
  Database,
  MessageCircleQuestion,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../contexts/AuthContext";
import {
  createHelpArticle,
  createHelpCategory,
  deleteHelpArticle,
  deleteHelpCategory,
  deleteAllHelpCenterData,
  HelpArticle,
  HelpArticleFAQ,
  HelpCategory,
  listHelpArticles,
  listHelpCategories,
  updateHelpArticle,
  updateHelpCategory,
} from "../../services/helpCenter";
import { initializeHelpCenterCategories } from "../../services/helpCenterInit";
import {
  initializeAllArticles,
  checkCategoriesExist as checkCategoriesExistFirestore,
} from "../../services/helpArticles/helpArticlesAdminService";

type CategoryFormState = Omit<HelpCategory, "id" | "createdAt" | "updatedAt">;
type ArticleFormState = Omit<HelpArticle, "id" | "createdAt" | "updatedAt">;

const SUPPORTED_LANGUAGES = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ch", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
];

// Helper to get first available translation
const getFirstAvailableTranslation = (
  translations: string | Record<string, string> | undefined,
  fallback: string = ""
): string => {
  if (typeof translations === "string") return translations;
  if (!translations || typeof translations !== "object") return fallback;
  for (const lang of SUPPORTED_LANGUAGES) {
    if (translations[lang.code] && translations[lang.code].trim().length > 0) {
      return translations[lang.code];
    }
  }
  return fallback;
};

// Helper to get translation for a specific locale (with fallback)
const getTranslationForLocale = (
  translations: string | Record<string, string> | undefined,
  locale: string,
  fallback: string = ""
): string => {
  if (typeof translations === "string") return translations;
  if (!translations || typeof translations !== "object") return fallback;
  // Try to get translation for the requested locale
  if (translations[locale] && translations[locale].trim().length > 0) {
    return translations[locale];
  }
  // Fallback to first available translation
  return getFirstAvailableTranslation(translations, fallback);
};

// Helper to get first available language code
const getFirstAvailableLanguageCode = (
  translations: string | Record<string, string> | undefined,
  fallback: string = "fr"
): string => {
  if (typeof translations === "string") return fallback;
  if (!translations || typeof translations !== "object") return fallback;
  for (const lang of SUPPORTED_LANGUAGES) {
    if (translations[lang.code] && translations[lang.code].trim().length > 0) {
      return lang.code;
    }
  }
  return fallback;
};

// Helper to get first available tags array
const getFirstAvailableTags = (
  tags: string[] | Record<string, string[]> | undefined,
  fallback: string[] = []
): string[] => {
  if (Array.isArray(tags)) return tags;
  if (!tags || typeof tags !== "object") return fallback;
  // Try to find first available language with tags
  for (const lang of SUPPORTED_LANGUAGES) {
    const langTags = tags[lang.code];
    if (langTags && Array.isArray(langTags) && langTags.length > 0) {
      return langTags;
    }
  }
  // Fallback: try to get any language's tags from the object
  const allTags = Object.values(tags);
  for (const tagArray of allTags) {
    if (Array.isArray(tagArray) && tagArray.length > 0) {
      return tagArray;
    }
  }
  return fallback;
};

// Helper to get tags for a specific locale (with fallback)
const getTagsForLocale = (
  tags: string[] | Record<string, string[]> | undefined,
  locale: string,
  fallback: string[] = []
): string[] => {
  if (Array.isArray(tags)) return tags;
  if (!tags || typeof tags !== "object") return fallback;
  // Try to get tags for the requested locale
  if (tags[locale] && Array.isArray(tags[locale]) && tags[locale].length > 0) {
    return tags[locale];
  }
  // Fallback to first available tags
  return getFirstAvailableTags(tags, fallback);
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[''"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Generate slug from text
const generateSlug = (text: string): string => {
  if (!text || text.trim().length === 0) {
    return "untitled";
  }
  let slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100);
  if (!slug || slug.trim().length === 0) {
    slug = "untitled";
  }
  return slug;
};

// Non-Latin languages that need English slug fallback for clean ASCII URLs
const NON_LATIN_LANGUAGES = ["hi", "ru", "ar", "ch"];

// Auto-detect language of text
const detectLanguage = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) {
    return "en";
  }
  try {
    const detectUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text.substring(0, 500))}`;
    const response = await fetch(detectUrl);
    if (response.ok) {
      const data = (await response.json()) as any;
      let detectedLang: string | null = null;
      if (typeof data === "string") {
        detectedLang = data;
      } else if (Array.isArray(data) && data.length > 2 && data[2]) {
        detectedLang = data[2];
      } else if (data && typeof data === "object" && data.src) {
        detectedLang = data.src;
      }
      if (detectedLang) {
        const langMap: Record<string, string> = {
          fr: "fr",
          en: "en",
          es: "es",
          pt: "pt",
          de: "de",
          ru: "ru",
          zh: "ch",
          "zh-CN": "ch",
          "zh-TW": "ch",
          "zh-cn": "ch",
          hi: "hi",
          ar: "ar",
        };
        const mappedLang =
          langMap[detectedLang.toLowerCase()] || langMap[detectedLang];
        if (mappedLang) {
          return mappedLang;
        }
      }
    }
  } catch (error) {
    console.warn("[detectLanguage] Error detecting language:", error);
  }
  // Fallback: Try simple heuristics
  const textLower = text.toLowerCase();
  if (/[àâäéèêëïîôùûüÿç]/.test(text)) return "fr";
  if (/[ñáéíóúü¿¡]/.test(text)) return "es";
  if (/[äöüß]/.test(text)) return "de";
  if (/[а-яё]/.test(text)) return "ru";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u4e00-\u9fff]/.test(text)) return "ch";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[áàâãéêíóôõúç]/.test(text)) return "pt";
  return "en";
};

// Translate text to target language
const translateText = async (
  text: string,
  fromLang: string,
  toLang: string
): Promise<string> => {
  if (!text || text.trim().length === 0) {
    return text;
  }
  if (fromLang === toLang) {
    return text;
  }
  const languageMap: Record<string, string> = {
    fr: "fr",
    en: "en",
    es: "es",
    pt: "pt",
    de: "de",
    ru: "ru",
    ch: "zh",
    hi: "hi",
    ar: "ar",
  };
  const targetLang = languageMap[toLang] || toLang;
  const sourceLang = languageMap[fromLang] || fromLang;
  // Try MyMemory Translation API
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(myMemoryUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = (await response.json()) as {
        responseData?: { translatedText?: string };
      };
      if (data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (error) {
    console.warn(`[translateText] MyMemory API error:`, error);
  }
  // Fallback: Try Google Translate
  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(googleUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = (await response.json()) as any;
      if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
        const translated = data[0].map((item: any[]) => item[0]).join("");
        if (translated) {
          return translated;
        }
      }
    }
  } catch (error) {
    console.warn(`[translateText] Google Translate API error:`, error);
  }
  return text;
};

const defaultCategoryForm = (locale: string): CategoryFormState => ({
  name: "",
  slug: "",
  order: 1,
  isPublished: true,
  locale,
  icon: "",
});

const defaultArticleForm = (
  locale: string,
  categoryId?: string
): ArticleFormState => ({
  title: "",
  slug: "",
  categoryId: categoryId ?? "",
  excerpt: "",
  content: "",
  tags: [],
  readTime: 3,
  order: 1,
  isPublished: true,
  locale,
});

const AdminHelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);

  const [locale, setLocale] = useState<string>("fr");
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] =
    useState<boolean>(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(
    defaultCategoryForm(locale)
  );
  const [articleForm, setArticleForm] = useState<ArticleFormState>(
    defaultArticleForm(locale)
  );
  const [tagInput, setTagInput] = useState<string>("");
  const [translating, setTranslating] = useState<boolean>(false);
  const [isInitModalOpen, setIsInitModalOpen] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [initResult, setInitResult] = useState<{
    success: boolean;
    created: number;
    skipped: number;
    total: number;
    errors: string[];
  } | null>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState<boolean>(false);
  const [selectedArticleFaqs, setSelectedArticleFaqs] = useState<{
    title: string;
    faqs: HelpArticleFAQ[];
  } | null>(null);

  // État pour l'initialisation des 119 articles
  const [isArticlesInitModalOpen, setIsArticlesInitModalOpen] = useState<boolean>(false);
  const [isInitializingArticles, setIsInitializingArticles] = useState<boolean>(false);
  const [articlesInitProgress, setArticlesInitProgress] = useState<{
    completed: number;
    total: number;
    currentArticle: string;
  } | null>(null);
  const [articlesInitResult, setArticlesInitResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [categoriesCheckResult, setCategoriesCheckResult] = useState<{
    exists: boolean;
    missing: string[];
    found: string[];
  } | null>(null);

  // Reset Help Center state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    categoriesDeleted: number;
    articlesDeleted: number;
  } | null>(null);

  // Single input fields for translation
  const [categoryNameInput, setCategoryNameInput] = useState<string>("");
  const [articleTitleInput, setArticleTitleInput] = useState<string>("");
  const [articleExcerptInput, setArticleExcerptInput] = useState<string>("");
  const [articleContentInput, setArticleContentInput] = useState<string>("");

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all categories and articles (they contain translations)
      const [cats, arts] = await Promise.all([
        listHelpCategories(), // Load all categories
        listHelpArticles({ onlyPublished: false }), // Load all articles in admin
      ]);
      setCategories(cats);
      setArticles(arts);
      // Set selectedCategoryId if not set, or if current selection doesn't exist in new categories
      setSelectedCategoryId((prev) => {
        if (!prev && cats.length > 0) {
          return cats[0].id;
        }
        // If current selection doesn't exist in new categories, select first one
        if (prev && !cats.find((c) => c.id === prev) && cats.length > 0) {
          return cats[0].id;
        }
        return prev;
      });
    } catch (error) {
      console.error("Error loading help center data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") {
      navigate("/admin/login");
      return;
    }
    // Load data on initial mount
    void refreshAll();
  }, [currentUser, navigate, refreshAll]);

  useEffect(() => {
    setCategoryForm(defaultCategoryForm(locale));
    setArticleForm(defaultArticleForm(locale, selectedCategoryId ?? undefined));
     
  }, [locale, selectedCategoryId]);

  // Build hierarchical category structure
  const hierarchicalCategories = useMemo(() => {
    // Create a map of parentSlug -> subcategories
    const subcatMap = new Map<string, HelpCategory[]>();

    for (const cat of categories) {
      const slugFr = typeof cat.slug === 'string' ? cat.slug : (cat.slug as Record<string, string>)?.fr || '';

      if (cat.parentSlug) {
        const existing = subcatMap.get(cat.parentSlug) || [];
        existing.push(cat);
        subcatMap.set(cat.parentSlug, existing);
      }
    }

    // Get main categories (no parentSlug) and attach children
    const mainCats = categories
      .filter(cat => !cat.parentSlug)
      .map(cat => {
        const slugFr = typeof cat.slug === 'string' ? cat.slug : (cat.slug as Record<string, string>)?.fr || '';
        const children = subcatMap.get(slugFr) || [];
        return {
          ...cat,
          children: children.sort((a, b) => a.order - b.order),
        };
      })
      .sort((a, b) => a.order - b.order);

    return { mainCategories: mainCats, subcategoryMap: subcatMap };
  }, [categories]);

  const filteredArticles = useMemo(() => {
    if (!selectedCategoryId) return articles;

    // Check if selected is a main category (has children)
    const mainCat = hierarchicalCategories.mainCategories.find(c => c.id === selectedCategoryId);
    if (mainCat && mainCat.children && mainCat.children.length > 0) {
      // Include articles from all subcategories
      const subcatIds = mainCat.children.map(c => c.id);
      return articles.filter(a => subcatIds.includes(a.categoryId));
    }

    // It's a subcategory, match directly
    return articles.filter((a) => a.categoryId === selectedCategoryId);
  }, [articles, selectedCategoryId, hierarchicalCategories]);

  // Translate category name and slug to all languages
  const translateCategory = async (
    name: string
  ): Promise<{ name: Record<string, string>; slug: Record<string, string> }> => {
    const sourceLang = await detectLanguage(name);
    const translatedName: Record<string, string> = {};
    const slugMap: Record<string, string> = {};

    // Get English translation first (for non-Latin slug fallback)
    const englishName = sourceLang === "en" ? name : await translateText(name, sourceLang, "en");
    const englishSlug = generateSlug(englishName);

    const translationPromises = SUPPORTED_LANGUAGES.map(async (lang) => {
      const translated = await translateText(name, sourceLang, lang.code);
      translatedName[lang.code] = translated;

      // For non-Latin scripts, use English slug with language prefix
      // e.g., "ar-account-settings" instead of broken transliteration
      if (NON_LATIN_LANGUAGES.includes(lang.code)) {
        slugMap[lang.code] = `${lang.code}-${englishSlug}`;
      } else {
        const slugSource =
          translated && translated.trim().length > 0 ? translated : name;
        slugMap[lang.code] = generateSlug(slugSource);
      }
    });

    await Promise.all(translationPromises);
    return { name: translatedName, slug: slugMap };
  };

  // Translate article fields to all languages
  const translateArticle = async (
    title: string,
    excerpt: string,
    content: string,
    tags: string[]
  ): Promise<{
    title: Record<string, string>;
    excerpt: Record<string, string>;
    content: Record<string, string>;
    slug: Record<string, string>;
    tags: Record<string, string[]>;
  }> => {
    const sourceLang = await detectLanguage(title);
    const translatedTitle: Record<string, string> = {};
    const translatedExcerpt: Record<string, string> = {};
    const translatedContent: Record<string, string> = {};
    const slugMap: Record<string, string> = {};
    const tagsMap: Record<string, string[]> = {};

    // Get English translation first (for non-Latin slug fallback)
    const englishTitle = sourceLang === "en" ? title : await translateText(title, sourceLang, "en");
    const englishSlug = generateSlug(englishTitle);

    const translationPromises = SUPPORTED_LANGUAGES.map(async (lang) => {
      const [translatedT, translatedE, translatedC] = await Promise.all([
        translateText(title, sourceLang, lang.code),
        translateText(excerpt, sourceLang, lang.code),
        translateText(content, sourceLang, lang.code),
      ]);
      translatedTitle[lang.code] = translatedT;
      translatedExcerpt[lang.code] = translatedE;
      translatedContent[lang.code] = translatedC;

      // For non-Latin scripts, use English slug with language prefix
      // e.g., "ar-how-to-create-account" instead of broken transliteration
      if (NON_LATIN_LANGUAGES.includes(lang.code)) {
        slugMap[lang.code] = `${lang.code}-${englishSlug}`;
      } else {
        const slugSource =
          translatedT && translatedT.trim().length > 0 ? translatedT : title;
        slugMap[lang.code] = generateSlug(slugSource);
      }

      // Translate tags
      const translatedTags = await Promise.all(
        tags.map((tag) => translateText(tag, sourceLang, lang.code))
      );
      tagsMap[lang.code] = translatedTags;
    });

    await Promise.all(translationPromises);
    return {
      title: translatedTitle,
      excerpt: translatedExcerpt,
      content: translatedContent,
      slug: slugMap,
      tags: tagsMap,
    };
  };

  const openCategoryModal = (category?: HelpCategory) => {
    if (category) {
      setEditingCategoryId(category.id);
      // Extract first available translation for editing
      const nameValue = getFirstAvailableTranslation(category.name, "");
      setCategoryNameInput(nameValue);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        order: category.order,
        isPublished: category.isPublished,
        locale: category.locale,
        icon: category.icon ?? "",
      });
    } else {
      setEditingCategoryId(null);
      setCategoryNameInput("");
      setCategoryForm(defaultCategoryForm(locale));
    }
    setIsCategoryModalOpen(true);
  };

  const openArticleModal = (article?: HelpArticle) => {
    if (article) {
      setEditingArticleId(article.id);
      // Extract first available translations for editing
      const titleValue = getFirstAvailableTranslation(article.title, "");
      const excerptValue = getFirstAvailableTranslation(article.excerpt, "");
      const contentValue = getFirstAvailableTranslation(article.content, "");
      const tagsArray = getFirstAvailableTags(article.tags, []);
      setArticleTitleInput(titleValue);
      setArticleExcerptInput(excerptValue);
      setArticleContentInput(contentValue);
      setTagInput(tagsArray.join(", "));
      setArticleForm({
        title: article.title,
        slug: article.slug,
        categoryId: article.categoryId,
        excerpt: article.excerpt,
        content: article.content,
        tags: article.tags ?? [],
        readTime: article.readTime,
        order: article.order,
        isPublished: article.isPublished,
        locale: article.locale,
      });
    } else {
      setEditingArticleId(null);
      setArticleTitleInput("");
      setArticleExcerptInput("");
      setArticleContentInput("");
      setTagInput("");
      const defaultCategoryId = selectedCategoryId ?? categories[0]?.id ?? "";
      setArticleForm(defaultArticleForm(locale, defaultCategoryId));
    }
    setIsArticleModalOpen(true);
  };

  const handleSaveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryNameInput.trim()) {
      toast.error(t('admin.helpCenter.alertCategoryName'));
      return;
    }
    setIsSaving(true);
    setTranslating(true);
    try {
      // Translate name and slug to all languages
      const { name: translatedName, slug: translatedSlug } =
        await translateCategory(categoryNameInput.trim());

      const payload = {
        ...categoryForm,
        name: translatedName,
        slug: translatedSlug,
      };

      if (editingCategoryId) {
        await updateHelpCategory(editingCategoryId, payload);
      } else {
        await createHelpCategory(payload);
      }
      
      // Close modal and reset form state first to avoid DOM reconciliation issues
      setIsCategoryModalOpen(false);
      setCategoryNameInput("");
      setEditingCategoryId(null);
      
      // Refresh data after a small delay to allow modal to fully unmount
      setTimeout(() => {
        void refreshAll();
      }, 100);
    } catch (error) {
      console.error("Error saving category", error);
      toast.error(t('admin.helpCenter.alertSaveCategoryError'));
    } finally {
      setIsSaving(false);
      setTranslating(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const hasArticles = articles.some((a) => a.categoryId === categoryId);
    if (
      hasArticles &&
      !window.confirm(t('admin.helpCenter.deleteConfirm'))
    ) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteHelpCategory(categoryId);
      await refreshAll();
    } catch (error) {
      console.error("Error deleting category", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveArticle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!articleForm.categoryId) {
      toast.error(t('admin.helpCenter.alertSelectCategory'));
      return;
    }
    if (!articleTitleInput.trim() || !articleExcerptInput.trim() || !articleContentInput.trim()) {
      toast.error(t('admin.helpCenter.alertFillFields'));
      return;
    }
    setIsSaving(true);
    setTranslating(true);
    try {
      const tags = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Translate all article fields to all languages
      const {
        title: translatedTitle,
        excerpt: translatedExcerpt,
        content: translatedContent,
        slug: translatedSlug,
        tags: translatedTags,
      } = await translateArticle(
        articleTitleInput.trim(),
        articleExcerptInput.trim(),
        articleContentInput.trim(),
        tags
      );

      const payload = {
        ...articleForm,
        title: translatedTitle,
        excerpt: translatedExcerpt,
        content: translatedContent,
        slug: translatedSlug,
        tags: translatedTags,
      };

      if (editingArticleId) {
        await updateHelpArticle(editingArticleId, payload);
      } else {
        await createHelpArticle(payload);
      }
      
      // Close modal and reset form state first to avoid DOM reconciliation issues
      setIsArticleModalOpen(false);
      setArticleTitleInput("");
      setArticleExcerptInput("");
      setArticleContentInput("");
      setTagInput("");
      setEditingArticleId(null);
      
      // Refresh data after a small delay to allow modal to fully unmount
      setTimeout(() => {
        void refreshAll();
      }, 100);
    } catch (error) {
      console.error("Error saving article", error);
      toast.error(t('admin.helpCenter.alertSaveArticleError'));
    } finally {
      setIsSaving(false);
      setTranslating(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    setIsSaving(true);
    try {
      await deleteHelpArticle(articleId);
      await refreshAll();
    } catch (error) {
      console.error("Error deleting article", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitializeCategories = async () => {
    setIsInitializing(true);
    setInitResult(null);
    try {
      const result = await initializeHelpCenterCategories();
      setInitResult(result);
      if (result.created > 0) {
        await refreshAll();
      }
    } catch (error) {
      console.error("Error initializing categories", error);
      setInitResult({
        success: false,
        created: 0,
        skipped: 0,
        total: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const openFaqModal = (article: HelpArticle) => {
    const title = typeof article.title === "string"
      ? article.title
      : getTranslationForLocale(article.title, locale, "Article");
    setSelectedArticleFaqs({
      title,
      faqs: article.faqs || [],
    });
    setIsFaqModalOpen(true);
  };

  // Ouvrir le modal d'initialisation des articles
  const openArticlesInitModal = async () => {
    setIsArticlesInitModalOpen(true);
    setArticlesInitResult(null);
    setArticlesInitProgress(null);
    setCategoriesCheckResult(null);

    // Vérifier si les catégories existent dans Firestore
    try {
      const result = await checkCategoriesExistFirestore();
      setCategoriesCheckResult(result);
    } catch (error) {
      console.error("Error checking categories:", error);
      // En cas d'erreur, on permet quand même de continuer si on a des catégories localement
      if (categories.length >= 5) {
        setCategoriesCheckResult({
          exists: true,
          missing: [],
          found: categories.map(c => typeof c.slug === 'string' ? c.slug : c.slug?.fr || ''),
        });
      } else {
        setCategoriesCheckResult({
          exists: false,
          missing: ["Erreur de vérification - Initialisez d'abord les 25 catégories"],
          found: [],
        });
      }
    }
  };

  // Lancer l'initialisation des 119 articles
  const handleInitializeArticles = async () => {
    setIsInitializingArticles(true);
    setArticlesInitResult(null);
    setArticlesInitProgress({ completed: 0, total: 119, currentArticle: "Démarrage..." });

    try {
      const result = await initializeAllArticles(
        false, // dryRun = false (pour de vrai)
        (completed, total, currentArticle) => {
          setArticlesInitProgress({ completed, total, currentArticle });
        }
      );

      setArticlesInitResult({
        total: result.total,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
      });

      // Rafraîchir les articles après l'initialisation
      if (result.success > 0) {
        await refreshAll();
      }
    } catch (error) {
      console.error("Error initializing articles:", error);
      setArticlesInitResult({
        total: 119,
        success: 0,
        failed: 119,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      setIsInitializingArticles(false);
      setArticlesInitProgress(null);
    }
  };

  // Reset complet du Help Center (supprimer toutes les catégories et articles)
  const handleResetHelpCenter = async () => {
    setIsResetting(true);
    setResetResult(null);

    try {
      const result = await deleteAllHelpCenterData();
      setResetResult(result);

      // Rafraîchir après la suppression
      await refreshAll();
    } catch (error) {
      console.error("Error resetting Help Center:", error);
      toast.error(t('admin.helpCenter.alertResetError') + " " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsResetting(false);
    }
  };

  // const selectedCategory =
  //   categories.find((c) => c.id === selectedCategoryId) ?? null;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 p-5">
        <div>
          <p className="text-sm text-gray-500">{t('admin.helpCenter.title')}</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('admin.helpCenter.subtitle')}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsResetModalOpen(true)}
            className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
          >
            <Trash className="h-4 w-4 mr-2" />
            {t('admin.helpCenter.resetComplete')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsInitModalOpen(true)}
          >
            <Database className="h-4 w-4 mr-2" />
            {t('admin.helpCenter.initCategories')}
          </Button>
          <Button
            variant="outline"
            onClick={openArticlesInitModal}
            className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            {t('admin.helpCenter.initArticles')}
          </Button>
          <Button
            variant="primary"
            onClick={() => openArticleModal()}
            disabled={categories.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('admin.helpCenter.newArticle')}
          </Button>
          <Button variant="outline" onClick={() => openCategoryModal()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('admin.helpCenter.newCategory')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-red-600" />
              <h2 className="font-semibold text-gray-900">{t('admin.helpCenter.categories')}</h2>
            </div>
            <Button
              size="small"
              variant="ghost"
              onClick={() => openCategoryModal()}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('admin.helpCenter.add')}
            </Button>
          </div>
          {isLoading ? (
            <div className="p-6 flex items-center justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t('admin.helpCenter.loadingCategories')}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 text-center">
              {t('admin.helpCenter.noCategories')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* "All" option */}
              <div
                className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                  selectedCategoryId === null ? "bg-red-50" : ""
                }`}
                onClick={() => setSelectedCategoryId(null)}
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{t('admin.helpCenter.allArticles')}</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {articles.length}
                </span>
              </div>

              {/* Hierarchical categories */}
              {hierarchicalCategories.mainCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const isActive = selectedCategoryId === category.id;
                const hasChildren = category.children && category.children.length > 0;
                const subcatArticleCount = hasChildren
                  ? category.children.reduce((sum, sub) => sum + articles.filter(a => a.categoryId === sub.id).length, 0)
                  : articles.filter(a => a.categoryId === category.id).length;

                return (
                  <div key={category.id}>
                    {/* Main category */}
                    <div
                      className={`p-3 flex items-start justify-between cursor-pointer hover:bg-gray-50 ${
                        isActive ? "bg-red-50" : ""
                      }`}
                      onClick={() => {
                        if (hasChildren) {
                          const newExpanded = new Set(expandedCategories);
                          if (newExpanded.has(category.id)) {
                            newExpanded.delete(category.id);
                          } else {
                            newExpanded.add(category.id);
                          }
                          setExpandedCategories(newExpanded);
                        }
                        setSelectedCategoryId(category.id);
                      }}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          {hasChildren && (
                            <span className="text-gray-400">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                          )}
                          <span className="font-medium text-gray-900">
                            {typeof category.name === "string"
                              ? category.name
                              : getTranslationForLocale(category.name, locale, t('admin.helpCenter.untitledCategory'))}
                          </span>
                          {category.isPublished ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {t('admin.helpCenter.published')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                              {t('admin.helpCenter.draft')}
                            </span>
                          )}
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {subcatArticleCount}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-x-2 ml-6">
                          <span>{t('admin.helpCenter.order')}: {category.order}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCategoryModal(category);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                          disabled={isSaving}
                        >
                          <Trash className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {/* Subcategories (shown when expanded) */}
                    {hasChildren && isExpanded && (
                      <div className="ml-4 border-l-2 border-gray-100">
                        {category.children.map((subcat) => {
                          const isSubActive = selectedCategoryId === subcat.id;
                          const subArticleCount = articles.filter(a => a.categoryId === subcat.id).length;
                          return (
                            <div
                              key={subcat.id}
                              className={`p-2 pl-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                                isSubActive ? "bg-red-50" : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCategoryId(subcat.id);
                              }}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-700">
                                  {typeof subcat.name === "string"
                                    ? subcat.name
                                    : getTranslationForLocale(subcat.name, locale, "")}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                  {subArticleCount}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="small"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCategoryModal(subcat);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="small"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategory(subcat.id);
                                  }}
                                  disabled={isSaving}
                                >
                                  <Trash className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tag className="h-5 w-5 text-red-600" />
              <h2 className="font-semibold text-gray-900">{t('admin.helpCenter.articles')}</h2>
            </div>
            <Button
              size="small"
              variant="outline"
              onClick={() => openArticleModal()}
              disabled={categories.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('admin.helpCenter.addArticle')}
            </Button>
          </div>

          {isLoading ? (
            <div className="p-6 flex items-center justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t('admin.helpCenter.loadingArticles')}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 text-center">
              {t('admin.helpCenter.noArticles')}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredArticles.map((article) => (
                <div key={article.id} className="p-4 flex justify-between">
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">
                        {typeof article.title === "string"
                          ? article.title
                          : getTranslationForLocale(article.title, locale, t('admin.helpCenter.untitledArticle'))}
                      </span>
                      {article.isPublished ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('admin.helpCenter.published')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">
                          {t('admin.helpCenter.draft')}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {t('admin.helpCenter.readTime')}: {article.readTime} min
                      </span>
                      <span className="text-xs text-gray-500">
                        {t('admin.helpCenter.order')}: {article.order}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {typeof article.excerpt === "string"
                        ? article.excerpt
                        : getTranslationForLocale(article.excerpt, locale, "")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getTagsForLocale(article.tags, locale, []).map((tag, tagIndex) => (
                        <span
                          key={`${article.id}-tag-${tagIndex}-${tag}`}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {article.faqs && article.faqs.length > 0 && (
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={() => openFaqModal(article)}
                      >
                        <MessageCircleQuestion className="h-4 w-4 text-blue-600" />
                        <span className="ml-1 text-xs text-blue-600">{article.faqs.length}</span>
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="ghost"
                      onClick={() => openArticleModal(article)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      onClick={() => handleDeleteArticle(article.id)}
                      disabled={isSaving}
                    >
                      <Trash className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategoryId ? t('admin.helpCenter.editCategory') : t('admin.helpCenter.newCategoryModal')}
        size="large"
      >
        <form className="space-y-4" onSubmit={handleSaveCategory}>
          {/* Translation Info Banner */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {t('admin.helpCenter.autoTranslationEnabled')}
                </p>
                <p className="text-xs text-blue-700">
                  {t('admin.helpCenter.autoTranslationCategoryDesc')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.helpCenter.nameLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={categoryNameInput}
              onChange={(e) => setCategoryNameInput(e.target.value)}
              placeholder={t('admin.helpCenter.namePlaceholder')}
              required
              disabled={translating}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('admin.helpCenter.languageAutoDetect')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.helpCenter.orderLabel')}
              </label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={categoryForm.order}
                onChange={(e) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    order: Number(e.target.value),
                  }))
                }
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 pt-6">
              <input
                id="category-published"
                type="checkbox"
                className="h-4 w-4 text-red-600"
                checked={categoryForm.isPublished}
                onChange={(e) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    isPublished: e.target.checked,
                  }))
                }
              />
              <label
                htmlFor="category-published"
                className="text-sm text-gray-700"
              >
                {t('admin.helpCenter.publishedLabel')}
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.helpCenter.iconLabel')}
            </label>
            <input
              type="text"
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={categoryForm.icon ?? ""}
              onChange={(e) =>
                setCategoryForm((prev) => ({
                  ...prev,
                  icon: e.target.value,
                }))
              }
              placeholder={t('admin.helpCenter.iconPlaceholder')}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              {t('admin.helpCenter.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={isSaving || translating} disabled={translating}>
              {translating
                ? t('admin.helpCenter.translating')
                : editingCategoryId
                ? t('admin.helpCenter.update')
                : t('admin.helpCenter.createAndTranslate')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        title={editingArticleId ? t('admin.helpCenter.editArticle') : t('admin.helpCenter.newArticleModal')}
        size="large"
      >
        <form className="space-y-4" onSubmit={handleSaveArticle}>
          {/* Translation Info Banner */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {t('admin.helpCenter.autoTranslationEnabled')}
                </p>
                <p className="text-xs text-blue-700">
                  {t('admin.helpCenter.autoTranslationArticleDesc')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.helpCenter.titleLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={articleTitleInput}
              onChange={(e) => setArticleTitleInput(e.target.value)}
              placeholder={t('admin.helpCenter.titlePlaceholder')}
              required
              disabled={translating}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('admin.helpCenter.languageAutoDetect')}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.helpCenter.categoryLabel')}
              </label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={articleForm.categoryId}
                onChange={(e) =>
                  setArticleForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
                required
              >
                <option value="">{t('admin.helpCenter.selectOption')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {typeof c.name === "string"
                      ? c.name
                      : getTranslationForLocale(c.name, locale, t('admin.helpCenter.untitledCategory'))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.helpCenter.localeLabel')}
              </label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={articleForm.locale}
                onChange={(e) =>
                  setArticleForm((prev) => ({
                    ...prev,
                    locale: e.target.value,
                  }))
                }
              >
                <option value="fr">{t('admin.helpCenter.french')}</option>
                <option value="en">{t('admin.helpCenter.english')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.helpCenter.readTimeLabel')}
              </label>
              <input
                type="number"
                min={1}
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={articleForm.readTime}
                onChange={(e) =>
                  setArticleForm((prev) => ({
                    ...prev,
                    readTime: Number(e.target.value),
                  }))
                }
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.helpCenter.excerptLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2"
              rows={3}
              value={articleExcerptInput}
              onChange={(e) => setArticleExcerptInput(e.target.value)}
              placeholder={t('admin.helpCenter.excerptPlaceholder')}
              required
              disabled={translating}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.helpCenter.orderLabel')}
              </label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={articleForm.order}
                onChange={(e) =>
                  setArticleForm((prev) => ({
                    ...prev,
                    order: Number(e.target.value),
                  }))
                }
                required
              />
              <div className="flex items-center space-x-2 mt-3">
                <input
                  id="article-published"
                  type="checkbox"
                  className="h-4 w-4 text-red-600"
                  checked={articleForm.isPublished}
                  onChange={(e) =>
                    setArticleForm((prev) => ({
                      ...prev,
                      isPublished: e.target.checked,
                    }))
                  }
                />
                <label
                  htmlFor="article-published"
                  className="text-sm text-gray-700"
                >
                  {t('admin.helpCenter.publishedLabel')}
                </label>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.helpCenter.contentLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 font-mono text-sm"
              rows={12}
              value={articleContentInput}
              onChange={(e) => setArticleContentInput(e.target.value)}
              placeholder={t('admin.helpCenter.contentPlaceholder')}
              required
              disabled={translating}
            />
            <p className="mt-1 text-xs text-gray-500">
              {articleContentInput.length} {t('admin.helpCenter.characters')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('admin.helpCenter.tagsLabel')}
            </label>
            <input
              type="text"
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={t('admin.helpCenter.tagsPlaceholder')}
              disabled={translating}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('admin.helpCenter.tagsDescription')}
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={() => setIsArticleModalOpen(false)}
            >
              {t('admin.helpCenter.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={isSaving || translating} disabled={translating}>
              {translating
                ? t('admin.helpCenter.translating')
                : editingArticleId
                ? t('admin.helpCenter.update')
                : t('admin.helpCenter.createAndTranslate')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal d'initialisation des catégories */}
      <Modal
        isOpen={isInitModalOpen}
        onClose={() => {
          setIsInitModalOpen(false);
          setInitResult(null);
        }}
        title={t('admin.helpCenter.initCategoriesTitle')}
        size="large"
      >
        <div className="space-y-4">
          {!initResult ? (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      {t('admin.helpCenter.categoriesReady')}
                    </p>
                    <p className="text-xs text-blue-700 mb-2">
                      {t('admin.helpCenter.categoriesDescription')}
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                      <li><strong>{t('admin.helpCenter.categoriesList.main')}</strong></li>
                      <li><strong>{t('admin.helpCenter.categoriesList.clients')}</strong></li>
                      <li><strong>{t('admin.helpCenter.categoriesList.lawyers')}</strong></li>
                      <li><strong>{t('admin.helpCenter.categoriesList.expats')}</strong></li>
                      <li><strong>{t('admin.helpCenter.categoriesList.understand')}</strong></li>
                      <li><strong>{t('admin.helpCenter.categoriesList.guides')}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {t('admin.helpCenter.categoriesNote')}
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsInitModalOpen(false)}
                >
                  {t('admin.helpCenter.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleInitializeCategories}
                  loading={isInitializing}
                  disabled={isInitializing}
                >
                  {isInitializing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('admin.helpCenter.initializing')}
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      {t('admin.helpCenter.initializeNow')}
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className={`p-4 rounded-lg border ${
                initResult.success
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-start gap-3">
                  {initResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <Trash className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium mb-2 ${
                      initResult.success ? "text-green-900" : "text-red-900"
                    }`}>
                      {initResult.success
                        ? t('admin.helpCenter.initSuccess')
                        : t('admin.helpCenter.initWithErrors')}
                    </p>
                    <ul className={`text-xs space-y-1 ${
                      initResult.success ? "text-green-700" : "text-red-700"
                    }`}>
                      <li>{t('admin.helpCenter.totalCategories', { total: initResult.total })}</li>
                      <li>{t('admin.helpCenter.created', { count: initResult.created })}</li>
                      <li>{t('admin.helpCenter.skipped', { count: initResult.skipped })}</li>
                      {initResult.errors.length > 0 && (
                        <li>{t('admin.helpCenter.errors', { count: initResult.errors.length })}</li>
                      )}
                    </ul>
                    {initResult.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                        {initResult.errors.map((err, i) => (
                          <p key={i}>{err}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsInitModalOpen(false);
                    setInitResult(null);
                  }}
                >
                  {t('admin.helpCenter.close')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal d'affichage des FAQ */}
      <Modal
        isOpen={isFaqModalOpen}
        onClose={() => {
          setIsFaqModalOpen(false);
          setSelectedArticleFaqs(null);
        }}
        title={t('admin.helpCenter.faqTitle', { title: selectedArticleFaqs?.title || "Article" })}
        size="large"
      >
        <div className="space-y-4">
          {selectedArticleFaqs?.faqs && selectedArticleFaqs.faqs.length > 0 ? (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  {t('admin.helpCenter.faqDescription')}
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {selectedArticleFaqs.faqs.map((faq, index) => {
                  const question = typeof faq.question === "string"
                    ? faq.question
                    : getTranslationForLocale(faq.question, locale, "Question");
                  const answer = typeof faq.answer === "string"
                    ? faq.answer
                    : getTranslationForLocale(faq.answer, locale, "Answer");
                  return (
                    <div key={index} className="py-4">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-start gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        {question}
                      </h4>
                      <p className="text-sm text-gray-600 ml-8">{answer}</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <MessageCircleQuestion className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{t('admin.helpCenter.noFaqs')}</p>
              <p className="text-xs mt-2">
                {t('admin.helpCenter.faqAutoGenerated')}
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setIsFaqModalOpen(false);
                setSelectedArticleFaqs(null);
              }}
            >
              {t('admin.helpCenter.close')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'initialisation des 119 articles */}
      <Modal
        isOpen={isArticlesInitModalOpen}
        onClose={() => {
          if (!isInitializingArticles) {
            setIsArticlesInitModalOpen(false);
            setArticlesInitResult(null);
            setArticlesInitProgress(null);
            setCategoriesCheckResult(null);
          }
        }}
        title={t('admin.helpCenter.articlesInitTitle')}
        size="large"
      >
        <div className="space-y-4">
          {/* Phase 1: Vérification des catégories */}
          {!articlesInitResult && !isInitializingArticles && (
            <>
              {/* Stats des articles */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      {t('admin.helpCenter.articlesReady')}
                    </p>
                    <p className="text-xs text-blue-700 mb-2">
                      {t('admin.helpCenter.articlesDescription')}
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                      <li><strong>{t('admin.helpCenter.articlesCounts.clients')}</strong></li>
                      <li><strong>{t('admin.helpCenter.articlesCounts.lawyers')}</strong></li>
                      <li><strong>{t('admin.helpCenter.articlesCounts.expats')}</strong></li>
                      <li><strong>{t('admin.helpCenter.articlesCounts.understand')}</strong></li>
                      <li><strong>{t('admin.helpCenter.articlesCounts.guides')}</strong></li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      {t('admin.helpCenter.articlesTotal')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vérification des catégories */}
              {categoriesCheckResult === null ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-600">{t('admin.helpCenter.checkingCategories')}</span>
                </div>
              ) : categoriesCheckResult.exists ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {t('admin.helpCenter.allCategoriesExist')}
                      </p>
                      <p className="text-xs text-green-700">
                        {t('admin.helpCenter.categoriesFoundReady', { count: categoriesCheckResult.found.length })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Trash className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        {t('admin.helpCenter.missingCategories', { count: categoriesCheckResult.missing.length })}
                      </p>
                      <p className="text-xs text-red-700 mb-2">
                        {t('admin.helpCenter.initCategoriesFirst')}
                      </p>
                      <div className="text-xs text-green-700 mb-1">
                        ✓ {t('admin.helpCenter.categoriesFound', { found: categoriesCheckResult.found.length })}
                      </div>
                      <div className="max-h-24 overflow-y-auto">
                        <ul className="text-xs text-red-600 list-disc ml-4">
                          {categoriesCheckResult.missing.slice(0, 10).map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                          {categoriesCheckResult.missing.length > 10 && (
                            <li className="font-medium">{t('admin.helpCenter.moreErrors', { count: categoriesCheckResult.missing.length - 10 })}</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Avertissement temps */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {t('admin.helpCenter.timeWarning')}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsArticlesInitModalOpen(false)}
                >
                  {t('admin.helpCenter.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleInitializeArticles}
                  disabled={!categoriesCheckResult?.exists}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t('admin.helpCenter.initArticlesButton')}
                </Button>
              </div>
            </>
          )}

          {/* Phase 2: Progression */}
          {isInitializingArticles && articlesInitProgress && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {t('admin.helpCenter.initInProgress')}
                  </span>
                </div>

                {/* Barre de progression */}
                <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(articlesInitProgress.completed / articlesInitProgress.total) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-blue-700">
                  <span>{t('admin.helpCenter.progressLabel', { completed: articlesInitProgress.completed, total: articlesInitProgress.total })}</span>
                  <span>{Math.round((articlesInitProgress.completed / articlesInitProgress.total) * 100)}%</span>
                </div>

                <p className="text-xs text-blue-600 mt-2 truncate">
                  {t('admin.helpCenter.currentArticle', { article: articlesInitProgress.currentArticle })}
                </p>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700">
                  {t('admin.helpCenter.doNotClose')}
                </p>
              </div>
            </div>
          )}

          {/* Phase 3: Résultat */}
          {articlesInitResult && (
            <>
              <div className={`p-4 rounded-lg border ${
                articlesInitResult.failed === 0
                  ? "bg-green-50 border-green-200"
                  : articlesInitResult.success > 0
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-start gap-3">
                  {articlesInitResult.failed === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-yellow-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium mb-2 ${
                      articlesInitResult.failed === 0 ? "text-green-900" : "text-yellow-900"
                    }`}>
                      {articlesInitResult.failed === 0
                        ? t('admin.helpCenter.initSuccess')
                        : t('admin.helpCenter.initPartial', { success: articlesInitResult.success, total: articlesInitResult.total })}
                    </p>
                    <ul className="text-xs space-y-1 text-gray-700">
                      <li>{t('admin.helpCenter.total', { count: articlesInitResult.total })}</li>
                      <li className="text-green-700">{t('admin.helpCenter.success', { count: articlesInitResult.success })}</li>
                      {articlesInitResult.failed > 0 && (
                        <li className="text-red-700">{t('admin.helpCenter.failed', { count: articlesInitResult.failed })}</li>
                      )}
                    </ul>
                    {articlesInitResult.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800 max-h-32 overflow-y-auto">
                        {articlesInitResult.errors.slice(0, 5).map((err, i) => (
                          <p key={i} className="truncate">{err}</p>
                        ))}
                        {articlesInitResult.errors.length > 5 && (
                          <p className="text-red-600 font-medium">
                            {t('admin.helpCenter.moreErrors', { count: articlesInitResult.errors.length - 5 })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsArticlesInitModalOpen(false);
                    setArticlesInitResult(null);
                  }}
                >
                  {t('admin.helpCenter.close')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal de Reset complet */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => {
          if (!isResetting) {
            setIsResetModalOpen(false);
            setResetResult(null);
          }
        }}
        title={t('admin.helpCenter.resetTitle')}
        size="medium"
      >
        <div className="space-y-4">
          {!resetResult && !isResetting && (
            <>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Trash className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-1">
                      {t('admin.helpCenter.resetWarning')}
                    </p>
                    <p className="text-xs text-red-700">
                      {t('admin.helpCenter.resetDescription', { categories: categories.length, articles: articles.length })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>{t('admin.helpCenter.resetStepsTitle')}</strong>
                </p>
                <ol className="text-xs text-gray-600 list-decimal ml-4 space-y-1">
                  <li>{t('admin.helpCenter.resetStep1')}</li>
                  <li>{t('admin.helpCenter.resetStep2')}</li>
                </ol>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsResetModalOpen(false)}
                >
                  {t('admin.helpCenter.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleResetHelpCenter}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {t('admin.helpCenter.confirmReset')}
                </Button>
              </div>
            </>
          )}

          {isResetting && (
            <div className="p-6 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-4" />
              <p className="text-sm text-gray-600">{t('admin.helpCenter.resetting')}</p>
            </div>
          )}

          {resetResult && (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900 mb-1">
                      {t('admin.helpCenter.resetSuccess')}
                    </p>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>{t('admin.helpCenter.categoriesDeleted', { count: resetResult.categoriesDeleted })}</li>
                      <li>{t('admin.helpCenter.articlesDeleted', { count: resetResult.articlesDeleted })}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setResetResult(null);
                  }}
                >
                  {t('admin.helpCenter.close')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AdminHelpCenter;
