/**
 * Système d'Audit Trail GDPR
 *
 * Enregistre tous les accès et modifications aux données personnelles
 * pour assurer la conformité GDPR :
 * - Accès aux données utilisateur
 * - Modifications de profil
 * - Exports de données
 * - Suppressions de compte
 * - Accès admin aux données sensibles
 *
 * Rétention : 3 ans (obligation légale GDPR)
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { makeStripeClient } from '../StripeManager';
import { getStripeSecretKey } from '../lib/stripe';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Traductions pour les messages GDPR
const GDPR_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    exportAlreadyExists: "Une demande d'export est déjà en cours",
    exportSuccess: "Votre demande d'export a été enregistrée. Vous recevrez un email dans les 30 jours.",
    deletionAlreadyExists: "Une demande de suppression est déjà en cours",
    deletionSuccessLegal: "Votre demande a été enregistrée. Certaines données seront conservées pour obligations légales (factures: 10 ans).",
    deletionSuccess: "Votre demande de suppression a été enregistrée. Elle sera traitée dans les 30 jours.",
    consentUpdated: "Vos préférences de consentement ont été mises à jour"
  },
  en: {
    exportAlreadyExists: "An export request is already in progress",
    exportSuccess: "Your export request has been registered. You will receive an email within 30 days.",
    deletionAlreadyExists: "A deletion request is already in progress",
    deletionSuccessLegal: "Your request has been registered. Some data will be retained for legal obligations (invoices: 10 years).",
    deletionSuccess: "Your deletion request has been registered. It will be processed within 30 days.",
    consentUpdated: "Your consent preferences have been updated"
  },
  es: {
    exportAlreadyExists: "Ya hay una solicitud de exportación en curso",
    exportSuccess: "Su solicitud de exportación ha sido registrada. Recibirá un correo electrónico en 30 días.",
    deletionAlreadyExists: "Ya hay una solicitud de eliminación en curso",
    deletionSuccessLegal: "Su solicitud ha sido registrada. Algunos datos se conservarán por obligaciones legales (facturas: 10 años).",
    deletionSuccess: "Su solicitud de eliminación ha sido registrada. Se procesará en 30 días.",
    consentUpdated: "Sus preferencias de consentimiento han sido actualizadas"
  },
  de: {
    exportAlreadyExists: "Eine Exportanfrage läuft bereits",
    exportSuccess: "Ihre Exportanfrage wurde registriert. Sie erhalten innerhalb von 30 Tagen eine E-Mail.",
    deletionAlreadyExists: "Eine Löschanfrage läuft bereits",
    deletionSuccessLegal: "Ihre Anfrage wurde registriert. Einige Daten werden aus rechtlichen Gründen aufbewahrt (Rechnungen: 10 Jahre).",
    deletionSuccess: "Ihre Löschanfrage wurde registriert. Sie wird innerhalb von 30 Tagen bearbeitet.",
    consentUpdated: "Ihre Einwilligungseinstellungen wurden aktualisiert"
  },
  pt: {
    exportAlreadyExists: "Uma solicitação de exportação já está em andamento",
    exportSuccess: "Sua solicitação de exportação foi registrada. Você receberá um e-mail em 30 dias.",
    deletionAlreadyExists: "Uma solicitação de exclusão já está em andamento",
    deletionSuccessLegal: "Sua solicitação foi registrada. Alguns dados serão mantidos por obrigações legais (faturas: 10 anos).",
    deletionSuccess: "Sua solicitação de exclusão foi registrada. Será processada em 30 dias.",
    consentUpdated: "Suas preferências de consentimento foram atualizadas"
  },
  ru: {
    exportAlreadyExists: "Запрос на экспорт уже в обработке",
    exportSuccess: "Ваш запрос на экспорт зарегистрирован. Вы получите письмо в течение 30 дней.",
    deletionAlreadyExists: "Запрос на удаление уже в обработке",
    deletionSuccessLegal: "Ваш запрос зарегистрирован. Некоторые данные будут сохранены по закону (счета: 10 лет).",
    deletionSuccess: "Ваш запрос на удаление зарегистрирован. Он будет обработан в течение 30 дней.",
    consentUpdated: "Ваши настройки согласия обновлены"
  },
  hi: {
    exportAlreadyExists: "एक निर्यात अनुरोध पहले से प्रगति पर है",
    exportSuccess: "आपका निर्यात अनुरोध पंजीकृत हो गया है। आपको 30 दिनों में ईमेल प्राप्त होगी।",
    deletionAlreadyExists: "एक हटाने का अनुरोध पहले से प्रगति पर है",
    deletionSuccessLegal: "आपका अनुरोध पंजीकृत हो गया है। कानूनी दायित्वों के लिए कुछ डेटा रखा जाएगा (चालान: 10 वर्ष)।",
    deletionSuccess: "आपका हटाने का अनुरोध पंजीकृत हो गया है। यह 30 दिनों में संसाधित किया जाएगा।",
    consentUpdated: "आपकी सहमति प्राथमिकताएं अपडेट हो गई हैं"
  },
  ar: {
    exportAlreadyExists: "طلب تصدير قيد التقدم بالفعل",
    exportSuccess: "تم تسجيل طلب التصدير الخاص بك. ستتلقى بريدًا إلكترونيًا خلال 30 يومًا.",
    deletionAlreadyExists: "طلب حذف قيد التقدم بالفعل",
    deletionSuccessLegal: "تم تسجيل طلبك. سيتم الاحتفاظ ببعض البيانات للالتزامات القانونية (الفواتير: 10 سنوات).",
    deletionSuccess: "تم تسجيل طلب الحذف الخاص بك. ستتم معالجته خلال 30 يومًا.",
    consentUpdated: "تم تحديث تفضيلات الموافقة الخاصة بك"
  },
  zh: {
    exportAlreadyExists: "导出请求已在进行中",
    exportSuccess: "您的导出请求已登记。您将在30天内收到电子邮件。",
    deletionAlreadyExists: "删除请求已在进行中",
    deletionSuccessLegal: "您的请求已登记。部分数据将因法律义务保留（发票：10年）。",
    deletionSuccess: "您的删除请求已登记。将在30天内处理。",
    consentUpdated: "您的同意偏好已更新"
  }
};

function getTranslation(key: string, language: string = 'fr'): string {
  const lang = GDPR_TRANSLATIONS[language] || GDPR_TRANSLATIONS['fr'];
  return lang[key] || GDPR_TRANSLATIONS['fr'][key] || key;
}

const CONFIG = {
  // Collection pour l'audit trail
  AUDIT_COLLECTION: 'gdpr_audit_logs',
  // Durée de rétention (3 ans en ms)
  RETENTION_MS: 3 * 365 * 24 * 60 * 60 * 1000,
  // Types d'événements à auditer
  AUDIT_EVENT_TYPES: [
    'DATA_ACCESS',
    'DATA_MODIFICATION',
    'DATA_DELETION',
    'DATA_EXPORT',
    'CONSENT_UPDATE',
    'PROFILE_VIEW',
    'ADMIN_ACCESS',
    'LOGIN',
    'LOGOUT',
    'PASSWORD_CHANGE',
    'EMAIL_CHANGE',
    'PHONE_CHANGE',
    'ACCOUNT_CREATION',
    'ACCOUNT_DELETION'
  ] as const
};

// ============================================================================
// TYPES
// ============================================================================

type AuditEventType = typeof CONFIG.AUDIT_EVENT_TYPES[number];

interface AuditLogEntry {
  id: string;
  timestamp: FirebaseFirestore.Timestamp;
  eventType: AuditEventType;
  actorId: string; // UID de l'utilisateur qui effectue l'action
  actorType: 'user' | 'admin' | 'system' | 'api';
  targetUserId?: string; // UID de l'utilisateur concerné (si différent)
  resourceType: string; // Type de ressource accédée
  resourceId?: string; // ID de la ressource
  action: string; // Description de l'action
  dataFields?: string[]; // Champs de données accédés/modifiés
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

interface GDPRDataRequest {
  id: string;
  userId: string;
  requestType: 'export' | 'deletion' | 'rectification' | 'access';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: FirebaseFirestore.Timestamp;
  processedAt?: FirebaseFirestore.Timestamp;
  processedBy?: string;
  notes?: string;
  downloadUrl?: string; // Pour les exports
  expiresAt?: FirebaseFirestore.Timestamp; // Expiration du lien de download
}

// ============================================================================
// AUDIT LOGGING FUNCTIONS
// ============================================================================

/**
 * Enregistre un événement dans l'audit trail
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  actorId: string,
  actorType: 'user' | 'admin' | 'system' | 'api',
  resourceType: string,
  action: string,
  options: {
    targetUserId?: string;
    resourceId?: string;
    dataFields?: string[];
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<string> {
  const db = admin.firestore();
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const entry: AuditLogEntry = {
    id: auditId,
    timestamp: admin.firestore.Timestamp.now(),
    eventType,
    actorId,
    actorType,
    resourceType,
    action,
    targetUserId: options.targetUserId,
    resourceId: options.resourceId,
    dataFields: options.dataFields,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    success: options.success ?? true,
    errorMessage: options.errorMessage,
    metadata: options.metadata
  };

  await db.collection(CONFIG.AUDIT_COLLECTION).doc(auditId).set(entry);

  return auditId;
}

/**
 * Log l'accès aux données personnelles
 */
