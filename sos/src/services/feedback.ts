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
import dashboardLog from '../utils/dashboardLogger';

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
 * Note: Firestore n'accepte pas les valeurs undefined, donc on les filtre
 */
function sanitizeFeedbackData(data: FeedbackData): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    email: data.email.toLowerCase().trim(),
    type: data.type,
    description: data.description.trim().substring(0, 2000),
    pageUrl: data.pageUrl.substring(0, 500),
    pageName: data.pageName.substring(0, 200),
    device: data.device,
    locale: data.locale,
    userRole: data.userRole,
  };

  // Only add optional fields if they have a value (avoid undefined in Firestore)
  if (data.userId) sanitized.userId = data.userId;
  if (data.userName) sanitized.userName = data.userName.trim().substring(0, 100);
  if (data.priority) sanitized.priority = data.priority;
  if (data.screenshotUrl) sanitized.screenshotUrl = data.screenshotUrl;

  return sanitized;
}

// ==========================================
// FONCTIONS PRINCIPALES
// ==========================================

/**
 * Upload une capture d'écran vers Firebase Storage
 */
export async function uploadFeedbackScreenshot(file: File): Promise<string> {
  console.log('%c📸 [feedback.ts] uploadFeedbackScreenshot() CALLED', 'background: #00BCD4; color: white; padding: 2px 6px; border-radius: 3px;', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });
  dashboardLog.api('uploadFeedbackScreenshot called', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  // Valider le fichier
  if (!file.type.startsWith('image/')) {
    console.error('❌ [feedback.ts] Invalid file type:', file.type);
    dashboardLog.error('Invalid file type', { type: file.type });
    throw new Error('Invalid file type. Only images are allowed.');
  }

  if (file.size > 5 * 1024 * 1024) {
    console.error('❌ [feedback.ts] File too large:', file.size);
    dashboardLog.error('File too large', { size: file.size, maxSize: 5 * 1024 * 1024 });
    throw new Error('File too large. Maximum size is 5MB.');
  }

  // Générer un nom unique
  const fileName = generateScreenshotFileName(file.name);
  const filePath = `${FEEDBACK_STORAGE_PATH}/${fileName}`;
  console.log('📸 [feedback.ts] Upload path:', filePath);
  dashboardLog.api('Uploading to Firebase Storage', { filePath });

  // Upload
  const storageRef = ref(storage, filePath);
  try {
    console.log('📸 [feedback.ts] Starting Firebase Storage upload...');
    await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    });
    console.log('%c✅ [feedback.ts] Storage upload SUCCESS', 'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px;');
    dashboardLog.api('File uploaded to Storage successfully');
  } catch (uploadError) {
    console.error('%c❌ [feedback.ts] Storage upload FAILED', 'background: #f44336; color: white; padding: 2px 6px; border-radius: 3px;', uploadError);
    dashboardLog.error('Firebase Storage upload failed', uploadError);
    throw uploadError;
  }

  // Retourner l'URL de téléchargement
  try {
    console.log('📸 [feedback.ts] Getting download URL...');
    const downloadUrl = await getDownloadURL(storageRef);
    console.log('%c✅ [feedback.ts] Download URL obtained', 'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px;');
    dashboardLog.api('Download URL obtained', { url: downloadUrl.substring(0, 80) + '...' });
    return downloadUrl;
  } catch (urlError) {
    console.error('%c❌ [feedback.ts] Failed to get download URL', 'background: #f44336; color: white; padding: 2px 6px; border-radius: 3px;', urlError);
    dashboardLog.error('Failed to get download URL', urlError);
    throw urlError;
  }
}

/**
 * Soumet un feedback utilisateur directement dans Firestore
 */
