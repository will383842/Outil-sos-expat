/**
 * =============================================================================
 * SERVICE FIRESTORE POUR LES SETTINGS IA
 * =============================================================================
 * 
 * Ce service connecte le frontend (admin) au backend (Cloud Functions)
 * via Firestore. Les settings modifiés ici sont lus par ai.ts
 * 
 * Collection : settings/ai
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// =============================================================================
// TYPES
// =============================================================================

export interface AISettings {
  // Activation
  enabled: boolean;
  replyOnBookingCreated: boolean;
  replyOnUserMessage: boolean;
  
  // Modèles
  model: string;
  perplexityModel: string;
  
  // Paramètres
  temperature: number;
  maxOutputTokens: number;
  perplexityTemperature: number;
  usePerplexityForFactual: boolean;
  
  // Prompts personnalisables (modifiables depuis l'admin)
  lawyerSystemPrompt: string;
  expertSystemPrompt: string;
  
  // Métadonnées
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface GPTPrompt {
  id: string;
  name: string;
  expertRole: 'avocat' | 'expatrie';
  countries: string[];
  problemTypes: string[];
  prompt: string;
  tone: 'formal' | 'empathetic' | 'professional';
  model: string;
  temperature: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastUsed?: Timestamp;
  usageCount: number;
}

// =============================================================================
// VALEURS PAR DÉFAUT
// =============================================================================

const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,
  replyOnBookingCreated: true,
  replyOnUserMessage: true,
  model: 'gpt-4o',
  perplexityModel: 'sonar-pro',
  temperature: 0.7,
  maxOutputTokens: 2000,
  perplexityTemperature: 0.3,
  usePerplexityForFactual: true,
  lawyerSystemPrompt: '',  // Vide = utilise le prompt par défaut dans ai.ts
  expertSystemPrompt: '',   // Vide = utilise le prompt par défaut dans ai.ts
};

const DEFAULT_LAWYER_PROMPT = `Tu es un conseiller juridique senior spécialisé dans le droit international des expatriés.

CONTEXTE : Tu assistes un AVOCAT en temps réel pendant son appel avec un client expatrié.
Le CLIENT EST EN URGENCE et attend une RÉPONSE IMMÉDIATE.

RÈGLES :
1. RÉPONSE DIRECTE en premier (oui/non/montant/délai)
2. DÉTAILS PRÉCIS ensuite (chiffres, lois, procédures)
3. NE RÉPÈTE JAMAIS les conseils déjà donnés
4. Si info incertaine → dis "À vérifier auprès de [source]"

DOMAINES : Immigration, Droit pénal, Fiscal, Famille, Successions, Immobilier, Travail

Réponds TOUJOURS en français, de manière claire et directement utilisable.`;

const DEFAULT_EXPERT_PROMPT = `Tu es un assistant expert pour les expatriés, spécialisé dans l'accompagnement pratique.

CONTEXTE : Tu assistes un EXPERT EXPATRIÉ pendant son appel avec un client.
Le client veut une SOLUTION PRATIQUE IMMÉDIATE.

RÈGLES :
1. Réponds directement à la question
2. Donne des conseils pratiques avec exemples concrets
3. Pour les questions juridiques complexes → recommande l'avocat de la plateforme
4. Si info non vérifiée → "Je recommande de vérifier auprès de [source]"

DOMAINES : Installation, Démarches admin, Vie quotidienne, Travail, Budget, Communauté française

Réponds TOUJOURS en français, de manière claire et pratique.`;

// =============================================================================
// FONCTIONS CRUD
// =============================================================================

/**
 * Récupère les settings IA depuis Firestore
 */
export async function getAISettings(): Promise<AISettings> {
  try {
    const docRef = doc(db, 'settings', 'ai');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<AISettings>;
      return { ...DEFAULT_AI_SETTINGS, ...data };
    }
    
    // Si le document n'existe pas, le créer avec les valeurs par défaut
    await setDoc(docRef, {
      ...DEFAULT_AI_SETTINGS,
      updatedAt: serverTimestamp()
    });
    
    return DEFAULT_AI_SETTINGS;
  } catch (error) {
    console.error('[aiSettingsService] Erreur getAISettings:', error);
    return DEFAULT_AI_SETTINGS;
  }
}

/**
 * Sauvegarde les settings IA dans Firestore
 */
export async function saveAISettings(
  settings: Partial<AISettings>, 
  userId?: string
): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'ai');
    
    await updateDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: userId || 'admin'
    });
    
    console.log('[aiSettingsService] Settings sauvegardés:', Object.keys(settings));
    return true;
  } catch (error: any) {
    // Si le document n'existe pas, le créer
    if (error.code === 'not-found') {
      const docRef = doc(db, 'settings', 'ai');
      await setDoc(docRef, {
        ...DEFAULT_AI_SETTINGS,
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: userId || 'admin'
      });
      return true;
    }
    
    console.error('[aiSettingsService] Erreur saveAISettings:', error);
    return false;
  }
}

/**
 * Met à jour uniquement les prompts
 */
export async function updatePrompts(
  lawyerPrompt: string,
  expertPrompt: string,
  userId?: string
): Promise<boolean> {
  return saveAISettings({
    lawyerSystemPrompt: lawyerPrompt,
    expertSystemPrompt: expertPrompt
  }, userId);
}

/**
 * Écoute les changements en temps réel
 */
export function subscribeToAISettings(
  callback: (settings: AISettings) => void
): () => void {
  const docRef = doc(db, 'settings', 'ai');
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<AISettings>;
      callback({ ...DEFAULT_AI_SETTINGS, ...data });
    } else {
      callback(DEFAULT_AI_SETTINGS);
    }
  }, (error) => {
    console.error('[aiSettingsService] Erreur subscription:', error);
  });
  
  return unsubscribe;
}

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Retourne le prompt par défaut pour avocat
 */
export function getDefaultLawyerPrompt(): string {
  return DEFAULT_LAWYER_PROMPT;
}

/**
 * Retourne le prompt par défaut pour expert
 */
export function getDefaultExpertPrompt(): string {
  return DEFAULT_EXPERT_PROMPT;
}

/**
 * Vérifie si un prompt est personnalisé ou par défaut
 */
export function isCustomPrompt(prompt: string, type: 'lawyer' | 'expert'): boolean {
  if (!prompt || prompt.trim() === '') return false;
  
  const defaultPrompt = type === 'lawyer' ? DEFAULT_LAWYER_PROMPT : DEFAULT_EXPERT_PROMPT;
  return prompt.trim() !== defaultPrompt.trim();
}

/**
 * Teste la connexion à Firestore
 */
export async function testFirestoreConnection(): Promise<{
  success: boolean;
  message: string;
  settings?: AISettings;
}> {
  try {
    const settings = await getAISettings();
    return {
      success: true,
      message: 'Connexion Firestore OK',
      settings
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erreur: ${error.message}`
    };
  }
}

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

export default {
  getAISettings,
  saveAISettings,
  updatePrompts,
  subscribeToAISettings,
  getDefaultLawyerPrompt,
  getDefaultExpertPrompt,
  isCustomPrompt,
  testFirestoreConnection,
  DEFAULT_AI_SETTINGS
};