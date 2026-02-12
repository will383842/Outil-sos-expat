import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Pause,
  XCircle,
  Copy,
  Download,
  Image,
  FileText,
  Video,
} from "lucide-react";
import {
  useCampaign,
  useSendCampaign,
  useCancelCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useDuplicateCampaign,
  useExportCampaignDeliveries,
  useCampaignDeliveries,
} from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import Pagination from "../components/ui/Pagination";
import { format, parseISO } from "date-fns";
import type { MediaType } from "../types";

const MEDIA_ICONS: Record<MediaType, React.ElementType> = {
  photo: Image,
  document: FileText,
  video: Video,
  audio: FileText,
};

export default function CampaignDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const campaignId = parseInt(id ?? "0", 10);
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const sendMutation = useSendCampaign();
  const cancelMutation = useCancelCampaign();
  const pauseMutation = usePauseCampaign();
  const resumeMutation = useResumeCampaign();
  const duplicateMutation = useDuplicateCampaign();
  const exportMutation = useExportCampaignDeliveries();

  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const { data: deliveries } = useCampaignDeliveries(campaignId, {
    page: deliveryPage,
    limit: 20,
    status: deliveryStatus || undefined,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!campaign) return <p>{t("campaigns.notFound")}</p>;

  const canSend = campaign.status === "draft" || campaign.status === "scheduled";
  const canPause = campaign.status === "sending";
  const canResume = campaign.status === "paused";
  const canCancel =
    campaign.status === "sending" ||
    campaign.status === "scheduled" ||
    campaign.status === "paused";
  const hasDeliveries =
    campaign.status === "sending" ||
    campaign.status === "completed" ||
    campaign.status === "paused" ||
    campaign.status === "cancelled";

  const progress =
    campaign.targetCount > 0
      ? Math.round(
          ((campaign.sentCount + campaign.failedCount) / campaign.targetCount) *
            100
        )
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/campaigns")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-sm text-gray-500">{campaign.description}</p>
          )}
        </div>
        <Badge variant={campaign.status}>{campaign.status}</Badge>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canSend && (
          <button
            onClick={() => sendMutation.mutate(campaignId)}
            disabled={sendMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4" /> {t("campaigns.send")}
          </button>
        )}
        {canPause && (
          <button
            onClick={() => pauseMutation.mutate(campaignId)}
            disabled={pauseMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            <Pause className="w-4 h-4" /> {t("campaigns.pause")}
          </button>
        )}
        {canResume && (
          <button
            onClick={() => resumeMutation.mutate(campaignId)}
            disabled={resumeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="w-4 h-4" /> {t("campaigns.resume")}
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => cancelMutation.mutate(campaignId)}
            disabled={cancelMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" /> {t("campaigns.cancel")}
          </button>
        )}
        <button
          onClick={() => duplicateMutation.mutate(campaignId)}
          disabled={duplicateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Copy className="w-4 h-4" /> {t("campaigns.duplicate")}
        </button>
        {hasDeliveries && (
          <button
            onClick={() => exportMutation.mutate(campaignId)}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {t("campaigns.exportCsv")}
          </button>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("campaigns.type")}</p>
          <p className="text-lg font-semibold">{campaign.type}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("campaigns.createdAt")}</p>
          <p className="text-lg font-semibold">
            {format(parseISO(campaign.createdAt), "dd/MM/yyyy HH:mm")}
          </p>
        </div>
      </div>

      {/* Progress */}
      {hasDeliveries && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-4">{t("campaigns.progress")}</h2>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{progress}%</span>
              <span>
                {campaign.sentCount + campaign.failedCount} /{" "}
                {campaign.targetCount}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-telegram-500 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {campaign.sentCount}
              </p>
              <p className="text-sm text-gray-500">{t("campaigns.sent")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {campaign.failedCount}
              </p>
              <p className="text-sm text-gray-500">{t("campaigns.failed")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {campaign.deliveryStats?.pending ?? 0}
              </p>
              <p className="text-sm text-gray-500">{t("campaigns.pending")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Targeting */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold mb-3">{t("campaigns.targeting")}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 w-32">{t("campaigns.targetRoles")}:</span>
            <span>
              {campaign.targetRoles?.join(", ") || t("common.all")}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-32">{t("campaigns.targetLanguages")}:</span>
            <span>
              {campaign.targetLanguages
                ?.map((l) => l.toUpperCase())
                .join(", ") || t("common.all")}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold mb-3">{t("campaigns.messages")}</h2>
        <div className="space-y-3">
          {campaign.messages.map((msg) => {
            const MediaIcon = msg.mediaType
              ? MEDIA_ICONS[msg.mediaType as MediaType]
              : null;
            return (
              <div key={msg.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{msg.language.toUpperCase()}</Badge>
                  <span className="text-xs text-gray-400">{msg.parseMode}</span>
                  {msg.mediaType && MediaIcon && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <MediaIcon className="w-3 h-3" />
                      {msg.mediaType}
                    </span>
                  )}
                </div>
                {msg.mediaUrl && (
                  <div className="mb-2 text-xs text-gray-500 break-all">
                    Media: {msg.mediaUrl}
                  </div>
                )}
                <pre
                  className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded"
                  dir={msg.language === "ar" ? "rtl" : "ltr"}
                >
                  {msg.content}
                </pre>
                {msg.replyMarkup && msg.replyMarkup.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">Inline Keyboard:</p>
                    {msg.replyMarkup.map((row, i) => (
                      <div key={i} className="flex gap-1">
                        {row.map((btn, j) => (
                          <span
                            key={j}
                            className="px-2 py-1 text-xs bg-telegram-50 text-telegram-700 border border-telegram-200 rounded"
                          >
                            {btn.text}
                            {btn.url && ` -> ${btn.url}`}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deliveries Table (P2) */}
      {hasDeliveries && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("campaigns.deliveries")}</h2>
            <select
              value={deliveryStatus}
              onChange={(e) => {
                setDeliveryStatus(e.target.value);
                setDeliveryPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">{t("campaigns.allStatuses")}</option>
              <option value="sent">{t("campaigns.sent")}</option>
              <option value="failed">{t("campaigns.failed")}</option>
              <option value="pending">{t("campaigns.pending")}</option>
              <option value="rate_limited">{t("campaigns.rateLimited")}</option>
            </select>
          </div>

          {deliveries?.data && deliveries.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 pr-3">Subscriber</th>
                      <th className="pb-2 pr-3">Role</th>
                      <th className="pb-2 pr-3">Lang</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Sent At</th>
                      <th className="pb-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.data.map((d) => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3">
                          {[d.subscriber.firstName, d.subscriber.lastName]
                            .filter(Boolean)
                            .join(" ") || d.subscriber.telegramUsername || "-"}
                        </td>
                        <td className="py-2 pr-3">{d.subscriber.role}</td>
                        <td className="py-2 pr-3">
                          {d.subscriber.language.toUpperCase()}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={d.status}>{d.status}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          {d.sentAt
                            ? format(parseISO(d.sentAt), "dd/MM HH:mm")
                            : "-"}
                        </td>
                        <td className="py-2 text-xs text-red-500 max-w-[200px] truncate">
                          {d.errorMessage || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {deliveries.pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    page={deliveries.pagination.page}
                    totalPages={deliveries.pagination.totalPages}
                    total={deliveries.pagination.total}
                    limit={deliveries.pagination.limit}
                    onPageChange={setDeliveryPage}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No deliveries yet</p>
          )}
        </div>
      )}
    </div>
  );
}
