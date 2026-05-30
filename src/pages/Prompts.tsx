import { useMemo, useState } from "react";
import { useI18n, type Lang } from "../i18n";
import { useStore } from "../store";
import { PageHeader, EmptyState, LevelBadge } from "../components/ui";
import { generatePrompt, PROMPT_TYPES, type PromptType } from "../lib/prompts";

export default function Prompts() {
  const { t, lang } = useI18n();
  const { rows, hasResults, attachPrompt } = useStore();

  const [rowId, setRowId] = useState<number | null>(rows[0]?.id ?? null);
  const [type, setType] = useState<PromptType>("HOTEL_ADDRESS");
  const [promptLang, setPromptLang] = useState<Lang>(lang);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const row = useMemo(() => rows.find((r) => r.id === rowId) ?? null, [rows, rowId]);
  const prompt = useMemo(() => (row ? generatePrompt(row, type, promptLang) : ""), [row, type, promptLang]);

  if (!hasResults) return <EmptyState message={t("prompts.empty")} />;

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const save = () => {
    if (row) {
      attachPrompt(row.id, prompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <div>
      <PageHeader title={t("prompts.title")} subtitle={t("prompts.subtitle")} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Controls */}
        <div className="space-y-4">
          <div className="card p-4">
            <div className="label">{t("prompts.selectRow")}</div>
            <select className="input" value={rowId ?? ""} onChange={(e) => setRowId(Number(e.target.value))}>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} · {r.hotelName || r.hotelId || "—"}
                </option>
              ))}
            </select>

            <div className="label mt-4">{t("prompts.promptType")}</div>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as PromptType)}>
              {PROMPT_TYPES.map((p) => (
                <option key={p} value={p}>{t(`ptype.${p}`)}</option>
              ))}
            </select>

            <div className="label mt-4">{t("prompts.promptLang")}</div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {(["ko", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setPromptLang(l)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    promptLang === l ? "bg-white text-brand-700 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {t(`lang.${l}`)}
                </button>
              ))}
            </div>
          </div>

          {row && (
            <div className="card p-4 text-xs text-gray-600">
              <div className="label">{t("prompts.rowInfo")}</div>
              <div className="mb-2 flex gap-1.5">
                <LevelBadge level={row.priority} />
                <LevelBadge level={row.riskLevel} />
              </div>
              <dl className="space-y-1">
                <Info label={t("field.hotelName")} value={row.hotelName} />
                <Info label={t("field.internalHotelName")} value={row.internalHotelName} />
                <Info label={t("field.address")} value={row.address} />
                <Info label={t("field.roomName")} value={row.roomName} />
                <Info label={t("field.bedType")} value={row.bedType} />
                <Info label={t("field.extraBedType")} value={row.extraBedType} />
              </dl>
            </div>
          )}
        </div>

        {/* Generated prompt */}
        <div className="card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">{t("prompts.generated")}</div>
            <div className="flex gap-2">
              <button className="btn-ghost px-2.5 py-1 text-xs" onClick={save}>{saved ? t("prompts.saved") : t("prompts.save")}</button>
              <button className="btn-primary px-2.5 py-1 text-xs" onClick={copy}>{copied ? t("common.copied") : t("common.copy")}</button>
            </div>
          </div>
          <textarea
            readOnly
            value={prompt}
            className="h-[460px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-800"
          />
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-gray-400">{label}</dt>
      <dd className="min-w-0 break-words text-gray-700">{value || "—"}</dd>
    </div>
  );
}
