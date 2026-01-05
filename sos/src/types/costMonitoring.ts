/**
 * Cost Monitoring Types
 * Types TypeScript pour le suivi des coûts des services cloud
 */

// ============================================================================
// Twilio Costs
// ============================================================================

export interface TwilioCosts {
  smsCount: number;
  smsCost: number;
  voiceMinutes: number;
  voiceCost: number;
  whatsappMessages: number;
  whatsappCost: number;
  total: number;
}

// ============================================================================
// Firestore Costs
// ============================================================================

export interface FirestoreCosts {
  reads: number;
  readsCost: number;
  writes: number;
  writesCost: number;
  deletes: number;
  deletesCost: number;
  storedDataGB: number;
  storageCost: number;
  total: number;
}

// ============================================================================
// Cloud Functions Costs
// ============================================================================

export interface FunctionsCosts {
  invocations: number;
  invocationsCost: number;
  computeTimeMs: number;
  computeCost: number;
  memoryUsedGB: number;
  memoryCost: number;
  networkEgressGB: number;
  networkCost: number;
  total: number;
}

// ============================================================================
// Cloud Storage Costs
// ============================================================================

export interface StorageCosts {
  storedDataGB: number;
  storageCost: number;
  downloadGB: number;
  downloadCost: number;
  uploadGB: number;
  uploadCost: number;
  operationsCount: number;
  operationsCost: number;
  total: number;
}

// ============================================================================
// Hosting Costs
// ============================================================================

export interface HostingCosts {
  bandwidthGB: number;
  bandwidthCost: number;
  storageGB: number;
  storageCost: number;
  total: number;
}

// ============================================================================
// Authentication Costs
// ============================================================================

export interface AuthCosts {
  phoneVerifications: number;
  phoneVerificationsCost: number;
  emailVerifications: number;
  emailVerificationsCost: number;
  mfaUsage: number;
  mfaCost: number;
  total: number;
}

// ============================================================================
// Main Cost Metrics
// ============================================================================

export type CostPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface CostMetrics {
  id: string;
  date: Date;
  period: CostPeriod;
  twilio: TwilioCosts;
  firestore: FirestoreCosts;
  functions: FunctionsCosts;
  storage: StorageCosts;
  hosting: HostingCosts;
  auth: AuthCosts;
  total: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Cost Alerts & Thresholds
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface CostThreshold {
  id: string;
  service: keyof Omit<CostMetrics, 'id' | 'date' | 'period' | 'total' | 'currency' | 'createdAt' | 'updatedAt'>;
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  period: CostPeriod;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CostAlert {
  id: string;
  thresholdId: string;
  service: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// ============================================================================
// Cost Budgets
// ============================================================================

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type BudgetStatus = 'on_track' | 'at_risk' | 'exceeded';

export interface CostBudget {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  services: string[];
  alertThresholds: number[]; // Percentages, e.g., [50, 75, 90, 100]
  currentSpend: number;
  status: BudgetStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  budgetName: string;
  thresholdPercent: number;
  currentPercent: number;
  currentSpend: number;
  budgetAmount: number;
  severity: AlertSeverity;
  status: AlertStatus;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// ============================================================================
// Cost Forecasting
// ============================================================================

export interface CostForecast {
  id: string;
  generatedAt: Date;
  forecastPeriod: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  projectedTotal: number;
  confidence: number; // 0-100 percentage
  breakdown: CostForecastBreakdown;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  recommendations: CostRecommendation[];
}

export interface CostForecastBreakdown {
  twilio: number;
  firestore: number;
  functions: number;
  storage: number;
  hosting: number;
  auth: number;
}

export interface CostRecommendation {
  id: string;
  service: string;
  type: 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  estimatedSavings?: number;
  priority: 'low' | 'medium' | 'high';
  actionRequired: boolean;
  actionUrl?: string;
}

// ============================================================================
// Cost Reports
// ============================================================================

export type ReportFormat = 'json' | 'csv' | 'pdf';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface CostReport {
  id: string;
  name: string;
  description?: string;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date;
  services: string[];
  format: ReportFormat;
  status: ReportStatus;
  fileUrl?: string;
  fileSize?: number;
  generatedAt?: Date;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  error?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  reportConfig: Omit<CostReport, 'id' | 'status' | 'fileUrl' | 'fileSize' | 'generatedAt' | 'expiresAt' | 'createdAt' | 'error'>;
  schedule: ReportSchedule;
  recipients: string[];
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string;
}

// ============================================================================
// Usage Tracking
// ============================================================================

export interface UsageRecord {
  id: string;
  service: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface UsageSummary {
  service: string;
  period: CostPeriod;
  startDate: Date;
  endDate: Date;
  metrics: UsageMetric[];
  totalCost: number;
}

export interface UsageMetric {
  name: string;
  value: number;
  unit: string;
  cost: number;
  percentOfTotal: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface CostDashboardData {
  summary: CostSummary;
  currentPeriodMetrics: CostMetrics;
  previousPeriodMetrics: CostMetrics;
  alerts: CostAlert[];
  budgets: CostBudget[];
  forecast: CostForecast;
  trends: CostTrend[];
}

export interface CostSummary {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  totalThisYear: number;
  comparisonToLastPeriod: number; // Percentage change
  topService: string;
  topServiceCost: number;
  activeAlerts: number;
  budgetsAtRisk: number;
}

export interface CostTrend {
  date: Date;
  total: number;
  twilio: number;
  firestore: number;
  functions: number;
  storage: number;
  hosting: number;
  auth: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CostMetricsResponse {
  success: boolean;
  data: CostMetrics;
  message?: string;
}

export interface CostMetricsListResponse {
  success: boolean;
  data: CostMetrics[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  message?: string;
}

export interface CostAlertsResponse {
  success: boolean;
  data: CostAlert[];
  unacknowledgedCount: number;
  message?: string;
}

export interface CostDashboardResponse {
  success: boolean;
  data: CostDashboardData;
  lastUpdated: Date;
  message?: string;
}

// ============================================================================
// Filter & Query Types
// ============================================================================

export interface CostFilters {
  startDate?: Date;
  endDate?: Date;
  period?: CostPeriod;
  services?: string[];
  minCost?: number;
  maxCost?: number;
}

export interface CostQueryParams extends CostFilters {
  page?: number;
  pageSize?: number;
  sortBy?: keyof CostMetrics;
  sortOrder?: 'asc' | 'desc';
}

export interface AlertFilters {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  service?: string[];
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface CostMonitoringConfig {
  enabled: boolean;
  collectionInterval: number; // in minutes
  retentionDays: number;
  alertsEnabled: boolean;
  emailNotifications: boolean;
  slackNotifications: boolean;
  slackWebhookUrl?: string;
  defaultCurrency: string;
  timezone: string;
  services: ServiceConfig[];
}

export interface ServiceConfig {
  name: string;
  enabled: boolean;
  trackingEnabled: boolean;
  alertsEnabled: boolean;
  customThresholds?: Partial<CostThreshold>[];
}

// ============================================================================
// Utility Types
// ============================================================================

export type ServiceType = 'twilio' | 'firestore' | 'functions' | 'storage' | 'hosting' | 'auth';

export type CostMetricKey = keyof Omit<CostMetrics, 'id' | 'date' | 'period' | 'total' | 'currency' | 'createdAt' | 'updatedAt'>;

export interface TimeRange {
  start: Date;
  end: Date;
  period: CostPeriod;
}

export interface CostComparison {
  current: number;
  previous: number;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}
