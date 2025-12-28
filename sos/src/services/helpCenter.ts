// src/services/helpCenter.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  DocumentData,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface HelpCategory {
  id: string;
  name: string | Record<string, string>; // Support both string and translations
  slug: string | Record<string, string>; // Support both string and translations
  order: number;
  isPublished: boolean;
  locale: string;
  icon?: string;
  parentSlug?: string; // For subcategories, links to parent category's slug (fr)
  createdAt?: Date;
  updatedAt?: Date;
}

// FAQ item for Schema.org FAQPage support
export interface HelpArticleFAQ {
  question: string | Record<string, string>; // Multilingual question
  answer: string | Record<string, string>;   // Multilingual answer
  order: number;
}

export interface HelpArticle {
  id: string;
  title: string | Record<string, string>; // Support both string and translations
  slug: string | Record<string, string>; // Support both string and translations
  categoryId: string;
  excerpt: string | Record<string, string>; // Support both string and translations
  content: string | Record<string, string>; // Support both string and translations
  tags: string[] | Record<string, string[]>; // Support both array and translations
  faqs?: HelpArticleFAQ[]; // FAQ items for Schema.org FAQPage
  readTime: number;
  order: number;
  isPublished: boolean;
  locale: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type TimestampLike = Timestamp | { toDate: () => Date };

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate === "function"
  ) {
    return (value as TimestampLike).toDate();
  }
  return undefined;
};

// Helper to get value from string or Record<string, string>
const getValue = (value: unknown, locale: string = "en"): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, string>;
    return record[locale] ?? record["en"] ?? record["fr"] ?? Object.values(record)[0] ?? "";
  }
  return "";
};

// Helper to get tags from array or Record<string, string[]>
const getTags = (value: unknown, locale: string = "en"): string[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, string[]>;
    return record[locale] ?? record["en"] ?? record["fr"] ?? Object.values(record)[0] ?? [];
  }
  return [];
};

const mapCategory = (snap: DocumentData & { id: string }): HelpCategory => {
  const locale = snap.locale ?? "en";
  return {
    id: snap.id,
    name: snap.name ?? snap.title ?? "",
    slug: snap.slug ?? "",
    order: Number(snap.order ?? 0),
    isPublished: Boolean(snap.isPublished),
    locale,
    icon: snap.icon,
    parentSlug: snap.parentSlug,
    createdAt: toDate(snap.createdAt),
    updatedAt: toDate(snap.updatedAt),
  };
};

const mapArticle = (snap: DocumentData & { id: string }): HelpArticle => {
  const locale = snap.locale ?? "en";
  // Handle tags: can be array or Record<string, string[]>
  let tags: string[] | Record<string, string[]> = [];
  if (Array.isArray(snap.tags)) {
    tags = snap.tags;
  } else if (snap.tags && typeof snap.tags === "object") {
    // Preserve the translation object structure
    tags = snap.tags as Record<string, string[]>;
  }
  // Handle FAQs: array of FAQ items with multilingual support
  let faqs: HelpArticleFAQ[] | undefined;
  if (Array.isArray(snap.faqs)) {
    faqs = snap.faqs.map((faq: any, index: number) => ({
      question: faq.question ?? "",
      answer: faq.answer ?? "",
      order: faq.order ?? index,
    }));
  }
  return {
    id: snap.id,
    title: snap.title ?? "",
    slug: snap.slug ?? "",
    categoryId: snap.categoryId ?? "",
    excerpt: snap.excerpt ?? "",
    content: snap.content ?? "",
    tags,
    faqs,
    readTime: Number(snap.readTime ?? 0),
    order: Number(snap.order ?? 0),
    isPublished: Boolean(snap.isPublished),
    locale,
    createdAt: toDate(snap.createdAt),
    updatedAt: toDate(snap.updatedAt),
  };
};

export const listHelpCategories = async (locale?: string): Promise<HelpCategory[]> => {
  const categoriesCol = collection(db, "help_categories");
  const constraints = [];
  if (locale) {
    constraints.push(where("locale", "==", locale));
  }
  const q = query(categoriesCol, ...constraints);
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapCategory({ id: d.id, ...d.data() }))
    .sort((a, b) => a.order - b.order);
};

export const listHelpArticles = async (options?: {
  locale?: string;
  categoryId?: string;
  onlyPublished?: boolean;
}): Promise<HelpArticle[]> => {
  const articlesCol = collection(db, "help_articles");
  const constraints = [];
  if (options?.locale) constraints.push(where("locale", "==", options.locale));
  if (options?.categoryId) constraints.push(where("categoryId", "==", options.categoryId));
  if (options?.onlyPublished) constraints.push(where("isPublished", "==", true));
  const q = query(articlesCol, ...constraints);
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapArticle({ id: d.id, ...d.data() }))
    .sort((a, b) => a.order - b.order);
};

export const createHelpCategory = async (
  data: Omit<HelpCategory, "id" | "createdAt" | "updatedAt">
): Promise<HelpCategory> => {
  const categoriesCol = collection(db, "help_categories");
  const payload = {
    ...("title" in data ? { name: (data as any).title } : {}),
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(categoriesCol, payload);
  const createdSnap = await getDoc(docRef);
  const createdData = createdSnap.data() ?? {};
  return mapCategory({ id: docRef.id, ...createdData });
};

export const updateHelpCategory = async (
  id: string,
  data: Partial<Omit<HelpCategory, "id">>
): Promise<void> => {
  await updateDoc(doc(db, "help_categories", id), {
    ...("title" in data ? { name: (data as any).title } : {}),
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteHelpCategory = (id: string): Promise<void> =>
  deleteDoc(doc(db, "help_categories", id));

export const createHelpArticle = async (
  data: Omit<HelpArticle, "id" | "createdAt" | "updatedAt">
): Promise<HelpArticle> => {
  const articlesCol = collection(db, "help_articles");
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(articlesCol, payload);
  const createdSnap = await getDoc(docRef);
  const createdData = createdSnap.data() ?? {};
  return mapArticle({ id: docRef.id, ...createdData });
};

export const updateHelpArticle = async (
  id: string,
  data: Partial<Omit<HelpArticle, "id">>
): Promise<void> => {
  await updateDoc(doc(db, "help_articles", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteHelpArticle = (id: string): Promise<void> =>
  deleteDoc(doc(db, "help_articles", id));

/**
 * Delete ALL categories and ALL articles from the Help Center
 * Use with caution - this cannot be undone!
 */
export const deleteAllHelpCenterData = async (): Promise<{
  categoriesDeleted: number;
  articlesDeleted: number;
}> => {
  // Delete all categories
  const categoriesSnap = await getDocs(collection(db, "help_categories"));
  const categoryDeletePromises = categoriesSnap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(categoryDeletePromises);

  // Delete all articles
  const articlesSnap = await getDocs(collection(db, "help_articles"));
  const articleDeletePromises = articlesSnap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(articleDeletePromises);

  return {
    categoriesDeleted: categoriesSnap.size,
    articlesDeleted: articlesSnap.size,
  };
};

