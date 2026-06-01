import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { useStore } from "../store";
import { PageHeader, BandBadge, StatusBadge, ScorePill, EmptyState } from "../components/ui";
import { generatePrompt, PROMPT_TYPES, type PromptType } from "../lib/prompts";
import { DEFAULT_WEIGHTS } from "../lib/match";
import { searchLinks } from "../lib/search";
import type { MatchRow, Band, RowStatus, MatchSettings, RoomWeights } from "../types";

const BANDS: Band[] = ["AUTO", "REVIEW", "NOMATCH"];
const STATUSES: RowStatus[] = ["PENDING", "CONFIRMED", "NEED_CREATION", "WEBSITE_CHECK"];

export default function Review() {
  const { t } = useI18n();
  const { matches, hasMatches, updateRow, settings, applyTuning } = useStore();
  const [q, setQ] = useState("");
  const [band, setBand] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [unlinked, setUnlinked] = useState(false);
  const [bedOnly, setBedOnly] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const priorities = useMemo(() => Array.from(new Set(matches.map((m) => m.priority).filter(Boolean))).sort(), [matches]);

  const stats = useMemo(() => {
    const s = { total: matches.length, AUTO: 0, REVIEW: 0, NOMATCH: 0, bed: 0, confirmed: 0 };
    for (const r of matches) {
      s[r.band] += 1;
      if (r.bedConflict) s.bed += 1;
      if (r.status === "CONFIRMED") s.confirmed += 1;
    }
    return s;
  }, [matches]);

  const filtered = useMemo(() => matches.filter((r) => {
    if (band && r.band !== band) return false;
    if (status && r.status !== status) return false;
    if (priority && r.priority !== priority) return false;
    if (unlinked && r.hotelLinked) return false;
    if (bedOnly && !r.bedConflict) return false;
    if (q) {
      const hay = `${r.clientHotelName} ${r.clientRoomName} ${r.masterHotelName} ${r.id}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [matches, band, status, priority, unlinked, bedOnly, q]);

  if (!hasMatches) return <EmptyState message={t("review.empty")} />;
  const editingRow = editing ? matches.find((m) => m.id === editing) ?? null : null;

  return (
    <div>
      <PageHeader title={t("review.title")} subtitle={t("review.subtitle")}
        actions={<span className="text-sm text-gray-500">{t("review.showing", { n: filtered.length, total: matches.length })}</span>} />

      {/* Calibration stats strip */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Stat label={t("review.stat.total")} value={stats.total} />
        <Stat label={t("band.AUTO")} value={stats.AUTO} color="text-green-600" />
        <Stat label={t("band.REVIEW")} value={stats.REVIEW} color="text-amber-600" />
        <Stat label={t("band.NOMATCH")} value={stats.NOMATCH} color="text-red-600" />
        <Stat label={t("review.bedConflict")} value={stats.bed} color="text-red-600" />
        <Stat label={t("review.stat.confirmed")} value={stats.confirmed} color="text-brand-700" />
      </div>
      <p className="mb-3 text-xs text-gray-400">ⓘ {t("review.scoreNote")}</p>

      <TuningPanel settings={settings} onChange={applyTuning} />

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
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={bedOnly} onChange={(e) => setBedOnly(e.target.checked)} />
          {t("review.bedConflictOnly")}
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
                    <td className="td text-center">
                      <div className="flex items-center justify-center gap-1">
                        <BandBadge band={r.band} />
                        {r.bedConflict && <span title={t("review.bedGateNote")} className="text-red-500">🛏✕</span>}
                        {r.circularBlocked && <span title={t("review.blockedTitle")} className="text-amber-600">🔁</span>}
                      </div>
                    </td>
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

function TuningPanel({ settings, onChange }: { settings: MatchSettings; onChange: (s: MatchSettings) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const w = settings.weights;
  const keys: (keyof RoomWeights)[] = ["name", "bed", "type", "grade", "view"];
  const total = keys.reduce((s, k) => s + w[k], 0) || 1;
  const setW = (k: keyof RoomWeights, v: number) => onChange({ ...settings, weights: { ...w, [k]: v } });
  const reset = () => onChange({ ...settings, weights: { ...DEFAULT_WEIGHTS }, autoThreshold: 90, reviewThreshold: 65 });

  return (
    <div className="card mb-4 p-3">
      <button className="flex w-full items-center justify-between text-sm font-semibold text-gray-800" onClick={() => setOpen(!open)}>
        <span>⚙ {t("review.tuning")}</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3">
          <p className="mb-3 text-xs text-gray-500">{t("review.tuningHint")}</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div className="label">{t("review.weights")}</div>
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-xs text-gray-600">{t(`review.w.${k}`)}</span>
                    <input type="range" min={0} max={100} value={w[k]} onChange={(e) => setW(k, Number(e.target.value))} className="flex-1 accent-brand-600" />
                    <span className="w-10 text-right text-xs tabular-nums text-gray-500">{w[k]}</span>
                    <span className="w-12 text-right text-[11px] tabular-nums text-brand-700">{Math.round((w[k] / total) * 100)}%</span>
                  </div>
                ))}
                <div className="text-right text-[10px] text-gray-400">{t("review.normalized")}</div>
              </div>
            </div>
            <div>
              <div className="label">{t("review.thresholds")}</div>
              <div className="flex flex-wrap items-end gap-4">
                <label className="text-xs text-gray-600">
                  <span className="mb-1 block">{t("load.autoTh")}</span>
                  <input type="number" min={0} max={100} className="input w-24" value={settings.autoThreshold}
                    onChange={(e) => onChange({ ...settings, autoThreshold: Number(e.target.value) })} />
                </label>
                <label className="text-xs text-gray-600">
                  <span className="mb-1 block">{t("load.reviewTh")}</span>
                  <input type="number" min={0} max={100} className="input w-24" value={settings.reviewThreshold}
                    onChange={(e) => onChange({ ...settings, reviewThreshold: Number(e.target.value) })} />
                </label>
                <button className="btn-ghost" onClick={reset}>{t("common.reset")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card flex items-center gap-2 px-3 py-1.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color ?? "text-gray-800"}`}>{value}</span>
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

        {row.bedConflict && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            ⚠ {t("review.bedGateNote")}
          </div>
        )}

        {/* Candidates */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="label mb-0">{t("review.pick")}</span>
            <span className="text-[11px] text-gray-400">ⓘ {t("review.scoreNote")}</span>
          </div>
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
                      {c.bedConflict && <span className="shrink-0 text-xs text-red-500" title={t("review.bedGateNote")}>🛏✕</span>}
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

        {row.blockedCandidates && row.blockedCandidates.length > 0 && (
          <div className="mb-4">
            <div className="label text-amber-700">{t("review.blockedTitle")}</div>
            <div className="space-y-1">
              {row.blockedCandidates.map((c) => (
                <div key={c.roomCode} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-1.5 opacity-70">
                  <ScorePill score={c.score} />
                  <span className="truncate text-sm text-gray-700 line-through">{c.roomName}</span>
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{t("review.circular")} · {c.source}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviewer / remarks / website */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div><div className="label">{t("review.reviewedBy")}</div><input className="input" placeholder={t("review.yourName")} value={reviewer} onChange={(e) => setReviewer(e.target.value)} /></div>
          <div><div className="label">{t("review.website")}</div><input className="input" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
          <div className="col-span-2"><div className="label">{t("review.remarks")}</div><textarea className="input min-h-[56px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
        </div>

        {/* Web search (one-click verify) */}
        <div className="mb-4">
          <div className="label">{t("review.webSearch")}</div>
          <div className="flex flex-wrap gap-2">
            {searchLinks(row.masterHotelName || row.clientHotelName, row.city, row.clientRoomName).map((l) => (
              <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-ghost px-2.5 py-1 text-xs">
                🔎 {t(`search.${l.key}`)}
              </a>
            ))}
          </div>
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
