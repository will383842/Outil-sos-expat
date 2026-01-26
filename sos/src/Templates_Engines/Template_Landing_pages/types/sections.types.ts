/**
 * ============================================================================
 * TYPES SECTIONS - LANDING PAGE CONTENT
 * ============================================================================
 *
 * Types pour toutes les sections de contenu d'une landing page :
 * Hero, Problem, Solution, Process, Benefits, FAQ, Testimonials, CTA
 */

// ============================================================================
// SECTIONS CONTAINER
// ============================================================================

export interface LandingSections {
  hero: HeroSection;
  problem?: ProblemSection;
  solution?: SolutionSection;
  howItWorks?: HowItWorksSection;
  advantages?: AdvantagesSection;
  testimonials?: TestimonialsSection;
  faq: FAQSection;
  cta: CTASection;
}

// ============================================================================
// HERO SECTION
// ============================================================================

export interface HeroSection {
  /** Titre principal (H1) */
  title: string;
  /** Sous-titre descriptif */
  subtitle: string;
  /** Image de fond responsive */
  image?: ResponsiveImage;
  /** Badges affichés dans le hero */
  badges?: string[];
  /** Gradient de fond (si pas d'image) */
  backgroundGradient?: string;
}

export interface ResponsiveImage {
  /** URL de l'image principale */
  src: string;
  /** Texte alternatif pour accessibilité */
  alt: string;
  /** Largeur native */
  width: number;
  /** Hauteur native */
  height: number;
  /** Sources pour différentes tailles d'écran */
  srcset: Array<{ src: string; width: number }>;
  /** Attribut sizes pour le navigateur */
  sizes: string;
  /** Stratégie de chargement */
  loading: 'lazy' | 'eager';
}

// ============================================================================
// PROBLEM SECTION
// ============================================================================

export interface ProblemSection {
  /** Titre de la section */
  title: string;
  /** Introduction optionnelle */
  intro?: string;
  /** Liste des problèmes */
  items: ProblemItem[];
}

export interface ProblemItem {
  title: string;
  description: string;
  icon: string;
}

// ============================================================================
// SOLUTION SECTION
// ============================================================================

export interface SolutionSection {
  /** Titre de la section */
  title: string;
  /** Introduction optionnelle */
  intro?: string;
  /** Liste des fonctionnalités */
  features: SolutionFeature[];
}

export interface SolutionFeature {
  title: string;
  description: string;
  icon: string;
}

// ============================================================================
// HOW IT WORKS SECTION
// ============================================================================

export interface HowItWorksSection {
  /** Titre de la section */
  title: string;
  /** Introduction optionnelle */
  intro?: string;
  /** Temps total estimé */
  totalTime: string;
  /** Étapes du processus */
  steps: ProcessStep[];
}

export interface ProcessStep {
  /** Numéro de l'étape (1, 2, 3...) */
  number: number;
  /** Titre de l'étape */
  title: string;
  /** Description détaillée */
  description: string;
  /** Icône représentative */
  icon: string;
  /** Temps estimé pour cette étape */
  estimatedTime: string;
}

// ============================================================================
// ADVANTAGES SECTION
// ============================================================================

export interface AdvantagesSection {
  /** Titre de la section (optionnel) */
  title?: string;
  /** Liste des avantages */
  items: AdvantageItem[];
}

export interface AdvantageItem {
  title: string;
  description: string;
  icon: string;
}

// ============================================================================
// TESTIMONIALS SECTION
// ============================================================================

export interface TestimonialsSection {
  /** Titre de la section (optionnel) */
  title?: string;
  /** Liste des témoignages */
  items: Testimonial[];
  /** Note agrégée pour Schema.org */
  aggregateRating: AggregateRating;
}

export interface Testimonial {
  /** Nom du client */
  name: string;
  /** Localisation (ville, pays) */
  location?: string;
  /** URL de l'avatar */
  avatar?: string;
  /** Citation/témoignage */
  quote: string;
  /** Note sur 5 */
  rating: number;
  /** Date du témoignage */
  date: string;
  /** Témoignage vérifié */
  verified: boolean;
}

export interface AggregateRating {
  /** Note moyenne */
  ratingValue: number;
  /** Nombre total d'avis */
  ratingCount: number;
  /** Note maximale possible */
  bestRating: number;
  /** Note minimale possible */
  worstRating: number;
}

// ============================================================================
// FAQ SECTION (Optimisé Position 0)
// ============================================================================

export interface FAQSection {
  /** Titre de la section */
  title: string;
  /** Liste des questions/réponses */
  items: FAQItem[];
  /** Nombre total de questions */
  totalQuestions: number;
}

export interface FAQItem {
  /** Question */
  question: string;
  /** Réponse complète */
  answer: string;
  /** Réponse courte pour Position 0 (30-60 mots) */
  answerShort: string;
  /** Format de la réponse pour le balisage */
  format: FAQAnswerFormat;
  /** Nombre de mots dans la réponse */
  wordCount: number;
  /** Compatible avec Speakable (assistants vocaux) */
  speakable: boolean;
}

export type FAQAnswerFormat =
  | 'paragraph'
  | 'list'
  | 'steps'
  | 'number'
  | 'comparison'
  | 'definition'
  | 'yes_no';

// ============================================================================
// CTA SECTION (Final Call To Action)
// ============================================================================

export interface CTASection {
  /** Titre accrocheur */
  title: string;
  /** Sous-titre optionnel */
  subtitle?: string;
  /** Configuration du CTA principal */
  primaryCta: CTAButton;
  /** Configuration du CTA secondaire (optionnel) */
  secondaryCta?: CTAButton;
  /** Message de réassurance */
  reassurance: string;
  /** Message d'urgence (optionnel) */
  urgency?: string;
}

export interface CTAButton {
  /** Texte du bouton */
  text: string;
  /** URL de destination */
  url: string;
  /** Style du bouton */
  style: 'primary' | 'secondary';
  /** Configuration du tracking */
  tracking?: {
    event: string;
    location: string;
  };
}
