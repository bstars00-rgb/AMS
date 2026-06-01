import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { MatchRow } from "../types";

type T = (key: string, vars?: Record<string, string | number>) => string;

export type ExportScope =
  | "ALL"
  | "CONFIRMED"
  | "AUTO"
  | "REVIEW"
  | "NOMATCH"
  | "NEED_CREATION"
  | "UNLINKED";

export const EXPORT_SCOPES: ExportScope[] = [
  "ALL",
  "CONFIRMED",
  "AUTO",
  "REVIEW",
  "NOMATCH",
  "NEED_CREATION",
  "UNLINKED",
];

export function filterByScope(rows: MatchRow[], scope: ExportScope): MatchRow[] {
  switch (scope) {
    case "CONFIRMED":
      return rows.filter((r) => r.status === "CONFIRMED");
    case "AUTO":
      return rows.filter((r) => r.band === "AUTO");
    case "REVIEW":
      return rows.filter((r) => r.band === "REVIEW");
    case "NOMATCH":
      return rows.filter((r) => r.band === "NOMATCH");
    case "NEED_CREATION":
      return rows.filter((r) => r.status === "NEED_CREATION");
    case "UNLINKED":
      return rows.filter((r) => !r.hotelLinked);
    case "ALL":
    default:
      return rows;
  }
}

function chosen(row: MatchRow) {
  return row.candidates.find((c) => c.roomCode === row.chosenRoomCode);
}

function toRecords(rows: MatchRow[], t: T): Record<string, string>[] {
  return rows.map((r) => {
    const c = chosen(r);
    const best = r.candidates[0];
    return {
      [t("col.clientHotel")]: r.clientHotelName,
      [t("col.clientHotelCode")]: r.clientHotelCode,
      [t("col.clientRoomId")]: r.id,
      [t("col.clientRoom")]: r.clientRoomName,
      [t("col.clientBed")]: r.clientBedType,
      [t("col.ourHotel")]: r.masterHotelName,
      [t("col.ourHotelCode")]: r.masterHotelCode,
      [t("col.expedia")]: r.expediaCode,
      [t("col.ourRoomCode")]: r.chosenRoomCode || "",
      [t("col.ourRoom")]: c?.roomName ?? "",
      [t("col.confidence")]: String((c ?? best)?.score ?? ""),
      [t("col.band")]: t(`band.${r.band}`),
      [t("col.status")]: t(`status.${r.status}`),
      // P1-b calibration columns: top candidate score, whether the human kept the
      // top candidate, and whether a bed conflict was present. Lets the team
      // measure accept-rate by score and recalibrate thresholds from real data.
      [t("col.topScore")]: String(best?.score ?? ""),
      [t("col.chosenIsTop")]: r.chosenRoomCode ? (best?.roomCode === r.chosenRoomCode ? t("common.yes") : t("common.no")) : "",
      [t("col.bedConflict")]: r.bedConflict ? t("common.yes") : t("common.no"),
      [t("col.remarks")]: r.remarks,
      [t("col.website")]: r.websiteUrl,
      [t("col.reviewedBy")]: r.reviewedBy,
      [t("col.reviewedDate")]: r.reviewedDate,
    };
  });
}

function ts(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function exportCsv(rows: MatchRow[], t: T) {
  const ws = XLSX.utils.json_to_sheet(toRecords(rows, t));
  const csv = XLSX.utils.sheet_to_csv(ws);
  saveAs(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `ams_mapping_${ts()}.csv`);
}

export function exportXlsx(rows: MatchRow[], t: T) {
  const ws = XLSX.utils.json_to_sheet(toRecords(rows, t));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mapping");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([out], { type: "application/octet-stream" }), `ams_mapping_${ts()}.xlsx`);
}
