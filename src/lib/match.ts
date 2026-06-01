import type {
  ClientRoom,
  MasterRoom,
  Candidate,
  MatchRow,
  MatchSettings,
  Band,
} from "../types";
import type { MasterData } from "./loaders";
import { similarity, bedLabel, norm } from "./normalize";

export const DEFAULT_SETTINGS: MatchSettings = {
  autoThreshold: 90,
  reviewThreshold: 65,
  clientChannel: "",
  excludeCircular: true,
};

// Feature weights (sum = 1). Bed type and room name carry the most signal.
const W = { name: 0.3, bed: 0.25, type: 0.2, grade: 0.15, view: 0.1 };

function catScore(a: string, b: string): number {
  if (!a && !b) return 0.5;
  if (!a || !b) return 0.5; // one unknown -> neutral
  return a === b ? 1 : 0;
}

interface BedEval {
  score: number; // 0..1
  conflict: boolean; // both known, no overlap
  verified: boolean; // both known, overlap >= 1
}
function evalBeds(a: string[], b: string[]): BedEval {
  const bothKnown = a.length > 0 && b.length > 0;
  if (!bothKnown) return { score: 0.5, conflict: false, verified: false }; // unknown -> neutral
  const setB = new Set(b);
  const common = a.filter((x) => setB.has(x)).length;
  if (common === 0) return { score: 0, conflict: true, verified: false };
  return { score: common / Math.min(a.length, b.length), conflict: false, verified: true };
}

function bedSummary(room: MasterRoom): string {
  if (room.bedSet.length) return room.bedSet.map(bedLabel).join(" / ");
  return room.bedTypes.join(" / ");
}

export function scoreRoom(client: ClientRoom, master: MasterRoom): Candidate {
  const name = similarity(client.roomName, master.roomName);
  const bedEval = evalBeds(client.bedSet, master.bedSet);
  const bed = bedEval.score;
  const type = catScore(client.typ, master.typ);
  const grade = catScore(client.grd, master.grd);
  const view = catScore(client.vw, master.vw);
  const score = Math.round(100 * (W.name * name + W.bed * bed + W.type * type + W.grade * grade + W.view * view));
  return {
    roomCode: master.roomCode,
    roomName: master.roomName,
    type: master.type,
    grade: master.grade,
    view: master.view,
    bedSummary: bedSummary(master),
    score,
    bedConflict: bedEval.conflict,
    bedVerified: bedEval.verified,
    source: master.source,
    circular: false, // set by runMatch once the client channel is known
    parts: {
      name: Math.round(name * 100),
      bed: Math.round(bed * 100),
      type: Math.round(type * 100),
      grade: Math.round(grade * 100),
      view: Math.round(view * 100),
    },
  };
}

function bandFor(score: number, s: MatchSettings): Band {
  if (score >= s.autoThreshold) return "AUTO";
  if (score >= s.reviewThreshold) return "REVIEW";
  return "NOMATCH";
}

// Link a client room's hotel to our master hotel: by Hotel code first, then by name.
function linkHotel(client: ClientRoom, master: MasterData) {
  const byCode = master.hotelsByCode.get(client.clientHotelCode);
  if (byCode) return { hotel: byCode, by: "code" as const };
  const byName = master.hotelsByName.get(norm(client.clientHotelName));
  if (byName) return { hotel: byName, by: "name" as const };
  return { hotel: null, by: null };
}

// A candidate is "circular" when we sourced it FROM the very party we're now
// mapping for (e.g. an Agoda-sourced room being mapped back to the Agoda client).
function isCircular(source: string, channel: string): boolean {
  if (!source || !channel) return false;
  const s = norm(source);
  const ch = norm(channel);
  return s === ch || s.includes(ch) || ch.includes(s);
}

export function runMatch(
  clientRooms: ClientRoom[],
  master: MasterData,
  settings: MatchSettings = DEFAULT_SETTINGS
): MatchRow[] {
  const channel = settings.clientChannel ?? "";
  return clientRooms.map((c) => {
    const { hotel, by } = linkHotel(c, master);
    let candidates: Candidate[] = [];
    let blockedCandidates: Candidate[] = [];
    if (hotel) {
      const ourRooms = master.roomsByHotelCode.get(hotel.hotelCode) ?? [];
      const scored = ourRooms
        .map((r) => {
          const cand = scoreRoom(c, r);
          cand.circular = isCircular(cand.source, channel);
          return cand;
        })
        .sort((a, b) => b.score - a.score);
      const allowed = settings.excludeCircular ? scored.filter((s) => !s.circular) : scored;
      candidates = allowed.slice(0, 5);
      blockedCandidates = settings.excludeCircular ? scored.filter((s) => s.circular).slice(0, 3) : [];
    }
    const top = candidates[0];
    const bestScore = top?.score ?? 0;
    let band: Band = hotel ? bandFor(bestScore, settings) : "NOMATCH";
    // P1 bed gate: only allow Auto when the bed type is POSITIVELY verified
    // (known on both sides and overlapping). A bed conflict or an unknown/blank
    // bed cannot auto-confirm — it must be human-reviewed.
    const gated = band === "AUTO" && !top?.bedVerified;
    if (gated) band = "REVIEW";

    return {
      id: c.basicRoomTypeId || `${c.clientHotelCode}-${c.roomName}`,
      clientHotelName: c.clientHotelName,
      clientHotelCode: c.clientHotelCode,
      clientRoomName: c.roomName,
      clientBedType: c.bedTypeRaw,
      city: c.city,
      priority: c.priority,
      hotelLinked: !!hotel,
      hotelLinkBy: by,
      masterHotelCode: hotel?.hotelCode ?? "",
      masterHotelName: hotel?.hotelName ?? "",
      expediaCode: hotel?.expediaCode ?? "",
      candidates,
      blockedCandidates,
      bestScore,
      band,
      bedConflict: !!top?.bedConflict,
      gated,
      circularBlocked: blockedCandidates.length > 0,
      status: "PENDING",
      chosenRoomCode: "",
      remarks: "",
      reviewedBy: "",
      reviewedDate: "",
      aiPrompt: "",
      websiteUrl: "",
    };
  });
}
