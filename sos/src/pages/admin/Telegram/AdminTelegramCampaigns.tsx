import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import { useNavigate } from "react-router-dom";
import {
  Megaphone,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Ban,
  FileText,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  targetAudience: string;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  createdBy: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  draft: { icon: <FileText className="h-3.5 w-3.5" />, color: "text-gray-600", bgColor: "bg-gray-100" },
  scheduled: { icon: <Clock className="h-3.5 w-3.5" />, color: "text-blue-600", bgColor: "bg-blue-50" },
  sending: { icon: <Send className="h-3.5 w-3.5" />, color: "text-yellow-600", bgColor: "bg-yellow-50" },
  completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-green-600", bgColor: "bg-green-50" },
  cancelled: { icon: <Ban className="h-3.5 w-3.5" />, color: "text-red-600", bgColor: "bg-red-50" },
};

const AdminTelegramCampaigns: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 50 };
      if (filterStatus) params.status = filterStatus;
      const res = await httpsCallable(functions, "telegram_getCampaigns")(params);
      const data = res.data as { campaigns: Campaign[] };
      setCampaigns(data.campaigns);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [filterStatus]);

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await httpsCallable(functions, "telegram_cancelCampaign")({ campaignId: id });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c))
      );
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-7 w-7 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("admin.telegram.campaigns.title")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("admin.telegram.campaigns.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/admin/toolbox/telegram/campaigns/create")}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            {t("admin.telegram.campaigns.create")}
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option value="">{t("admin.telegram.campaigns.allStatuses")}</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={loadCampaigns}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("admin.telegram.refresh")}
          </button>
        </div>

        {/* Campaign List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t("admin.telegram.campaigns.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const statusConf = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      <span
                        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConf.color} ${statusConf.bgColor}`}
                      >
                        {statusConf.icon}
                        {campaign.status}
                      </span>
                    </div>
                    {(campaign.status === "draft" || campaign.status === "scheduled") && (
                      <button
                        onClick={() => handleCancel(campaign.id)}
                        disabled={cancelling === campaign.id}
                        className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5 inline mr-1" />
                        {t("admin.telegram.campaigns.cancel")}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm text-gray-500">
                    <div>
                      <span className="text-xs text-gray-400">{t("admin.telegram.campaigns.audience")}</span>
                      <p className="font-medium text-gray-700">{campaign.targetAudience}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">{t("admin.telegram.campaigns.targets")}</span>
                      <p className="font-medium text-gray-700">{campaign.targetCount}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">{t("admin.telegram.sent")}</span>
                      <p className="font-medium text-green-600">{campaign.sentCount}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">{t("admin.telegram.failed")}</span>
                      <p className="font-medium text-red-600">{campaign.failedCount}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">{t("admin.telegram.campaigns.created")}</span>
                      <p className="font-medium text-gray-700">{formatDate(campaign.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramCampaigns;
