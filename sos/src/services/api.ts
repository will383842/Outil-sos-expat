import { auth, functions, functionsPayment } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Interface pour les résultats des fonctions Cloud
 */
interface CloudFunctionResult {
  success?: boolean;
  [key: string]: unknown;
}

/**
 * Interface pour les données d'appel
 */
interface CallData {
  clientId: string;
  providerId: string;
  clientPhone: string;
  providerPhone: string;
  providerType: 'lawyer' | 'expat';
  clientLanguage?: string;
  providerLanguage?: string;
  paymentIntentId: string;
}

/**
 * Interface pour les données SMS
 */
interface SmsData {
  to: string;
  message: string;
  from?: string;
}

/**
 * Interface pour les données de paiement
 */
interface PaymentData {
  amount: number;
  currency?: string;
  description?: string;
}

/**
 * Vérification de l'authentification utilisateur
 */
function checkUserAuth(): void {
  if (!auth.currentUser) {
    throw new Error('Vous devez être connecté pour effectuer cette action');
  }
}

/**
 * Validation des données d'appel
 */
function validateCallData(data: CallData): void {
  if (!data.providerId || typeof data.providerId !== 'string') {
    throw new Error('Provider ID invalide');
  }
  if (!data.clientId || typeof data.clientId !== 'string') {
    throw new Error('Client ID invalide');
  }
  if (!data.clientPhone || typeof data.clientPhone !== 'string') {
    throw new Error('Numéro de téléphone client invalide');
  }
  if (!data.providerPhone || typeof data.providerPhone !== 'string') {
    throw new Error('Numéro de téléphone prestataire invalide');
  }
  if (!data.paymentIntentId || typeof data.paymentIntentId !== 'string') {
    throw new Error('Payment Intent ID invalide');
  }
  if (data.providerType !== 'lawyer' && data.providerType !== 'expat') {
    throw new Error('Type de prestataire invalide');
  }
}

/**
 * Validation des données SMS
 */
function validateSmsData(data: SmsData): void {
  if (!data.to || !/^\+?[0-9]{8,15}$/.test(data.to)) {
    throw new Error('Numéro de téléphone invalide');
  }
  if (!data.message || data.message.length === 0) {
    throw new Error('Message invalide');
  }
  if (data.message.length > 1600) {
    throw new Error('Message trop long (max 1600 caractères)');
  }
}

/**
 * Validation des données de paiement
 */
function validatePaymentData(data: PaymentData): void {
  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    throw new Error('Montant invalide');
  }
  if (data.currency && typeof data.currency !== 'string') {
    throw new Error('Devise invalide');
  }
}

/**
 * Validation du Payment Intent ID
 */
function validatePaymentIntentId(paymentIntentId: string): void {
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    throw new Error('Payment Intent ID invalide');
  }
  if (!paymentIntentId.startsWith('pi_')) {
    throw new Error('Format Payment Intent ID invalide');
  }
}

/**
 * Validation des données de mise à jour de statut d'appel
 */
function validateCallStatusData(callSessionId: string, status: string): void {
  if (!callSessionId || typeof callSessionId !== 'string') {
    throw new Error('Call Session ID invalide');
  }
  if (!status || typeof status !== 'string') {
    throw new Error('Statut invalide');
  }
}

/**
 * Gestion des erreurs des fonctions Cloud
 */
function handleCloudFunctionError(error: unknown, operation: string): never {
  console.error(`Error ${operation}:`, error);
  throw error;
}

/**
 * Crée une intention de paiement via Stripe
 */
export async function createPaymentIntent(data: PaymentData) {
  try {
    checkUserAuth();
    validatePaymentData(data);

    const createPaymentIntentFn = httpsCallable(functionsPayment, 'createPaymentIntent');
    const result = await createPaymentIntentFn({
      amount: data.amount,
      currency: data.currency || 'eur',
      description: data.description
    });
    
    return result.data;
  } catch (error) {
    handleCloudFunctionError(error, 'creating payment intent');
  }
}

/**
 * Capture un paiement après un appel réussi
 */
export async function capturePayment(paymentIntentId: string): Promise<boolean> {
  try {
    checkUserAuth();
    validatePaymentIntentId(paymentIntentId);

    const capturePaymentFn = httpsCallable(functions, 'capturePayment');
    const result = await capturePaymentFn({ paymentIntentId });
    
    return (result.data as CloudFunctionResult)?.success || false;
  } catch (error) {
    console.error('Error capturing payment:', error);
    return false;
  }
}

/**
 * Annule un paiement
 */
export async function cancelPayment(paymentIntentId: string): Promise<boolean> {
  try {
    checkUserAuth();
    validatePaymentIntentId(paymentIntentId);

    const cancelPaymentFn = httpsCallable(functions, 'cancelPayment');
    const result = await cancelPaymentFn({ paymentIntentId });
    
    return (result.data as CloudFunctionResult)?.success || false;
  } catch (error) {
    console.error('Error canceling payment:', error);
    return false;
  }
}

/**
 * Initie un appel via Twilio
 */
export async function initiateCall(callData: CallData) {
  try {
    checkUserAuth();
    validateCallData(callData);

    const initiateCallFn = httpsCallable(functions, 'initiateCall');
    const result = await initiateCallFn(callData);
    
    return result.data;
  } catch (error) {
    handleCloudFunctionError(error, 'initiating call');
  }
}

/**
 * Envoie un SMS via Twilio
 */
export async function sendSms(data: SmsData) {
  try {
    checkUserAuth();
    validateSmsData(data);

    const sendSmsFn = httpsCallable(functions, 'sendSms');
    const result = await sendSmsFn(data);
    
    return result.data;
  } catch (error) {
    handleCloudFunctionError(error, 'sending SMS');
  }
}

/**
 * Met à jour le statut d'un appel
 */
export async function updateCallStatus(
  callSessionId: string,
  status: string,
  details?: Record<string, unknown>
) {
  try {
    checkUserAuth();
    validateCallStatusData(callSessionId, status);

    const updateCallStatusFn = httpsCallable(functions, 'updateCallStatus');
    const result = await updateCallStatusFn({
      callSessionId,
      status,
      details
    });
    
    return result.data;
  } catch (error) {
    handleCloudFunctionError(error, 'updating call status');
  }
}