import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { PageHeader, BandBadge, StatusBadge, ScorePill, EmptyState } from "../components/ui";
import { generatePrompt, PROMPT_TYPES, type PromptType } from "../lib/prompts";
import type { MatchRow, Band, RowStatus } from "../types";

const BANDS: Band[] = ["AUTO", "REVIEW", "NOMATCH"];
const STATUSES: RowStatus[] = ["PENDING", "CONFIRMED", "NEED_CREATION", "WEBSITE_CHECK"];

export default function Review() {
  const { t } = useI18n();
  const { matches, hasMatches, updateRow } = useStore();
  const [q, setQ] = useState("");
  const [band, setBand] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [unlinked, setUnlinked] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const priorities = useMemo(() => Array.from(new Set(matches.map((m) => m.priority).filter(Boolean))).sort(), [matches]);

  const filtered = useMemo(() => matches.filter((r) => {
    if (band && r.band !== band) return false;
    if (status && r.status !== status) return false;
    if (priority && r.priority !== priority) return false;
    if (unlinked && r.hotelLinked) return false;
    if (q) {
      const hay = `${r.clientHotelName} ${r.clientRoomName} ${r.masterHotelName} ${r.id}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [matches, band, status, priority, unlinked, q]);

  if (!hasMatches) return <EmptyState message={t("review.empty")} />;
  const editingRow = editing ? matches.find((m) => m.id === editing) ?? null : null;

  return (
    <div>
      <PageHeader title={t("review.title")} subtitle={t("review.subtitle")}
        actions={<span className="text-sm text-gray-500">{t("review.showing", { n: filtered.length, total: matches.length })}</span>} />

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <input className="input max-w-xs" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-[150px]" value={band} onChange={(e) => setBand(e.target.value)}>
          <option value="">{t("review.band")}: {t("common.all")}</option>
          {BANDS.map((b) => <option key={b} value={b}>{t(`band.${b}`)}</option>)}
        </select>
        <select className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t("review.status")}: {t("common.all")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <select className="input max-w-[150px]" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">{t("review.priority")}: {t("common.all")}</option>
          {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={unlinked} onChange={(e) => setUnlinked(e.target.checked)} />
          {t("review.unlinkedOnly")}
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">{t("review.priority")}</th>
                <th className="th">{t("col.clientHotel")}</th>
                <th className="th">{t("col.clientRoom")}</th>
                <th className="th">{t("col.clientBed")}</th>
                <th className="th">{t("review.best")} → {t("col.ourRoom")}</th>
                <th className="th text-center">{t("col.confidence")}</th>
                <th className="th text-center">{t("review.band")}</th>
                <th className="th text-center">{t("review.status")}</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td className="td text-center text-gray-400" colSpan={9}>{t("review.noRows")}</td></tr>
              ) : filtered.map((r) => {
                const chosen = r.candidates.find((c) => c.roomCode === r.chosenRoomCode);
                const best = r.candidates[0];
                const show = chosen ?? best;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="td whitespace-nowrap text-xs text-gray-500">{r.priority || "—"}</td>
                    <td className="td">
                      <div className="font-medium text-gray-800">{r.clientHotelName || "—"}</div>
                      {!r.hotelLinked
                        ? <div className="text-[11px] text-red-500">{t("review.notLinked")}</div>
                        : <div className="text-[11px] text-gray-400">→ {r.masterHotelName}{r.expediaCode && r.expediaCode !== "0" ? ` · Exp ${r.expediaCode}` : ""}</div>}
                    </td>
                    <td className="td font-medium text-gray-800">{r.clientRoomName}</td>
                    <td className="td text-xs">{r.clientBedType || "—"}</td>
                    <td className="td text-sm">{show ? show.roomName : <span className="text-gray-400">—</span>}</td>
                    <td className="td text-center">{show ? <ScorePill score={show.score} /> : "—"}</td>
                    <td className="td text-center"><BandBadge band={r.band} /></td>
                    <td className="td text-center"><StatusBadge status={r.status} /></td>
                    <td className="td"><button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(r.id)}>{t("common.confirm")}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingRow && <DetailModal row={editingRow} onClose={() => setEditing(null)}
        onUpdate={(patch) => updateRow(editingRow.id, patch)} />}
    </div>
  );
}

function DetailModal({ row, onClose, onUpdate }: { row: MatchRow; onClose: () => void; onUpdate: (p: Partial<MatchRow>) => void }) {
  const { t, lang } = useI18n();
  const [picked, setPicked] = useState(row.chosenRoomCode || row.candidates[0]?.roomCode || "");
  const [remarks, setRemarks] = useState(row.remarks);
  const [reviewer, setReviewer] = useState(row.reviewedBy);
  const [website, setWebsite] = useState(row.websiteUrl);
  const [ptype, setPtype] = useState<PromptType>("ROOM_MATCH");
  const [copied, setCopied] = useState(false);

  const prompt = generatePrompt(row, ptype, lang);
  const base = () => ({ remarks, reviewedBy: reviewer, websiteUrl: website, aiPrompt: prompt });

  const confirm = () => { onUpdate({ ...base(), chosenRoomCode: picked, status: "CONFIRMED" }); onClose(); };
  const markCreate = () => { onUpdate({ ...base(), chosenRoomCode: "", status: "NEED_CREATION" }); onClose(); };
  const markWebsite = () => { onUpdate({ ...base(), status: "WEBSITE_CHECK" }); onClose(); };
  const copy = async () => { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3">
          <div className="text-base font-semibold text-gray-900">{row.clientRoomName}</div>
          <div className="text-xs text-gray-500">
            {row.clientHotelName}
            {row.hotelLinked
              ? ` → ${row.masterHotelName} (${t("review.linkedBy", { by: row.hotelLinkBy ?? "" })})${row.expediaCode && row.expediaCode !== "0" ? ` · Expedia ${row.expediaCode}` : ""}`
              : ` · ${t("review.notLinked")}`}
            {" · "}{t("col.clientBed")}: {row.clientBedType || "—"}
          </div>
        </div>

        {/* Candidates */}
        <div className="mb-4">
          <div className="label">{t("review.pick")}</div>
          {row.candidates.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">{t("review.noCandidates")}</p>
          ) : (
            <div className="space-y-1.5">
              {row.candidates.map((c) => (
                <label key={c.roomCode}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${picked === c.roomCode ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="cand" checked={picked === c.roomCode} onChange={() => setPicked(c.roomCode)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ScorePill score={c.score} />
                      <span className="truncate text-sm font-medium text-gray-800">{c.roomName}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-400">
                      [{c.roomCode}] {c.type || "?"} · {c.grade || "?"} · {c.view || "?"} · {c.bedSummary || "?"}
                      <span className="ml-2 text-gray-300">({t("review.subscores")}: {c.parts.name}/{c.parts.bed}/{c.parts.type}/{c.parts.grade}/{c.parts.view})</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Reviewer / remarks / website */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div><div className="label">{t("review.reviewedBy")}</div><input className="input" placeholder={t("review.yourName")} value={reviewer} onChange={(e) => setReviewer(e.target.value)} /></div>
          <div><div className="label">{t("review.website")}</div><input className="input" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
          <div className="col-span-2"><div className="label">{t("review.remarks")}</div><textarea className="input min-h-[56px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
        </div>

        {/* AI prompt */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <div className="label mb-0">{t("review.aiPrompt")}</div>
            <div className="flex items-center gap-2">
              <select className="input py-1 text-xs" value={ptype} onChange={(e) => setPtype(e.target.value as PromptType)}>
                {PROMPT_TYPES.map((p) => <option key={p} value={p}>{t(`ptype.${p}`)}</option>)}
              </select>
              <button className="btn-ghost px-2 py-1 text-xs" onClick={copy}>{copied ? t("common.copied") : t("common.copy")}</button>
            </div>
          </div>
          <textarea readOnly value={prompt} className="h-40 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-2 font-mono text-[11px] leading-relaxed text-gray-700" />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          <button className="btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn-ghost border-purple-300 text-purple-700" onClick={markWebsite}>{t("review.markWebsite")}</button>
          <button className="btn-ghost border-orange-300 text-orange-700" onClick={markCreate}>{t("review.markCreate")}</button>
          <button className="btn-primary" disabled={!picked} onClick={confirm}>{t("review.confirmMatch")}</button>
        </div>
      </div>
    </div>
  );
}
