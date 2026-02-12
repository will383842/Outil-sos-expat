import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { useTags, useCreateTag, useDeleteTag } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function TagsPage() {
  const { t } = useTranslation();
  const { data: tags, isLoading } = useTags();
  const createMutation = useCreateTag();
  const deleteMutation = useDeleteTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0088cc");

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), color });
    setName("");
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("tags.title")}</h1>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("tags.name")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="VIP" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("tags.color")}</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
        </div>
        <button type="submit" disabled={createMutation.isPending} className="flex items-center gap-2 px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 disabled:opacity-50">
          <Plus className="w-4 h-4" /> {t("tags.create")}
        </button>
      </form>

      {/* Tags list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("tags.color")}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("tags.name")}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("tags.subscribers")}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tags?.map((tag) => (
              <tr key={tag.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: tag.color }} />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{tag.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{tag._count?.subscribers ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { if (confirm(t("tags.confirmDelete"))) deleteMutation.mutate(tag.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-500"
                  >
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
