/**
 * =============================================================================
 * TESTS - ProtectedRoute Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useSubscription
const mockUseSubscription = vi.fn();
vi.mock("../contexts/SubscriptionContext", () => ({
  useSubscription: () => mockUseSubscription(),
}));

function renderWithRouter(ui: React.ReactElement, initialRoute = "/protected") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/auth" element={<div>Auth Page</div>} />
        <Route
          path="/protected"
          element={<ProtectedRoute>{ui}</ProtectedRoute>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading States", () => {
    it("affiche le spinner pendant le chargement auth", () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: false,
        hasAllowedRole: false,
        role: null,
        loading: false,
        error: null,
      });

      renderWithRouter(<div>Protected Content</div>);

      expect(screen.getByText("Chargement...")).toBeInTheDocument();
    });

    it("affiche le spinner pendant la vérification abonnement", () => {
      mockUseAuth.mockReturnValue({
        user: { uid: "123", email: "test@test.com" },
        loading: false,
      });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: false,
        hasAllowedRole: false,
        role: null,
        loading: true,
        error: null,
      });

      renderWithRouter(<div>Protected Content</div>);

      expect(screen.getByText("Vérification de votre accès...")).toBeInTheDocument();
    });
  });

  describe("Access Control", () => {
    it("redirige vers /auth si pas d'utilisateur", () => {
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: false,
        hasAllowedRole: false,
        role: null,
        loading: false,
        error: null,
      });

      renderWithRouter(<div>Protected Content</div>);

      expect(screen.getByText("Auth Page")).toBeInTheDocument();
    });

    it("affiche le contenu protégé si tout est valide", () => {
      mockUseAuth.mockReturnValue({
        user: { uid: "123", email: "test@test.com" },
        loading: false,
      });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: true,
        hasAllowedRole: true,
        role: "lawyer",
        loading: false,
        error: null,
      });

      renderWithRouter(<div>Protected Content</div>);

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("Blocked Screens", () => {
    it("affiche écran 'Compte non trouvé' en cas d'erreur", () => {
      mockUseAuth.mockReturnValue({
        user: { uid: "123", email: "test@test.com" },
        loading: false,
      });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: false,
        hasAllowedRole: false,
        role: null,
        loading: false,
        error: "User not found",
      });

      renderWithRouter(<div>Protected Content</div>);

      expect(screen.getByText("Compte non trouvé")).toBeInTheDocument();
    });

    it("affiche écran 'Accès réservé' si rôle non autorisé", () => {
      mockUseAuth.mockReturnValue({
        user: { uid: "123", email: "test@test.com" },
        loading: false,
      });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: true,
        hasAllowedRole: false,
        role: "user",
        loading: false,
        error: null,
      });

      renderWithRouter(<div>Protected Content</div>);

      expect(screen.getByText("Accès réservé aux prestataires")).toBeInTheDocument();
    });

    it("affiche écran 'Abonnement requis' si pas d'abonnement", () => {
      mockUseAuth.mockReturnValue({
        user: { uid: "123", email: "test@test.com" },
        loading: false,
      });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: false,
        hasAllowedRole: true,
        role: "lawyer",
        loading: false,
        error: null,
      });

      renderWithRouter(<div>Protected Content</div>);

      expect(screen.getByText("Abonnement requis")).toBeInTheDocument();
    });

    it("affiche les liens d'action dans les écrans bloqués", () => {
      mockUseAuth.mockReturnValue({
        user: { uid: "123", email: "test@test.com" },
        loading: false,
      });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: false,
        hasAllowedRole: true,
        role: "lawyer",
        loading: false,
        error: null,
      });

      renderWithRouter(<div>Protected Content</div>);

      // Le nouveau composant SubscriptionScreen utilise ces textes
      expect(screen.getByText("S'abonner maintenant")).toBeInTheDocument();
      expect(screen.getByText(/Contactez-nous/)).toBeInTheDocument();
      expect(screen.getByText("Se deconnecter")).toBeInTheDocument();
    });

    it("affiche l'email de l'utilisateur dans les écrans bloqués", () => {
      mockUseAuth.mockReturnValue({
        user: { uid: "123", email: "blocked@test.com" },
        loading: false,
      });
      mockUseSubscription.mockReturnValue({
        hasActiveSubscription: false,
        hasAllowedRole: true,
        role: "lawyer",
        loading: false,
        error: null,
      });

      renderWithRouter(<div>Protected Content</div>);

      expect(screen.getByText(/blocked@test.com/)).toBeInTheDocument();
    });
  });
});
