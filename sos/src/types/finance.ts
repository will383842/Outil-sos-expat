// Devises supportées pour les rapports financiers (majuscules = standard Stripe/ISO)
export type Currency = 'EUR' | 'USD';
export interface CurrencyRate { base: Currency; quote: Currency; rate: number; asOf: string; }
export interface TaxRate { id: string; country: string; name: string; rate: number; }
export interface Payment { id: string; created: string; amount: number; currency: Currency; country?: string; status: 'succeeded'|'refunded'|'failed'|'disputed'; fee?: number; invoiceId?: string; tax?: number; }
export interface Invoice { id: string; created: string; total: number; currency: Currency; country?: string; tax?: number; taxRates?: TaxRate[]; paid: boolean; }
export interface Dispute { id: string; paymentId: string; amount: number; currency: Currency; status: 'needs_response'|'warning_closed'|'won'|'lost'; created: string; }
export interface Refund { id: string; paymentId: string; amount: number; currency: Currency; created: string; }

// Demande de remboursement par le client
export type RefundRequestStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
export type RefundReason = 'service_not_provided' | 'technical_issue' | 'provider_no_show' | 'quality_issue' | 'duplicate_charge' | 'other';

export interface RefundRequest {
  id: string;
  clientId: string;
  clientEmail?: string;
  paymentId: string;
  paymentIntentId?: string;
  sessionId?: string;
  providerId?: string;
  amount: number;
  currency: Currency;
  reason: RefundReason;
  description?: string;
  status: RefundRequestStatus;
  adminNotes?: string;
  processedBy?: string;
  processedAt?: string;
  refundId?: string; // ID du remboursement Stripe une fois traité
  createdAt: string;
  updatedAt?: string;
}
export interface CountryAmount { country: string; currency: Currency; gross: number; net: number; tax: number; count: number; }
export interface VatBucket { country: string; rate: number; taxable: number; tax: number; }
