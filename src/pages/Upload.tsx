import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { parseFile } from "../lib/parse";
import { FIELD_ORDER, REQUIRED_FIELDS } from "../lib/columns";
import { SAMPLE_FILE } from "../lib/sample";
import { PageHeader } from "../components/ui";
import type { FieldKey } from "../types";

export default function Upload() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { parsed, columnMap, fileName, setParsedFile, setColumnMap, runAnalysis } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const p = await parseFile(file);
      if (p.rows.length === 0) {
        setError(t("upload.parseError"));
        return;
      }
      setParsedFile(p);
    } catch {
      setError(t("upload.parseError"));
    }
  };

  const missingRequired = REQUIRED_FIELDS.filter((f) => !columnMap[f]);

  const analyze = () => {
    const n = runAnalysis();
    if (n > 0) navigate("/review");
  };

  const setMap = (field: FieldKey, header: string) => {
    setColumnMap({ ...columnMap, [field]: header || undefined });
  };

  return (
    <div>
      <PageHeader
        title={t("upload.title")}
        subtitle={t("upload.subtitle")}
        actions={
          <button className="btn-ghost" onClick={() => setParsedFile(SAMPLE_FILE)}>
            {t("upload.sample")}
          </button>
        }
      />

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-12 text-center transition ${
          dragOver ? "border-brand-500 bg-brand-50" : "border-gray-300 bg-white hover:border-brand-400"
        }`}
      >
        <span className="text-4xl text-gray-300">⭱</span>
        <span className="mt-3 text-sm font-medium text-gray-700">{t("upload.drop")}</span>
        <span className="mt-1 text-xs text-gray-400">{t("upload.or")}</span>
        <span className="btn-primary mt-2">{t("upload.browse")}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>

      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {parsed && (
        <>
          <div className="mt-5 flex flex-wrap gap-4">
            <div className="card flex-1 min-w-[200px] p-4">
              <div className="label">{t("upload.loaded")}</div>
              <div className="truncate text-sm font-medium text-gray-800" title={fileName}>{fileName}</div>
            </div>
            <div className="card min-w-[160px] p-4">
              <div className="label">{t("upload.totalRows")}</div>
              <div className="text-2xl font-semibold text-brand-700">{parsed.rows.length}</div>
            </div>
          </div>

          {/* Column mapping */}
          <div className="card mt-5 p-5">
            <h2 className="text-sm font-semibold text-gray-800">{t("upload.mappingTitle")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("upload.mappingHint")}</p>

            <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
              {FIELD_ORDER.map((field) => {
                const required = REQUIRED_FIELDS.includes(field);
                const unset = required && !columnMap[field];
                return (
                  <div key={field} className="flex items-center gap-2">
                    <label className="w-40 shrink-0 text-xs font-medium text-gray-600">
                      {t(`field.${field}`)}
                      {required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    <select
                      className={`input py-1.5 ${unset ? "border-red-300" : ""}`}
                      value={columnMap[field] ?? ""}
                      onChange={(e) => setMap(field, e.target.value)}
                    >
                      <option value="">{t("upload.notMapped")}</option>
                      {parsed.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
              {missingRequired.length > 0 && (
                <p className="text-xs text-red-600">
                  {t("upload.missingRequired")}{" "}
                  {missingRequired.map((f) => t(`field.${f}`)).join(", ")}
                </p>
              )}
              <button className="btn-primary ml-auto" disabled={missingRequired.length > 0} onClick={analyze}>
                {t("upload.analyze")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
