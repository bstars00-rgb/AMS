// Canonical field keys used internally. The uploaded file's column names are
// mapped onto these via the column-mapping step.
export type FieldKey =
  | "supplier"
  | "hotelId"
  | "hotelName"
  | "country"
  | "city"
  | "address"
  | "activeStatus"
  | "mappingStatus"
  | "hotelCreationType"
  | "roomName"
  | "bedType"
  | "extraBedType"
  | "internalHotelName"
  | "internalAddress"
  | "internalRoomName"
  | "internalBedType"
  | "internalExtraBedType";

export type Level = "HIGH" | "MEDIUM" | "LOW";

export type ActionKey =
  | "PROCEED_MAPPING"
  | "NEED_HOTEL_REVIEW"
  | "NEED_ROOM_REVIEW"
  | "NEED_STAKEHOLDER_CONFIRMATION"
  | "REQUEST_AGENT_AMENDMENT"
  | "REQUEST_NEW_HOTEL_CREATION"
  | "REQUEST_NEW_ROOM_CREATION"
  | "NO_ACTION_NEEDED";

// Remark codes are resolved to KO/EN text at render/export time so the language
// toggle keeps working for analysis-generated remarks.
export type RemarkCode =
  | "ACTIVE_UNMAPPED"
  | "NEWLY_CREATED_UNMAPPED"
  | "NAME_SIMILAR_ADDRESS_DIFF"
  | "ADDRESS_PARTIAL_DIFF"
  | "DIFFERENT_CITY"
  | "ROOM_MATCH_BED_DIFF"
  | "ROOM_NAME_PARTIAL_DIFF"
  | "EXTRA_BED_UNCLEAR"
  | "EXTRA_BED_MISMATCH"
  | "PARTIAL_MAPPED"
  | "INTERNAL_MISSING"
  | "INACTIVE_LOW"
  | "ALL_MATCH";

// Raw record straight from the file (canonical keys -> string values).
export type RawRow = Record<FieldKey, string>;

export interface AnalyzedRow extends RawRow {
  id: number; // 1-based row number
  priority: Level;
  riskLevel: Level;
  suggestedAction: ActionKey;
  stakeholderConfirmationRequired: boolean;
  agentRequestRequired: boolean;
  remarkCodes: RemarkCode[];
  remarksOverride?: string; // set when the user manually edits remarks
  edited: boolean;
  reviewedBy?: string;
  reviewedDate?: string;
  aiPrompt?: string; // last generated AI research prompt (included in export)
}

// Result of parsing a file before column mapping is confirmed.
export interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[]; // keyed by original headers
}

export type ColumnMap = Partial<Record<FieldKey, string>>; // FieldKey -> original header
