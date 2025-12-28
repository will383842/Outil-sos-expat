/**
 * =============================================================================
 * TESTS - GPTChatBox Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "../../test/test-utils";
import GPTChatBox from "./GPTChatBox";
import type { ChatMessage } from "../../types";

describe("GPTChatBox", () => {
  const mockOnSendMessage = vi.fn();
  const mockOnRetryMessage = vi.fn();

  const defaultProps = {
    messages: [] as ChatMessage[],
    onSendMessage: mockOnSendMessage,
    onRetryMessage: mockOnRetryMessage,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("affiche le champ de saisie", () => {
      render(<GPTChatBox {...defaultProps} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("affiche le bouton d'envoi", () => {
      render(<GPTChatBox {...defaultProps} />);

      const button = screen.getByRole("button", { name: /envoyer/i });
      expect(button).toBeInTheDocument();
    });

    it("affiche le placeholder personnalisé", () => {
      render(
        <GPTChatBox {...defaultProps} placeholder="Tapez votre message..." />
      );

      const input = screen.getByPlaceholderText("Tapez votre message...");
      expect(input).toBeInTheDocument();
    });

    it("affiche les messages de l'utilisateur", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          content: "Bonjour",
          role: "user",
          timestamp: new Date(),
        },
      ];

      render(<GPTChatBox {...defaultProps} messages={messages} />);

      expect(screen.getByText("Bonjour")).toBeInTheDocument();
    });

    it("affiche les messages de l'assistant", () => {
      const messages: ChatMessage[] = [
        {
          id: "1",
          content: "Je suis là pour vous aider",
          role: "assistant",
          timestamp: new Date(),
        },
      ];

      render(<GPTChatBox {...defaultProps} messages={messages} />);

      expect(screen.getByText("Je suis là pour vous aider")).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("permet de taper un message", () => {
      render(<GPTChatBox {...defaultProps} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Test message" } });

      expect(input).toHaveValue("Test message");
    });

    it("envoie le message au submit", () => {
      render(<GPTChatBox {...defaultProps} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Test message" } });

      const form = input.closest("form");
      fireEvent.submit(form!);

      expect(mockOnSendMessage).toHaveBeenCalledWith("Test message");
    });

    it("vide le champ après envoi", () => {
      render(<GPTChatBox {...defaultProps} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Test message" } });

      const form = input.closest("form");
      fireEvent.submit(form!);

      expect(input).toHaveValue("");
    });

    it("n'envoie pas de message vide", () => {
      render(<GPTChatBox {...defaultProps} />);

      const input = screen.getByRole("textbox");
      const form = input.closest("form");
      fireEvent.submit(form!);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it("n'envoie pas pendant le chargement", () => {
      render(<GPTChatBox {...defaultProps} isLoading={true} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Test" } });

      const form = input.closest("form");
      fireEvent.submit(form!);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("affiche l'indicateur de chargement", () => {
      render(<GPTChatBox {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/réfléchit/i)).toBeInTheDocument();
    });

    it("désactive le bouton d'envoi pendant le chargement", () => {
      render(<GPTChatBox {...defaultProps} isLoading={true} />);

      const button = screen.getByRole("button", { name: /envoi en cours/i });
      expect(button).toBeDisabled();
    });

    it("désactive le textarea pendant le chargement", () => {
      render(<GPTChatBox {...defaultProps} isLoading={true} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });
  });

  describe("Error State", () => {
    it("affiche le message d'erreur", () => {
      render(
        <GPTChatBox {...defaultProps} error="Une erreur s'est produite" />
      );

      expect(screen.getByText("Une erreur s'est produite")).toBeInTheDocument();
    });

    it("l'erreur a le rôle alert pour l'accessibilité", () => {
      render(
        <GPTChatBox {...defaultProps} error="Une erreur s'est produite" />
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("le conteneur de messages a le rôle log", () => {
      render(<GPTChatBox {...defaultProps} />);

      expect(screen.getByRole("log")).toBeInTheDocument();
    });

    it("le textarea a un aria-label", () => {
      render(<GPTChatBox {...defaultProps} />);

      const input = screen.getByLabelText(/message à envoyer/i);
      expect(input).toBeInTheDocument();
    });

    it("le bouton d'envoi a un aria-label descriptif", () => {
      render(<GPTChatBox {...defaultProps} />);

      const button = screen.getByLabelText(/envoyer le message/i);
      expect(button).toBeInTheDocument();
    });

    it("l'indicateur de chargement a aria-busy", () => {
      render(<GPTChatBox {...defaultProps} isLoading={true} />);

      const statuses = screen.getAllByRole("status");
      const loadingIndicator = statuses.find(el => el.getAttribute("aria-busy") === "true");
      expect(loadingIndicator).toBeInTheDocument();
    });
  });

  describe("Character Counter", () => {
    it("affiche le compteur de caractères quand on tape", () => {
      render(<GPTChatBox {...defaultProps} />);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Test" } });

      expect(screen.getByText("4/1000")).toBeInTheDocument();
    });

    it("n'affiche pas le compteur quand le champ est vide", () => {
      render(<GPTChatBox {...defaultProps} />);

      expect(screen.queryByText(/\/1000/)).not.toBeInTheDocument();
    });
  });
});
