import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { ParsedFile } from "../types";

// Parse an uploaded .csv or .xlsx file entirely in the browser.
export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return parseCsv(file);
  }
  return parseXlsx(file);
}

function toParsed(fileName: string, rows: Record<string, string>[]): ParsedFile {
  const headerSet: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k);
        headerSet.push(k);
      }
    }
  }
  return { fileName, headers: headerSet, rows };
}

function parseCsv(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const rows = res.data
          .map((r) => {
            const out: Record<string, string> = {};
            for (const [k, v] of Object.entries(r)) out[k] = v == null ? "" : String(v).trim();
            return out;
          })
          .filter((r) => Object.values(r).some((v) => v !== ""));
        resolve(toParsed(file.name, rows));
      },
      error: (err) => reject(err),
    });
  });
}

async function parseXlsx(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // defval keeps empty cells as "" so columns stay aligned.
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  const rows = json
    .map((r) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) out[k.trim()] = v == null ? "" : String(v).trim();
      return out;
    })
    .filter((r) => Object.values(r).some((v) => v !== ""));
  return toParsed(file.name, rows);
}
