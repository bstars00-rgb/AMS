// ---------- Our master inventory (the reference DB) ----------

export interface MasterHotel {
  hotelCode: string;
  hotelName: string;
  expediaCode: string; // reference code handed to clients ("" or "0" = none)
  legacyHotelCode: string;
  countryCode: string;
  countryName: string;
  regionName: string;
  star: string;
  address: string;
  lat: string;
  lng: string;
  source: string; // provenance: where we sourced it (direct vs a 3rd-party supplier)
}

export interface MasterRoom {
  hotelCode: string;
  hotelName: string;
  roomCode: string;
  legacyRoomCode: string;
  roomName: string;
  view: string;
  grade: string;
  type: string; // Room Type column (Double/Twin/...)
  bedTypes: string[]; // union across bed groups, normalized labels (raw)
  bedSet: string[]; // normalized canonical bed tokens
  bedQty: string;
  minPax: string;
  maxPax: string;
  roomSize: string;
  source: string; // provenance (room-level, falls back to hotel source)
  // parsed/enriched
  grd: string; // canonical grade
  typ: string; // canonical type
  vw: string; // canonical view
  smoking: Smoking;
}

// ---------- Client unmapped rooms (the query set) ----------

export interface ClientRoom {
  basicRoomTypeId: string;
  roomName: string;
  bedTypeRaw: string;
  bedSet: string[]; // normalized canonical bed tokens (handles "A/B" options)
  clientHotelName: string;
  clientHotelCode: string;
  masterHotelId: string;
  city: string;
  star: string;
  priority: string;
  // parsed
  grd: string;
  typ: string;
  vw: string;
  smoking: Smoking;
}

export type Smoking = "SMOKING" | "NON_SMOKING" | "UNKNOWN";

// ---------- Matching output ----------

export interface Candidate {
  roomCode: string;
  roomName: string;
  type: string;
  grade: string;
  view: string;
  bedSummary: string;
  score: number; // 0-100 — a SIMILARITY score, not a probability of correctness
  bedConflict: boolean; // both bed sets known and fully disjoint (e.g. King vs Twin)
  bedVerified: boolean; // both bed sets known AND overlapping (positively matched)
  source: string; // master room provenance
  circular: boolean; // candidate sourced from the same party we're mapping for
  // sub-scores for transparency
  parts: { name: number; bed: number; type: number; grade: number; view: number };
}

export type Band = "AUTO" | "REVIEW" | "NOMATCH";

export type RowStatus = "PENDING" | "CONFIRMED" | "NEED_CREATION" | "WEBSITE_CHECK";

export interface MatchRow {
  id: string; // client basicRoomTypeId (unique key)
  // client side
  clientHotelName: string;
  clientHotelCode: string;
  clientRoomName: string;
  clientBedType: string;
  city: string;
  priority: string;
  // hotel link
  hotelLinked: boolean;
  hotelLinkBy: "code" | "name" | null;
  masterHotelCode: string;
  masterHotelName: string;
  expediaCode: string;
  // room match
  candidates: Candidate[];
  blockedCandidates: Candidate[]; // circular candidates excluded from matching
  bestScore: number;
  band: Band;
  bedConflict: boolean; // top candidate has a bed-type conflict (gated out of Auto)
  gated: boolean; // band was downgraded from Auto by the bed gate
  circularBlocked: boolean; // at least one candidate was excluded as circular
  // human decision
  status: RowStatus;
  chosenRoomCode: string; // our Room Code the user confirmed ("" if none)
  remarks: string;
  reviewedBy: string;
  reviewedDate: string;
  aiPrompt: string;
  websiteUrl: string;
}

export interface MatchSettings {
  autoThreshold: number; // >= => AUTO band
  reviewThreshold: number; // >= => REVIEW band, else NOMATCH
  clientChannel: string; // who we are mapping for (e.g. "Agoda") — for circular block
  excludeCircular: boolean; // drop candidates we sourced FROM that same party
}
