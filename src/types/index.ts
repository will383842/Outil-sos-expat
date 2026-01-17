// 🚀 Types d'interface ultra-modernes 2025 pour outil interne ChatGPT
// Plateforme d'assistance IA pour équipe de support

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'superadmin'; // Ajout superadmin pour hiérarchie
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date; // Suivi d'activité pour tableau de bord
  avatar?: string; // Photo de profil optionnelle
  permissions?: UserPermission[]; // Permissions granulaires
  department?: string; // Service (support, commercial, technique)
  timezone?: string; // Fuseau horaire pour coordination équipe
}

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  category: 'requests' | 'users' | 'analytics' | 'settings' | 'gpt_config';
}

export interface ClientRequest {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail?: string; // Contact pour suivi
  clientPhone?: string; // Numéro de téléphone
  nationality: string;
  country: string;
  language: string;
  title: string;
  description: string;
  expertRole: 'avocat' | 'expatrie' | 'fiscal' | 'immobilier' | 'visa'; // Étendu
  scheduledTime: Date;
  assignedUserId: string;
  assignedUserName?: string; // Cache pour affichage
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent'; // Priorisation
  estimatedDuration?: number; // Minutes prévues
  actualDuration?: number; // Temps réel passé
  tags?: string[]; // Catégorisation flexible
  clientSatisfaction?: number; // Note de 1 à 5
  followUpRequired?: boolean; // Suivi nécessaire
  internalNotes?: string; // Notes équipe (invisible client)
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  // Propriétés étendues pour UI
  isVip?: boolean; // Client VIP
  isReturningClient?: boolean; // Client fidèle/récurrent
  contactMethod?: string; // Méthode de contact préférée
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical'; // Niveau d'urgence détaillé
}

export interface GPTResponse {
  id: string;
  requestId: string;
  initialResponse: string;
  chatHistory: ChatMessage[];
  usedPromptId: string;
  generatedAt: Date;
  tokensUsed: number; // Suivi consommation
  confidence?: number; // Score de confiance IA (1-100)
  processingTime: number; // Millisecondes
  model: string; // GPT-4, GPT-4-turbo, etc.
  temperature: number; // Paramètre créativité utilisé
  cost?: number; // Coût estimé en centimes
  feedback?: 'helpful' | 'not_helpful' | 'needs_improvement'; // Retour équipe
  isArchived?: boolean; // Archivage pour optimisation
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system'; // Ajout system pour instructions
  content: string;
  timestamp: Date;
  tokensUsed?: number; // Tokens pour ce message
  metadata?: {
    model?: string;
    temperature?: number;
    responseTime?: number;
    editedBy?: string; // Si modifié par équipe
    isInternal?: boolean; // Message interne équipe
  };
}

export interface GPTPrompt {
  id: string;
  name: string;
  description?: string; // Description pour équipe
  expertRole: 'avocat' | 'expatrie' | 'fiscal' | 'immobilier' | 'visa';
  countries: string[];
  problemTypes: string[];
  prompt: string;
  tone: 'formal' | 'empathetic' | 'professional' | 'technical' | 'friendly';
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo'; // Modèles disponibles
  temperature: number; // 0.0 à 1.0
  maxTokens?: number; // Limite réponse
  isActive: boolean;
  isDefault?: boolean; // Prompt par défaut pour ce rôle
  usage: {
    timesUsed: number;
    avgSatisfaction?: number;
    lastUsed?: Date;
  };
  createdBy: string; // ID utilisateur créateur
  createdAt: Date;
  updatedAt?: Date;
  version: number; // Versioning des prompts
}

export interface AppStats {
  // Métriques principales
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  
  // Performance
  averageProcessingTime: number; // Minutes
  averageResponseTime: number; // Secondes IA
  completionRate: number; // Pourcentage
  customerSatisfaction: number; // Note moyenne
  
  // Utilisation IA
  totalTokensUsed: number;
  totalCost: number; // Coût total en euros
  avgTokensPerRequest: number;
  mostUsedPrompts: Record<string, number>;
  
  // Géographie et langues
  mostCommonCountries: Record<string, number>;
  mostCommonLanguages: Record<string, number>;
  mostCommonNationalities: Record<string, number>;
  
  // Temporel
  requestsByDate: Record<string, number>; // YYYY-MM-DD
  requestsByHour: Record<number, number>; // 0-23
  requestsByWeekday: Record<string, number>;
  
  // Équipe
  userStats: Record<string, {
    handled: number;
    avgTime: number;
    satisfaction: number;
  }>;
  
  // Problématiques
  topProblemTypes: Record<string, number>;
  expertRoleDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  
  // Tendances
  growthRate: number; // Pourcentage mensuel
  lastUpdated: Date;
}

// Types pour l'administration avancée
export interface SystemConfig {
  id: string;
  openaiApiKey: string;
  maxConcurrentRequests: number;
  defaultModel: string;
  defaultTemperature: number;
  maxTokensPerRequest: number;
  enableAnalytics: boolean;
  retentionDays: number; // Jours de conservation données
  maintenanceMode: boolean;
  allowedDomains?: string[]; // Domaines email autorisés
  updatedBy: string;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: 'login' | 'logout' | 'create_request' | 'update_request' | 
          'delete_request' | 'create_user' | 'update_user' | 'delete_user' |
          'update_prompt' | 'update_config' | 'export_data';
  resourceType: 'user' | 'request' | 'prompt' | 'config' | 'system';
  resourceId?: string;
  details?: Record<string, any>; // Détails de l'action
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'request_assigned' | 'request_urgent' | 'system_alert' | 
        'quota_warning' | 'new_request' | 'request_completed';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string; // Lien vers la ressource
  createdAt: Date;
  expiresAt?: Date;
}

// Types pour les rapports avancés
export interface PerformanceReport {
  id: string;
  name: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    requestVolume: number;
    completionRate: number;
    avgProcessingTime: number;
    customerSatisfaction: number;
    costAnalysis: {
      totalCost: number;
      costPerRequest: number;
      costPerToken: number;
    };
    teamPerformance: Array<{
      userId: string;
      userName: string;
      requestsHandled: number;
      avgTime: number;
      satisfaction: number;
    }>;
  };
  insights: string[]; // Insights automatiques
  generatedAt: Date;
  generatedBy: string;
}

// Types pour l'intégration et API
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    requestId: string;
    timestamp: Date;
  };
}

export interface WebhookEvent {
  id: string;
  event: 'request.created' | 'request.completed' | 'request.assigned' | 
         'user.created' | 'system.maintenance';
  data: any;
  timestamp: Date;
  signature: string; // Signature de sécurité
}

// Types d'état pour l'interface utilisateur
export interface UIState {
  user: User | null;
  isLoading: boolean;
  selectedRequest: ClientRequest | null;
  notifications: Notification[];
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'fr' | 'en';
  filters: {
    status?: string;
    priority?: string;
    expertRole?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

// Types pour les préférences utilisateur
export interface UserPreferences {
  id: string;
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    newRequests: boolean;
    urgentRequests: boolean;
    dailyDigest: boolean;
  };
  interface: {
    theme: 'light' | 'dark' | 'auto';
    language: 'fr' | 'en';
    autoRefresh: boolean;
    refreshInterval: number; // Secondes
    defaultView: 'list' | 'kanban' | 'calendar';
  };
  updatedAt: Date;
}