import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Trash2 } from "lucide-react";
import { useCampaigns, useDeleteCampaign } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import Pagination from "../components/ui/Pagination";
import { format, parseISO } from "date-fns";

export default function CampaignListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading } = useCampaigns({ page, status: statusFilter || undefined });
  const deleteMutation = useDeleteCampaign();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("campaigns.title")}</h1>
        <button
          onClick={() => navigate("/campaigns/new")}
          className="flex items-center gap-2 px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("campaigns.create")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">{t("common.all")}</option>
          {["draft", "scheduled", "sending", "completed", "cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.data.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">{t("campaigns.noCampaigns")}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("campaigns.name")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("campaigns.type")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("campaigns.status")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("campaigns.progress")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("campaigns.createdAt")}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                      {campaign.description && (
                        <p className="text-xs text-gray-500 truncate max-w-xs">{campaign.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={campaign.type}>{campaign.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={campaign.status}>{campaign.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {campaign.sentCount}/{campaign.targetCount || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(parseISO(campaign.createdAt), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/campaigns/${campaign.id}`)}
                          className="p-1.5 text-gray-400 hover:text-telegram-500"
                          title={t("campaigns.edit")}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {campaign.status === "draft" && (
                          <button
                            onClick={() => { if (confirm(t("campaigns.confirmDelete"))) deleteMutation.mutate(campaign.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-500"
                            title={t("campaigns.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
