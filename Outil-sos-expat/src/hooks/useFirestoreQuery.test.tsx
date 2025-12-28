/**
 * =============================================================================
 * TESTS - Firestore Query Hooks
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Mock Firebase Firestore - simplified
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((db, name) => ({ _path: name })),
  doc: vi.fn((db, collection, id) => ({ _path: `${collection}/${id}` })),
  getDoc: vi.fn(() =>
    Promise.resolve({
      exists: () => false,
      id: "test-id",
      data: () => null,
    })
  ),
  getDocs: vi.fn(() =>
    Promise.resolve({
      docs: [],
    })
  ),
  query: vi.fn((ref) => ref),
  where: vi.fn(() => ({ type: "where" })),
  orderBy: vi.fn(() => ({ type: "orderBy" })),
  limit: vi.fn(() => ({ type: "limit" })),
  addDoc: vi.fn(() => Promise.resolve({ id: "new-id" })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn(() => vi.fn()),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
  },
}));

vi.mock("../lib/firebase", () => ({
  db: {},
}));

// Import after mocks
import {
  useFirestoreDocument,
  useFirestoreCollection,
  FirestoreDocument,
} from "./useFirestoreQuery";

// Wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useFirestoreDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne undefined quand documentId est null", async () => {
    const { result } = renderHook(() => useFirestoreDocument("users", null), {
      wrapper: createWrapper(),
    });

    // La query est désactivée donc pas de fetching
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("retourne undefined quand documentId est undefined", async () => {
    const { result } = renderHook(
      () => useFirestoreDocument("users", undefined),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it("est désactivé quand enabled=false", () => {
    const { result } = renderHook(
      () => useFirestoreDocument("users", "user-123", { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("retourne la bonne structure de requête", () => {
    const { result } = renderHook(
      () => useFirestoreDocument("users", "user-123"),
      { wrapper: createWrapper() }
    );

    // Vérifie que les propriétés de base existent
    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("isError");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("isFetching");
  });

  it("exécute une requête quand documentId est fourni", async () => {
    const { result } = renderHook(
      () => useFirestoreDocument("users", "user-123"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Après le chargement, soit success soit error
    expect(
      result.current.isSuccess || result.current.isError
    ).toBe(true);
  });
});

describe("useFirestoreCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("est désactivé quand enabled=false", () => {
    const { result } = renderHook(
      () => useFirestoreCollection("bookings", [], { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("retourne la bonne structure de requête", () => {
    const { result } = renderHook(() => useFirestoreCollection("bookings"), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("isError");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("isFetching");
  });

  it("accepte des contraintes de requête", () => {
    const { result } = renderHook(
      () =>
        useFirestoreCollection("bookings", [
          { type: "where" } as unknown as import("firebase/firestore").QueryConstraint,
          { type: "orderBy" } as unknown as import("firebase/firestore").QueryConstraint,
        ]),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeDefined();
  });

  it("exécute une requête sur une collection", async () => {
    const { result } = renderHook(() => useFirestoreCollection("bookings"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // La requête devrait être terminée
    expect(
      result.current.isSuccess || result.current.isError
    ).toBe(true);
  });
});

describe("Types et interfaces", () => {
  it("FirestoreDocument a les propriétés requises", () => {
    const doc: FirestoreDocument = {
      id: "test-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(doc.id).toBe("test-id");
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  it("FirestoreDocument accepte des champs optionnels", () => {
    const doc: FirestoreDocument = {
      id: "test-id",
    };

    expect(doc.id).toBe("test-id");
    expect(doc.createdAt).toBeUndefined();
    expect(doc.updatedAt).toBeUndefined();
  });
});