export async function logDataAccess(
  actorId: string,
  actorType: 'user' | 'admin' | 'system',
  targetUserId: string,
  dataFields: string[],
  context?: { ipAddress?: string; userAgent?: string }
): Promise<string> {
  return logAuditEvent(
    'DATA_ACCESS',
    actorId,
    actorType,
    'user_data',
    `Accessed personal data fields: ${dataFields.join(', ')}`,
    {
      targetUserId,
      dataFields,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent
    }
  );
}

/**
 * Log la modification de données personnelles
 */
export async function logDataModification(
  actorId: string,
  actorType: 'user' | 'admin',
  targetUserId: string,
  resourceType: string,
  modifiedFields: string[],
  context?: { ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> }
): Promise<string> {
  return logAuditEvent(
    'DATA_MODIFICATION',
    actorId,
    actorType,
    resourceType,
    `Modified data fields: ${modifiedFields.join(', ')}`,
    {
      targetUserId,
      dataFields: modifiedFields,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: context?.metadata
    }
  );
}

/**
 * Log l'export de données (droit à la portabilité)
 */
export async function logDataExport(
  userId: string,
  exportType: 'full' | 'partial',
  dataTypes: string[]
): Promise<string> {
  return logAuditEvent(
    'DATA_EXPORT',
    userId,
    'user',
    'user_data',
    `Exported ${exportType} data: ${dataTypes.join(', ')}`,
    {
      targetUserId: userId,
      dataFields: dataTypes,
      metadata: { exportType }
    }
  );
}

