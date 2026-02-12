import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Eye } from "lucide-react";
import { useSegments, useCreateSegment, useDeleteSegment, usePreviewSegment } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { ROLES, LANGUAGES } from "../types";
import type { SegmentFilters } from "../types";

export default function SegmentsPage() {
  const { t } = useTranslation();
  const { data: segments, isLoading } = useSegments();
  const createMutation = useCreateSegment();
  const deleteMutation = useDeleteSegment();
  const previewMutation = usePreviewSegment();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [filterRoles, setFilterRoles] = useState<string[]>([]);
  const [filterLangs, setFilterLangs] = useState<string[]>([]);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const filters: SegmentFilters = {};
    if (filterRoles.length) filters.roles = filterRoles;
    if (filterLangs.length) filters.languages = filterLangs;
    createMutation.mutate({ name, filters });
    setShowForm(false);
    setName("");
    setFilterRoles([]);
    setFilterLangs([]);
  };

  const handlePreview = () => {
    const filters: SegmentFilters = {};
    if (filterRoles.length) filters.roles = filterRoles;
    if (filterLangs.length) filters.languages = filterLangs;
    previewMutation.mutate(filters);
  };

  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("segments.title")}</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600">
          <Plus className="w-4 h-4" /> {t("segments.create")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("segments.name")}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button key={role} type="button" onClick={() => setFilterRoles(toggle(filterRoles, role))}
                  className={`px-3 py-1.5 rounded-full text-sm border ${filterRoles.includes(role) ? "bg-telegram-500 text-white border-telegram-500" : "border-gray-300"}`}>
                  {role}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button key={l} type="button" onClick={() => setFilterLangs(toggle(filterLangs, l))}
                  className={`px-3 py-1.5 rounded-full text-sm border ${filterLangs.includes(l) ? "bg-telegram-500 text-white border-telegram-500" : "border-gray-300"}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handlePreview} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <Eye className="w-4 h-4" /> {t("segments.preview")}
            </button>
            {previewMutation.data && (
              <span className="text-sm text-telegram-600 font-medium">
                {previewMutation.data.count} {t("segments.subscribers")}
              </span>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg">{t("common.cancel")}</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-telegram-500 text-white rounded-lg disabled:opacity-50">{t("common.create")}</button>
          </div>
        </form>
      )}

      {/* Segments list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("segments.name")}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("segments.filters")}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("tags.subscribers")}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {segments?.map((seg) => (
              <tr key={seg.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{seg.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {seg.filters.roles?.join(", ") || "all roles"}
                  {seg.filters.languages?.length ? ` | ${seg.filters.languages.join(", ")}` : ""}
                </td>
                <td className="px-4 py-3 text-sm font-medium">{seg.count}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteMutation.mutate(seg.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
