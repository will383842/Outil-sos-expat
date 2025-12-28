/**
 * =============================================================================
 * FIRESTORE MONITOR - Wrapper pour monitoring opérations Firestore
 * =============================================================================
 *
 * Wrapper pour tracker:
 * - Latence des opérations (read/write/query)
 * - Nombre de documents lus/écrits
 * - Erreurs Firestore
 * - Coût estimé (reads/writes)
 *
 * =============================================================================
 */

import * as admin from "firebase-admin";
import { metrics } from "./MetricsService";

// =============================================================================
// TYPES
// =============================================================================

export interface FirestoreMetrics {
  reads: number;
  writes: number;
  deletes: number;
  queries: number;
  batchWrites: number;
  errors: number;
}

export interface OperationResult<T> {
  data: T;
  duration: number;
  documentsRead?: number;
  documentsWritten?: number;
}

// =============================================================================
// COUNTERS
// =============================================================================

let sessionMetrics: FirestoreMetrics = {
  reads: 0,
  writes: 0,
  deletes: 0,
  queries: 0,
  batchWrites: 0,
  errors: 0,
};

// =============================================================================
// MONITORED OPERATIONS
// =============================================================================

/**
 * Monitor a document read operation
 */
export async function monitoredGet<T extends admin.firestore.DocumentData>(
  docRef: admin.firestore.DocumentReference<T>
): Promise<OperationResult<admin.firestore.DocumentSnapshot<T>>> {
  const start = Date.now();
  const collection = docRef.parent.id;

  try {
    const snapshot = await docRef.get();
    const duration = Date.now() - start;

    // Track metrics
    sessionMetrics.reads++;
    metrics.recordLatency("firestore_read", duration, { collection });
    metrics.incrementCounter("firestore_reads", { collection });

    if (snapshot.exists) {
      metrics.incrementCounter("firestore_cache_hits", { collection });
    } else {
      metrics.incrementCounter("firestore_cache_misses", { collection });
    }

    return {
      data: snapshot,
      duration,
      documentsRead: snapshot.exists ? 1 : 0,
    };
  } catch (error) {
    const duration = Date.now() - start;
    sessionMetrics.errors++;

    metrics.recordError("firestore_read", (error as Error).name, { collection });
    metrics.recordLatency("firestore_read", duration, { collection, error: "true" });

    throw error;
  }
}

/**
 * Monitor a document set operation
 */
export async function monitoredSet<T extends admin.firestore.DocumentData>(
  docRef: admin.firestore.DocumentReference<T>,
  data: T,
  options?: admin.firestore.SetOptions
): Promise<OperationResult<admin.firestore.WriteResult>> {
  const start = Date.now();
  const collection = docRef.parent.id;

  try {
    const result = await (options
      ? docRef.set(data, options)
      : docRef.set(data));
    const duration = Date.now() - start;

    sessionMetrics.writes++;
    metrics.recordLatency("firestore_write", duration, { collection, operation: "set" });
    metrics.incrementCounter("firestore_writes", { collection, operation: "set" });

    return {
      data: result,
      duration,
      documentsWritten: 1,
    };
  } catch (error) {
    const duration = Date.now() - start;
    sessionMetrics.errors++;

    metrics.recordError("firestore_write", (error as Error).name, { collection });
    metrics.recordLatency("firestore_write", duration, { collection, error: "true" });

    throw error;
  }
}

/**
 * Monitor a document update operation
 */
export async function monitoredUpdate<T extends admin.firestore.DocumentData>(
  docRef: admin.firestore.DocumentReference<T>,
  data: Partial<T>
): Promise<OperationResult<admin.firestore.WriteResult>> {
  const start = Date.now();
  const collection = docRef.parent.id;

  try {
    const result = await docRef.update(data);
    const duration = Date.now() - start;

    sessionMetrics.writes++;
    metrics.recordLatency("firestore_write", duration, { collection, operation: "update" });
    metrics.incrementCounter("firestore_writes", { collection, operation: "update" });

    return {
      data: result,
      duration,
      documentsWritten: 1,
    };
  } catch (error) {
    const duration = Date.now() - start;
    sessionMetrics.errors++;

    metrics.recordError("firestore_write", (error as Error).name, { collection });
    metrics.recordLatency("firestore_write", duration, { collection, error: "true" });

    throw error;
  }
}

/**
 * Monitor a document delete operation
 */
export async function monitoredDelete<T extends admin.firestore.DocumentData>(
  docRef: admin.firestore.DocumentReference<T>
): Promise<OperationResult<admin.firestore.WriteResult>> {
  const start = Date.now();
  const collection = docRef.parent.id;

  try {
    const result = await docRef.delete();
    const duration = Date.now() - start;

    sessionMetrics.deletes++;
    metrics.recordLatency("firestore_delete", duration, { collection });
    metrics.incrementCounter("firestore_deletes", { collection });

    return {
      data: result,
      duration,
      documentsWritten: 1,
    };
  } catch (error) {
    const duration = Date.now() - start;
    sessionMetrics.errors++;

    metrics.recordError("firestore_delete", (error as Error).name, { collection });
    metrics.recordLatency("firestore_delete", duration, { collection, error: "true" });

    throw error;
  }
}

/**
 * Monitor a query operation
 */
