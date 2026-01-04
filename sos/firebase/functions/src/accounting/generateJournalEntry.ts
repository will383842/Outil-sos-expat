/**
 * Generateur d'ecritures comptables - SOS-Expat OU
 *
 * Module de generation automatique des ecritures comptables
 * conformement au plan comptable estonien et aux regles TVA OSS.
 *
 * @module accounting/generateJournalEntry
 */

import { Timestamp } from 'firebase-admin/firestore';
import {
  JournalEntry,
  JournalLine,
  JournalEntryStatus,
  PaymentData,
  RefundData,
  PayoutData,
  SubscriptionData,
  VatInfo,
  CustomerInfo,
  DEFAULT_ACCOUNTING_CONFIG,
} from './types';

// =============================================================================
// TAUX DE TVA OSS PAR PAYS
// =============================================================================

const OSS_VAT_RATES: Record<string, { rate: number; accountCode: string }> = {
  EE: { rate: 0.22, accountCode: '445201' },
  FR: { rate: 0.20, accountCode: '445202' },
  DE: { rate: 0.19, accountCode: '445203' },
  BE: { rate: 0.21, accountCode: '445204' },
  NL: { rate: 0.21, accountCode: '445205' },
  IT: { rate: 0.22, accountCode: '445206' },
  ES: { rate: 0.21, accountCode: '445207' },
  PT: { rate: 0.23, accountCode: '445208' },
  AT: { rate: 0.20, accountCode: '445209' },
  PL: { rate: 0.23, accountCode: '445210' },
  GR: { rate: 0.24, accountCode: '445211' },
  CZ: { rate: 0.21, accountCode: '445212' },
  RO: { rate: 0.19, accountCode: '445213' },
  HU: { rate: 0.27, accountCode: '445214' },
  SE: { rate: 0.25, accountCode: '445215' },
  DK: { rate: 0.25, accountCode: '445216' },
  FI: { rate: 0.24, accountCode: '445217' },
  IE: { rate: 0.23, accountCode: '445218' },
  SK: { rate: 0.20, accountCode: '445219' },
  LT: { rate: 0.21, accountCode: '445220' },
  LV: { rate: 0.21, accountCode: '445221' },
  SI: { rate: 0.22, accountCode: '445222' },
  HR: { rate: 0.25, accountCode: '445223' },
  BG: { rate: 0.20, accountCode: '445224' },
  CY: { rate: 0.19, accountCode: '445225' },
  MT: { rate: 0.18, accountCode: '445226' },
  LU: { rate: 0.17, accountCode: '445227' },
};

// Liste des pays de l'UE (pour verification B2B intra-UE)
const EU_COUNTRIES = new Set(Object.keys(OSS_VAT_RATES));

// =============================================================================
// NOMS DES COMPTES
// =============================================================================

const ACCOUNT_NAMES: Record<string, string> = {
  '512100': 'Stripe',
  '512200': 'PayPal',
  '512300': 'Wise',
  '512400': 'Banque LHV',
  '622100': 'Frais Stripe',
  '622200': 'Frais PayPal',
  '622300': 'Frais Wise',
  '627000': 'Frais bancaires',
  '706000': 'Commissions sur services',
  '706100': 'Commission appels avocats',
  '706200': 'Commission appels expatries',
  '707000': 'Abonnements IA',
  '467100': 'Escrow prestataires',
  '467200': 'Prestataires a payer',
  '445200': 'TVA collectee',
};

// Ajouter les noms des comptes TVA OSS
Object.entries(OSS_VAT_RATES).forEach(([country, info]) => {
  ACCOUNT_NAMES[info.accountCode] = `TVA ${country} (${(info.rate * 100).toFixed(0)}%)`;
});

// =============================================================================
// UTILITAIRES
// =============================================================================

/**
 * Arrondir a 2 decimales
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Generer une reference unique
 */
function generateReference(
  prefix: string,
  date: Date,
  sequence?: number
): string {
  const year = date.getFullYear();
  const seq = sequence ?? Math.floor(Math.random() * 100000);
  return `${prefix}-${year}-${seq.toString().padStart(5, '0')}`;
}

/**
 * Obtenir la periode comptable (YYYY-MM)
 */
function getPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Obtenir le nom du compte
 */
function getAccountName(code: string): string {
  return ACCOUNT_NAMES[code] || `Compte ${code}`;
}

/**
 * Obtenir le code compte banque selon le processeur
 */
function getBankAccountCode(processor: string): string {
  switch (processor) {
    case 'stripe': return '512100';
    case 'paypal': return '512200';
    case 'wise': return '512300';
    default: return '512400';
  }
}

/**
 * Obtenir le code compte frais selon le processeur
 */
function getFeeAccountCode(processor: string): string {
  switch (processor) {
    case 'stripe': return '622100';
    case 'paypal': return '622200';
    case 'wise': return '622300';
    default: return '627000';
  }
}

/**
 * Obtenir le code compte commission selon le type de service
 */
function getCommissionAccountCode(serviceType: string): string {
  switch (serviceType) {
    case 'lawyer_call': return '706100';
    case 'expat_call': return '706200';
    default: return '706000';
  }
}

// =============================================================================
// CALCUL TVA
// =============================================================================

/**
 * Determiner les informations TVA applicables
 *
 * Regles:
 * - B2C dans UE: TVA OSS du pays du client
 * - B2B intra-UE avec numero TVA valide: Autoliquidation (reverse charge)
 * - Hors UE: Pas de TVA (export)
 * - B2C Estonie: TVA estonienne 22%
 */
export function calculateVatInfo(
  customer: CustomerInfo,
  commissionHt: number
): VatInfo {
  const countryCode = customer.countryCode?.toUpperCase() || 'FR';

  // Hors UE: pas de TVA
  if (!EU_COUNTRIES.has(countryCode)) {
    return {
      countryCode,
      rate: 0,
      accountCode: '445200',
      amount: 0,
      regime: 'EXEMPT',
    };
  }

  // B2B intra-UE avec numero TVA: autoliquidation
  if (customer.type === 'B2B' && customer.vatNumber && countryCode !== 'EE') {
    return {
      countryCode,
      rate: 0,
      accountCode: '445200',
      amount: 0,
      regime: 'REVERSE_CHARGE',
    };
  }

  // B2C ou B2B sans numero TVA: TVA OSS
  const vatConfig = OSS_VAT_RATES[countryCode];
  if (!vatConfig) {
    // Pays inconnu, appliquer TVA estonienne par defaut
    return {
      countryCode: 'EE',
      rate: 0.22,
      accountCode: '445201',
      amount: round2(commissionHt * 0.22),
      regime: 'DOMESTIC',
    };
  }

  const regime = countryCode === 'EE' ? 'DOMESTIC' : 'OSS';

  return {
    countryCode,
    rate: vatConfig.rate,
    accountCode: vatConfig.accountCode,
    amount: round2(commissionHt * vatConfig.rate),
    regime,
  };
}

// =============================================================================
// GENERATION ECRITURES - PAIEMENT CLIENT
// =============================================================================

/**
 * Generer l'ecriture comptable pour un paiement client recu
 *
 * Schema d'ecriture (exemple 120 EUR TTC, client FR B2C):
 * ```
 * DEBIT  512100 Stripe         116.52  (montant apres frais Stripe)
 * DEBIT  622100 Frais Stripe     3.48  (frais payment processor)
 * CREDIT 706100 Commissions     15.00  (commission HT)
 * CREDIT 445202 TVA OSS FR       3.00  (TVA 20% sur commission)
 * CREDIT 467100 Escrow          98.52  (montant du prestataire)
 * ```
 */
