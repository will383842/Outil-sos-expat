/**
 * =============================================================================
 * COMPOSANT EXPORT BUTTON — Bouton d'export de données
 * Permet d'exporter des données en CSV ou JSON
 * =============================================================================
 */

import { useState } from "react";
import { Download, FileSpreadsheet, FileJson, ChevronDown, X } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";

// =============================================================================
// TYPES
// =============================================================================

export type ExportFormat = "csv" | "json";

interface ExportButtonProps {
  onExport: (format: ExportFormat) => Promise<void>;
  disabled?: boolean;
  label?: string;
  count?: number;
}

// =============================================================================
// COMPOSANT
// =============================================================================

export default function ExportButton({
  onExport,
  disabled = false,
  label,
  count,
}: ExportButtonProps) {
  const { t } = useLanguage({ mode: "admin" });
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const displayLabel = label ?? t("actions.export");

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    try {
      await onExport(format);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || exporting}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4 text-gray-600" />
        <span className="text-gray-700">{displayLabel}</span>
        {count !== undefined && count > 0 && (
          <span className="text-xs text-gray-500">({count})</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent border-0"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            aria-label={t("actions.close")}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {t("export.format")}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-1">
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">CSV</div>
                  <div className="text-xs text-gray-500">{t("export.csvDescription")}</div>
                </div>
              </button>

              <button
                onClick={() => handleExport("json")}
                disabled={exporting}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg disabled:opacity-50"
              >
                <FileJson className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">JSON</div>
                  <div className="text-xs text-gray-500">{t("export.jsonDescription")}</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
