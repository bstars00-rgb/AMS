import * as XLSX from "xlsx";
import type { MasterHotel, MasterRoom, ClientRoom } from "../types";
import {
  normalizeBeds,
  bedLabel,
  parseGrade,
  parseView,
  parseType,
  parseSmoking,
  canonicalType,
  norm,
} from "./normalize";

type Row = Record<string, string>;

export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

function sheetRows(wb: XLSX.WorkBook, nameMatch: (n: string) => boolean): Row[] {
  const name = wb.SheetNames.find(nameMatch) ?? wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
  return raw.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) o[k.trim()] = v == null ? "" : String(v).trim();
    return o;
  });
}

// Build a tolerant accessor: matches a header by normalized alias (handles
// trailing spaces, case, punctuation).
function accessor(rows: Row[]) {
  const headers = new Set<string>();
  for (const r of rows.slice(0, 20)) for (const k of Object.keys(r)) headers.add(k);
  const list = Array.from(headers).map((h) => ({ raw: h, n: norm(h) }));
  const cache = new Map<string, string | null>();
  const find = (aliases: string[]): string | null => {
    const key = aliases.join("|");
    if (cache.has(key)) return cache.get(key)!;
    let hit: string | null = null;
    for (const a of aliases) {
      const na = norm(a);
      const exact = list.find((h) => h.n === na);
      if (exact) { hit = exact.raw; break; }
    }
    if (!hit) {
      for (const a of aliases) {
        const na = norm(a);
        const part = list.find((h) => h.n.includes(na));
        if (part) { hit = part.raw; break; }
      }
    }
    cache.set(key, hit);
    return hit;
  };
  return (row: Row, aliases: string[]): string => {
    const h = find(aliases);
    return h ? (row[h] ?? "") : "";
  };
}

export interface MasterData {
  hotels: MasterHotel[];
  rooms: MasterRoom[];
  hotelsByCode: Map<string, MasterHotel>;
  hotelsByName: Map<string, MasterHotel>;
  roomsByHotelCode: Map<string, MasterRoom[]>;
}

export function loadMaster(wb: XLSX.WorkBook): MasterData {
  const overall = sheetRows(wb, (n) => /overall/i.test(n));
  const roomSheet = sheetRows(wb, (n) => /room/i.test(n));
  const gh = accessor(overall);
  const gr = accessor(roomSheet);

  const SOURCE_ALIASES = ["Source", "Supplier", "Provider", "Channel", "Sourcing", "공급원", "공급사"];
  const hotels: MasterHotel[] = overall.map((r) => ({
    hotelCode: gh(r, ["Hotel Code"]),
    hotelName: gh(r, ["Hotel Name"]),
    expediaCode: gh(r, ["Expedia code", "Expedia"]),
    legacyHotelCode: gh(r, ["Legacy Hotel Code"]),
    countryCode: gh(r, ["Country Code"]),
    countryName: gh(r, ["Country Name"]),
    regionName: gh(r, ["Region Name"]),
    star: gh(r, ["Star Rating", "Star"]),
    address: gh(r, ["Address (EN)", "Address"]),
    lat: gh(r, ["Latitude"]),
    lng: gh(r, ["Longitude"]),
    source: gh(r, SOURCE_ALIASES),
  }));
  const hotelSourceByCode = new Map(hotels.map((h) => [h.hotelCode, h.source]));

  // Group room rows by Room Code (collect bed groups).
  const byRoomCode = new Map<string, Row[]>();
  for (const r of roomSheet) {
    const code = gr(r, ["Room Code"]) || gr(r, ["Legacy Room Code"]);
    if (!code) continue;
    if (!byRoomCode.has(code)) byRoomCode.set(code, []);
    byRoomCode.get(code)!.push(r);
  }

  const rooms: MasterRoom[] = [];
  for (const [roomCode, group] of byRoomCode) {
    const head = group[0];
    const roomName = gr(head, ["Room Name"]);
    const grade = gr(head, ["Room Grade"]);
    const type = gr(head, ["Room Type"]);
    const view = gr(head, ["Room View"]);
    const bedRaw = group.map((g) => gr(g, ["Bed Type"])).filter(Boolean);
    const bedSet = Array.from(new Set(bedRaw.flatMap((b) => normalizeBeds(b))));
    const hotelCode = gr(head, ["Hotel Code"]);
    const roomSource = gr(head, SOURCE_ALIASES);
    rooms.push({
      hotelCode,
      hotelName: gr(head, ["Hotel Name"]),
      roomCode,
      legacyRoomCode: gr(head, ["Legacy Room Code"]),
      roomName,
      view,
      grade,
      type,
      bedTypes: Array.from(new Set(bedRaw)),
      bedSet,
      bedQty: gr(head, ["Bed Quantity"]),
      minPax: gr(head, ["Min"]),
      maxPax: gr(head, ["Max"]),
      roomSize: gr(head, ["Room Size"]),
      source: roomSource || hotelSourceByCode.get(hotelCode) || "",
      grd: parseGrade(`${grade} ${roomName}`),
      typ: canonicalType(type) || parseType(roomName),
      vw: (parseView(view) || parseView(roomName)),
      smoking: parseSmoking(roomName),
    });
  }

  const hotelsByCode = new Map(hotels.map((h) => [h.hotelCode, h]));
  const hotelsByName = new Map(hotels.map((h) => [norm(h.hotelName), h]));
  const roomsByHotelCode = new Map<string, MasterRoom[]>();
  for (const room of rooms) {
    if (!roomsByHotelCode.has(room.hotelCode)) roomsByHotelCode.set(room.hotelCode, []);
    roomsByHotelCode.get(room.hotelCode)!.push(room);
  }

  return { hotels, rooms, hotelsByCode, hotelsByName, roomsByHotelCode };
}

export function loadClient(wb: XLSX.WorkBook): ClientRoom[] {
  const rows = sheetRows(wb, (n) => /room/i.test(n));
  const g = accessor(rows);
  const out: ClientRoom[] = [];
  for (const r of rows) {
    const id = g(r, ["basicroomtypeid", "room type id", "room id"]);
    const roomName = g(r, ["basicroomengname", "room name", "room eng name"]);
    if (!id && !roomName) continue;
    const bedRaw = g(r, ["Bedtype", "Bed type"]);
    out.push({
      basicRoomTypeId: id,
      roomName,
      bedTypeRaw: bedRaw,
      bedSet: normalizeBeds(bedRaw),
      clientHotelName: g(r, ["Hotel name", "hotel"]),
      clientHotelCode: g(r, ["Hotel code"]),
      masterHotelId: g(r, ["masterhotelid", "master hotel id"]),
      city: g(r, ["bigcity", "city"]),
      star: g(r, ["mstar", "star"]),
      priority: g(r, ["Priority"]),
      grd: parseGrade(roomName),
      typ: parseType(roomName) || bedToType(bedRaw),
      vw: parseView(roomName),
      smoking: parseSmoking(roomName),
    });
  }
  return out;
}

// When the client room name has no explicit type, infer a coarse one from beds.
function bedToType(bedRaw: string): string {
  const beds = normalizeBeds(bedRaw);
  if (beds.length >= 2 && beds.includes("single")) return "twin";
  if (beds.includes("double") || beds.includes("queen") || beds.includes("king")) return "double";
  if (beds.includes("single")) return "single";
  return "";
}

export { bedLabel };