export function generatePaymentEntry(data: PaymentData): JournalEntry {
  const {
    paymentId,
    amountEur,
    processorFeeEur,
    commissionEur,
    providerAmountEur,
    processor,
    serviceType,
    customer,
    paymentDate,
  } = data;

  // Calculer le montant net recu (apres frais processeur)
  const netReceived = round2(amountEur - processorFeeEur);

  // Calculer la TVA sur la commission
  const vatInfo = calculateVatInfo(customer, commissionEur);
  const commissionHt = vatInfo.regime === 'REVERSE_CHARGE'
    ? commissionEur
    : round2(commissionEur / (1 + vatInfo.rate));
  const vatAmount = vatInfo.regime === 'REVERSE_CHARGE'
    ? 0
    : round2(commissionEur - commissionHt);

  // Montant en escrow (ce qui revient au prestataire)
  // = montant total - frais processeur - commission TTC
  const escrowAmount = round2(amountEur - processorFeeEur - commissionEur);

  const lines: JournalLine[] = [];

  // DEBIT: Compte bancaire (montant net recu)
  lines.push({
    accountCode: getBankAccountCode(processor),
    accountName: getAccountName(getBankAccountCode(processor)),
    debit: netReceived,
    credit: 0,
    currency: 'EUR',
    description: `Paiement ${paymentId}`,
  });

  // DEBIT: Frais processeur
  if (processorFeeEur > 0) {
    lines.push({
      accountCode: getFeeAccountCode(processor),
      accountName: getAccountName(getFeeAccountCode(processor)),
      debit: processorFeeEur,
      credit: 0,
      currency: 'EUR',
      description: `Frais ${processor} sur ${paymentId}`,
    });
  }

  // CREDIT: Commission (montant HT si TVA applicable)
  const commissionAccount = getCommissionAccountCode(serviceType);
  lines.push({
    accountCode: commissionAccount,
    accountName: getAccountName(commissionAccount),
    debit: 0,
    credit: vatInfo.regime === 'REVERSE_CHARGE' ? commissionEur : commissionHt,
    currency: 'EUR',
    description: `Commission sur ${paymentId}`,
  });

  // CREDIT: TVA (si applicable)
  if (vatAmount > 0) {
    lines.push({
      accountCode: vatInfo.accountCode,
      accountName: getAccountName(vatInfo.accountCode),
      debit: 0,
      credit: vatAmount,
      currency: 'EUR',
      description: `TVA ${customer.countryCode} sur commission`,
      taxCode: `${customer.countryCode}${Math.round(vatInfo.rate * 100)}`,
      countryCode: customer.countryCode,
    });
  }

  // CREDIT: Escrow prestataire
  lines.push({
    accountCode: '467100',
    accountName: getAccountName('467100'),
    debit: 0,
    credit: escrowAmount,
    currency: 'EUR',
    description: `Part prestataire ${data.providerId}`,
  });

  // Calculer totaux
  const totalDebit = round2(lines.reduce((sum, l) => sum + l.debit, 0));
  const totalCredit = round2(lines.reduce((sum, l) => sum + l.credit, 0));

  // Verifier equilibre
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > DEFAULT_ACCOUNTING_CONFIG.balanceTolerance) {
    // Ajuster sur le compte escrow pour equilibrer
    const adjustmentIndex = lines.findIndex(l => l.accountCode === '467100');
    if (adjustmentIndex >= 0) {
      lines[adjustmentIndex].credit = round2(lines[adjustmentIndex].credit + (totalDebit - totalCredit));
    }
  }

  const entry: JournalEntry = {
    id: `je_${paymentId}_${Date.now()}`,
    date: Timestamp.fromDate(paymentDate),
    reference: generateReference('PAY', paymentDate),
    description: `Paiement client - ${serviceType === 'lawyer_call' ? 'Appel avocat' : 'Appel expatrie'} - ${customer.countryCode}`,
    sourceDocument: {
      type: 'PAYMENT',
      id: paymentId,
      collection: 'payments',
    },
    lines,
    period: getPeriod(paymentDate),
    status: 'DRAFT' as JournalEntryStatus,
    totalDebit: round2(lines.reduce((sum, l) => sum + l.debit, 0)),
    totalCredit: round2(lines.reduce((sum, l) => sum + l.credit, 0)),
    createdAt: Timestamp.now(),
    metadata: {
      customerCountry: customer.countryCode,
      customerType: customer.type,
      vatRegime: vatInfo.regime,
      vatRate: vatInfo.rate,
      processor,
      serviceType,
    },
  };

  return entry;
}

// =============================================================================
// GENERATION ECRITURES - PAIEMENT B2B INTRA-UE (AUTOLIQUIDATION)
// =============================================================================

