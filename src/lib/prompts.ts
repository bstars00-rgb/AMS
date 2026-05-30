import type { AnalyzedRow } from "../types";
import type { Lang } from "../i18n/dict";

export type PromptType =
  | "HOTEL_ADDRESS"
  | "HOTEL_NAME"
  | "DUPLICATE_HOTEL"
  | "ROOM_NAME"
  | "BED_TYPE"
  | "EXTRA_BED"
  | "AGENT_AMENDMENT"
  | "STAKEHOLDER_CONFIRMATION";

export const PROMPT_TYPES: PromptType[] = [
  "HOTEL_ADDRESS",
  "HOTEL_NAME",
  "DUPLICATE_HOTEL",
  "ROOM_NAME",
  "BED_TYPE",
  "EXTRA_BED",
  "AGENT_AMENDMENT",
  "STAKEHOLDER_CONFIRMATION",
];

const dash = (v: string) => (v && v.trim() ? v.trim() : "(empty)");
const dashKo = (v: string) => (v && v.trim() ? v.trim() : "(비어 있음)");

const EN_FORMAT = `Return the result in the following format:
1. Most likely conclusion
2. Confidence level (high / medium / low)
3. Key reason
4. Potential mapping risk
5. Recommended action before mapping`;

const KO_FORMAT = `다음 형식으로 답변하세요:
1. 가장 가능성 높은 결론
2. 신뢰 수준 (높음 / 보통 / 낮음)
3. 핵심 근거
4. 매핑 시 잠재 위험
5. 매핑 전 권장 조치`;

export function generatePrompt(row: AnalyzedRow, type: PromptType, lang: Lang): string {
  if (lang === "ko") return ko(row, type);
  return en(row, type);
}

function en(r: AnalyzedRow, type: PromptType): string {
  const d = dash;
  switch (type) {
    case "HOTEL_ADDRESS":
      return `Please verify whether the following two hotel addresses refer to the same property.

Supplier Hotel Name:
${d(r.hotelName)}

Supplier Address:
${d(r.address)}

Internal Hotel Name:
${d(r.internalHotelName)}

Internal Address:
${d(r.internalAddress)}

Country: ${d(r.country)}
City: ${d(r.city)}

Please check if these refer to the same hotel, and whether one is an old address, a road-name address, a land-lot address, or a different property.
${EN_FORMAT}`;

    case "HOTEL_NAME":
      return `Please verify whether the following two hotel names refer to the same property.

Supplier Hotel Name: ${d(r.hotelName)}
Internal Hotel Name: ${d(r.internalHotelName)}
Country: ${d(r.country)}
City: ${d(r.city)}
Address: ${d(r.address)}

Consider brand variations, abbreviations, language/transliteration differences, and chain naming.
${EN_FORMAT}`;

    case "DUPLICATE_HOTEL":
      return `Check whether the following hotel might be a duplicate of an existing property.

Hotel Name: ${d(r.hotelName)}
Address: ${d(r.address)}
City: ${d(r.city)}
Country: ${d(r.country)}
Internal Hotel Name (candidate match): ${d(r.internalHotelName)}
Internal Address: ${d(r.internalAddress)}

Determine whether this is the same property under a different name, a nearby but different property, or a genuinely new hotel.
${EN_FORMAT}`;

    case "ROOM_NAME":
      return `Please verify whether the following two room names refer to the same room type.

Hotel: ${d(r.hotelName)}
Supplier Room Name: ${d(r.roomName)}
Internal Room Name: ${d(r.internalRoomName)}
Supplier Bed Type: ${d(r.bedType)}
Internal Bed Type: ${d(r.internalBedType)}

Consider view, size, and category wording differences.
${EN_FORMAT}`;

    case "BED_TYPE":
      return `Please verify whether the following bed types are equivalent.

Hotel: ${d(r.hotelName)}
Room Name: ${d(r.roomName)}
Supplier Bed Type: ${d(r.bedType)}
Internal Bed Type: ${d(r.internalBedType)}

Determine whether these describe the same sleeping configuration (e.g. Double vs Queen, Twin vs Two Singles, Futon vs Bed).
${EN_FORMAT}`;

    case "EXTRA_BED":
      return `Please clarify the extra bed configuration for the following room.

Hotel: ${d(r.hotelName)}
Room Name: ${d(r.roomName)}
Supplier Extra Bed Type: ${d(r.extraBedType)}
Internal Extra Bed Type: ${d(r.internalExtraBedType)}
Country: ${d(r.country)}

The extra bed type is unclear or empty. Determine the most likely extra bed (e.g. rollaway single bed, sofa bed, tatami/futon) based on hotel type and region.
${EN_FORMAT}`;

    case "AGENT_AMENDMENT":
      return `Draft a concise amendment request to send to the supplier/agent for the following hotel.

Supplier: ${d(r.supplier)}
Hotel ID: ${d(r.hotelId)}
Hotel Name: ${d(r.hotelName)}
Address: ${d(r.address)}
Room Name: ${d(r.roomName)}
Bed Type: ${d(r.bedType)}
Extra Bed Type: ${d(r.extraBedType)}

Issue detected: ${r.remarkCodes.join(", ") || "data inconsistency"}.
Write a clear, polite request asking the agent to confirm or correct the inconsistent fields. Keep it under 120 words.`;

    case "STAKEHOLDER_CONFIRMATION":
      return `Draft a short internal message asking a stakeholder to confirm before mapping.

Hotel: ${d(r.hotelName)} (${d(r.hotelId)}, ${d(r.supplier)})
Location: ${d(r.city)}, ${d(r.country)}
Detected risk: ${r.riskLevel}
Issues: ${r.remarkCodes.join(", ") || "needs confirmation"}.

Summarize the discrepancy and ask a clear yes/no question about whether to proceed with mapping. Keep it under 100 words.`;
  }
}

