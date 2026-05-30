import type { MatchRow } from "../types";
import type { Lang } from "../i18n/dict";

export type PromptType = "ROOM_MATCH" | "WEBSITE_CHECK";
export const PROMPT_TYPES: PromptType[] = ["ROOM_MATCH", "WEBSITE_CHECK"];

function candidatesBlock(row: MatchRow): string {
  if (!row.candidates.length) return "(no candidates found in our inventory)";
  return row.candidates
    .map((c, i) => `${i + 1}. [${c.roomCode}] "${c.roomName}" — type=${c.type || "?"}, grade=${c.grade || "?"}, view=${c.view || "?"}, bed=${c.bedSummary || "?"} (score ${c.score}%)`)
    .join("\n");
}

export function generatePrompt(row: MatchRow, type: PromptType, lang: Lang): string {
  return lang === "ko" ? ko(row, type) : en(row, type);
}

function en(row: MatchRow, type: PromptType): string {
  if (type === "WEBSITE_CHECK") {
    return `I need to verify a hotel room type on the hotel's official website before mapping.

Hotel: ${row.masterHotelName || row.clientHotelName}
Client room type: "${row.clientRoomName}" (bed: ${row.clientBedType || "?"})

List exactly what to check on the official website to confirm which of our room types it matches:
- Room category/grade (Standard / Superior / Deluxe / Premium / Suite …)
- Bed configuration (King / Queen / Double / Twin / Single, quantity)
- View (Sea / Ocean / Garden / City …)
- Smoking / Non-smoking
- Room size (sqm)
- Max occupancy
Give me a short checklist and the most likely official source URL to look at.`;
  }
  return `Decide which of our room types best matches the client's room type. This is a probabilistic mapping decision — be conservative and flag uncertainty.

Hotel: ${row.masterHotelName || row.clientHotelName}${row.expediaCode ? ` (Expedia code ${row.expediaCode})` : ""}

CLIENT room type to map:
- Name: "${row.clientRoomName}"
- Bed type: ${row.clientBedType || "?"}

OUR candidate room types:
${candidatesBlock(row)}

Return:
1. Best matching candidate (room code) or "NO MATCH / needs creation"
2. Confidence (high / medium / low)
3. Key differences (bed, view, grade, smoking, size)
4. What to verify on the hotel website before confirming`;
}

function ko(row: MatchRow, type: PromptType): string {
  if (type === "WEBSITE_CHECK") {
    return `매핑 전에 호텔 공식 웹사이트에서 객실 타입을 확인해야 합니다.

호텔: ${row.masterHotelName || row.clientHotelName}
고객사 객실: "${row.clientRoomName}" (베드: ${row.clientBedType || "?"})

우리 어떤 객실과 일치하는지 확인하려면 공식 웹사이트에서 무엇을 봐야 하는지 정확히 알려주세요:
- 객실 등급 (Standard / Superior / Deluxe / Premium / Suite …)
- 베드 구성 (King / Queen / Double / Twin / Single, 개수)
- 뷰 (Sea / Ocean / Garden / City …)
- 흡연 / 금연
- 객실 크기(㎡)
- 최대 수용 인원
짧은 체크리스트와, 확인할 공식 출처 URL(가능성 높은 것)을 알려주세요.`;
  }
  return `고객사 객실 타입이 우리 어느 객실과 가장 잘 맞는지 판단해 주세요. 확률 기반 매핑 결정이며, 불확실하면 보수적으로 표시해 주세요.

호텔: ${row.masterHotelName || row.clientHotelName}${row.expediaCode ? ` (Expedia 코드 ${row.expediaCode})` : ""}

매핑할 고객사 객실:
- 이름: "${row.clientRoomName}"
- 베드타입: ${row.clientBedType || "?"}

우리 후보 객실들:
${candidatesBlock(row)}

다음을 답해 주세요:
1. 가장 잘 맞는 후보(룸 코드) 또는 "매칭 없음 / 신규 생성 필요"
2. 신뢰도 (높음 / 보통 / 낮음)
3. 핵심 차이 (베드, 뷰, 등급, 흡연, 크기)
4. 확정 전에 호텔 웹사이트에서 확인할 항목`;
}