/**
 * Generer l'ecriture comptable pour un paiement B2B intra-UE (reverse charge)
 *
 * Schema d'ecriture (exemple 120 EUR, client FR B2B avec numero TVA):
 * ```
 * DEBIT  512100 Stripe         116.52  (montant apres frais Stripe)
 * DEBIT  622100 Frais Stripe     3.48  (frais payment processor)
 * CREDIT 706100 Commissions     18.00  (commission complete - pas de TVA)
 * CREDIT 467100 Escrow         102.00  (montant du prestataire)
 * ```
 *
 * Note: Avec l'autoliquidation, la TVA est due par le client dans son pays.
 */
export function generateB2BPaymentEntry(data: PaymentData): JournalEntry {
  // Forcer le type B2B pour le calcul
  const b2bCustomer: CustomerInfo = {
    ...data.customer,
    type: 'B2B',
  };

  return generatePaymentEntry({
    ...data,
    customer: b2bCustomer,
  });
}

// =============================================================================
// GENERATION ECRITURES - REVERSEMENT PRESTATAIRE
// =============================================================================

/**
 * Generer l'ecriture comptable pour un reversement prestataire
 *
 * Schema d'ecriture (exemple reversement 98.52 EUR via Wise):
 * ```
 * DEBIT  467100 Escrow          98.52  (liberation escrow)
 * CREDIT 512300 Wise            97.52  (montant net envoye)
 * CREDIT 622300 Frais Wise       1.00  (frais de transfert)
 * ```
 *
 * Note: En realite, les frais sont debites, pas credites. Correction:
 * ```
 * DEBIT  467100 Escrow          98.52
 * DEBIT  622300 Frais Wise       1.00
 * CREDIT 512300 Wise            99.52
 * ```
 * Non, cela ne fonctionne pas car Wise debite le montant net.
 *
 * Ecriture correcte:
 * ```
 * DEBIT  467100 Escrow          98.52  (liberation escrow)
 * CREDIT 512300 Wise            97.52  (sortie de tresorerie)
 * DEBIT  622300 Frais Wise       1.00  (charge)
 * CREDIT 467100 Escrow           1.00  (reduction escrow pour frais)
 * ```
 * Simplifie:
 * ```
 * DEBIT  467100 Escrow          98.52
 * DEBIT  622300 Frais Wise       1.00
 * CREDIT 512300 Wise            98.52
 * CREDIT 467100 Escrow           1.00
 * ```
 * Encore plus simple (net):
 * ```
 * DEBIT  467100 Escrow          98.52  (montant brut)
 * CREDIT 512300 Wise            97.52  (montant net envoye)
 * CREDIT 622300 Frais Wise      -1.00  <- Incorrect
 * ```
 *
 * Version finale correcte:
 * On considere que les frais Wise sont payes depuis le compte Wise.
 * ```
 * DEBIT  467100 Escrow          98.52  (liberation escrow total)
 * CREDIT 512300 Wise            98.52  (sortie totale du compte Wise)
 *
 * Puis separement ou dans la meme ecriture:
 * DEBIT  622300 Frais Wise       1.00  (charge)
 * CREDIT 512300 Wise             1.00  (paiement des frais)
 * ```
 *
 * En realite simplifie:
 * ```
 * DEBIT  467100 Escrow          98.52
 * DEBIT  622300 Frais Wise       1.00
 * CREDIT 512300 Wise            99.52
 * ```
 * Cette ecriture est incorrecte car le montant qui sort de Wise est 97.52, pas 99.52.
 *
 * SOLUTION FINALE: Le prestataire recoit net, nous supportons les frais
 * ```
 * DEBIT  467100 Escrow          98.52  (liberation dette prestataire)
 * DEBIT  622300 Frais Wise       1.00  (frais a notre charge)
 * CREDIT 512300 Wise            99.52  (total debite de notre compte Wise)
 * ```
 * Non! Wise debite 98.52 de notre compte et vire 97.52 au prestataire.
 *
 * VRAIE SOLUTION:
 * - Nous avons 98.52 en escrow (dette envers prestataire)
 * - Nous payons 98.52 via Wise
 * - Wise prend 1 EUR de frais
 * - Le prestataire recoit 97.52
 *
 * Ecriture:
 * - Liberation de la dette: Debit 467100 (98.52)
 * - Sortie compte Wise: Credit 512300 (98.52)
 * - Frais Wise: l'ecriture precedente est suffisante si on considere
 *   que le prestataire recoit moins (on lui doit moins car il paie les frais)
 *
 * OU si SOS-Expat paie les frais (prestataire recoit le montant complet):
 * - Nous devons 98.52 au prestataire
 * - Nous envoyons via Wise en payant 1 EUR de frais
 * - Total sortie Wise: 99.52 (98.52 au prestataire + 1 frais)
 *
 * Ecriture SOS-Expat paie les frais:
 * ```
 * DEBIT  467100 Escrow          98.52  (liberation dette)
 * DEBIT  622300 Frais Wise       1.00  (frais)
 * CREDIT 512300 Wise            99.52  (sortie totale)
 * ```
 *
 * Ecriture prestataire paie les frais (recoit net):
 * ```
 * DEBIT  467100 Escrow          98.52  (liberation dette)
 * CREDIT 512300 Wise            98.52  (sortie = dette)
 * ```
 * (Les frais sont transparents pour nous, Wise les deduit du montant envoye)
 *
 * On va utiliser l'approche "SOS-Expat supporte les frais" pour plus de clarte.
 */