/**
 * Log la suppression de compte (droit à l'oubli)
 */
export async function logAccountDeletion(
  actorId: string,
  actorType: 'user' | 'admin',
  targetUserId: string,
  reason?: string
): Promise<string> {
  return logAuditEvent(
    'ACCOUNT_DELETION',
    actorId,
    actorType,
    'user_account',
    `Account deletion requested${reason ? `: ${reason}` : ''}`,
    {
      targetUserId,
      metadata: { reason, deletionType: actorId === targetUserId ? 'self' : 'admin' }
    }
  );
}

// ============================================================================
// GDPR DATA REQUEST MANAGEMENT
// ============================================================================

/**
 * Crée une demande GDPR (export, suppression, etc.)
 */
export async function createGDPRRequest(
  userId: string,
  requestType: GDPRDataRequest['requestType'],
  notes?: string
): Promise<string> {
  const db = admin.firestore();
  const requestId = `gdpr_${requestType}_${Date.now()}`;

  const request: GDPRDataRequest = {
    id: requestId,
    userId,
    requestType,
    status: 'pending',
    createdAt: admin.firestore.Timestamp.now(),
    notes
  };

  await db.collection('gdpr_requests').doc(requestId).set(request);

  // Log dans l'audit trail
  await logAuditEvent(
    'DATA_ACCESS',
    userId,
    'user',
    'gdpr_request',
    `Created GDPR ${requestType} request`,
    {
      targetUserId: userId,
      resourceId: requestId,
      metadata: { requestType }
    }
  );

  return requestId;
}

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Utilisateur demande l'export de ses données (Article 20 GDPR)
 */
