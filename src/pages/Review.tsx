import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { PageHeader, LevelBadge, ActionBadge, YesNo, EmptyState } from "../components/ui";
import { remarksText } from "../lib/format";
import { ACTIONS_LIST } from "../lib/actions";
import type { AnalyzedRow, Level, ActionKey } from "../types";

const LEVELS: Level[] = ["HIGH", "MEDIUM", "LOW"];

export default function Review() {
  const { t } = useI18n();
  const { rows, updateRow, hasResults } = useStore();

  const [q, setQ] = useState("");
  const [supplier, setSupplier] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [priority, setPriority] = useState("");
  const [risk, setRisk] = useState("");
  const [action, setAction] = useState("");
  const [stake, setStake] = useState("");
  const [agent, setAgent] = useState("");
  const [editing, setEditing] = useState<AnalyzedRow | null>(null);

  const uniq = (sel: (r: AnalyzedRow) => string) =>
    Array.from(new Set(rows.map(sel).filter(Boolean))).sort();

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (supplier && r.supplier !== supplier) return false;
      if (country && r.country !== country) return false;
      if (city && r.city !== city) return false;
      if (priority && r.priority !== priority) return false;
      if (risk && r.riskLevel !== risk) return false;
      if (action && r.suggestedAction !== action) return false;
      if (stake && String(r.stakeholderConfirmationRequired) !== stake) return false;
      if (agent && String(r.agentRequestRequired) !== agent) return false;
      if (q) {
        const hay = `${r.hotelName} ${r.hotelId} ${r.supplier} ${r.city} ${r.roomName}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, supplier, country, city, priority, risk, action, stake, agent]);

  const reset = () => {
    setQ(""); setSupplier(""); setCountry(""); setCity("");
    setPriority(""); setRisk(""); setAction(""); setStake(""); setAgent("");
  };

  if (!hasResults) return <EmptyState message={t("review.empty")} />;

  return (
    <div>
      <PageHeader
        title={t("review.title")}
        subtitle={t("review.subtitle")}
        actions={<span className="text-sm text-gray-500">{t("review.showing", { n: filtered.length, total: rows.length })}</span>}
      />

      {/* Filters */}
      <div className="card mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input max-w-xs" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={supplier} onChange={setSupplier} label={t("field.supplier")} options={uniq((r) => r.supplier)} />
          <Select value={country} onChange={setCountry} label={t("field.country")} options={uniq((r) => r.country)} />
          <Select value={city} onChange={setCity} label={t("field.city")} options={uniq((r) => r.city)} />
          <LevelSelect value={priority} onChange={setPriority} label={t("col.priority")} />
          <LevelSelect value={risk} onChange={setRisk} label={t("col.risk")} />
          <Select value={action} onChange={setAction} label={t("col.action")} options={ACTIONS_LIST} render={(a) => t(`action.${a}`)} />
          <BoolSelect value={stake} onChange={setStake} label={t("col.stakeholder")} t={t} />
          <BoolSelect value={agent} onChange={setAgent} label={t("col.agent")} t={t} />
          <button className="btn-ghost ml-auto" onClick={reset}>{t("review.reset")}</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">{t("col.rowNo")}</th>
                <th className="th">{t("field.supplier")}</th>
                <th className="th">{t("field.hotelId")}</th>
                <th className="th">{t("field.hotelName")}</th>
                <th className="th">{t("field.city")}</th>
                <th className="th">{t("field.activeStatus")}</th>
                <th className="th">{t("field.mappingStatus")}</th>
                <th className="th">{t("field.roomName")}</th>
                <th className="th">{t("field.bedType")}</th>
                <th className="th">{t("field.extraBedType")}</th>
                <th className="th">{t("col.priority")}</th>
                <th className="th">{t("col.risk")}</th>
                <th className="th">{t("col.action")}</th>
                <th className="th text-center">{t("col.stakeholder")}</th>
                <th className="th text-center">{t("col.agent")}</th>
                <th className="th min-w-[260px]">{t("col.remarks")}</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td className="td text-center text-gray-400" colSpan={17}>{t("review.noMatch")}</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${r.edited ? "bg-brand-50/30" : ""}`}>
                    <td className="td text-gray-400">{r.id}</td>
                    <td className="td">{r.supplier || "—"}</td>
                    <td className="td font-mono text-xs">{r.hotelId || "—"}</td>
                    <td className="td font-medium text-gray-800">
                      {r.hotelName || "—"}
                      {r.internalHotelName && <div className="text-[11px] font-normal text-gray-400">↔ {r.internalHotelName}</div>}
                    </td>
                    <td className="td">{r.city || "—"}</td>
                    <td className="td">{r.activeStatus || "—"}</td>
                    <td className="td">{r.mappingStatus || "—"}</td>
                    <td className="td">{r.roomName || "—"}</td>
                    <td className="td">{r.bedType || "—"}</td>
                    <td className="td">{r.extraBedType || <span className="text-amber-600">—</span>}</td>
                    <td className="td"><LevelBadge level={r.priority} /></td>
                    <td className="td"><LevelBadge level={r.riskLevel} /></td>
                    <td className="td"><ActionBadge action={r.suggestedAction} /></td>
                    <td className="td text-center"><YesNo value={r.stakeholderConfirmationRequired} /></td>
                    <td className="td text-center"><YesNo value={r.agentRequestRequired} /></td>
                    <td className="td text-xs text-gray-600">{remarksText(r, t)}</td>
                    <td className="td">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(r)}>{t("common.edit")}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => { updateRow(editing.id, patch); setEditing(null); }}
        />
      )}
    </div>
  );
}

