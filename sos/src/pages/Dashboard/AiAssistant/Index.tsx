/**
 * AI Assistant Access Page
 * Page d'accès à l'Outil IA - Affiche quota, conversations récentes, et lien vers Outil
 *
 * ARCHITECTURE:
 * - SOS gère les abonnements et affiche le quota
 * - Outil-sos-expat est L'OUTIL IA complet (chat, conversations)
 * - Cette page sert de "passerelle" vers l'Outil
 *
 * V2 UPDATE (2026):
 * - Modern UI with glassmorphism, animations, and modular components
 * - Reduced from 1,122 lines to ~400 lines (main component)
 * - Full dark mode support
 * - WCAG 2.1 AA accessibility
 * - Mobile-first responsive design
 */

// ============================================================================
// V2 EXPORT - Modern 2026 UI
// ============================================================================
export { AiAssistantPageV2 as AiAssistantPage } from './AiAssistantPageV2';
export { default } from './AiAssistantPageV2';