function ko(r: AnalyzedRow, type: PromptType): string {
  const d = dashKo;
  switch (type) {
    case "HOTEL_ADDRESS":
      return `다음 두 호텔 주소가 동일한 시설을 가리키는지 확인해 주세요.

공급사 호텔명:
${d(r.hotelName)}

공급사 주소:
${d(r.address)}

내부 호텔명:
${d(r.internalHotelName)}

내부 주소:
${d(r.internalAddress)}

국가: ${d(r.country)}
도시: ${d(r.city)}

동일한 호텔인지, 혹은 한쪽이 구주소·도로명·지번 주소이거나 다른 시설인지 확인해 주세요.
${KO_FORMAT}`;

    case "HOTEL_NAME":
      return `다음 두 호텔명이 동일한 시설을 가리키는지 확인해 주세요.

공급사 호텔명: ${d(r.hotelName)}
내부 호텔명: ${d(r.internalHotelName)}
국가: ${d(r.country)}
도시: ${d(r.city)}
주소: ${d(r.address)}

브랜드 표기 차이, 약어, 언어/음역 차이, 체인 명명 규칙을 고려해 주세요.
${KO_FORMAT}`;

    case "DUPLICATE_HOTEL":
      return `다음 호텔이 기존 시설과 중복일 가능성이 있는지 확인해 주세요.

호텔명: ${d(r.hotelName)}
주소: ${d(r.address)}
도시: ${d(r.city)}
국가: ${d(r.country)}
내부 호텔명(후보): ${d(r.internalHotelName)}
내부 주소: ${d(r.internalAddress)}

다른 이름의 동일 시설인지, 인근의 다른 시설인지, 실제 신규 호텔인지 판단해 주세요.
${KO_FORMAT}`;

    case "ROOM_NAME":
      return `다음 두 객실명이 동일한 객실 타입을 가리키는지 확인해 주세요.

호텔: ${d(r.hotelName)}
공급사 객실명: ${d(r.roomName)}
내부 객실명: ${d(r.internalRoomName)}
공급사 베드타입: ${d(r.bedType)}
내부 베드타입: ${d(r.internalBedType)}

전망, 크기, 카테고리 표현 차이를 고려해 주세요.
${KO_FORMAT}`;

    case "BED_TYPE":
      return `다음 베드타입이 동일한 구성인지 확인해 주세요.

호텔: ${d(r.hotelName)}
객실명: ${d(r.roomName)}
공급사 베드타입: ${d(r.bedType)}
내부 베드타입: ${d(r.internalBedType)}

동일한 취침 구성을 의미하는지 판단해 주세요 (예: Double vs Queen, Twin vs 싱글 2개, Futon vs Bed).
${KO_FORMAT}`;

    case "EXTRA_BED":
      return `다음 객실의 엑스트라베드 구성을 명확히 해 주세요.

호텔: ${d(r.hotelName)}
객실명: ${d(r.roomName)}
공급사 엑스트라베드 타입: ${d(r.extraBedType)}
내부 엑스트라베드 타입: ${d(r.internalExtraBedType)}
국가: ${d(r.country)}

엑스트라베드 타입이 불명확하거나 비어 있습니다. 호텔 유형과 지역을 고려해 가장 가능성 높은 엑스트라베드(예: 롤어웨이 싱글, 소파베드, 타타미/이불)를 판단해 주세요.
${KO_FORMAT}`;

    case "AGENT_AMENDMENT":
      return `다음 호텔에 대해 공급사/Agent에 보낼 수정 요청문을 작성해 주세요.

공급사: ${d(r.supplier)}
호텔 ID: ${d(r.hotelId)}
호텔명: ${d(r.hotelName)}
주소: ${d(r.address)}
객실명: ${d(r.roomName)}
베드타입: ${d(r.bedType)}
엑스트라베드 타입: ${d(r.extraBedType)}

감지된 이슈: ${r.remarkCodes.join(", ") || "데이터 불일치"}.
불일치 항목을 확인·정정해 달라고 요청하는 명확하고 정중한 문장을 120자 이내로 작성해 주세요.`;

    case "STAKEHOLDER_CONFIRMATION":
      return `매핑 전 이해관계자 확인을 요청하는 짧은 내부 메시지를 작성해 주세요.

호텔: ${d(r.hotelName)} (${d(r.hotelId)}, ${d(r.supplier)})
위치: ${d(r.city)}, ${d(r.country)}
감지된 위험도: ${r.riskLevel}
이슈: ${r.remarkCodes.join(", ") || "확인 필요"}.

불일치 내용을 요약하고 매핑 진행 여부를 묻는 명확한 질문을 100자 이내로 작성해 주세요.`;
  }
}
