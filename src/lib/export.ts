import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { AnalyzedRow } from "../types";
import { FIELD_ORDER } from "./columns";
import { remarksText } from "./format";

type T = (key: string, vars?: Record<string, string | number>) => string;

export type ExportScope =
  | "ALL"
  | "HIGH_PRIORITY"
  | "HIGH_RISK"
  | "STAKEHOLDER"
  | "AGENT"
  | "NEW_CREATION"
  | "EDITED";

export const EXPORT_SCOPES: ExportScope[] = [
  "ALL",
  "HIGH_PRIORITY",
  "HIGH_RISK",
  "STAKEHOLDER",
  "AGENT",
  "NEW_CREATION",
  "EDITED",
];

export function filterByScope(rows: AnalyzedRow[], scope: ExportScope): AnalyzedRow[] {
  switch (scope) {
    case "HIGH_PRIORITY":
      return rows.filter((r) => r.priority === "HIGH");
    case "HIGH_RISK":
      return rows.filter((r) => r.riskLevel === "HIGH");
    case "STAKEHOLDER":
      return rows.filter((r) => r.stakeholderConfirmationRequired);
    case "AGENT":
      return rows.filter((r) => r.agentRequestRequired);
    case "NEW_CREATION":
      return rows.filter(
        (r) =>
          r.suggestedAction === "REQUEST_NEW_HOTEL_CREATION" ||
          r.suggestedAction === "REQUEST_NEW_ROOM_CREATION"
      );
    case "EDITED":
      return rows.filter((r) => r.edited);
    case "ALL":
    default:
      return rows;
  }
}

// Build localized export records (header label -> value).
function toRecords(rows: AnalyzedRow[], t: T, includePrompt: boolean): Record<string, string>[] {
  return rows.map((r) => {
    const rec: Record<string, string> = {};
    rec[t("col.rowNo")] = String(r.id);
    for (const f of FIELD_ORDER) rec[t(`field.${f}`)] = r[f] ?? "";
    rec[t("col.priority")] = t(`level.${r.priority}`);
    rec[t("col.risk")] = t(`level.${r.riskLevel}`);
    rec[t("col.action")] = t(`action.${r.suggestedAction}`);
    rec[t("col.stakeholder")] = r.stakeholderConfirmationRequired ? t("common.yes") : t("common.no");
    rec[t("col.agent")] = r.agentRequestRequired ? t("common.yes") : t("common.no");
    rec[t("col.remarks")] = remarksText(r, t);
    if (includePrompt) rec[t("col.aiPrompt")] = r.aiPrompt ?? "";
    rec[t("col.reviewedBy")] = r.reviewedBy ?? "";
    rec[t("col.reviewedDate")] = r.reviewedDate ?? "";
    return rec;
  });
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function exportCsv(rows: AnalyzedRow[], t: T, includePrompt: boolean) {
  const records = toRecords(rows, t, includePrompt);
  const ws = XLSX.utils.json_to_sheet(records);
  const csv = XLSX.utils.sheet_to_csv(ws);
  // Prepend BOM so Excel renders Korean/UTF-8 correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `ams_results_${timestamp()}.csv`);
}

export function exportXlsx(rows: AnalyzedRow[], t: T, includePrompt: boolean) {
  const records = toRecords(rows, t, includePrompt);
  const ws = XLSX.utils.json_to_sheet(records);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "AMS Results");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], { type: "application/octet-stream" });
  saveAs(blob, `ams_results_${timestamp()}.xlsx`);
}