export function generatePayoutEntry(data: PayoutData): JournalEntry {
  const {
    payoutId,
    providerId,
    grossAmountEur,
    transferFeeEur,
    paymentMethod,
    payoutDate,
  } = data;

  const totalPayout = round2(grossAmountEur + transferFeeEur);

  const lines: JournalLine[] = [];

  // DEBIT: Liberation escrow
  lines.push({
    accountCode: '467100',
    accountName: getAccountName('467100'),
    debit: grossAmountEur,
    credit: 0,
    currency: 'EUR',
    description: `Reversement prestataire ${providerId}`,
  });

  // DEBIT: Frais de transfert
  if (transferFeeEur > 0) {
    const feeAccount = paymentMethod === 'wise' ? '622300' : '627000';
    lines.push({
      accountCode: feeAccount,
      accountName: getAccountName(feeAccount),
      debit: transferFeeEur,
      credit: 0,
      currency: 'EUR',
      description: `Frais transfert ${payoutId}`,
    });
  }

  // CREDIT: Compte bancaire (sortie)
  const bankAccount = paymentMethod === 'wise' ? '512300' :
    paymentMethod === 'stripe_connect' ? '512100' : '512400';

  lines.push({
    accountCode: bankAccount,
    accountName: getAccountName(bankAccount),
    debit: 0,
    credit: totalPayout,
    currency: 'EUR',
    description: `Paiement prestataire ${providerId}`,
  });

  const entry: JournalEntry = {
    id: `je_${payoutId}_${Date.now()}`,
    date: Timestamp.fromDate(payoutDate),
    reference: generateReference('OUT', payoutDate),
    description: `Reversement prestataire ${providerId}`,
    sourceDocument: {
      type: 'PAYOUT',
      id: payoutId,
      collection: 'payouts',
    },
    lines,
    period: getPeriod(payoutDate),
    status: 'DRAFT' as JournalEntryStatus,
    totalDebit: round2(lines.reduce((sum, l) => sum + l.debit, 0)),
    totalCredit: round2(lines.reduce((sum, l) => sum + l.credit, 0)),
    createdAt: Timestamp.now(),
    metadata: {
      providerId,
      paymentMethod,
      grossAmount: grossAmountEur,
      transferFee: transferFeeEur,
    },
  };

  return entry;
}

// =============================================================================
// GENERATION ECRITURES - REMBOURSEMENT
// =============================================================================

/**
 * Generer l'ecriture comptable pour un remboursement
 *
 * Schema d'ecriture (extourne du paiement original):
 * ```
 * DEBIT  706100 Commissions     15.00  (annulation commission)
 * DEBIT  445202 TVA OSS FR       3.00  (annulation TVA)
 * DEBIT  467100 Escrow          98.52  (reduction escrow - si pas encore paye)
 * CREDIT 512100 Stripe         116.52  (sortie pour remboursement)
 * ```
 *
 * Note: Si le prestataire a deja ete paye, l'escrow sera negatif
 * et devra etre recupere aupres du prestataire.
 */
