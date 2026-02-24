import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { MessageTemplate } from './MessageManager';

// Configuration d'optimisation CPU
const CPU_OPTIMIZED_CONFIG = {
  region: 'europe-west1' as const,
  memory: '256MiB' as const,
  cpu: 0.083 as const,
  timeoutSeconds: 120,
  maxInstances: 3,
  minInstances: 0,
  concurrency: 1
};

// Templates vocaux uniquement (SMS/WhatsApp supprimés)
const defaultTemplates: Omit<MessageTemplate, 'createdAt' | 'updatedAt'>[] = [
  // ====== TEMPLATES VOCAUX ======
  {
    id: 'voice_provider_welcome',
    name: 'Message vocal accueil prestataire',
    type: 'voice',
    language: 'fr',
    content: 'Bonjour, vous allez être mis en relation avec votre client SOS Expat. Veuillez patienter quelques instants.',
    variables: [],
    isActive: true
  },
  {
    id: 'voice_client_welcome',
    name: 'Message vocal accueil client',
    type: 'voice',
    language: 'fr',
    content: 'Bonjour, vous allez être mis en relation avec votre expert SOS Expat. Veuillez patienter quelques instants.',
    variables: [],
    isActive: true
  },
  {
    id: 'voice_call_failure_provider_no_answer',
    name: 'Message vocal échec - prestataire non réponse',
    type: 'voice',
    language: 'fr',
    content: 'Désolé, le prestataire n\'a pas répondu à l\'appel. Vous ne serez pas débité et un remboursement automatique sera effectué.',
    variables: [],
    isActive: true
  },
  {
    id: 'voice_call_failure_client_no_answer',
    name: 'Message vocal échec - client non réponse',
    type: 'voice',
    language: 'fr',
    content: 'Le client n\'a pas répondu à l\'appel. Aucune facturation n\'a été effectuée.',
    variables: [],
    isActive: true
  },
  {
    id: 'voice_call_ending_soon',
    name: 'Message vocal fin d\'appel proche',
    type: 'voice',
    language: 'fr',
    content: 'Attention, votre temps de consultation arrive à sa fin. L\'appel sera terminé dans 2 minutes.',
    variables: [],
    isActive: true
  },

  // ====== TEMPLATES VOCAUX EN ======
  {
    id: 'voice_provider_welcome_en',
    name: 'Voice message provider welcome (EN)',
    type: 'voice',
    language: 'en',
    content: 'Hello, you will be connected to your SOS Expat client. Please wait a moment.',
    variables: [],
    isActive: true
  },
  {
    id: 'voice_client_welcome_en',
    name: 'Voice message client welcome (EN)',
    type: 'voice',
    language: 'en',
    content: 'Hello, you will be connected to your SOS Expat expert. Please wait a moment.',
    variables: [],
    isActive: true
  },

  // ====== TEMPLATES VOCAUX ES ======
  {
    id: 'voice_provider_welcome_es',
    name: 'Mensaje vocal bienvenida proveedor (ES)',
    type: 'voice',
    language: 'es',
    content: 'Hola, será conectado con su cliente de SOS Expat. Por favor espere un momento.',
    variables: [],
    isActive: true
  },
  {
    id: 'voice_client_welcome_es',
    name: 'Mensaje vocal bienvenida cliente (ES)',
    type: 'voice',
    language: 'es',
    content: 'Hola, será conectado con su experto de SOS Expat. Por favor espere un momento.',
    variables: [],
    isActive: true
  }
];

/**
 * Cloud Function pour initialiser les templates de messages vocaux dans Firestore
 */
export const initializeMessageTemplates = onCall(
  CPU_OPTIMIZED_CONFIG,
  async (request) => {
    // Vérifier que l'utilisateur est admin
    if (!request.auth) {
      throw new Error('Authentication required');
    }

    const db = admin.firestore();
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    let created = 0;
    let skipped = 0;

    for (const template of defaultTemplates) {
      const docRef = db.collection('message_templates').doc(template.id);
      const existing = await docRef.get();

      if (!existing.exists) {
        batch.set(docRef, {
          ...template,
          createdAt: now,
          updatedAt: now
        });
        created++;
      } else {
        skipped++;
      }
    }

    await batch.commit();

    return {
      success: true,
      message: `Templates initialized: ${created} created, ${skipped} skipped (already exist)`,
      created,
      skipped
    };
  }
);
