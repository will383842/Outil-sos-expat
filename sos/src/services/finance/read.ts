import { collection, query, where, getDocs, orderBy, Timestamp, type QueryConstraint } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { Payment, Invoice, Dispute, Refund, TaxRate, Currency } from '@/types/finance';

// Helpers
function toISODate(ts: Timestamp | undefined): string {
  return ts ? ts.toDate().toISOString() : new Date().toISOString();
}

function buildDateConstraints(from?: string, to?: string): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (from) {
    constraints.push(where('createdAt', '>=', Timestamp.fromDate(new Date(from))));
  }
  if (to) {
    constraints.push(where('createdAt', '<=', Timestamp.fromDate(new Date(to))));
  }
  return constraints;
}

export async function listPayments(params?: { from?: string; to?: string; country?: string }): Promise<Payment[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      ...buildDateConstraints(params?.from, params?.to),
    ];

    if (params?.country) {
      constraints.push(where('country', '==', params.country));
    }

    const q = query(collection(db, 'payments'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          created: toISODate(data.createdAt),
          amount: Number(data.amount || data.totalAmount || 0),
          currency: (data.currency || 'EUR') as Currency,
          country: data.country,
          status: data.status || 'succeeded',
          fee: data.fee ? Number(data.fee) : undefined,
          invoiceId: data.invoiceId,
          tax: data.tax ? Number(data.tax) : undefined,
        };
      });
  } catch (error) {
    console.error('[Finance] Error loading payments:', error);
    return [];
  }
}

export async function listInvoices(params?: { from?: string; to?: string; country?: string }): Promise<Invoice[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      ...buildDateConstraints(params?.from, params?.to),
    ];

    if (params?.country) {
      constraints.push(where('country', '==', params.country));
    }

    const q = query(collection(db, 'invoices'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          created: toISODate(data.createdAt),
          total: Number(data.total || data.amount || 0),
          currency: (data.currency || 'EUR') as Currency,
          country: data.country,
          tax: data.tax ? Number(data.tax) : undefined,
          taxRates: data.taxRates,
          paid: Boolean(data.paid || data.status === 'paid'),
        };
      });
  } catch (error) {
    console.error('[Finance] Error loading invoices:', error);
    return [];
  }
}

export async function listDisputes(params?: { from?: string; to?: string; country?: string }): Promise<Dispute[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      ...buildDateConstraints(params?.from, params?.to),
    ];

    const q = query(collection(db, 'disputes'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          paymentId: data.paymentId || '',
          amount: Number(data.amount || 0),
          currency: (data.currency || 'EUR') as Currency,
          status: data.status || 'needs_response',
          created: toISODate(data.createdAt),
        };
      });
  } catch (error) {
    console.error('[Finance] Error loading disputes:', error);
    return [];
  }
}

export async function listRefunds(params?: { from?: string; to?: string; country?: string }): Promise<Refund[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      ...buildDateConstraints(params?.from, params?.to),
    ];

    const q = query(collection(db, 'refunds'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          paymentId: data.paymentId || '',
          amount: Number(data.amount || 0),
          currency: (data.currency || 'EUR') as Currency,
          created: toISODate(data.createdAt),
        };
      });
  } catch (error) {
    console.error('[Finance] Error loading refunds:', error);
    return [];
  }
}

export async function listTaxRates(country?: string): Promise<TaxRate[]> {
  try {
    const constraints: QueryConstraint[] = [];
    if (country) {
      constraints.push(where('country', '==', country));
    }

    const q = query(collection(db, 'tax_rates'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs
      .filter(doc => !doc.data()._placeholder)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          country: data.country || '',
          name: data.name || '',
          rate: Number(data.rate || 0),
        };
      });
  } catch (error) {
    console.error('[Finance] Error loading tax rates:', error);
    return [];
  }
}