export function generateRefundEntry(data: RefundData): JournalEntry {
  const {
    refundId,
    originalPaymentId,
    amountEur,
    processor,
    serviceType,
    originalVatInfo,
    refundDate,
  } = data;

  // Estimer les montants si pas d'info TVA originale
  const vatRate = originalVatInfo?.rate || 0.20;
  const commissionRate = DEFAULT_ACCOUNTING_CONFIG.standardCommissionRate;

  // Calculer les montants a extourner
  const commissionTtc = round2(amountEur * commissionRate);
  const commissionHt = round2(commissionTtc / (1 + vatRate));
  const vatAmount = round2(commissionTtc - commissionHt);
  const escrowAmount = round2(amountEur - commissionTtc);

  const vatAccountCode = originalVatInfo?.accountCode || '445202';

  const lines: JournalLine[] = [];

  // DEBIT: Annulation commission
  const commissionAccount = getCommissionAccountCode(serviceType);
  lines.push({
    accountCode: commissionAccount,
    accountName: getAccountName(commissionAccount),
    debit: commissionHt,
    credit: 0,
    currency: 'EUR',
    description: `Annulation commission - Remboursement ${refundId}`,
  });

  // DEBIT: Annulation TVA
  if (vatAmount > 0) {
    lines.push({
      accountCode: vatAccountCode,
      accountName: getAccountName(vatAccountCode),
      debit: vatAmount,
      credit: 0,
      currency: 'EUR',
      description: `Annulation TVA - Remboursement ${refundId}`,
      countryCode: originalVatInfo?.countryCode,
    });
  }

  // DEBIT: Reduction escrow
  lines.push({
    accountCode: '467100',
    accountName: getAccountName('467100'),
    debit: escrowAmount,
    credit: 0,
    currency: 'EUR',
    description: `Reduction escrow - Remboursement ${refundId}`,
  });

  // CREDIT: Sortie compte bancaire
  lines.push({
    accountCode: getBankAccountCode(processor),
    accountName: getAccountName(getBankAccountCode(processor)),
    debit: 0,
    credit: amountEur,
    currency: 'EUR',
    description: `Remboursement client ${refundId}`,
  });

  const entry: JournalEntry = {
    id: `je_${refundId}_${Date.now()}`,
    date: Timestamp.fromDate(refundDate),
    reference: generateReference('REF', refundDate),
    description: `Remboursement client - ${originalPaymentId}`,
    sourceDocument: {
      type: 'REFUND',
      id: refundId,
      collection: 'refunds',
    },
    lines,
    period: getPeriod(refundDate),
    status: 'DRAFT' as JournalEntryStatus,
    totalDebit: round2(lines.reduce((sum, l) => sum + l.debit, 0)),
    totalCredit: round2(lines.reduce((sum, l) => sum + l.credit, 0)),
    createdAt: Timestamp.now(),
    metadata: {
      originalPaymentId,
      refundAmount: amountEur,
      processor,
    },
  };

  return entry;
}

// =============================================================================
// GENERATION ECRITURES - ABONNEMENT IA
// =============================================================================

/**
 * Generer l'ecriture comptable pour un paiement d'abonnement IA
 *
 * Schema d'ecriture (exemple 29 EUR TTC, client EE):
 * ```
 * DEBIT  512100 Stripe          28.03  (montant apres frais Stripe)
 * DEBIT  622100 Frais Stripe     0.97  (frais Stripe: 2.9% + 0.25)
 * CREDIT 707000 Abonnements     23.77  (abonnement HT)
 * CREDIT 445201 TVA EE           5.23  (TVA 22% Estonie)
 * ```
 */