export const requestDataExport = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = context.auth.uid;
    const { language = 'fr' } = (data || {}) as { language?: string };
    const db = admin.firestore();

    try {
      // Vérifier si une demande est déjà en cours
      const existingRequest = await db.collection('gdpr_requests')
        .where('userId', '==', userId)
        .where('requestType', '==', 'export')
        .where('status', 'in', ['pending', 'processing'])
        .limit(1)
        .get();

      if (!existingRequest.empty) {
        throw new functions.https.HttpsError(
          'already-exists',
          getTranslation('exportAlreadyExists', language)
        );
      }

      const requestId = await createGDPRRequest(userId, 'export');

      return {
        success: true,
        requestId,
        message: getTranslation('exportSuccess', language)
      };

    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) throw error;
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[GDPR] Export request failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Utilisateur demande la suppression de son compte (Article 17 GDPR)
 */
export const requestAccountDeletion = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = context.auth.uid;
    const { reason, language = 'fr' } = data as { reason?: string; language?: string };
    const db = admin.firestore();

    try {
      // Vérifier si une demande est déjà en cours
      const existingRequest = await db.collection('gdpr_requests')
        .where('userId', '==', userId)
        .where('requestType', '==', 'deletion')
        .where('status', 'in', ['pending', 'processing'])
        .limit(1)
        .get();

      if (!existingRequest.empty) {
        throw new functions.https.HttpsError(
          'already-exists',
          getTranslation('deletionAlreadyExists', language)
        );
      }

      // Vérifier s'il y a des obligations légales empêchant la suppression
      const invoices = await db.collection('invoices')
        .where('userId', '==', userId)
        .where('status', '==', 'paid')
        .limit(1)
        .get();

      const hasLegalRetentionData = !invoices.empty;

      const requestId = await createGDPRRequest(
        userId,
        'deletion',
        `Reason: ${reason || 'Not specified'}. Legal retention: ${hasLegalRetentionData}`
      );

      await logAccountDeletion(userId, 'user', userId, reason);

      return {
        success: true,
        requestId,
        hasLegalRetention: hasLegalRetentionData,
        message: hasLegalRetentionData
          ? getTranslation('deletionSuccessLegal', language)
          : getTranslation('deletionSuccess', language)
      };

    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) throw error;
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[GDPR] Deletion request failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Utilisateur consulte l'historique d'accès à ses données (Article 15 GDPR)
 */
export const getMyDataAccessHistory = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = context.auth.uid;
    const { limit: queryLimit = 50 } = data as { limit?: number };
    const db = admin.firestore();

    try {
      // Log cette consultation
      await logDataAccess(userId, 'user', userId, ['audit_logs'], {});

      const auditLogs = await db.collection(CONFIG.AUDIT_COLLECTION)
        .where('targetUserId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(Math.min(queryLimit, 100))
        .get();

      return {
        logs: auditLogs.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            timestamp: data.timestamp?.toDate?.()?.toISOString(),
            eventType: data.eventType,
            actorType: data.actorType,
            action: data.action,
            dataFields: data.dataFields,
            success: data.success
          };
        }),
        total: auditLogs.size
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[GDPR] Get access history failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Utilisateur met à jour ses préférences de consentement
 */
