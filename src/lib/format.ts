import type { AnalyzedRow } from "../types";

type T = (key: string, vars?: Record<string, string | number>) => string;

// Resolve a row's remarks to display text in the current language.
// A manual edit (remarksOverride) takes precedence over generated remark codes.
export function remarksText(row: AnalyzedRow, t: T): string {
  if (row.remarksOverride != null) return row.remarksOverride;
  return row.remarkCodes
    .map((c) => t(`remark.${c}`))
    .filter(Boolean)
    .join(" ");
}
