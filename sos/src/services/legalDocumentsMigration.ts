/**
 * Migration service for legal documents
 * Uses extracted content from legalDocumentsData.json
 */
import { collection, doc, setDoc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import legalDocumentsData from './legalDocumentsData.json';

interface LegalDocumentData {
  id: string;
  type: string;
  language: string;
  title: string;
  content: string;
  isActive: boolean;
  version: string;
}

/**
 * Migrate all legal documents to Firestore
 * This will create documents that don't exist yet
 */
export async function migrateLegalDocumentsToFirestore(): Promise<{
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  try {
    // Get existing documents
    const existingDocs = await getDocs(collection(db, 'legal_documents'));
    const existingIds = new Set(existingDocs.docs.map(d => d.id));

    // Use batched writes for better performance (max 500 per batch)
    const BATCH_SIZE = 400;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const docData of legalDocumentsData as LegalDocumentData[]) {
      try {
        if (existingIds.has(docData.id)) {
          skipped++;
          continue;
        }

        const docRef = doc(db, 'legal_documents', docData.id);
        batch.set(docRef, {
          title: docData.title,
          content: docData.content,
          type: docData.type,
          language: docData.language,
          isActive: docData.isActive,
          version: docData.version,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
        });

        created++;
        batchCount++;

        // Commit batch when it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      } catch (error) {
        errors.push(`Error creating ${docData.id}: ${error}`);
      }
    }

    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
    }

    return { success: errors.length === 0, created, skipped, errors };
  } catch (error) {
    return { success: false, created, skipped, errors: [`Global error: ${error}`] };
  }
}

/**
 * Get count of documents in the data file
 */
export function getAvailableDocumentsCount(): {
  total: number;
  byType: Record<string, number>;
  byLanguage: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};

  for (const doc of legalDocumentsData as LegalDocumentData[]) {
    byType[doc.type] = (byType[doc.type] || 0) + 1;
    byLanguage[doc.language] = (byLanguage[doc.language] || 0) + 1;
  }

  return {
    total: legalDocumentsData.length,
    byType,
    byLanguage,
  };
}

/**
 * Get all available document data (for preview before migration)
 */
export function getAvailableDocuments(): LegalDocumentData[] {
  return legalDocumentsData as LegalDocumentData[];
}
