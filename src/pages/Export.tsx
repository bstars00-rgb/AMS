import { useState } from "react";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { PageHeader, EmptyState } from "../components/ui";
import { EXPORT_SCOPES, filterByScope, exportCsv, exportXlsx, type ExportScope } from "../lib/export";

export default function Export() {
  const { t } = useI18n();
  const tFn = t;
  const { rows, hasResults } = useStore();
  const [scope, setScope] = useState<ExportScope>("ALL");
  const [includePrompt, setIncludePrompt] = useState(true);

  if (!hasResults) return <EmptyState message={t("export.empty")} />;

  const selected = filterByScope(rows, scope);

  return (
    <div>
      <PageHeader title={t("export.title")} subtitle={t("export.subtitle")} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="label">{t("export.scope")}</div>
          <div className="space-y-2">
            {EXPORT_SCOPES.map((s) => {
              const count = filterByScope(rows, s).length;
              return (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                    scope === s ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} />
                    {t(`scope.${s}`)}
                  </span>
                  <span className="text-xs font-medium text-gray-400">{count}</span>
                </label>
              );
            })}
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={includePrompt} onChange={(e) => setIncludePrompt(e.target.checked)} />
            {t("export.includePrompt")}
          </label>
        </div>

        <div className="card flex flex-col p-5">
          <div className="label">{t("export.format")}</div>
          <p className="mb-4 text-sm text-gray-600">{t("export.count", { n: selected.length })}</p>
          <div className="mt-auto flex gap-3">
            <button
              className="btn-primary flex-1"
              disabled={selected.length === 0}
              onClick={() => exportCsv(selected, tFn, includePrompt)}
            >
              ⭳ CSV
            </button>
            <button
              className="btn-primary flex-1"
              disabled={selected.length === 0}
              onClick={() => exportXlsx(selected, tFn, includePrompt)}
            >
              ⭳ XLSX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
