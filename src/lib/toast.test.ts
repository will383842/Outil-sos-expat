/**
 * =============================================================================
 * TESTS - Toast Utility
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import toast from "react-hot-toast";
import {
  showSuccess,
  showError,
  showLoading,
  showInfo,
  dismissToast,
  dismissAllToasts,
  notify,
  promiseToast,
} from "./toast";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(() => "toast-id"),
    error: vi.fn(() => "toast-id"),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
    promise: vi.fn((promise) => promise),
  },
  __esModule: true,
}));

describe("Toast Utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("showSuccess", () => {
    it("appelle toast.success avec le message", () => {
      showSuccess("Test success");
      expect(toast.success).toHaveBeenCalledWith("Test success", {
        duration: 3000,
        id: undefined,
      });
    });

    it("respecte les options personnalisées", () => {
      showSuccess("Test", { duration: 5000, id: "custom-id" });
      expect(toast.success).toHaveBeenCalledWith("Test", {
        duration: 5000,
        id: "custom-id",
      });
    });
  });

  describe("showError", () => {
    it("appelle toast.error avec durée plus longue", () => {
      showError("Test error");
      expect(toast.error).toHaveBeenCalledWith("Test error", {
        duration: 5000,
        id: undefined,
      });
    });
  });

  describe("showLoading", () => {
    it("appelle toast.loading sans durée", () => {
      showLoading("Chargement...");
      expect(toast.loading).toHaveBeenCalledWith("Chargement...", {
        id: undefined,
      });
    });
  });

  describe("dismissToast", () => {
    it("appelle toast.dismiss avec l'ID", () => {
      dismissToast("my-toast-id");
      expect(toast.dismiss).toHaveBeenCalledWith("my-toast-id");
    });
  });

  describe("dismissAllToasts", () => {
    it("appelle toast.dismiss sans argument", () => {
      dismissAllToasts();
      expect(toast.dismiss).toHaveBeenCalledWith();
    });
  });

  describe("notify shortcuts", () => {
    it("authSuccess affiche le bon message", () => {
      notify.authSuccess();
      expect(toast.success).toHaveBeenCalledWith(
        "Connexion réussie",
        expect.any(Object)
      );
    });

    it("aiError affiche le bon message", () => {
      notify.aiError();
      expect(toast.error).toHaveBeenCalledWith(
        "L'assistant IA n'a pas pu répondre. Veuillez réessayer.",
        expect.any(Object)
      );
    });

    it("quotaExceeded affiche le bon message", () => {
      notify.quotaExceeded();
      expect(toast.error).toHaveBeenCalledWith(
        "Votre quota d'appels IA est épuisé pour ce mois.",
        expect.any(Object)
      );
    });

    it("saveSuccess affiche le bon message", () => {
      notify.saveSuccess();
      expect(toast.success).toHaveBeenCalledWith(
        "Modifications enregistrées",
        expect.any(Object)
      );
    });

    it("networkError affiche le bon message", () => {
      notify.networkError();
      expect(toast.error).toHaveBeenCalledWith(
        "Problème de connexion. Vérifiez votre réseau.",
        expect.any(Object)
      );
    });
  });

  describe("promiseToast", () => {
    it("appelle toast.promise avec la promesse et les messages", async () => {
      const promise = Promise.resolve("success");
      const messages = {
        loading: "Chargement...",
        success: "Succès !",
        error: "Erreur !",
      };

      await promiseToast(promise, messages);

      expect(toast.promise).toHaveBeenCalledWith(promise, messages);
    });
  });
});
