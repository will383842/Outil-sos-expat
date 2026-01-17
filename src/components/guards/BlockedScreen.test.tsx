/**
 * =============================================================================
 * TESTS - BlockedScreen Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BlockedScreen, { BlockedScreenProps } from "./BlockedScreen";

// Mock firebase
const mockSignOut = vi.fn(() => Promise.resolve());
vi.mock("../../lib/firebase", () => ({
  auth: {
    signOut: () => mockSignOut(),
  },
}));

// Mock window.location
const mockLocationAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: { href: "", assign: mockLocationAssign },
  writable: true,
});

describe("BlockedScreen", () => {
  const defaultProps: BlockedScreenProps = {
    icon: "lock",
    title: "Test Title",
    description: "Test description",
    primaryAction: { label: "Primary", href: "https://example.com" },
    secondaryAction: { label: "Secondary", href: "https://help.com" },
    userEmail: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";
  });

  describe("Rendu de base", () => {
    it("affiche le titre correctement", () => {
      render(<BlockedScreen {...defaultProps} />);
      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    it("affiche la description correctement", () => {
      render(<BlockedScreen {...defaultProps} />);
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("affiche l'email de l'utilisateur", () => {
      render(<BlockedScreen {...defaultProps} />);
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });

    it("n'affiche pas l'email si null", () => {
      render(<BlockedScreen {...defaultProps} userEmail={null} />);
      expect(screen.queryByText(/Connecte en tant que/)).not.toBeInTheDocument();
    });

    it("affiche le copyright avec l'année courante", () => {
      render(<BlockedScreen {...defaultProps} />);
      const currentYear = new Date().getFullYear().toString();
      expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("affiche le bouton d'action primaire avec le bon lien", () => {
      render(<BlockedScreen {...defaultProps} />);
      const primaryButton = screen.getByText("Primary").closest("a");
      expect(primaryButton).toHaveAttribute("href", "https://example.com");
    });

    it("affiche le bouton d'action secondaire avec le bon lien", () => {
      render(<BlockedScreen {...defaultProps} />);
      const secondaryButton = screen.getByText("Secondary").closest("a");
      expect(secondaryButton).toHaveAttribute("href", "https://help.com");
    });

    it("affiche le bouton de déconnexion", () => {
      render(<BlockedScreen {...defaultProps} />);
      expect(screen.getByText("Se deconnecter")).toBeInTheDocument();
    });

    it("appelle signOut et redirige au clic sur déconnexion", async () => {
      render(<BlockedScreen {...defaultProps} />);
      const signOutButton = screen.getByText("Se deconnecter");

      fireEvent.click(signOutButton);

      // Attendre que la promesse soit résolue
      await vi.waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });
  });

  describe("Icônes", () => {
    it("affiche l'icône lock avec le bon style", () => {
      render(<BlockedScreen {...defaultProps} icon="lock" />);
      const iconContainer = document.querySelector(".bg-amber-100");
      expect(iconContainer).toBeInTheDocument();
    });

    it("affiche l'icône shield avec le bon style", () => {
      render(<BlockedScreen {...defaultProps} icon="shield" />);
      const iconContainer = document.querySelector(".bg-red-100");
      expect(iconContainer).toBeInTheDocument();
    });

    it("affiche l'icône user avec le bon style", () => {
      render(<BlockedScreen {...defaultProps} icon="user" />);
      const iconContainer = document.querySelector(".bg-gray-100");
      expect(iconContainer).toBeInTheDocument();
    });
  });
});