export async function monitoredQuery<T extends admin.firestore.DocumentData>(
  query: admin.firestore.Query<T>,
  queryName?: string
): Promise<OperationResult<admin.firestore.QuerySnapshot<T>>> {
  const start = Date.now();

  try {
    const snapshot = await query.get();
    const duration = Date.now() - start;
    const docsRead = snapshot.docs.length;

    sessionMetrics.queries++;
    sessionMetrics.reads += docsRead;

    metrics.recordLatency("firestore_query", duration, { query: queryName || "unknown" });
    metrics.incrementCounter("firestore_queries", { query: queryName || "unknown" });
    metrics.recordMetric("firestore_query_docs", docsRead, { query: queryName || "unknown" });

    // Warn on large queries
    if (docsRead > 100) {
      metrics.warn("Large Firestore query", {
        query: queryName,
        documentsReturned: docsRead,
        duration,
      });
    }

    return {
      data: snapshot,
      duration,
      documentsRead: docsRead,
    };
  } catch (error) {
    const duration = Date.now() - start;
    sessionMetrics.errors++;

    metrics.recordError("firestore_query", (error as Error).name, { query: queryName || "unknown" });
    metrics.recordLatency("firestore_query", duration, { query: queryName || "unknown", error: "true" });

    throw error;
  }
}

/**
 * Monitor a batch write operation
 */
export async function monitoredBatchWrite(
  batch: admin.firestore.WriteBatch,
  operationCount: number
): Promise<OperationResult<admin.firestore.WriteResult[]>> {
  const start = Date.now();

  try {
    const results = await batch.commit();
    const duration = Date.now() - start;

    sessionMetrics.batchWrites++;
    sessionMetrics.writes += operationCount;

    metrics.recordLatency("firestore_batch", duration, { operations: operationCount.toString() });
    metrics.incrementCounter("firestore_batch_writes");
    metrics.recordMetric("firestore_batch_size", operationCount);

    // Warn on large batches
    if (operationCount > 250) {
      metrics.warn("Large batch write", {
        operations: operationCount,
        duration,
      });
    }

    return {
      data: results,
      duration,
      documentsWritten: operationCount,
    };
  } catch (error) {
    const duration = Date.now() - start;
    sessionMetrics.errors++;

    metrics.recordError("firestore_batch", (error as Error).name);
    metrics.recordLatency("firestore_batch", duration, { error: "true" });

    throw error;
  }
}

/**
 * Monitor a transaction
 */
export async function monitoredTransaction<T>(
  db: admin.firestore.Firestore,
  transactionHandler: (transaction: admin.firestore.Transaction) => Promise<T>,
  transactionName?: string
): Promise<OperationResult<T>> {
  const start = Date.now();

  try {
    const result = await db.runTransaction(transactionHandler);
    const duration = Date.now() - start;

    metrics.recordLatency("firestore_transaction", duration, { name: transactionName || "unknown" });
    metrics.incrementCounter("firestore_transactions", { name: transactionName || "unknown" });

    return {
      data: result,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    sessionMetrics.errors++;

    metrics.recordError("firestore_transaction", (error as Error).name, { name: transactionName || "unknown" });
    metrics.recordLatency("firestore_transaction", duration, { name: transactionName || "unknown", error: "true" });

    throw error;
  }
}

// =============================================================================
// SESSION METRICS
// =============================================================================

/**
 * Get current session metrics
 */
export function getSessionMetrics(): FirestoreMetrics {
  return { ...sessionMetrics };
}

/**
 * Reset session metrics
 */
export function resetSessionMetrics(): void {
  sessionMetrics = {
    reads: 0,
    writes: 0,
    deletes: 0,
    queries: 0,
    batchWrites: 0,
    errors: 0,
  };
}

/**
 * Estimate cost based on session metrics
 * Pricing: $0.06/100K reads, $0.18/100K writes
 */
export function estimateSessionCost(): {
  reads: number;
  writes: number;
  totalUSD: number;
} {
  const readCost = (sessionMetrics.reads / 100000) * 0.06;
  const writeCost = ((sessionMetrics.writes + sessionMetrics.deletes) / 100000) * 0.18;

  return {
    reads: sessionMetrics.reads,
    writes: sessionMetrics.writes + sessionMetrics.deletes,
    totalUSD: readCost + writeCost,
  };
}

// =============================================================================
// QUERY BUILDER WITH MONITORING
// =============================================================================

/**
 * Create a monitored query builder
 */
export function createMonitoredQuery<T extends admin.firestore.DocumentData>(
  collection: admin.firestore.CollectionReference<T>
) {
  return {
    collection,

    async getDoc(id: string) {
      return monitoredGet(collection.doc(id));
    },

    async setDoc(id: string, data: T, options?: admin.firestore.SetOptions) {
      return monitoredSet(collection.doc(id), data, options);
    },

    async updateDoc(id: string, data: Partial<T>) {
      return monitoredUpdate(collection.doc(id), data);
    },

    async deleteDoc(id: string) {
      return monitoredDelete(collection.doc(id));
    },

    async query(
      queryFn: (col: admin.firestore.CollectionReference<T>) => admin.firestore.Query<T>,
      queryName?: string
    ) {
      return monitoredQuery(queryFn(collection), queryName);
    },
  };
}

export default {
  monitoredGet,
  monitoredSet,
  monitoredUpdate,
  monitoredDelete,
  monitoredQuery,
  monitoredBatchWrite,
  monitoredTransaction,
  getSessionMetrics,
  resetSessionMetrics,
  estimateSessionCost,
  createMonitoredQuery,
};
