/**
 * =============================================================================
 * CHAT COMPONENTS - Barrel Export
 * Reusable chat components for AI-assisted conversations
 * =============================================================================
 */

// Main container component
export { AIChat, default as AIChatDefault } from "./AIChat";
export type { AIChatProps, Message } from "./AIChat";

// Individual message component
export { ChatMessage, default as ChatMessageDefault } from "./ChatMessage";
export type { ChatMessageProps, ChatMessageData } from "./ChatMessage";

// Input component with auto-resize
export { ChatInput, default as ChatInputDefault } from "./ChatInput";
export type { ChatInputProps } from "./ChatInput";
