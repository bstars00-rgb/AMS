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
  score: number; // 0-100
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
  bestScore: number;
  band: Band;
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
}
