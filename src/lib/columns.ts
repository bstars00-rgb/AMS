import type { FieldKey, ColumnMap, ParsedFile, RawRow } from "../types";

// Canonical fields in display order, with the columns that are required for analysis.
export const FIELD_ORDER: FieldKey[] = [
  "supplier",
  "hotelId",
  "hotelName",
  "country",
  "city",
  "address",
  "activeStatus",
  "mappingStatus",
  "hotelCreationType",
  "roomName",
  "bedType",
  "extraBedType",
  "internalHotelName",
  "internalAddress",
  "internalRoomName",
  "internalBedType",
  "internalExtraBedType",
];

// Fields the analysis really needs; the rest are optional.
export const REQUIRED_FIELDS: FieldKey[] = [
  "hotelName",
  "activeStatus",
  "mappingStatus",
];

// Candidate header aliases used to auto-detect the mapping.
const ALIASES: Record<FieldKey, string[]> = {
  supplier: ["supplier", "agent", "agent name", "source", "공급사", "에이전트"],
  hotelId: ["hotel id", "hotelid", "id", "property id", "호텔 id", "호텔코드"],
  hotelName: ["hotel name", "hotelname", "name", "property name", "호텔명", "호텔 이름"],
  country: ["country", "국가", "나라"],
  city: ["city", "도시"],
  address: ["address", "addr", "supplier address", "주소"],
  activeStatus: ["active status", "active", "status", "활성", "활성 상태"],
  mappingStatus: ["mapping status", "mapping", "map status", "매핑 상태", "매핑상태"],
  hotelCreationType: ["hotel creation type", "creation type", "creation", "hotel type", "생성 구분", "생성유형"],
  roomName: ["room name", "roomname", "room", "객실명", "객실 이름"],
  bedType: ["bed type", "bedtype", "bed", "베드타입", "침대 타입"],
  extraBedType: ["extra bed type", "extra bed", "extrabed", "엑스트라베드", "엑스트라 베드"],
  internalHotelName: ["internal hotel name", "internal name", "internal hotel", "내부 호텔명", "내부호텔명"],
  internalAddress: ["internal address", "internal addr", "내부 주소"],
  internalRoomName: ["internal room name", "internal room", "내부 객실명"],
  internalBedType: ["internal bed type", "internal bed", "내부 베드타입"],
  internalExtraBedType: ["internal extra bed type", "internal extra bed", "내부 엑스트라베드"],
};

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[_\-./]/g, " ").replace(/\s+/g, " ").trim();
}

// Guess the column mapping from the file headers.
export function autoMap(headers: string[]): ColumnMap {
  const normed = headers.map((h) => ({ raw: h, norm: normHeader(h) }));
  const map: ColumnMap = {};
  const used = new Set<string>();

  for (const field of FIELD_ORDER) {
    const aliases = ALIASES[field];
    // 1) exact normalized match
    let hit = normed.find((h) => !used.has(h.raw) && aliases.includes(h.norm));
    // 2) contains match (longest alias first to prefer specific names)
    if (!hit) {
      for (const alias of [...aliases].sort((a, b) => b.length - a.length)) {
        hit = normed.find((h) => !used.has(h.raw) && h.norm.includes(alias));
        if (hit) break;
      }
    }
    if (hit) {
      map[field] = hit.raw;
      used.add(hit.raw);
    }
  }
  return map;
}

// Apply a confirmed column map to produce canonical RawRows.
export function applyMapping(parsed: ParsedFile, map: ColumnMap): RawRow[] {
  return parsed.rows.map((row) => {
    const out = {} as RawRow;
    for (const field of FIELD_ORDER) {
      const header = map[field];
      const value = header != null ? row[header] : undefined;
      out[field] = (value ?? "").toString().trim();
    }
    return out;
  });
}
