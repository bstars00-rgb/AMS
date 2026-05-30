import type { Smoking } from "../types";

// ---------- generic text ----------
export function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}

/** 0..1 similarity, order-insensitive on word tokens. */
export function similarity(a: string, b: string): number {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const sa = na.split(" ").sort().join(" ");
  const sb = nb.split(" ").sort().join(" ");
  return 1 - levenshtein(sa, sb) / Math.max(sa.length, sb.length);
}

// ---------- bed type normalization ----------
// Maps both our vocab (Single, Double, King, Semi Double, Sofa bed, Bunk Bed, …)
// and the client vocab (King Bed, SingleBed, DoubleBed, Queen Bed, Semi-double, …)
// onto canonical tokens. Client values may be multi-option ("SingleBed/King Bed").
export function normalizeBeds(raw: string): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[/,+&]|\bor\b|\band\b/i)
        .map((p) => canonicalBed(p))
        .filter(Boolean)
    )
  );
}

function canonicalBed(part: string): string {
  // Strip "bed"/"beds" even when concatenated (client uses "DoubleBed", "SingleBed").
  const s = norm(part).replace(/beds?/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (/semi[\s-]?double/.test(s)) return "semidouble";
  if (/\bking\b/.test(s)) return "king";
  if (/\bqueen\b/.test(s)) return "queen";
  if (/\bdouble\b/.test(s)) return "double";
  if (/\bsingle\b|\btwin\b/.test(s)) return "single";
  if (/\bsofa\b/.test(s)) return "sofa";
  if (/\bbunk\b/.test(s)) return "bunk";
  if (/\bfloor\b|futon|tatami/.test(s)) return "floor";
  if (/\bextra\b|rollaway/.test(s)) return "extra";
  if (/\bcapsule\b/.test(s)) return "capsule";
  return s.replace(/\s+/g, "");
}

export function bedLabel(token: string): string {
  const map: Record<string, string> = {
    king: "King", queen: "Queen", double: "Double", single: "Single",
    semidouble: "Semi Double", sofa: "Sofa", bunk: "Bunk", floor: "Floor", extra: "Extra", capsule: "Capsule",
  };
  return map[token] ?? token;
}

// ---------- room name parsing ----------
const GRADES: [string, RegExp][] = [
  ["suite", /\bsuites?\b/], ["junior suite", /\bjunior\b/], ["presidential", /\bpresidential\b/],
  ["executive", /\bexecutive\b|\bclub\b/], ["premier", /\bpremier\b/], ["premium", /\bpremium\b/],
  ["deluxe", /\bdeluxe\b|\bdlx\b/], ["superior", /\bsuperior\b|\bsup\b/], ["grand", /\bgrand\b/],
  ["luxury", /\bluxury\b/], ["family", /\bfamily\b/], ["comfort", /\bcomfort\b/],
  ["economy", /\beconomy\b|\bbudget\b/], ["standard", /\bstandard\b|\bstd\b|\bclassic\b/],
];
const VIEWS: [string, RegExp][] = [
  ["ocean", /\bocean\b/], ["sea", /\bsea\b/], ["garden", /\bgarden\b/], ["city", /\bcity\b/],
  ["mountain", /\bmountain\b/], ["river", /\briver\b/], ["pool", /\bpool\b/], ["lake", /\blake\b/],
  ["park", /\bpark\b/], ["beach", /\bbeach\b|beachfront/], ["harbour", /\bharbou?r\b/],
];
const TYPES: [string, RegExp][] = [
  ["suite", /\bsuites?\b/], ["villa", /\bvilla\b/], ["bungalow", /\bbungalow\b/], ["studio", /\bstudio\b/],
  ["family", /\bfamily\b/], ["quad", /\bquad\b/], ["triple", /\btriple\b/], ["twin", /\btwin\b/],
  ["double", /\bdouble\b/], ["single", /\bsingle\b/], ["dormitory", /\bdorm\b|dormitory/],
  ["japanese", /\bjapanese\b|tatami|ryokan/],
];

function findFirst(table: [string, RegExp][], s: string): string {
  for (const [label, re] of table) if (re.test(s)) return label;
  return "";
}

export function parseGrade(text: string): string {
  return findFirst(GRADES, norm(text));
}
export function parseView(text: string): string {
  return findFirst(VIEWS, norm(text));
}
export function parseType(text: string): string {
  return findFirst(TYPES, norm(text));
}
export function parseSmoking(text: string): Smoking {
  const s = norm(text);
  if (/non smoking|non smk|nonsmoking/.test(s)) return "NON_SMOKING";
  if (/\bsmoking\b|\bsmk\b/.test(s)) return "SMOKING";
  return "UNKNOWN";
}

// Normalize our master "Room Type" column to a canonical type token.
export function canonicalType(roomType: string): string {
  const t = parseType(roomType);
  if (t) return t;
  const s = norm(roomType);
  if (/semi double/.test(s)) return "double";
  if (/multiple/.test(s)) return "family";
  return s;
}
