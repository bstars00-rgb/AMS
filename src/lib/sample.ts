import * as XLSX from "xlsx";
import { loadMaster, loadClient, type MasterData } from "./loaders";
import type { ClientRoom } from "../types";

// Builds in-memory workbooks that mirror the real file columns, then runs them
// through the same loaders the app uses — so "Load sample" exercises the real path.

function wbFromSheets(sheets: Record<string, string[][]>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  }
  return wb;
}

const OVERALL_HEADER = ["Expedia code", "Hotel Code", "Hotel Name", "Legacy Hotel Code", "Country Code", "Country Name", "Region Code", "Region Name", "Star Rating", "Address (EN)", "PhoneNo", "Fax Number", "Longitude", "Latitude"];
const ROOM_HEADER = ["Hotel Code", "Hotel Name", "Room Code", "Legacy Room Code", "Room Name", "Room View", "Room Grade", "Room Type", "Bed Group", "Bed Type", "Bed Quantity", "Bed Size", "Min", "Max", "Room Size"];
const CLIENT_HEADER = ["masterhotelid", "mstar", "hotel", "Hotel name", "Hotel code", "basicroomtypeid", "basicroomengname", "Bedtype", "Priority", "bigcity"];

export function loadSampleMaster(): MasterData {
  const overall = [
    OVERALL_HEADER,
    ["5500039", "665050", "Seaside Resort", "665050", "VN", "Vietnam", "1", "Ho Chi Minh City", "4", "12 Beach Road, HCMC", "", "", "106.7", "10.77"],
    ["0", "700001", "Anise Hotel & Spa Hanoi", "700001", "VN", "Vietnam", "2", "Hanoi", "4", "21 Old Quarter, Hanoi", "", "", "105.85", "21.03"],
  ];
  const R = (hc: string, hn: string, rc: string, name: string, view: string, grade: string, type: string, bg: string, bed: string, qty: string, size: string, min: string, max: string, rsize: string) =>
    [hc, hn, rc, rc, name, view, grade, type, bg, bed, qty, size, min, max, rsize];
  const rooms = [
    ROOM_HEADER,
    R("665050", "Seaside Resort", "1269410", "Deluxe Double Sea View", "Sea View", "Deluxe", "Double", "1", "King", "1", "180", "1", "2", "40"),
    R("665050", "Seaside Resort", "1269412", "Premium Garden Double", "Garden View", "Premium", "Double", "1", "Queen", "1", "150", "1", "2", "40"),
    R("665050", "Seaside Resort", "1269406", "Superior Twin", "", "Superior", "Twin", "1", "Single", "2", "100", "1", "2", "36"),
    R("665050", "Seaside Resort", "1269408", "Deluxe Double", "", "Deluxe", "Double", "1", "Queen", "1", "150", "1", "3", "36"),
    R("700001", "Anise Hotel & Spa Hanoi", "2200101", "Superior Double", "", "Superior", "Double", "1", "Double", "1", "140", "1", "2", "28"),
    R("700001", "Anise Hotel & Spa Hanoi", "2200102", "Deluxe Twin City View", "City View", "Deluxe", "Twin", "1", "Single", "2", "100", "1", "2", "30"),
  ];
  return loadMaster(wbFromSheets({ "Overall list": overall, "Room list": rooms }));
}

export function loadSampleClient(): ClientRoom[] {
  const C = (mhid: string, hotel: string, hcode: string, rid: string, rname: string, bed: string, prio: string, city: string) =>
    [mhid, "4", hotel, hotel, hcode, rid, rname, bed, prio, city];
  const rows = [
    CLIENT_HEADER,
    C("702126", "Seaside Resort", "665050", "554104825", "Deluxe Double Sea View", "King Bed", "Priority 1", "Ho Chi Minh City"),
    C("702126", "Seaside Resort", "665050", "507317865", "Premium Garden Double", "Queen Bed", "Priority 1", "Ho Chi Minh City"),
    C("702126", "Seaside Resort", "665050", "507317869", "Seaside Suite", "King Bed", "Priority 1", "Ho Chi Minh City"),
    C("810044", "Anise Hotel & Spa Hanoi", "700001", "620010011", "Superior Double Room", "DoubleBed", "Priority 2", "Hanoi"),
    C("810044", "Anise Hotel & Spa Hanoi", "700001", "620010012", "Family Deluxe 3 Persons", "SingleBed/DoubleBed", "Priority 2", "Hanoi"),
  ];
  return loadClient(wbFromSheets({ "Room list": rows }));
}