export async function submitUserFeedback(data: FeedbackData): Promise<string> {
  // ============= DEBUG LOGS - Firestore Service =============
  console.log('%c🔥 [feedback.ts] submitUserFeedback() CALLED', 'background: #FF5722; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;');
  console.log('%c🔥 [feedback.ts] Input data', 'background: #E64A19; color: white; padding: 2px 6px; border-radius: 3px;', {
    email: data.email,
    type: data.type,
    userRole: data.userRole,
    hasScreenshotUrl: !!data.screenshotUrl,
    pageUrl: data.pageUrl,
    descriptionLength: data.description?.length,
  });

  dashboardLog.group('submitUserFeedback');
  dashboardLog.api('submitUserFeedback called', {
    email: data.email,
    type: data.type,
    userRole: data.userRole,
    hasScreenshotUrl: !!data.screenshotUrl,
    pageUrl: data.pageUrl,
  });

  // Nettoyer les données (retourne un objet sans valeurs undefined)
  console.log('🔥 [feedback.ts] Sanitizing data...');
  dashboardLog.state('Sanitizing feedback data...');
  const sanitizedData = sanitizeFeedbackData(data);
  console.log('%c🔥 [feedback.ts] Data sanitized', 'background: #795548; color: white; padding: 2px 6px; border-radius: 3px;', {
    email: sanitizedData.email,
    type: sanitizedData.type,
    descriptionLength: (sanitizedData.description as string).length,
    hasUserId: !!sanitizedData.userId,
    hasPriority: !!sanitizedData.priority,
  });
  dashboardLog.state('Data sanitized', {
    email: sanitizedData.email as string,
    descriptionLength: (sanitizedData.description as string).length,
  });

  // Créer le document de feedback (sanitizedData n'a pas de valeurs undefined)
  const feedbackDoc: Record<string, unknown> = {
    ...sanitizedData,
    // Champs admin (initialisés) - use null not undefined for Firestore
    status: 'new' as FeedbackStatus,
    assignedTo: null,
    adminNotes: null,
    resolution: null,
    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resolvedAt: null,
  };

  console.log('%c🔥 [feedback.ts] Document prepared for Firestore', 'background: #607D8B; color: white; padding: 2px 6px; border-radius: 3px;', {
    collection: FEEDBACK_COLLECTION,
    status: feedbackDoc.status,
    fieldsCount: Object.keys(feedbackDoc).length,
    fields: Object.keys(feedbackDoc),
  });
  dashboardLog.api('Feedback document prepared', {
    status: feedbackDoc.status,
    collection: FEEDBACK_COLLECTION,
  });

  try {
    // Sauvegarder directement dans Firestore
    console.log('%c🔥 [feedback.ts] Writing to Firestore...', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;', {
      collection: FEEDBACK_COLLECTION,
      timestamp: new Date().toISOString(),
    });
    dashboardLog.api(`Writing to Firestore collection: ${FEEDBACK_COLLECTION}`);
    dashboardLog.time('Firestore addDoc');

    const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), feedbackDoc);

    dashboardLog.timeEnd('Firestore addDoc');
    console.log('%c✅ [feedback.ts] FIRESTORE WRITE SUCCESS', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;', {
      docId: docRef.id,
      path: docRef.path,
      collection: FEEDBACK_COLLECTION,
    });
    dashboardLog.api('Feedback saved to Firestore successfully!', {
      docId: docRef.id,
      path: docRef.path,
    });
    dashboardLog.groupEnd();
    return docRef.id;
  } catch (error: unknown) {
    // ============= DETAILED ERROR LOGGING FOR FIRESTORE =============
    console.error('%c❌ [feedback.ts] FIRESTORE WRITE FAILED', 'background: #f44336; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 14px;');
    console.error('❌ [feedback.ts] Raw error object:', error);
    dashboardLog.error('FIRESTORE WRITE FAILED', error);

    // Log more details for debugging
    if (error instanceof Error) {
      const errorCode = (error as { code?: string }).code;

      console.error('%c❌ [feedback.ts] Error details', 'background: #D32F2F; color: white; padding: 2px 6px; border-radius: 3px;', {
        name: error.name,
        message: error.message,
        code: errorCode,
        stack: error.stack?.substring(0, 300),
      });
      dashboardLog.error('Error details', {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500),
      });

      // Check for common Firestore errors
      if (errorCode === 'permission-denied' || error.message.includes('permission-denied') || error.message.includes('PERMISSION_DENIED')) {
        console.error('%c🔒 [feedback.ts] PERMISSION DENIED - Firestore security rules blocking write', 'background: #f44336; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;');
        console.error('🔒 [feedback.ts] ============ DEBUGGING CHECKLIST ============');
        console.error('🔒 1. Are Firestore rules deployed? Run: firebase deploy --only firestore:rules');
        console.error('🔒 2. Does the collection "user_feedback" allow writes in firestore.rules?');
        console.error('🔒 3. Is email format valid? Email:', sanitizedData.email);
        console.error('🔒 4. Is description size OK? Size:', (sanitizedData.description as string).length, 'bytes');
        console.error('🔒 5. Check Firebase Console > Firestore > Rules for the exact rule blocking');
        console.error('🔒 =============================================');
        dashboardLog.error('PERMISSION DENIED - Check Firestore security rules for collection:', FEEDBACK_COLLECTION);
      }

      if (errorCode === 'unavailable' || error.message.includes('unavailable')) {
        console.error('%c🌐 [feedback.ts] FIRESTORE UNAVAILABLE', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;');
        console.error('🌐 Network issue or Firestore service down');
        dashboardLog.error('FIRESTORE UNAVAILABLE - Network issue or service down');
      }

      if (errorCode === 'invalid-argument' || error.message.includes('invalid')) {
        console.error('%c⚠️ [feedback.ts] INVALID ARGUMENT', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;');
        console.error('⚠️ Document contains invalid data. Check for undefined/NaN values.');
        console.error('⚠️ Document being written:', JSON.stringify(feedbackDoc, null, 2));
      }
    }

    // Log the data that failed to save
    console.error('❌ [feedback.ts] Data that FAILED to save:', {
      email: sanitizedData.email,
      type: sanitizedData.type,
      descriptionPreview: (sanitizedData.description as string).substring(0, 50) + '...',
      pageUrl: sanitizedData.pageUrl,
    });

    dashboardLog.groupEnd();
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
