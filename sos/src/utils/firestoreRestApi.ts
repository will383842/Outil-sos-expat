// src/utils/firestoreRestApi.ts
// Fallback REST API pour Firestore quand le SDK ne fonctionne pas

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sos-urgently-ac307';
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || '';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Convertit une valeur Firestore REST en valeur JavaScript
 */
function convertFirestoreValue(value: any): any {
  if (value === undefined || value === null) return null;

  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(convertFirestoreValue);
  }
  if ('mapValue' in value) {
    const result: Record<string, any> = {};
    const fields = value.mapValue.fields || {};
    for (const [key, val] of Object.entries(fields)) {
      result[key] = convertFirestoreValue(val);
    }
    return result;
  }

  return value;
}

/**
 * Convertit un document Firestore REST en objet JavaScript
 */
function convertFirestoreDocument(doc: any): { id: string; data: Record<string, any> } | null {
  if (!doc || !doc.name) return null;

  // Extraire l'ID du document depuis le path
  const nameParts = doc.name.split('/');
  const id = nameParts[nameParts.length - 1];

  const data: Record<string, any> = {};
  const fields = doc.fields || {};

  for (const [key, value] of Object.entries(fields)) {
    data[key] = convertFirestoreValue(value);
  }

  return { id, data };
}

/**
 * Récupère un document via l'API REST Firestore
 */
export async function getDocumentRest<T = Record<string, any>>(
  collectionPath: string,
  documentId: string,
  timeoutMs = 5000
): Promise<{ exists: boolean; data: T | null; id: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${BASE_URL}/${collectionPath}/${documentId}`;
    console.log(`📡 [REST API] Fetching document: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      console.log(`📡 [REST API] Document not found: ${collectionPath}/${documentId}`);
      return { exists: false, data: null, id: documentId };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const doc = await response.json();
    const converted = convertFirestoreDocument(doc);

    if (!converted) {
      return { exists: false, data: null, id: documentId };
    }

    console.log(`✅ [REST API] Document loaded: ${collectionPath}/${documentId}`);
    return { exists: true, data: converted.data as T, id: converted.id };

  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as Error).name === 'AbortError') {
      console.error(`❌ [REST API] Timeout after ${timeoutMs}ms`);
      throw new Error('REST API timeout');
    }

    console.error(`❌ [REST API] Error:`, error);
    throw error;
  }
}

/**
 * Récupère une collection via l'API REST Firestore
 */
export async function getCollectionRest<T = Record<string, any>>(
  collectionPath: string,
  options: {
    pageSize?: number;
    orderBy?: string;
    where?: Array<{
      field: string;
      op: 'EQUAL' | 'NOT_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL' | 'ARRAY_CONTAINS' | 'IN' | 'ARRAY_CONTAINS_ANY' | 'NOT_IN';
      value: any;
    }>;
    timeoutMs?: number;
  } = {}
): Promise<Array<{ id: string; data: T }>> {
  const { pageSize = 100, timeoutMs = 8000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Pour les requêtes simples, on utilise le endpoint GET avec la clé API
    let url = `${BASE_URL}/${collectionPath}?pageSize=${pageSize}`;
    if (API_KEY) {
      url += `&key=${API_KEY}`;
    }

    console.log(`📡 [REST API] Fetching collection: ${collectionPath} (pageSize=${pageSize})`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const documents = result.documents || [];

    const converted = documents
      .map(convertFirestoreDocument)
      .filter((doc: any): doc is { id: string; data: T } => doc !== null);

    console.log(`✅ [REST API] Collection loaded: ${collectionPath} (${converted.length} documents)`);
    return converted;

  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as Error).name === 'AbortError') {
      console.error(`❌ [REST API] Timeout after ${timeoutMs}ms for collection ${collectionPath}`);
      throw new Error('REST API timeout');
    }

    console.error(`❌ [REST API] Error fetching collection:`, error);
    throw error;
  }
}

/**
 * Exécute une requête structurée via l'API REST Firestore
 */
export async function runQueryRest<T = Record<string, any>>(
  collectionPath: string,
  filters: Array<{
    field: string;
    op: 'EQUAL' | 'NOT_EQUAL' | 'IN' | 'NOT_IN' | 'ARRAY_CONTAINS' | 'ARRAY_CONTAINS_ANY';
    value: any;
  }>,
  options: {
    limit?: number;
    timeoutMs?: number;
  } = {}
): Promise<Array<{ id: string; data: T }>> {
  const { limit = 100, timeoutMs = 8000 } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Construire le body de la requête structurée
    const structuredQuery: any = {
      from: [{ collectionId: collectionPath.split('/').pop() }],
      limit: limit,
    };

    if (filters.length > 0) {
      const whereFilters = filters.map(f => {
        const fieldFilter: any = {
          field: { fieldPath: f.field },
          op: f.op,
        };

        // Convertir la valeur en format Firestore
        if (Array.isArray(f.value)) {
          fieldFilter.value = {
            arrayValue: {
              values: f.value.map(v =>
                typeof v === 'string' ? { stringValue: v } :
                typeof v === 'number' ? { integerValue: String(v) } :
                typeof v === 'boolean' ? { booleanValue: v } :
                { stringValue: String(v) }
              )
            }
          };
        } else if (typeof f.value === 'string') {
          fieldFilter.value = { stringValue: f.value };
        } else if (typeof f.value === 'number') {
          fieldFilter.value = { integerValue: String(f.value) };
        } else if (typeof f.value === 'boolean') {
          fieldFilter.value = { booleanValue: f.value };
        }

        return { fieldFilter };
      });

      if (whereFilters.length === 1) {
        structuredQuery.where = whereFilters[0];
      } else {
        structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters: whereFilters,
          }
        };
      }
    }

    const url = `${BASE_URL}:runQuery`;
    console.log(`📡 [REST API] Running query on ${collectionPath}`, { filters, limit });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ structuredQuery }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [REST API] Query error response:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const results = await response.json();

    // Le résultat est un tableau d'objets avec { document: ... } ou { readTime: ... }
    const documents = results
      .filter((r: any) => r.document)
      .map((r: any) => convertFirestoreDocument(r.document))
      .filter((doc: any): doc is { id: string; data: T } => doc !== null);

    console.log(`✅ [REST API] Query completed: ${documents.length} results`);
    return documents;

  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as Error).name === 'AbortError') {
      console.error(`❌ [REST API] Query timeout after ${timeoutMs}ms`);
      throw new Error('REST API timeout');
    }

    console.error(`❌ [REST API] Query error:`, error);
    throw error;
  }
}