export const updateConsentPreferences = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userId = context.auth.uid;
    const { consents, language = 'fr' } = data as {
      consents: {
        marketing?: boolean;
        analytics?: boolean;
        thirdParty?: boolean;
      };
      language?: string;
    };

    const db = admin.firestore();

    try {
      const consentData = {
        ...consents,
        updatedAt: admin.firestore.Timestamp.now(),
        version: '2.0' // Version des CGU/politique de confidentialité
      };

      await db.collection('users').doc(userId).update({
        'preferences.consents': consentData
      });

      // Log le changement de consentement
      await logAuditEvent(
        'CONSENT_UPDATE',
        userId,
        'user',
        'consent_preferences',
        `Updated consent preferences: ${JSON.stringify(consents)}`,
        {
          targetUserId: userId,
          metadata: consents
        }
      );

      return {
        success: true,
        message: getTranslation('consentUpdated', language)
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[GDPR] Update consent failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Admin: Liste les demandes GDPR en attente
 */
export const listGDPRRequests = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { status = 'pending', limit: queryLimit = 50 } = data as {
      status?: string;
      limit?: number;
    };

    try {
      let query: FirebaseFirestore.Query = admin.firestore().collection('gdpr_requests');

      if (status !== 'all') {
        query = query.where('status', '==', status);
      }

      const requests = await query
        .orderBy('createdAt', 'desc')
        .limit(queryLimit)
        .get();

      // Log l'accès admin
      await logAuditEvent(
        'ADMIN_ACCESS',
        context.auth.uid,
        'admin',
        'gdpr_requests',
        `Listed ${requests.size} GDPR requests`,
        {}
      );

      return {
        requests: requests.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
          processedAt: doc.data().processedAt?.toDate?.()?.toISOString()
        }))
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Admin: Traite une demande GDPR
 */
export const processGDPRRequest = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { requestId, action, notes } = data as {
      requestId: string;
      action: 'approve' | 'reject';
      notes?: string;
    };

    const db = admin.firestore();

    try {
      const requestDoc = await db.collection('gdpr_requests').doc(requestId).get();

      if (!requestDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Request not found');
      }

      const request = requestDoc.data() as GDPRDataRequest;

      if (request.status !== 'pending') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Request already processed'
        );
      }

      if (action === 'reject') {
        await requestDoc.ref.update({
          status: 'rejected',
          processedAt: admin.firestore.Timestamp.now(),
          processedBy: context.auth.uid,
          notes
        });

        await logAuditEvent(
          'ADMIN_ACCESS',
          context.auth.uid,
          'admin',
          'gdpr_request',
          `Rejected GDPR ${request.requestType} request`,
          {
            targetUserId: request.userId,
            resourceId: requestId,
            metadata: { action: 'reject', notes }
          }
        );

        return { success: true, message: 'Request rejected' };
      }

      // Traiter la demande selon le type
      await requestDoc.ref.update({ status: 'processing' });

      if (request.requestType === 'export') {
        // Collecter toutes les données de l'utilisateur
        const exportData = await collectUserData(request.userId);

        // Sauvegarder dans Storage
        const storage = admin.storage().bucket();
        const exportPath = `gdpr_exports/${request.userId}/${requestId}.json`;
        const file = storage.file(exportPath);

        await file.save(JSON.stringify(exportData, null, 2), {
          metadata: { contentType: 'application/json' }
        });

        // Générer URL signée (valide 7 jours)
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000
        });

        await requestDoc.ref.update({
          status: 'completed',
          processedAt: admin.firestore.Timestamp.now(),
          processedBy: context.auth.uid,
          downloadUrl: signedUrl,
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          ),
          notes
        });

        await logDataExport(request.userId, 'full', Object.keys(exportData));

      } else if (request.requestType === 'deletion') {
        // Anonymiser/supprimer les données utilisateur
        await anonymizeUserData(request.userId);

        await requestDoc.ref.update({
          status: 'completed',
          processedAt: admin.firestore.Timestamp.now(),
          processedBy: context.auth.uid,
          notes
        });

        await logAccountDeletion(context.auth.uid, 'admin', request.userId, notes);
      }

      await logAuditEvent(
        'ADMIN_ACCESS',
        context.auth.uid,
        'admin',
        'gdpr_request',
        `Processed GDPR ${request.requestType} request`,
        {
          targetUserId: request.userId,
          resourceId: requestId,
          metadata: { action: 'approve' }
        }
      );

      return {
        success: true,
        message: `GDPR ${request.requestType} request processed successfully`
      };

    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) throw error;
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[GDPR] Process request failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Admin: Consulte l'audit trail d'un utilisateur
 */
