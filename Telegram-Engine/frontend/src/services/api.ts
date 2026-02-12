import axios from "axios";
import toast from "react-hot-toast";
import type {
  LoginResponse,
  Campaign,
  Subscriber,
  SubscriberStats,
  Tag,
  Template,
  Segment,
  SegmentFilters,
  Automation,
  AutomationEnrollment,
  AutomationStats,
  NotificationLog,
  DashboardData,
  QueueData,
  AppSettings,
  PaginatedResponse,
  MessageDelivery,
  CampaignComparison,
  AnalyticsData,
  HealthData,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tg_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 + toast errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem("tg_token");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    } else {
      const message =
        error.response?.data?.message || error.message || "An error occurred";
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

function toParams(
  filters: Record<string, unknown> = {}
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = String(value);
    }
  }
  return params;
}

// ─── Auth ────────────────────────────────────────────────
export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data.data;
}

// ─── Dashboard ───────────────────────────────────────────
export async function getDashboardStats(): Promise<DashboardData> {
  const { data } = await api.get("/dashboard/stats");
  return data.data;
}

export async function getQueueData(): Promise<QueueData> {
  const { data } = await api.get("/dashboard/queue");
  return data.data;
}

// ─── Campaigns ───────────────────────────────────────────
export async function getCampaigns(
  filters: Record<string, unknown> = {}
): Promise<PaginatedResponse<Campaign>> {
  const { data } = await api.get("/campaigns", {
    params: toParams(filters),
  });
  return data;
}

export async function getCampaign(id: number): Promise<Campaign> {
  const { data } = await api.get(`/campaigns/${id}`);
  return data.data;
}

export async function createCampaign(
  body: Record<string, unknown>
): Promise<Campaign> {
  const { data } = await api.post("/campaigns", body);
  return data.data;
}

export async function updateCampaign(
  id: number,
  body: Record<string, unknown>
): Promise<Campaign> {
  const { data } = await api.put(`/campaigns/${id}`, body);
  return data.data;
}

export async function sendCampaign(
  id: number
): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post(`/campaigns/${id}/send`);
  return data.data;
}

export async function cancelCampaign(id: number): Promise<{ ok: boolean }> {
  const { data } = await api.post(`/campaigns/${id}/cancel`);
  return data.data;
}

export async function deleteCampaign(id: number): Promise<void> {
  await api.delete(`/campaigns/${id}`);
}

export async function pauseCampaign(id: number): Promise<{ ok: boolean }> {
  const { data } = await api.post(`/campaigns/${id}/pause`);
  return data.data;
}

export async function resumeCampaign(id: number): Promise<{ ok: boolean }> {
  const { data } = await api.post(`/campaigns/${id}/resume`);
  return data.data;
}

export async function duplicateCampaign(id: number): Promise<Campaign> {
  const { data } = await api.post(`/campaigns/${id}/duplicate`);
  return data.data;
}

export async function getCampaignDeliveries(
  id: number,
  filters: Record<string, unknown> = {}
): Promise<PaginatedResponse<MessageDelivery>> {
  const { data } = await api.get(`/campaigns/${id}/deliveries`, {
    params: toParams(filters),
  });
  return data;
}

export async function exportCampaignDeliveries(id: number): Promise<Blob> {
  const response = await api.get(`/campaigns/${id}/export`, {
    responseType: "blob",
  });
  return response.data;
}

export async function compareCampaigns(
  campaignIds: number[]
): Promise<CampaignComparison[]> {
  const { data } = await api.post("/campaigns/compare", { campaignIds });
  return data.data;
}

// ─── Analytics ───────────────────────────────────────────
export async function getAnalytics(): Promise<AnalyticsData> {
  const { data } = await api.get("/dashboard/analytics");
  return data.data;
}

// ─── Health ──────────────────────────────────────────────
export async function getHealth(): Promise<HealthData> {
  const { data } = await api.get("/health");
  return data;
}

// ─── Subscribers ─────────────────────────────────────────
export async function getSubscribers(
  filters: Record<string, unknown> = {}
): Promise<PaginatedResponse<Subscriber>> {
  const { data } = await api.get("/subscribers", {
    params: toParams(filters),
  });
  return data;
}

export async function getSubscriber(id: number): Promise<Subscriber> {
  const { data } = await api.get(`/subscribers/${id}`);
  return data.data;
}

export async function getSubscriberStats(): Promise<SubscriberStats> {
  const { data } = await api.get("/subscribers/stats");
  return data.data;
}

export async function assignTags(
  subscriberId: number,
  tagIds: number[]
): Promise<Subscriber> {
  const { data } = await api.post(`/subscribers/${subscriberId}/tags`, {
    tagIds,
  });
  return data.data;
}