export function generateSubscriptionEntry(data: SubscriptionData): JournalEntry {
  const {
    subscriptionId,
    userId,
    amountEur,
    processorFeeEur,
    processor,
    customer,
    plan,
    paymentDate,
  } = data;

  // Montant net recu
  const netReceived = round2(amountEur - processorFeeEur);

  // Calculer la TVA
  const vatInfo = calculateVatInfo(customer, amountEur);
  const amountHt = vatInfo.regime === 'REVERSE_CHARGE'
    ? amountEur
    : round2(amountEur / (1 + vatInfo.rate));
  const vatAmount = vatInfo.regime === 'REVERSE_CHARGE'
    ? 0
    : round2(amountEur - amountHt);

  const lines: JournalLine[] = [];

  // DEBIT: Compte bancaire
  lines.push({
    accountCode: getBankAccountCode(processor),
    accountName: getAccountName(getBankAccountCode(processor)),
    debit: netReceived,
    credit: 0,
    currency: 'EUR',
    description: `Abonnement IA ${subscriptionId}`,
  });

  // DEBIT: Frais processeur
  if (processorFeeEur > 0) {
    lines.push({
      accountCode: getFeeAccountCode(processor),
      accountName: getAccountName(getFeeAccountCode(processor)),
      debit: processorFeeEur,
      credit: 0,
      currency: 'EUR',
      description: `Frais ${processor} abonnement`,
    });
  }

  // CREDIT: Produit abonnement (HT)
  lines.push({
    accountCode: '707000',
    accountName: getAccountName('707000'),
    debit: 0,
    credit: amountHt,
    currency: 'EUR',
    description: `Abonnement ${plan} - ${userId}`,
  });

  // CREDIT: TVA (si applicable)
  if (vatAmount > 0) {
    lines.push({
      accountCode: vatInfo.accountCode,
      accountName: getAccountName(vatInfo.accountCode),
      debit: 0,
      credit: vatAmount,
      currency: 'EUR',
      description: `TVA ${customer.countryCode} abonnement`,
      taxCode: `${customer.countryCode}${Math.round(vatInfo.rate * 100)}`,
      countryCode: customer.countryCode,
    });
  }

  const entry: JournalEntry = {
    id: `je_${subscriptionId}_${Date.now()}`,
    date: Timestamp.fromDate(paymentDate),
    reference: generateReference('SUB', paymentDate),
    description: `Abonnement IA ${plan} - ${customer.countryCode}`,
    sourceDocument: {
      type: 'SUBSCRIPTION',
      id: subscriptionId,
      collection: 'subscriptions',
    },
    lines,
    period: getPeriod(paymentDate),
    status: 'DRAFT' as JournalEntryStatus,
    totalDebit: round2(lines.reduce((sum, l) => sum + l.debit, 0)),
    totalCredit: round2(lines.reduce((sum, l) => sum + l.credit, 0)),
    createdAt: Timestamp.now(),
    metadata: {
      userId,
      plan,
      customerCountry: customer.countryCode,
      customerType: customer.type,
      vatRegime: vatInfo.regime,
      vatRate: vatInfo.rate,
    },
  };

  return entry;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Valider qu'une ecriture est equilibree
 */
export function validateJournalEntry(entry: JournalEntry): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verifier l'equilibre debit/credit
  const totalDebit = round2(entry.lines.reduce((sum, l) => sum + l.debit, 0));
  const totalCredit = round2(entry.lines.reduce((sum, l) => sum + l.credit, 0));
  const diff = Math.abs(totalDebit - totalCredit);

  if (diff > DEFAULT_ACCOUNTING_CONFIG.balanceTolerance) {
    errors.push(
      `Ecriture desequilibree: Debit=${totalDebit}, Credit=${totalCredit}, Difference=${diff}`
    );
  }

  // Verifier qu'il y a au moins une ligne debit et une ligne credit
  const hasDebit = entry.lines.some(l => l.debit > 0);
  const hasCredit = entry.lines.some(l => l.credit > 0);

  if (!hasDebit) {
    errors.push('Aucune ligne au debit');
  }
  if (!hasCredit) {
    errors.push('Aucune ligne au credit');
  }

  // Verifier que chaque ligne a soit un debit soit un credit (pas les deux)
  entry.lines.forEach((line, index) => {
    if (line.debit > 0 && line.credit > 0) {
      errors.push(`Ligne ${index + 1}: une ligne ne peut pas avoir debit ET credit`);
    }
    if (line.debit === 0 && line.credit === 0) {
      errors.push(`Ligne ${index + 1}: montant nul`);
    }
  });

  // Verifier les codes comptes
  entry.lines.forEach((line, index) => {
    if (!line.accountCode || !/^\d{6}$/.test(line.accountCode)) {
      errors.push(`Ligne ${index + 1}: code compte invalide "${line.accountCode}"`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