function Select({ value, onChange, label, options, render }: {
  value: string; onChange: (v: string) => void; label: string; options: string[]; render?: (v: string) => string;
}) {
  const { t } = useI18n();
  return (
    <select className="input max-w-[170px] py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}: {t("common.all")}</option>
      {options.map((o) => <option key={o} value={o}>{render ? render(o) : o}</option>)}
    </select>
  );
}

function LevelSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { t } = useI18n();
  return (
    <select className="input max-w-[150px] py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}: {t("common.all")}</option>
      {LEVELS.map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
    </select>
  );
}

function BoolSelect({ value, onChange, label, t }: { value: string; onChange: (v: string) => void; label: string; t: (k: string) => string }) {
  return (
    <select className="input max-w-[170px] py-1.5" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}: {t("common.all")}</option>
      <option value="true">{t("common.yes")}</option>
      <option value="false">{t("common.no")}</option>
    </select>
  );
}

function EditModal({ row, onClose, onSave }: {
  row: AnalyzedRow; onClose: () => void; onSave: (patch: Partial<AnalyzedRow>) => void;
}) {
  const { t } = useI18n();
  const [priority, setPriority] = useState<Level>(row.priority);
  const [risk, setRisk] = useState<Level>(row.riskLevel);
  const [action, setAction] = useState<ActionKey>(row.suggestedAction);
  const [remarks, setRemarks] = useState(remarksText(row, t));
  const [reviewedBy, setReviewedBy] = useState(row.reviewedBy ?? "");

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-base font-semibold text-gray-900">{t("review.editRow")} #{row.id}</h2>
        <p className="mb-4 text-sm text-gray-500">{row.hotelName}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="label">{t("col.priority")}</div>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Level)}>
              {LEVELS.map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
            </select>
          </div>
          <div>
            <div className="label">{t("col.risk")}</div>
            <select className="input" value={risk} onChange={(e) => setRisk(e.target.value as Level)}>
              {LEVELS.map((l) => <option key={l} value={l}>{t(`level.${l}`)}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <div className="label">{t("col.action")}</div>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value as ActionKey)}>
              {ACTIONS_LIST.map((a) => <option key={a} value={a}>{t(`action.${a}`)}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <div className="label">{t("col.remarks")}</div>
            <textarea className="input min-h-[80px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <div className="col-span-2">
            <div className="label">{t("review.reviewedBy")}</div>
            <input className="input" placeholder={t("review.yourName")} value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button
            className="btn-primary"
            onClick={() =>
              onSave({
                priority,
                riskLevel: risk,
                suggestedAction: action,
                remarksOverride: remarks,
                reviewedBy: reviewedBy || undefined,
              })
            }
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