export const getUserAuditTrail = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, limit: queryLimit = 100 } = data as { userId: string; limit?: number };

    try {
      // Log l'accès admin à l'audit trail
      await logAuditEvent(
        'ADMIN_ACCESS',
        context.auth.uid,
        'admin',
        'audit_trail',
        `Viewed audit trail for user ${userId}`,
        { targetUserId: userId }
      );

      const auditLogs = await admin.firestore()
        .collection(CONFIG.AUDIT_COLLECTION)
        .where('targetUserId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(queryLimit)
        .get();

      return {
        logs: auditLogs.docs.map(doc => ({
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString()
        })),
        total: auditLogs.size
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Collecte toutes les données d'un utilisateur pour l'export
 */
async function collectUserData(userId: string): Promise<Record<string, unknown>> {
  const db = admin.firestore();

  const [
    userDoc,
    sessions,
    payments,
    invoices,
    reviews,
    messages,
    // Chatter-specific collections
    chatterDoc,
    chatterCommissions,
    chatterWithdrawals,
    chatterNotifications,
    chatterQuizAttempts,
    chatterCallCounts,
    chatterSocialLikes
  ] = await Promise.all([
    db.collection('users').doc(userId).get(),
    db.collection('call_sessions')
      .where('metadata.clientId', '==', userId)
      .get(),
    db.collection('payments')
      .where('userId', '==', userId)
      .get(),
    db.collection('invoices')
      .where('userId', '==', userId)
      .get(),
    db.collection('reviews')
      .where('userId', '==', userId)
      .get(),
    db.collection('messages')
      .where('participants', 'array-contains', userId)
      .get(),
    // Chatter data
    db.collection('chatters').doc(userId).get(),
    db.collection('chatter_commissions')
      .where('chatterId', '==', userId)
      .get(),
    db.collection('chatter_withdrawals')
      .where('chatterId', '==', userId)
      .get(),
    db.collection('chatter_notifications')
      .where('chatterId', '==', userId)
      .get(),
    db.collection('chatter_quiz_attempts')
      .where('chatterId', '==', userId)
      .get(),
    db.collection('chatter_call_counts').doc(userId).get(),
    db.collection('chatter_social_likes')
      .where('chatterId', '==', userId)
      .get()
  ]);

  return {
    exportedAt: new Date().toISOString(),
    userId,
    profile: userDoc.exists ? sanitizeForExport(userDoc.data()) : null,
    callSessions: sessions.docs.map(d => sanitizeForExport(d.data())),
    payments: payments.docs.map(d => sanitizeForExport(d.data())),
    invoices: invoices.docs.map(d => sanitizeForExport(d.data())),
    reviews: reviews.docs.map(d => sanitizeForExport(d.data())),
    messages: messages.docs.map(d => sanitizeForExport(d.data())),
    // Chatter data
    chatterProfile: chatterDoc.exists ? sanitizeForExport(chatterDoc.data()) : null,
    chatterCommissions: chatterCommissions.docs.map(d => sanitizeForExport(d.data())),
    chatterWithdrawals: chatterWithdrawals.docs.map(d => sanitizeForExport(d.data())),
    chatterNotifications: chatterNotifications.docs.map(d => sanitizeForExport(d.data())),
    chatterQuizAttempts: chatterQuizAttempts.docs.map(d => sanitizeForExport(d.data())),
    chatterCallCounts: chatterCallCounts.exists ? sanitizeForExport(chatterCallCounts.data()) : null,
    chatterSocialLikes: chatterSocialLikes.docs.map(d => sanitizeForExport(d.data()))
  };
}

/**
 * Anonymise les données d'un utilisateur (droit à l'oubli)
 */
async function anonymizeUserData(userId: string): Promise<void> {
  const db = admin.firestore();
  const batch = db.batch();

  // Récupérer les stripeCustomerId AVANT de les anonymiser
  const userRef = db.collection('users').doc(userId);
  const userSnapshot = await userRef.get();
  const userData = userSnapshot.data();
  const userStripeCustomerId = userData?.stripeCustomerId as string | undefined;

  // Vérifier aussi si le user a un customer Stripe pour les subscriptions (providers)
  const subscriptionRef = db.collection('subscriptions').doc(userId);
  const subscriptionSnapshot = await subscriptionRef.get();
  const subscriptionData = subscriptionSnapshot.data();
  const subscriptionStripeCustomerId = subscriptionData?.stripeCustomerId as string | undefined;

  // Anonymiser le profil utilisateur
  batch.update(userRef, {
    email: `deleted_${userId}@anonymized.local`,
    displayName: 'Utilisateur supprimé',
    phoneNumber: null,
    photoURL: null,
    address: null,
    'preferences.consents': null,
    stripeCustomerId: null, // Supprimer la référence
    deletedAt: admin.firestore.Timestamp.now(),
    isDeleted: true
  });

  // Anonymiser le profil Chatter si existant
  const chatterRef = db.collection('chatters').doc(userId);
  const chatterDoc = await chatterRef.get();
  if (chatterDoc.exists) {
    batch.update(chatterRef, {
      email: `deleted_${userId}@anonymized.local`,
      firstName: 'Supprimé',
      lastName: 'Supprimé',
      phone: null,
      bio: null,
      photoUrl: null,
      paymentDetails: null,
      status: 'deleted',
      deletedAt: admin.firestore.Timestamp.now(),
      isDeleted: true
    });
  }

  // Supprimer les notifications Chatter (non nécessaires légalement)
  const notificationsQuery = await db.collection('chatter_notifications')
    .where('chatterId', '==', userId)
    .get();
  notificationsQuery.docs.forEach(doc => batch.delete(doc.ref));

  // Supprimer les IP registry (données sensibles)
  const ipRegistryQuery = await db.collection('chatter_ip_registry')
    .where('chatterId', '==', userId)
    .get();
  ipRegistryQuery.docs.forEach(doc => batch.delete(doc.ref));

  // Anonymiser/supprimer le document subscription si existant
  if (subscriptionSnapshot.exists) {
    // Supprimer la référence au customer Stripe mais conserver l'historique de facturation
    batch.update(subscriptionRef, {
      stripeCustomerId: null,
      deletedAt: admin.firestore.Timestamp.now(),
      isDeleted: true
    });
  }

  // Note: Les commissions et retraits sont conservés (obligation comptable)
  // mais les données personnelles dans chatters sont anonymisées

  await batch.commit();

  // RGPD Art. 17: Supprimer les customers Stripe avec toutes leurs données personnelles
  const customersToDelete = [userStripeCustomerId, subscriptionStripeCustomerId].filter(Boolean) as string[];

  for (const customerId of customersToDelete) {
    try {
      await deleteStripeCustomer(customerId);
      logger.info(`[GDPR] Stripe customer deleted: ${customerId.substring(0, 12)}...`);
    } catch (stripeError) {
      logger.error(`[GDPR] Failed to delete Stripe customer ${customerId}:`, stripeError);
      // On continue quand même pour ne pas bloquer la suppression du compte
    }
  }

  // Supprimer le compte Firebase Auth
  try {
    await admin.auth().deleteUser(userId);
  } catch (authError) {
    logger.warn(`[GDPR] Could not delete auth user ${userId}:`, authError);
  }
}

/**
 * Supprime un customer Stripe (RGPD Art. 17 - Droit à l'effacement)
 * @param stripeCustomerId - L'ID du customer Stripe (cus_xxx)
 */
async function deleteStripeCustomer(stripeCustomerId: string): Promise<void> {
  try {
    // Récupérer la clé Stripe appropriée
    const stripeSecretKey = getStripeSecretKey();
    const stripe = makeStripeClient(stripeSecretKey);

    // Supprimer le customer Stripe - Cela supprime:
    // - Les données personnelles (nom, email, téléphone, adresse)
    // - Les méthodes de paiement attachées
    // - Les abonnements actifs (annulés automatiquement)
    // - Les sources de paiement
    // Note: Les PaymentIntents et Charges historiques sont conservés chez Stripe
    // pour obligations légales/comptables mais ne contiennent plus de référence au customer
    await stripe.customers.del(stripeCustomerId);

    logger.info(`[GDPR] Stripe customer successfully deleted: ${stripeCustomerId}`);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`[GDPR] Failed to delete Stripe customer ${stripeCustomerId}:`, {
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
}

/**
 * Nettoie les données sensibles pour l'export
 */
function sanitizeForExport(data: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!data) return null;

  const sanitized = { ...data };

  // Supprimer les champs internes/techniques
  delete sanitized.stripeCustomerId;
  delete sanitized.stripeAccountId;
  delete sanitized.fcmTokens;
  delete sanitized.internalNotes;

  // Convertir les Timestamps
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object' && 'toDate' in value) {
      sanitized[key] = (value as FirebaseFirestore.Timestamp).toDate().toISOString();
    }
  }

  return sanitized;
}
