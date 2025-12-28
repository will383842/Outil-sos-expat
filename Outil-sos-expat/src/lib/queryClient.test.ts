/**
 * =============================================================================
 * TESTS - QueryClient Configuration
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryClient, queryKeys, invalidateEntity, clearAllCache } from "./queryClient";

describe("QueryClient", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  describe("Configuration par défaut", () => {
    it("est initialisé correctement", () => {
      expect(queryClient).toBeDefined();
      expect(queryClient.getDefaultOptions()).toBeDefined();
    });

    it("a les bonnes options par défaut pour les queries", () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultOptions.queries?.gcTime).toBe(30 * 60 * 1000); // 30 minutes
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(true);
      expect(defaultOptions.queries?.refetchOnReconnect).toBe(true);
    });

    it("a les bonnes options par défaut pour les mutations", () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.mutations?.retry).toBe(1);
    });
  });
});

describe("queryKeys", () => {
  describe("Users", () => {
    it("génère les clés pour users.all", () => {
      expect(queryKeys.users.all).toEqual(["users"]);
    });

    it("génère les clés pour users.detail", () => {
      expect(queryKeys.users.detail("123")).toEqual(["users", "123"]);
    });

    it("génère les clés pour users.byEmail", () => {
      expect(queryKeys.users.byEmail("test@example.com")).toEqual([
        "users",
        "email",
        "test@example.com",
      ]);
    });
  });

  describe("Providers", () => {
    it("génère les clés pour providers.all", () => {
      expect(queryKeys.providers.all).toEqual(["providers"]);
    });

    it("génère les clés pour providers.detail", () => {
      expect(queryKeys.providers.detail("provider-123")).toEqual([
        "providers",
        "provider-123",
      ]);
    });

    it("génère les clés pour providers.byType", () => {
      expect(queryKeys.providers.byType("lawyer")).toEqual([
        "providers",
        "type",
        "lawyer",
      ]);
    });

    it("génère les clés pour providers.stats", () => {
      expect(queryKeys.providers.stats("provider-123")).toEqual([
        "providers",
        "provider-123",
        "stats",
      ]);
    });
  });

  describe("Bookings", () => {
    it("génère les clés pour bookings.all", () => {
      expect(queryKeys.bookings.all).toEqual(["bookings"]);
    });

    it("génère les clés pour bookings.list avec filtres", () => {
      const filters = { status: "active" };
      expect(queryKeys.bookings.list(filters)).toEqual([
        "bookings",
        "list",
        filters,
      ]);
    });

    it("génère les clés pour bookings.detail", () => {
      expect(queryKeys.bookings.detail("booking-456")).toEqual([
        "bookings",
        "booking-456",
      ]);
    });

    it("génère les clés pour bookings.byProvider", () => {
      expect(queryKeys.bookings.byProvider("provider-123")).toEqual([
        "bookings",
        "provider",
        "provider-123",
      ]);
    });

    it("génère les clés pour bookings.recent", () => {
      expect(queryKeys.bookings.recent(10)).toEqual(["bookings", "recent", 10]);
    });
  });

  describe("Conversations", () => {
    it("génère les clés pour conversations.all", () => {
      expect(queryKeys.conversations.all).toEqual(["conversations"]);
    });

    it("génère les clés pour conversations.messages", () => {
      expect(queryKeys.conversations.messages("conv-123")).toEqual([
        "conversations",
        "conv-123",
        "messages",
      ]);
    });

    it("génère les clés pour conversations.byBooking", () => {
      expect(queryKeys.conversations.byBooking("booking-456")).toEqual([
        "conversations",
        "booking",
        "booking-456",
      ]);
    });
  });

  describe("Stats", () => {
    it("génère les clés pour stats.dashboard", () => {
      expect(queryKeys.stats.dashboard).toEqual(["stats", "dashboard"]);
    });

    it("génère les clés pour stats.provider", () => {
      expect(queryKeys.stats.provider("provider-123")).toEqual([
        "stats",
        "provider",
        "provider-123",
      ]);
    });

    it("génère les clés pour stats.ai", () => {
      expect(queryKeys.stats.ai).toEqual(["stats", "ai"]);
    });
  });

  describe("CountryConfigs", () => {
    it("génère les clés pour countryConfigs.all", () => {
      expect(queryKeys.countryConfigs.all).toEqual(["countryConfigs"]);
    });

    it("génère les clés pour countryConfigs.detail", () => {
      expect(queryKeys.countryConfigs.detail("FR")).toEqual([
        "countryConfigs",
        "FR",
      ]);
    });
  });
});

describe("Helpers", () => {
  describe("invalidateEntity", () => {
    it("invalide les queries d'une entité", () => {
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      invalidateEntity("users");

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["users"],
      });
    });
  });

  describe("clearAllCache", () => {
    it("vide tout le cache", () => {
      const clearSpy = vi.spyOn(queryClient, "clear");

      clearAllCache();

      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
