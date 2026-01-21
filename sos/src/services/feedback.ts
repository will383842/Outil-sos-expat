// src/services/feedback.ts
// Service pour la gestion des feedbacks utilisateur
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

// ==========================================
// TYPES
// ==========================================

export type FeedbackType = 'bug' | 'ux_friction' | 'suggestion' | 'other';
export type FeedbackPriority = 'blocking' | 'annoying' | 'minor';
export type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate';
export type UserRole = 'client' | 'lawyer' | 'expat' | 'visitor' | 'admin';

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screenResolution: string;
  connectionType: string;
}

export interface FeedbackData {
  // Informations utilisateur
  email: string;
  userId?: string;
  userRole: UserRole;
  userName?: string;

  // Détails du feedback
  type: FeedbackType;
  priority?: FeedbackPriority;
  description: string;
  pageUrl: string;
  pageName: string;

  // Contexte technique
  device: DeviceInfo;
  locale: string;

  // Pièces jointes (ajouté après upload)
  screenshotUrl?: string;
}

export interface UserFeedback extends FeedbackData {
  id: string;
  // Gestion admin
  status: FeedbackStatus;
  assignedTo?: string;
  adminNotes?: string;
  resolution?: string;
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
}

// ==========================================
// CONSTANTES
// ==========================================

const FEEDBACK_COLLECTION = 'user_feedback';
const FEEDBACK_STORAGE_PATH = 'feedback_screenshots';

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Génère un nom de fichier unique pour le screenshot
 */
function generateScreenshotFileName(email: string): string {
  const timestamp = Date.now();
  const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  const randomId = Math.random().toString(36).substring(2, 8);
  return `${sanitizedEmail}_${timestamp}_${randomId}.jpg`;
}

/**
 * Nettoie et valide les données de feedback
 */
function sanitizeFeedbackData(data: FeedbackData): FeedbackData {
  return {
    ...data,
    email: data.email.toLowerCase().trim(),
    description: data.description.trim().substring(0, 2000),
    pageUrl: data.pageUrl.substring(0, 500),
    pageName: data.pageName.substring(0, 200),
    userName: data.userName?.trim().substring(0, 100),
  };
}

// ==========================================
// FONCTIONS PRINCIPALES
// ==========================================

/**
 * Upload une capture d'écran vers Firebase Storage
 */
export async function uploadFeedbackScreenshot(file: File): Promise<string> {
  // Valider le fichier
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Only images are allowed.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 5MB.');
  }

  // Générer un nom unique
  const fileName = generateScreenshotFileName(file.name);
  const filePath = `${FEEDBACK_STORAGE_PATH}/${fileName}`;

  // Upload
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      uploadedAt: new Date().toISOString(),
    },
  });

  // Retourner l'URL de téléchargement
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

/**
 * Soumet un feedback utilisateur directement dans Firestore
 */
export async function submitUserFeedback(data: FeedbackData): Promise<string> {
  // Nettoyer les données
  const sanitizedData = sanitizeFeedbackData(data);

  // Créer le document de feedback
  const feedbackDoc = {
    ...sanitizedData,
    // Champs admin (initialisés)
    status: 'new' as FeedbackStatus,
    assignedTo: null,
    adminNotes: null,
    resolution: null,
    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resolvedAt: null,
  };

  try {
    // Sauvegarder directement dans Firestore
    const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), feedbackDoc);
    console.log(`[Feedback] New feedback submitted: ${docRef.id}`);
    return docRef.id;
  } catch (error: unknown) {
    console.error('[Feedback] Failed to submit feedback:', error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('[Feedback] Error message:', error.message);
      console.error('[Feedback] Error stack:', error.stack);
    }
    // Throw with the original error message if available
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.';
    throw new Error(errorMessage);
  }
}

/**
 * Récupère les feedbacks récents pour un utilisateur (optionnel - pour historique)
 */
export async function getUserFeedbacks(email: string, maxResults: number = 10): Promise<UserFeedback[]> {
  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    where('email', '==', email.toLowerCase()),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as UserFeedback[];
}
