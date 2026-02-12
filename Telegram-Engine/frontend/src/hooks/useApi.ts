import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as api from "../services/api";
import type { SegmentFilters } from "../types";

export const queryKeys = {
  dashboard: () => ["dashboard"] as const,
  queue: () => ["queue"] as const,
  analytics: () => ["analytics"] as const,
  health: () => ["health"] as const,
  campaigns: (filters?: Record<string, unknown>) => ["campaigns", filters] as const,
  campaign: (id: number) => ["campaign", id] as const,
  campaignDeliveries: (id: number, filters?: Record<string, unknown>) =>
    ["campaign-deliveries", id, filters] as const,
  subscribers: (filters?: Record<string, unknown>) => ["subscribers", filters] as const,
  subscriberStats: () => ["subscriber-stats"] as const,
  tags: () => ["tags"] as const,
  templates: () => ["templates"] as const,
  logs: (filters?: Record<string, unknown>) => ["logs", filters] as const,
  logEventTypes: () => ["log-event-types"] as const,
  segments: () => ["segments"] as const,
  automations: () => ["automations"] as const,
  automation: (id: number) => ["automation", id] as const,
  automationEnrollments: (id: number, filters?: Record<string, unknown>) =>
    ["automation-enrollments", id, filters] as const,
  automationStats: (id: number) => ["automation-stats", id] as const,
  settings: () => ["settings"] as const,
};

// ─── Dashboard ───────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: api.getDashboardStats,
    staleTime: 60_000,
  });
}

export function useQueue() {
  return useQuery({
    queryKey: queryKeys.queue(),
    queryFn: api.getQueueData,
    refetchInterval: 30_000,
  });
}

// ─── Campaigns ───────────────────────────────────────────
export function useCampaigns(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: queryKeys.campaigns(filters),
    queryFn: () => api.getCampaigns(filters),
  });
}

export function useCampaign(id: number) {
  return useQuery({
    queryKey: queryKeys.campaign(id),
    queryFn: () => api.getCampaign(id),
    enabled: id > 0,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Campaign created");
    },
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.sendCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Campaign queued for sending");
    },
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.cancelCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign cancelled");
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
  });
}

export function usePauseCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.pauseCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign"] });
      toast.success("Campaign paused");
    },
  });
}

export function useResumeCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.resumeCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign"] });
      toast.success("Campaign resumed");
    },
  });
}

export function useDuplicateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.duplicateCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign duplicated");
    },
  });
}

export function useCampaignDeliveries(
  id: number,
  filters: Record<string, unknown> = {}
) {
  return useQuery({
    queryKey: queryKeys.campaignDeliveries(id, filters),
    queryFn: () => api.getCampaignDeliveries(id, filters),
    enabled: id > 0,
  });
}

export function useExportCampaignDeliveries() {
  return useMutation({
    mutationFn: async (id: number) => {
      const blob = await api.exportCampaignDeliveries(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-${id}-deliveries.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("CSV exported"),
  });
}

export function useCompareCampaigns() {
  return useMutation({
    mutationFn: (ids: number[]) => api.compareCampaigns(ids),
  });
}

// ─── Analytics ──────────────────────────────────────────
export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics(),
    queryFn: api.getAnalytics,
    staleTime: 5 * 60_000,
  });
}

// ─── Health ─────────────────────────────────────────────
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: api.getHealth,
    refetchInterval: 60_000,
  });
}

// ─── Subscribers ─────────────────────────────────────────
export function useSubscribers(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: queryKeys.subscribers(filters),
    queryFn: () => api.getSubscribers(filters),
  });
}

export function useSubscriberStats() {
  return useQuery({
    queryKey: queryKeys.subscriberStats(),
    queryFn: api.getSubscriberStats,
    staleTime: 5 * 60_000,
  });
}

export function useSyncSubscribers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.syncSubscribers,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["subscribers"] });
      qc.invalidateQueries({ queryKey: ["subscriber-stats"] });
      toast.success(`Synced ${result.synced} subscribers (${result.errors} errors)`);
    },
  });
}

export function useAssignTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriberId, tagIds }: { subscriberId: number; tagIds: number[] }) =>
      api.assignTags(subscriberId, tagIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscribers"] });
      toast.success("Tags updated");
    },
  });
}

// ─── Tags ────────────────────────────────────────────────
export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags(),
    queryFn: api.getTags,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTag,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag created");
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag deleted");
    },
  });
}

// ─── Templates ───────────────────────────────────────────
export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates(),
    queryFn: api.getTemplates,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template created");
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template updated");
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
    },
  });
}

export function useTestSend() {
  return useMutation({
    mutationFn: api.testSendMessage,
    onSuccess: () => toast.success("Test message sent!"),
  });
}

// ─── Logs ────────────────────────────────────────────────
export function useLogs(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: queryKeys.logs(filters),
    queryFn: () => api.getLogs(filters),
  });
}

export function useLogEventTypes() {
  return useQuery({
    queryKey: queryKeys.logEventTypes(),
    queryFn: api.getLogEventTypes,
  });
}

// ─── Segments ────────────────────────────────────────────
export function useSegments() {
  return useQuery({
    queryKey: queryKeys.segments(),
    queryFn: api.getSegments,
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSegment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["segments"] });
      toast.success("Segment created");
    },
  });
}

export function usePreviewSegment() {
  return useMutation({
    mutationFn: (filters: SegmentFilters) => api.previewSegment(filters),
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteSegment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["segments"] });
      toast.success("Segment deleted");
    },
  });
}

// ─── Automations ─────────────────────────────────────────
export function useAutomations() {
  return useQuery({
    queryKey: queryKeys.automations(),
    queryFn: api.getAutomations,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAutomation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation created");
    },
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.toggleAutomation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
    },
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteAutomation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation deleted");
    },
  });
}

export function useAutomation(id: number) {
  return useQuery({
    queryKey: queryKeys.automation(id),
    queryFn: () => api.getAutomation(id),
    enabled: id > 0,
  });
}

export function useAutomationEnrollments(
  id: number,
  filters: Record<string, unknown> = {}
) {
  return useQuery({
    queryKey: queryKeys.automationEnrollments(id, filters),
    queryFn: () => api.getAutomationEnrollments(id, filters),
    enabled: id > 0,
  });
}

export function useAutomationStats(id: number) {
  return useQuery({
    queryKey: queryKeys.automationStats(id),
    queryFn: () => api.getAutomationStats(id),
    enabled: id > 0,
    refetchInterval: 30_000,
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.updateAutomation(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["automations"] });
      qc.invalidateQueries({ queryKey: ["automation", variables.id] });
      toast.success("Automation updated");
    },
  });
}

// ─── Settings ────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: api.getSettings,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api.updateSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Setting saved");
    },
  });
}

export function useValidateBot() {
  return useMutation({ mutationFn: api.validateBot });
}

export function useDetectChatId() {
  return useMutation({ mutationFn: api.detectChatId });
}
