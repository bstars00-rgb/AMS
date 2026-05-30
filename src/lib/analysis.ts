import type { AnalyzedRow, RawRow, Level, ActionKey, RemarkCode } from "../types";

// ---------- string helpers ----------
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
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

// 0..1 similarity, order-insensitive on word tokens.
function similarity(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // token sort to handle reordered words (e.g. "Kyoto Ryokan Sakura" vs "Kyoto Sakura Ryokan")
  const sa = na.split(" ").sort().join(" ");
  const sb = nb.split(" ").sort().join(" ");
  const dist = levenshtein(sa, sb);
  return 1 - dist / Math.max(sa.length, sb.length);
}

const present = (s: string) => norm(s).length > 0;

// ---------- value classifiers ----------
function isActive(v: string): boolean {
  return /\bactive\b/i.test(v) && !/inactive/i.test(v);
}
function isInactive(v: string): boolean {
  return /inactive/i.test(v) || /\bclosed\b/i.test(v);
}
type Mapping = "unmapped" | "partial" | "mapped" | "unknown";
function mappingState(v: string): Mapping {
  const n = norm(v);
  if (!n) return "unknown";
  if (n.includes("partial")) return "partial";
  if (n.includes("unmap") || n.includes("not map") || n === "no") return "unmapped";
  if (n.includes("map")) return "mapped";
  return "unknown";
}
function isNewlyCreated(v: string): boolean {
  return /new/i.test(v);
}
// Extra bed is unclear when empty or flagged with vague markers.
function extraBedUnclear(v: string): boolean {
  const n = norm(v);
  if (!n) return true;
  return /unclear|unknown|tbd|n a|na|\?/.test(n);
}

// ---------- thresholds ----------
const SAME = 0.92; // treat as identical
const STRONG = 0.7; // clearly the same name with variations
const SIMILAR = 0.55; // loosely similar

