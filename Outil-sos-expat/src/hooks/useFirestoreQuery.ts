/**
 * =============================================================================
 * FIRESTORE QUERY HOOKS - Hooks TanStack Query pour Firestore
 * =============================================================================
 *
 * Hooks réutilisables qui combinent TanStack Query avec Firestore pour:
 * - Cache automatique
 * - Refetch intelligent
 * - Optimistic updates
 * - Gestion d'erreurs centralisée
 *
 * =============================================================================
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  QueryConstraint,
  DocumentData,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { queryKeys } from "../lib/queryClient";
import { useEffect } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface FirestoreDocument {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

// =============================================================================
// HOOK: useFirestoreDocument
// =============================================================================

/**
 * Récupère un document Firestore par son ID
 */
export function useFirestoreDocument<T extends FirestoreDocument>(
  collectionName: string,
  documentId: string | null | undefined,
  options: QueryOptions = {}
) {
  return useQuery({
    queryKey: [collectionName, documentId],
    queryFn: async (): Promise<T | null> => {
      if (!documentId) return null;

      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      } as T;
    },
    enabled: !!documentId && options.enabled !== false,
    staleTime: options.staleTime,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
  });
}

// =============================================================================
// HOOK: useFirestoreCollection
// =============================================================================

/**
 * Récupère une collection Firestore avec filtres optionnels
 */
export function useFirestoreCollection<T extends FirestoreDocument>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: QueryOptions = {}
) {
  // Créer une clé de cache stable basée sur les contraintes
  const constraintKey = JSON.stringify(constraints.map((c) => c.type));

  return useQuery({
    queryKey: [collectionName, "list", constraintKey],
    queryFn: async (): Promise<T[]> => {
      const collectionRef = collection(db, collectionName);
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : query(collectionRef);

      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        } as T;
      });
    },
    enabled: options.enabled !== false,
    staleTime: options.staleTime,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
  });
}

// =============================================================================
// HOOK: useFirestoreRealtime
// =============================================================================

/**
 * Écoute un document en temps réel avec mise à jour du cache TanStack Query
 */
export function useFirestoreRealtime<T extends FirestoreDocument>(
  collectionName: string,
  documentId: string | null | undefined,
  options: QueryOptions = {}
) {
  const queryClient = useQueryClient();
  const queryKey = [collectionName, documentId];

  useEffect(() => {
    if (!documentId || options.enabled === false) return;

    const docRef = doc(db, collectionName, documentId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const document = {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
          } as T;

          queryClient.setQueryData(queryKey, document);
        } else {
          queryClient.setQueryData(queryKey, null);
        }
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.error(`[Firestore Realtime] Error listening to ${collectionName}/${documentId}:`, error);
        }
      }
    );

    return () => unsubscribe();
  }, [collectionName, documentId, queryClient, options.enabled]);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<T | null> => {
      if (!documentId) return null;

      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
      } as T;
    },
    enabled: !!documentId && options.enabled !== false,
  });
}

// =============================================================================
// HOOK: useFirestoreMutation (Create/Update/Delete)
// =============================================================================

/**
 * Mutation pour créer un document
 */
export function useCreateDocument<T extends DocumentData>(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: T): Promise<string> => {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    },
    onSuccess: () => {
      // Invalider les queries de la collection
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    },
  });
}

/**
 * Mutation pour mettre à jour un document
 */
export function useUpdateDocument<T extends Partial<DocumentData>>(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: T }): Promise<void> => {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
    },
    onSuccess: (_, variables) => {
      // Invalider le document spécifique et la liste
      queryClient.invalidateQueries({ queryKey: [collectionName, variables.id] });
      queryClient.invalidateQueries({ queryKey: [collectionName, "list"] });
    },
  });
}

/**
 * Mutation pour supprimer un document
 */
export function useDeleteDocument(collectionName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    },
    onSuccess: (_, id) => {
      // Invalider le document spécifique et la liste
      queryClient.invalidateQueries({ queryKey: [collectionName, id] });
      queryClient.invalidateQueries({ queryKey: [collectionName, "list"] });
    },
  });
}

// =============================================================================
// HOOKS SPÉCIFIQUES - Bookings
// =============================================================================

export interface Booking extends FirestoreDocument {
  clientName?: string;
  clientEmail?: string;
  country?: string;
  category?: string;
  status?: string;
  providerId?: string;
  urgencyLevel?: string;
  createdAt?: Date;
}

/**
 * Hook pour récupérer les bookings d'un provider
 */
export function useProviderBookings(providerId: string | null, options: QueryOptions = {}) {
  return useFirestoreCollection<Booking>(
    "bookings",
    providerId
      ? [
          where("providerId", "==", providerId),
          orderBy("createdAt", "desc"),
          limit(50),
        ]
      : [],
    { ...options, enabled: !!providerId && options.enabled !== false }
  );
}

/**
 * Hook pour récupérer tous les bookings (admin)
 */
export function useAllBookings(limitCount: number = 100, options: QueryOptions = {}) {
  return useFirestoreCollection<Booking>(
    "bookings",
    [orderBy("createdAt", "desc"), limit(limitCount)],
    options
  );
}

/**
 * Hook pour récupérer un booking par ID
 */
export function useBooking(bookingId: string | null, options: QueryOptions = {}) {
  return useFirestoreDocument<Booking>("bookings", bookingId, options);
}

// =============================================================================
// HOOKS SPÉCIFIQUES - Providers
// =============================================================================

export interface Provider extends FirestoreDocument {
  name?: string;
  email?: string;
  type?: "lawyer" | "expat";
  country?: string;
  active?: boolean;
  specialties?: string[];
}

/**
 * Hook pour récupérer tous les providers
 */
export function useProviders(options: QueryOptions = {}) {
  return useFirestoreCollection<Provider>(
    "providers",
    [where("active", "!=", false), orderBy("active"), orderBy("name")],
    options
  );
}

/**
 * Hook pour récupérer un provider par ID
 */
export function useProvider(providerId: string | null, options: QueryOptions = {}) {
  return useFirestoreDocument<Provider>("providers", providerId, options);
}

// =============================================================================
// HOOKS SPÉCIFIQUES - Conversations
// =============================================================================

export interface Conversation extends FirestoreDocument {
  bookingId?: string;
  providerId?: string;
  userId?: string;
  messageCount?: number;
}

export interface Message extends FirestoreDocument {
  role: "user" | "assistant" | "system";
  content: string;
  source?: string;
  model?: string;
  timestamp?: Date;
}

/**
 * Hook pour récupérer les conversations d'un booking
 */
export function useBookingConversations(bookingId: string | null, options: QueryOptions = {}) {
  return useFirestoreCollection<Conversation>(
    "conversations",
    bookingId ? [where("bookingId", "==", bookingId)] : [],
    { ...options, enabled: !!bookingId && options.enabled !== false }
  );
}

/**
 * Hook pour récupérer les messages d'une conversation
 */
export function useConversationMessages(conversationId: string | null, options: QueryOptions = {}) {
  return useFirestoreCollection<Message>(
    `conversations/${conversationId}/messages`,
    [orderBy("timestamp", "asc")],
    { ...options, enabled: !!conversationId && options.enabled !== false }
  );
}
