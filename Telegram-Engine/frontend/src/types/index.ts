// ─── Auth ────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ─── Subscriber ──────────────────────────────────────────
export interface Subscriber {
  id: number;
  telegramChatId: string;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  sosUserId: string | null;
  role: string;
  language: string;
  country: string | null;
  status: string;
  subscribedAt: string;
  lastMessageAt: string | null;
  tags: Array<{ tag: Tag; assignedAt: string }>;
}

export interface SubscriberStats {
  total: number;
  byRole: Record<string, number>;
  byLanguage: Record<string, number>;
  byCountry: Record<string, number>;
  byStatus: Record<string, number>;
}

// ─── Tag ─────────────────────────────────────────────────
export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  _count?: { subscribers: number };
}

// ─── Campaign ────────────────────────────────────────────
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "paused"
  | "completed"
  | "cancelled";

export type CampaignType = "broadcast" | "action_triggered" | "scheduled";

export type MediaType = "photo" | "document" | "video" | "audio";

export interface CampaignMessage {
  id: number;
  campaignId: number;
  language: string;
  content: string;
  parseMode: string;
  mediaType: MediaType | null;
  mediaUrl: string | null;
  replyMarkup: InlineKeyboardButton[][] | null;
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  targetRoles: string[] | null;
  targetTags: number[] | null;
  targetLanguages: string[] | null;
  targetCountries: string[] | null;
  triggerAction: string | null;
  triggerDelay: number | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  createdBy: string | null;
  createdAt: string;
  messages: CampaignMessage[];
  deliveryStats?: {
    sent: number;
    failed: number;
    pending: number;
  };
}

// ─── Template ────────────────────────────────────────────
export interface Template {
  id: number;
  eventType: string;
  language: string;
  name: string;
  content: string;
  parseMode: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Segment ─────────────────────────────────────────────
export interface SegmentFilters {
  roles?: string[];
  tags?: number[];
  languages?: string[];
  countries?: string[];
  statuses?: string[];
}

export interface Segment {
  id: number;
  name: string;
  filters: SegmentFilters;
  count: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Automation ──────────────────────────────────────────
export interface AutomationStep {
  id: number;
  automationId: number;
  stepOrder: number;
  type: "send_message" | "wait" | "condition";
  config: Record<string, unknown>;
}

export interface Automation {
  id: number;
  name: string;
  triggerEvent: string;
  conditions: Record<string, unknown> | null;
  isActive: boolean;
  allowReenrollment: boolean;
  steps: AutomationStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationEnrollment {
  id: number;
  automationId: number;
  subscriberId: number;
  currentStep: number;
  status: "active" | "completed" | "cancelled";
  nextExecuteAt: string | null;
  eventPayload: Record<string, unknown> | null;
  enrolledAt: string;
  completedAt: string | null;
  subscriber: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    telegramUsername: string | null;
    role: string;
    language: string;
  };
}

export interface AutomationStats {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
}

// ─── Notification Log ────────────────────────────────────
export interface NotificationLog {
  id: number;
  eventType: string;
  subscriberChatId: string | null;
  status: string;
  content: string | null;
  errorMessage: string | null;
  telegramMsgId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Delivery ────────────────────────────────────────────
export interface MessageDelivery {
  id: number;
  campaignId: number | null;
  automationId: number | null;
  enrollmentId: number | null;
  subscriberId: number;
  telegramChatId: string;
  content: string;
  status: string;
  telegramMsgId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  subscriber: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    telegramUsername: string | null;
    role: string;
    language: string;
  };
}

// ─── Campaign Comparison ─────────────────────────────────
export interface CampaignComparison {
  id: number;
  name: string;
  type: string;
  status: string;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  languages: string[];
  successRate: number;
  deliveryBreakdown: Record<string, number>;
  createdAt: string;
  completedAt: string | null;
}

// ─── Analytics ───────────────────────────────────────────
export interface AnalyticsData {
  deliveryLast7d: Record<string, number>;
  deliveryLast30d: Record<string, number>;
  topCampaigns: Array<{
    id: number;
    name: string;
    type: string;
    sentCount: number;
    failedCount: number;
    targetCount: number;
    successRate: number;
    completedAt: string | null;
  }>;
  subscriberGrowth: Record<string, number>;
  languageBreakdown: Array<{ language: string; count: number }>;
}

// ─── Health ──────────────────────────────────────────────
export interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  checks: Record<string, { status: string; latencyMs?: number; error?: string }>;
  queues: Array<{ name: string; waiting: number; active: number; delayed: number; failed: number }>;
  alerts: string[];
}

// ─── Dashboard ───────────────────────────────────────────
export interface DailyStats {
  id: number;
  date: string;
  sent: number;
  failed: number;
  newSubscribers: number;
  unsubscribed: number;
}

export interface DashboardData {
  subscribers: { total: number; active: number };
  campaigns: { total: number; active: number };
  messages: {
    sentToday: number;
    failedToday: number;
    sentTotal: number;
    queuePending: number;
    successRate: number;
  };
  automations: {
    total: number;
    active: number;
    activeEnrollments: number;
    completedEnrollments: number;
  };
  dailyStats: DailyStats[];
}

export interface QueueData {
  depth: {
    pending: number;
    queued: number;
    sent: number;
    failed: number;
    total: number;
  };
  hourly: Record<string, number>;
}

// ─── Pagination ──────────────────────────────────────────
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ─── Settings ────────────────────────────────────────────
export type AppSettings = Record<string, unknown>;

// ─── Constants ───────────────────────────────────────────
export const ROLES = ["chatter", "influencer", "blogger", "groupAdmin"] as const;
export const LANGUAGES = ["en", "fr", "es", "de", "pt", "ru", "zh", "hi", "ar"] as const;
export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "draft", "scheduled", "sending", "paused", "completed", "cancelled",
];

export const EVENT_TYPES = [
  "welcome",
  "new_registration",
  "call_completed",
  "payment_received",
  "daily_report",
  "new_provider",
  "new_contact_message",
  "negative_review",
  "security_alert",
  "withdrawal_request",
] as const;

export const TRIGGER_ACTIONS = [
  "registration",
  "first_call",
  "first_payment",
  "referral",
  "inactivity_7d",
  "inactivity_30d",
] as const;