export function analyzeRow(raw: RawRow, id: number): AnalyzedRow {
  const active = isActive(raw.activeStatus);
  const inactive = isInactive(raw.activeStatus);
  const map = mappingState(raw.mappingStatus);
  const newly = isNewlyCreated(raw.hotelCreationType);

  const hasInternalHotel = present(raw.internalHotelName);
  const hasInternalRoom = present(raw.internalRoomName);
  const hasInternalAddr = present(raw.internalAddress);

  const nameSim = hasInternalHotel ? similarity(raw.hotelName, raw.internalHotelName) : null;
  const addrSim = hasInternalAddr ? similarity(raw.address, raw.internalAddress) : null;
  const roomSim = hasInternalRoom ? similarity(raw.roomName, raw.internalRoomName) : null;

  const bedMismatch =
    present(raw.bedType) && present(raw.internalBedType) && norm(raw.bedType) !== norm(raw.internalBedType);
  const extraUnclear = extraBedUnclear(raw.extraBedType);
  const extraMismatch =
    present(raw.extraBedType) &&
    present(raw.internalExtraBedType) &&
    norm(raw.extraBedType) !== norm(raw.internalExtraBedType);

  // City heuristic: internal address present but doesn't mention the city -> possible different city.
  const differentCity =
    present(raw.city) && hasInternalAddr && !norm(raw.internalAddress).includes(norm(raw.city));

  const nameStrong = nameSim != null && nameSim >= STRONG;
  const nameSimilar = nameSim != null && nameSim >= SIMILAR && nameSim < SAME;
  const addrDifferent = addrSim != null && addrSim < STRONG;
  const addrPartial = addrSim != null && addrSim >= STRONG && addrSim < SAME;
  const roomSimilar = roomSim != null && roomSim >= SIMILAR && roomSim < SAME;
  const internalMissing = (!hasInternalHotel || !hasInternalRoom) && !newly;

  const remarks: RemarkCode[] = [];

  // ---------- RISK ----------
  const riskLevels: Level[] = [];

  if (bedMismatch) { riskLevels.push("HIGH"); remarks.push("ROOM_MATCH_BED_DIFF"); } // rule 5: bed mismatch always HIGH
  if (nameStrong && addrDifferent) { riskLevels.push("HIGH"); remarks.push("NAME_SIMILAR_ADDRESS_DIFF"); }
  if (differentCity) { riskLevels.push("HIGH"); remarks.push("DIFFERENT_CITY"); }
  if (newly && map === "unmapped") { riskLevels.push("HIGH"); remarks.push("NEWLY_CREATED_UNMAPPED"); }
  if (extraMismatch && !bedMismatch) { riskLevels.push("HIGH"); remarks.push("EXTRA_BED_MISMATCH"); }

  if (nameSimilar) riskLevels.push("MEDIUM");
  if (roomSimilar) { riskLevels.push("MEDIUM"); remarks.push("ROOM_NAME_PARTIAL_DIFF"); }
  if (addrPartial) { riskLevels.push("MEDIUM"); remarks.push("ADDRESS_PARTIAL_DIFF"); }
  if (internalMissing) { riskLevels.push("MEDIUM"); remarks.push("INTERNAL_MISSING"); }
  if (map === "partial") { riskLevels.push("MEDIUM"); remarks.push("PARTIAL_MAPPED"); }

  // Extra bed unclear (rule 6): HIGH when combined with other risk, else MEDIUM.
  const baseRisk = maxLevel(riskLevels);
  if (extraUnclear && !extraMismatch) {
    riskLevels.push(baseRisk === "HIGH" ? "HIGH" : "MEDIUM");
    remarks.push("EXTRA_BED_UNCLEAR");
  }
  if (inactive) remarks.push("INACTIVE_LOW");

  const risk = maxLevel(riskLevels);

  // ---------- PRIORITY ----------
  const priorityLevels: Level[] = [];

  if (active && map === "unmapped") { priorityLevels.push("HIGH"); remarks.unshift("ACTIVE_UNMAPPED"); }
  if (newly && map === "unmapped") priorityLevels.push("HIGH");
  if (nameStrong && addrDifferent) priorityLevels.push("HIGH");
  if (roomSim != null && roomSim >= STRONG && bedMismatch) priorityLevels.push("HIGH");
  if (extraUnclear) priorityLevels.push("HIGH");

  if (map === "partial") priorityLevels.push("MEDIUM");
  if (nameSimilar || roomSimilar) priorityLevels.push("MEDIUM");
  if (addrPartial) priorityLevels.push("MEDIUM");
  if (internalMissing) priorityLevels.push("MEDIUM");

  const priority: Level = inactive ? "LOW" : maxLevel(priorityLevels);

  // ---------- SUGGESTED ACTION ----------
  let action: ActionKey;
  if (newly && map === "unmapped" && !hasInternalHotel) {
    action = "REQUEST_NEW_HOTEL_CREATION";
  } else if (hasInternalHotel && !hasInternalRoom && present(raw.roomName)) {
    action = "REQUEST_NEW_ROOM_CREATION";
  } else if ((nameStrong && addrDifferent) || differentCity || extraMismatch) {
    action = "NEED_STAKEHOLDER_CONFIRMATION";
  } else if (bedMismatch || (extraUnclear && risk === "HIGH")) {
    action = "NEED_STAKEHOLDER_CONFIRMATION";
  } else if (internalMissing || addrPartial) {
    action = "REQUEST_AGENT_AMENDMENT";
  } else if (nameSimilar) {
    action = "NEED_HOTEL_REVIEW";
  } else if (roomSimilar) {
    action = "NEED_ROOM_REVIEW";
  } else if (active && map === "unmapped") {
    action = "PROCEED_MAPPING";
  } else if (inactive || (map === "mapped" && risk === "LOW")) {
    action = "NO_ACTION_NEEDED";
  } else {
    action = "NEED_HOTEL_REVIEW";
  }

  // ---------- FLAGS ----------
  const agentRequestRequired =
    action === "REQUEST_AGENT_AMENDMENT" ||
    action === "REQUEST_NEW_HOTEL_CREATION" ||
    action === "REQUEST_NEW_ROOM_CREATION";

  // Rule 4: every HIGH-risk row must require stakeholder confirmation OR an agent request.
  const stakeholderConfirmationRequired =
    action === "NEED_STAKEHOLDER_CONFIRMATION" || (risk === "HIGH" && !agentRequestRequired);

  if (risk === "LOW" && remarks.length === 0) remarks.push("ALL_MATCH");

  return {
    ...raw,
    id,
    priority,
    riskLevel: risk,
    suggestedAction: action,
    stakeholderConfirmationRequired,
    agentRequestRequired,
    remarkCodes: dedupe(remarks),
    edited: false,
  };
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

const LEVEL_RANK: Record<Level, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
function maxLevel(levels: Level[]): Level {
  return levels.reduce<Level>((acc, l) => (LEVEL_RANK[l] > LEVEL_RANK[acc] ? l : acc), "LOW");
}

export function analyzeAll(rows: RawRow[]): AnalyzedRow[] {
  return rows.map((r, i) => analyzeRow(r, i + 1));
}
