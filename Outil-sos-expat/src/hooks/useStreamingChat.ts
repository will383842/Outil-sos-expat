/**
 * =============================================================================
 * USE STREAMING CHAT - Hook pour chat IA avec streaming SSE
 * =============================================================================
 *
 * Utilise Server-Sent Events pour afficher les réponses IA progressivement.
 * Feedback visuel immédiat = perception de rapidité améliorée.
 *
 * Usage:
 *   const { messages, sendMessage, streaming, error } = useStreamingChat(conversationId);
 *
 * =============================================================================
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { auth } from "../lib/firebase";

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  streaming?: boolean;
  model?: string;
  provider?: string;
}

// P0 FIX: Types pour les événements de progression
export interface ProgressData {
  step: "initializing" | "validating" | "searching" | "analyzing" | "generating" | "finalizing";
  stepNumber: number;
  totalSteps: number;
  message: string;
}

interface StreamEvent {
  event: "start" | "chunk" | "done" | "error" | "progress" | "warning";
  data: Record<string, unknown>;
}

interface UseStreamingChatReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  streaming: boolean;
  error: string | null;
  progress: ProgressData | null;  // P0 FIX: État de progression
  clearError: () => void;
  clearMessages: () => void;
}

interface StreamingChatOptions {
  onStart?: (conversationId: string) => void;
  onChunk?: (text: string, fullText: string) => void;
  onDone?: (response: { conversationId: string; messageId: string }) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: ProgressData) => void;  // P0 FIX: Callback de progression
  fallbackToClassic?: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const STREAM_ENDPOINT = "/aiChatStream";
const FALLBACK_ENDPOINT = "/chat";

// =============================================================================
// HOOK
// =============================================================================

export function useStreamingChat(
  conversationId?: string,
  options: StreamingChatOptions = {}
): UseStreamingChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);  // P0 FIX: État progression
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageRef = useRef<string>("");

  // Update conversation ID if prop changes
  useEffect(() => {
    if (conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
      setMessages([]);
    }
  }, [conversationId, currentConversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Parse SSE event from text line
   */
  const parseSSELine = useCallback((line: string): StreamEvent | null => {
    if (!line.startsWith("data: ")) return null;

    try {
      const data = JSON.parse(line.slice(6));
      // Extract event type from preceding line or default to 'chunk'
      return { event: "chunk", data };
    } catch {
      return null;
    }
  }, []);

  /**
   * Parse full SSE event (event: + data:)
   */
  const parseSSEBlock = useCallback(
    (block: string): StreamEvent | null => {
      const lines = block.split("\n");
      let event: StreamEvent["event"] = "chunk";
      let data: Record<string, unknown> = {};

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          event = line.slice(7).trim() as StreamEvent["event"];
        } else if (line.startsWith("data: ")) {
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            // Invalid JSON, ignore
          }
        }
      }

      return { event, data };
    },
    []
  );

  /**
   * Send message with streaming
   */
  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim() || streaming) return;

      // Abort previous stream if any
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setStreaming(true);
      setError(null);
      setProgress(null);  // P0 FIX: Reset progress
      streamingMessageRef.current = "";

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      // Add placeholder for AI response
      const aiMessageId = `ai-${Date.now()}`;
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };

      setMessages((prev) => [...prev, userMessage, aiMessage]);

      try {
        // Get auth token
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          throw new Error("Non authentifié");
        }

        const response = await fetch(`${API_BASE_URL}${STREAM_ENDPOINT}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            message: text.trim(),
            conversationId: currentConversationId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Erreur ${response.status}`);
        }

        // Check if streaming is supported
        if (!response.body) {
          throw new Error("Streaming non supporté");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split by double newline (SSE event separator)
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || ""; // Keep incomplete block

          for (const block of blocks) {
            if (!block.trim()) continue;

            const event = parseSSEBlock(block);
            if (!event) continue;

            switch (event.event) {
              case "start":
                if (event.data.conversationId) {
                  setCurrentConversationId(event.data.conversationId as string);
                  options.onStart?.(event.data.conversationId as string);
                }
                break;

              case "chunk":
                if (event.data.text) {
                  const chunkText = event.data.text as string;
                  streamingMessageRef.current += chunkText;

                  // Update message content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMessageId
                        ? { ...msg, content: streamingMessageRef.current }
                        : msg
                    )
                  );

                  options.onChunk?.(chunkText, streamingMessageRef.current);
                }
                break;

              case "done":
                // Finalize message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? {
                          ...msg,
                          streaming: false,
                          model: event.data.model as string,
                          provider: event.data.provider as string,
                        }
                      : msg
                  )
                );

                options.onDone?.({
                  conversationId: event.data.conversationId as string,
                  messageId: event.data.messageId as string,
                });
                break;

              case "progress":
                // P0 FIX: Gérer les événements de progression
                const progressData: ProgressData = {
                  step: event.data.step as ProgressData["step"],
                  stepNumber: event.data.stepNumber as number,
                  totalSteps: event.data.totalSteps as number,
                  message: event.data.message as string,
                };
                setProgress(progressData);
                options.onProgress?.(progressData);
                break;

              case "warning":
                // P0 FIX: Gérer les warnings de modération
                console.warn("[useStreamingChat] Warning:", event.data);
                break;

              case "error":
                throw new Error((event.data.error as string) || "Erreur streaming");
            }
          }
        }
      } catch (err) {
        const errorMessage = (err as Error).message;

        // Handle abort
        if ((err as Error).name === "AbortError") {
          console.debug("[useStreamingChat] Aborted");
          return;
        }

        console.error("[useStreamingChat] Error:", err);
        setError(errorMessage);
        options.onError?.(errorMessage);

        // Remove failed AI message or show error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content: streamingMessageRef.current || "Erreur lors de la génération de la réponse.",
                  streaming: false,
                }
              : msg
          )
        );

        // Fallback to classic endpoint if enabled
        if (options.fallbackToClassic && !streamingMessageRef.current) {
          await fallbackToClassic(text.trim(), aiMessageId);
        }
      } finally {
        setStreaming(false);
        setProgress(null);  // P0 FIX: Reset progress when done
        abortControllerRef.current = null;
      }
    },
    [streaming, currentConversationId, options, parseSSEBlock]
  );

  /**
   * Fallback to classic (non-streaming) endpoint
   */
  const fallbackToClassic = async (
    text: string,
    aiMessageId: string
  ): Promise<void> => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}${FALLBACK_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.ok && data.response) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content: data.response,
                  streaming: false,
                  model: data.model,
                  provider: data.provider,
                }
              : msg
          )
        );

        if (data.conversationId) {
          setCurrentConversationId(data.conversationId);
        }
      }
    } catch (err) {
      console.error("[useStreamingChat] Fallback error:", err);
    }
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    streamingMessageRef.current = "";
  }, []);

  return {
    messages,
    sendMessage,
    streaming,
    error,
    progress,  // P0 FIX: Exposer l'état de progression
    clearError,
    clearMessages,
  };
}

// =============================================================================
// HOOK POUR COMPOSANT DE MESSAGE EN STREAMING
// =============================================================================

interface UseStreamingTextReturn {
  displayText: string;
  isStreaming: boolean;
  cursorVisible: boolean;
}

/**
 * Hook pour l'animation du texte en streaming
 * Ajoute un curseur clignotant pendant le streaming
 */
export function useStreamingText(
  text: string,
  isStreaming: boolean
): UseStreamingTextReturn {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!isStreaming) {
      setCursorVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return {
    displayText: text,
    isStreaming,
    cursorVisible: isStreaming && cursorVisible,
  };
}

export default useStreamingChat;
