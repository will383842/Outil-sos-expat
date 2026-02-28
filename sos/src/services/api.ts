import { auth, functionsPayment } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

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
 * Crée une intention de paiement via Stripe
 */
export async function createPaymentIntent(data: PaymentData) {
  checkUserAuth();
  validatePaymentData(data);

  const createPaymentIntentFn = httpsCallable(functionsPayment, 'createPaymentIntent');
  const result = await createPaymentIntentFn({
    amount: data.amount,
    currency: data.currency || 'eur',
    description: data.description
  });

  return result.data;
}