export async function syncSubscribers(): Promise<{
  synced: number;
  errors: number;
}> {
  const { data } = await api.post("/subscribers/sync");
  return data.data;
}

// ─── Tags ────────────────────────────────────────────────
export async function getTags(): Promise<Tag[]> {
  const { data } = await api.get("/tags");
  return data.data;
}

export async function createTag(body: {
  name: string;
  color?: string;
}): Promise<Tag> {
  const { data } = await api.post("/tags", body);
  return data.data;
}

export async function updateTag(
  id: number,
  body: { name?: string; color?: string }
): Promise<Tag> {
  const { data } = await api.put(`/tags/${id}`, body);
  return data.data;
}

export async function deleteTag(id: number): Promise<void> {
  await api.delete(`/tags/${id}`);
}

// ─── Templates ───────────────────────────────────────────
export async function getTemplates(): Promise<
  Record<string, Template[]>
> {
  const { data } = await api.get("/templates");
  return data.data;
}

export async function createTemplate(
  body: Record<string, unknown>
): Promise<Template> {
  const { data } = await api.post("/templates", body);
  return data.data;
}

export async function updateTemplate(
  id: number,
  body: Record<string, unknown>
): Promise<Template> {
  const { data } = await api.put(`/templates/${id}`, body);
  return data.data;
}

export async function deleteTemplate(id: number): Promise<void> {
  await api.delete(`/templates/${id}`);
}

export async function testSendMessage(body: {
  chatId: string;
  content: string;
  parseMode?: string;
}): Promise<{ ok: boolean; messageId?: number }> {
  const { data } = await api.post("/templates/test-send", body);
  return data.data;
}

// ─── Logs ────────────────────────────────────────────────
export async function getLogs(
  filters: Record<string, unknown> = {}
): Promise<PaginatedResponse<NotificationLog>> {
  const { data } = await api.get("/logs", { params: toParams(filters) });
  return data;
}

export async function getLogEventTypes(): Promise<string[]> {
  const { data } = await api.get("/logs/event-types");
  return data.data;
}

// ─── Segments ────────────────────────────────────────────
export async function getSegments(): Promise<Segment[]> {
  const { data } = await api.get("/segments");
  return data.data;
}

export async function createSegment(body: {
  name: string;
  filters: SegmentFilters;
}): Promise<Segment> {
  const { data } = await api.post("/segments", body);
  return data.data;
}

export async function previewSegment(
  filters: SegmentFilters
): Promise<{ count: number }> {
  const { data } = await api.post("/segments/preview", { filters });
  return data.data;
}

export async function deleteSegment(id: number): Promise<void> {
  await api.delete(`/segments/${id}`);
}

// ─── Automations ─────────────────────────────────────────
export async function getAutomations(): Promise<Automation[]> {
  const { data } = await api.get("/automations");
  return data.data;
}

export async function createAutomation(
  body: Record<string, unknown>
): Promise<Automation> {
  const { data } = await api.post("/automations", body);
  return data.data;
}

export async function updateAutomation(
  id: number,
  body: Record<string, unknown>
): Promise<Automation> {
  const { data } = await api.put(`/automations/${id}`, body);
  return data.data;
}

export async function toggleAutomation(id: number): Promise<Automation> {
  const { data } = await api.post(`/automations/${id}/toggle`);
  return data.data;
}

export async function deleteAutomation(id: number): Promise<void> {
  await api.delete(`/automations/${id}`);
}

export async function getAutomation(id: number): Promise<Automation> {
  const { data } = await api.get(`/automations/${id}`);
  return data.data;
}

export async function getAutomationEnrollments(
  id: number,
  filters: Record<string, unknown> = {}
): Promise<PaginatedResponse<AutomationEnrollment>> {
  const { data } = await api.get(`/automations/${id}/enrollments`, {
    params: toParams(filters),
  });
  return data;
}

export async function getAutomationStats(id: number): Promise<AutomationStats> {
  const { data } = await api.get(`/automations/${id}/stats`);
  return data.data;
}

// ─── Settings ────────────────────────────────────────────
export async function getSettings(): Promise<AppSettings> {
  const { data } = await api.get("/settings");
  return data.data;
}

export async function updateSetting(
  key: string,
  value: unknown
): Promise<void> {
  await api.put("/settings", { key, value });
}

export async function validateBot(): Promise<{
  ok: boolean;
  username?: string;
  error?: string;
}> {
  const { data } = await api.post("/settings/validate-bot");
  return data.data;
}

export async function detectChatId(): Promise<{
  chats: Array<{
    chatId: string;
    username?: string;
    firstName?: string;
    chatType: string;
  }>;
  updatesCount: number;
}> {
  const { data } = await api.post("/settings/detect-chat-id");
  return data.data;
}

export default api;
